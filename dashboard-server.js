const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const LIVE_API_PORT = 3100;

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const REPORT_DIR = path.join(ROOT, "reports");

function send(res, status, content, type) {
    res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "no-cache"
    });

    res.end(content);
}

/*
==================================================
 LOAD LOCAL REPORT
==================================================
*/

function loadReport(agentId) {

    const jsonPath = path.join(
        REPORT_DIR,
        `agent-trust-${agentId}.json`
    );

    if (!fs.existsSync(jsonPath)) {
        return null;
    }

    try {

        return JSON.parse(
            fs.readFileSync(
                jsonPath,
                "utf8"
            )
        );

    } catch {

        return null;

    }
}

/*
==================================================
 PROXY LIVE API
==================================================
*/

function liveAnalysis(req, res, agentId) {

    const options = {
        hostname: "localhost",
        port: LIVE_API_PORT,
        path:
            `/api/live-agent?id=${encodeURIComponent(agentId)}`,
        method: "GET",
        headers: {
            "Accept":
                "application/json"
        }
    };

    const proxy =
        http.request(
            options,
            proxyRes => {

                let data = "";

                proxyRes.on(
                    "data",
                    chunk => {
                        data +=
                            chunk.toString();
                    }
                );

                proxyRes.on(
                    "end",
                    () => {

                        send(
                            res,
                            proxyRes.statusCode || 500,
                            data,
                            "application/json; charset=utf-8"
                        );

                    }
                );

            }
        );

    proxy.on(
        "error",
        error => {

            send(
                res,
                503,
                JSON.stringify({
                    error:
                        "Live engine unavailable.",
                    details:
                        error.message
                }),
                "application/json; charset=utf-8"
            );

        }
    );

    proxy.end();
}

/*
==================================================
 SERVER
==================================================
*/

const server =
    http.createServer(
        (req, res) => {

            const url =
                new URL(
                    req.url,
                    `http://localhost:${PORT}`
                );

            /*
            ==========================================
            LIVE AGENT
            ==========================================
            */

            if (
                url.pathname ===
                "/api/live-agent"
            ) {

                const agentId =
                    url.searchParams.get(
                        "id"
                    );

                if (
                    !agentId ||
                    !/^\d+$/.test(agentId)
                ) {

                    return send(
                        res,
                        400,
                        JSON.stringify({
                            error:
                                "Invalid Agent ID"
                        }),
                        "application/json; charset=utf-8"
                    );

                }

                return liveAnalysis(
                    req,
                    res,
                    agentId
                );

            }

            /*
            ==========================================
            LOCAL REPORT API
            ==========================================
            */

            if (
                url.pathname ===
                "/api/agent"
            ) {

                const agentId =
                    url.searchParams.get(
                        "id"
                    );

                if (
                    !agentId ||
                    !/^\d+$/.test(agentId)
                ) {

                    return send(
                        res,
                        400,
                        JSON.stringify({
                            error:
                                "Invalid Agent ID"
                        }),
                        "application/json; charset=utf-8"
                    );

                }

                const report =
                    loadReport(
                        agentId
                    );

                if (!report) {

                    return send(
                        res,
                        404,
                        JSON.stringify({
                            error:
                                "No local report found.",
                            hint:
                                "Use /api/live-agent for live analysis."
                        }),
                        "application/json; charset=utf-8"
                    );

                }

                return send(
                    res,
                    200,
                    JSON.stringify(
                        report
                    ),
                    "application/json; charset=utf-8"
                );

            }

            /*
            ==========================================
            HEALTH
            ==========================================
            */

            if (
                url.pathname ===
                "/health"
            ) {

                return send(
                    res,
                    200,
                    JSON.stringify({
                        status:
                            "ok",
                        dashboard:
                            "v68",
                        liveApi:
                            "http://localhost:3100",
                        network:
                            "Arc Testnet"
                    }),
                    "application/json; charset=utf-8"
                );

            }

            /*
            ==========================================
            STATIC FILES
            ==========================================
            */

            let filePath;

            if (
                url.pathname === "/" ||
                url.pathname === "/index.html"
            ) {

                filePath =
                    path.join(
                        PUBLIC_DIR,
                        "index.html"
                    );

            } else {

                filePath =
                    path.join(
                        PUBLIC_DIR,
                        url.pathname.replace(
                            /^\/+/,
                            ""
                        )
                    );

            }

            /*
            SECURITY
            */

            const relative =
                path.relative(
                    PUBLIC_DIR,
                    filePath
                );

            if (
                relative.startsWith("..") ||
                path.isAbsolute(relative)
            ) {

                return send(
                    res,
                    403,
                    "Forbidden",
                    "text/plain"
                );

            }

            /*
            FILE CHECK
            */

            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return send(
                    res,
                    404,
                    "Not Found",
                    "text/plain"
                );

            }

            const ext =
                path.extname(
                    filePath
                ).toLowerCase();

            const types = {

                ".html":
                    "text/html; charset=utf-8",

                ".css":
                    "text/css; charset=utf-8",

                ".js":
                    "application/javascript; charset=utf-8",

                ".json":
                    "application/json; charset=utf-8",

                ".png":
                    "image/png",

                ".jpg":
                    "image/jpeg",

                ".jpeg":
                    "image/jpeg",

                ".svg":
                    "image/svg+xml",

                ".ico":
                    "image/x-icon"

            };

            const content =
                fs.readFileSync(
                    filePath
                );

            send(
                res,
                200,
                content,
                types[ext] ||
                    "application/octet-stream"
            );

        }
    );

/*
==================================================
 START
==================================================
*/

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "       ARC AGENT TRUST — DASHBOARD v68"
        );

        console.log(
            "=========================================="
        );

        console.log("");

        console.log(
            `Dashboard: http://localhost:${PORT}`
        );

        console.log(
            `Live API:  http://localhost:${LIVE_API_PORT}`
        );

        console.log(
            "Live endpoint:"
        );

        console.log(
            "/api/live-agent?id=887060"
        );

        console.log("");

        console.log(
            "Dashboard v68 READY"
        );

        console.log("");

    }
);