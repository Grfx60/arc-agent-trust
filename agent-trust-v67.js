const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 3100;
const ENGINE = "agent-trust-v66.js";

function send(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache"
    });

    res.end(JSON.stringify(data, null, 2));
}

function runEngine(agentId) {

    return new Promise((resolve, reject) => {

        console.log("");
        console.log(
            `LIVE ANALYSIS → Agent ${agentId}`
        );

        const child = spawn(
            process.execPath,
            [
                ENGINE,
                agentId
            ],
            {
                cwd: __dirname,
                shell: false
            }
        );

        let stdout = "";
        let stderr = "";

        child.stdout.on(
            "data",
            data => {
                const text = data.toString();

                stdout += text;

                process.stdout.write(text);
            }
        );

        child.stderr.on(
            "data",
            data => {
                const text = data.toString();

                stderr += text;

                process.stderr.write(text);
            }
        );

        child.on(
            "error",
            error => {
                reject(error);
            }
        );

        child.on(
            "close",
            code => {

                if (code !== 0) {

                    reject(
                        new Error(
                            stderr ||
                            `Engine exited with code ${code}`
                        )
                    );

                    return;
                }

                resolve({
                    stdout,
                    stderr
                });

            }
        );

    });

}

const server = http.createServer(
    async (req, res) => {

        const requestUrl = new URL(
            req.url,
            `http://localhost:${PORT}`
        );

        /*
        ==========================================
        LIVE AGENT API
        ==========================================
        */

        if (
            requestUrl.pathname ===
            "/api/live-agent"
        ) {

            const agentId =
                requestUrl.searchParams.get("id");

            if (
                !agentId ||
                !/^\d+$/.test(agentId)
            ) {

                return send(
                    res,
                    400,
                    {
                        error:
                            "Invalid Agent ID"
                    }
                );

            }

            try {

                await runEngine(agentId);

                const reportPath =
                    path.join(
                        __dirname,
                        "reports",
                        `agent-live-${agentId}-v66.json`
                    );

                if (
                    !fs.existsSync(reportPath)
                ) {

                    throw new Error(
                        `Live report not found: ${reportPath}`
                    );

                }

                const report =
                    JSON.parse(
                        fs.readFileSync(
                            reportPath,
                            "utf8"
                        )
                    );

                console.log("");
                console.log(
                    `LIVE ANALYSIS COMPLETE → Agent ${agentId}`
                );
                console.log("");

                return send(
                    res,
                    200,
                    report
                );

            } catch (error) {

                console.error("");
                console.error(
                    "LIVE ANALYSIS ERROR:"
                );
                console.error(
                    error.message
                );
                console.error("");

                return send(
                    res,
                    500,
                    {
                        error:
                            "Live analysis failed.",
                        details:
                            error.message
                    }
                );

            }

        }

        /*
        ==========================================
        HEALTH CHECK
        ==========================================
        */

        if (
            requestUrl.pathname ===
            "/health"
        ) {

            return send(
                res,
                200,
                {
                    status: "ok",
                    engine: ENGINE,
                    version: "v67"
                }
            );

        }

        /*
        ==========================================
        NOT FOUND
        ==========================================
        */

        return send(
            res,
            404,
            {
                error:
                    "Not Found"
            }
        );

    }
);

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "      ARC AGENT TRUST — LIVE API v67"
        );

        console.log(
            "=========================================="
        );

        console.log("");

        console.log(
            `Live API: http://localhost:${PORT}`
        );

        console.log(
            "Endpoint: /api/live-agent?id=845265"
        );

        console.log(
            "Health:   /health"
        );

        console.log("");

        console.log(
            "LIVE ENGINE READY"
        );

        console.log("");

    }
);