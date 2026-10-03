const http = require("http");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const reportRepository = require('../report-repository');
const {
    deriveReportGraph,
    loadGraph,
    loadReportDerivedGraph,
    summarizeGraph
} = require("../graph-data");
const {
    listCatalog,
    loadState,
    scanNextChunk
} = require("../network-catalog");

const PORT = config.servers.dashboard.port;
const HOST = config.servers.dashboard.host;
const LIVE_API_PORT = config.servers.liveApi.port;
const LIVE_API_HOST = process.env.LIVE_API_PROXY_HOST || "127.0.0.1";

const PUBLIC_DIR = config.servers.dashboard.publicDir;
const REPORT_DIR = config.evidence.reportDir;
const GRAPH_DIR = path.resolve(__dirname, "../..");
const { isValidAgentId, normalizeAgentId } = require('../agent-id');

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
        hostname: LIVE_API_HOST,
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

const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(error => {
        if (res.headersSent) return res.destroy();
        send(res, 503, JSON.stringify({ error: 'Service temporarily unavailable.', code: 'SERVICE_UNAVAILABLE' }), 'application/json; charset=utf-8');
    });
});

async function handleRequest(req, res) {

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
                    !isValidAgentId(agentId)
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

                const normalizedAgentId = normalizeAgentId(agentId);

                return liveAnalysis(
                    req,
                    res,
                    normalizedAgentId
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
                    !isValidAgentId(agentId)
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

                const normalizedAgentId = normalizeAgentId(agentId);

                const report =
                    loadReport(
                        normalizedAgentId
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

            if (url.pathname === "/api/agents") {
                try {
                    const agents = await reportRepository.listArchivedAgents(
                        REPORT_DIR,
                        url.searchParams.get("q") || ""
                    );

                    return send(
                        res,
                        200,
                        JSON.stringify({ agents, count: agents.length }),
                        "application/json; charset=utf-8"
                    );
                } catch {
                    return send(
                        res,
                        500,
                        JSON.stringify({ error: "Could not list local reports." }),
                        "application/json; charset=utf-8"
                    );
                }
            }

            if (url.pathname === "/api/archive") {
                const query = url.searchParams.get("q") || "";
                return send(
                    res,
                    200,
                    JSON.stringify({
                        agents: await reportRepository.listArchivedAgents(REPORT_DIR, query),
                        query
                    }),
                    "application/json; charset=utf-8"
                );
            }

            if (url.pathname === "/api/network-agents") {
                try {
                    let state = loadState(config.evidence.cacheDir);
                    if (url.searchParams.get("refresh") === "1") {
                        state = await scanNextChunk(config.evidence.cacheDir);
                    }
                    return send(
                        res,
                        200,
                        JSON.stringify({
                            source: "ARC_IDENTITY_REGISTRY",
                            registry: config.blockchain.contracts.identityRegistry,
                            ...listCatalog(
                                state,
                                url.searchParams.get("page"),
                                url.searchParams.get("limit")
                            )
                        }),
                        "application/json; charset=utf-8"
                    );
                } catch (error) {
                    return send(
                        res,
                        502,
                        JSON.stringify({
                            error: "Network agent catalog unavailable.",
                            details: error.message
                        }),
                        "application/json; charset=utf-8"
                    );
                }
            }

            if (url.pathname === "/api/history") {
                const agentId = url.searchParams.get("id");

                if (!isValidAgentId(agentId)) {
                    return send(
                        res,
                        400,
                        JSON.stringify({ error: "Invalid Agent ID" }),
                        "application/json; charset=utf-8"
                    );
                }

                const normalizedAgentId = normalizeAgentId(agentId);

                return send(
                    res,
                    200,
                    JSON.stringify({
                        agentId: normalizedAgentId,
                        reports: await reportRepository.listAgentReports(REPORT_DIR, normalizedAgentId)
                    }),
                    "application/json; charset=utf-8"
                );
            }

            if (url.pathname === "/api/compare") {
                const ids = (url.searchParams.get("ids") || "")
                    .split(",")
                    .map(value => value.trim())
                    .filter(Boolean);

                if (ids.length < 2 || ids.length > 10 || ids.some(id => !isValidAgentId(id))) {
                    return send(
                        res,
                        400,
                        JSON.stringify({ error: "Provide at least two numeric agent IDs." }),
                        "application/json; charset=utf-8"
                    );
                }

                const normalizedIds = ids.map(normalizeAgentId);

                return send(
                    res,
                    200,
                    JSON.stringify(await reportRepository.compareAgents(REPORT_DIR, normalizedIds)),
                    "application/json; charset=utf-8"
                );
            }

            if (url.pathname === "/api/graph") {
                const agentId = url.searchParams.get("id");

                if (!isValidAgentId(agentId)) {
                    return send(
                        res,
                        400,
                        JSON.stringify({ error: "Invalid Agent ID" }),
                        "application/json; charset=utf-8"
                    );
                }

                const normalizedAgentId = normalizeAgentId(agentId);

                const graph = loadGraph(GRAPH_DIR, normalizedAgentId)
                    || loadReportDerivedGraph(REPORT_DIR, normalizedAgentId)
                    || deriveReportGraph(await reportRepository.latestFullReport(REPORT_DIR, normalizedAgentId), normalizedAgentId);
                const summary = summarizeGraph(graph);
                if (!summary) {
                    return send(
                        res,
                        404,
                        JSON.stringify({ error: "No graph data found for this agent." }),
                        "application/json; charset=utf-8"
                    );
                }

                return send(
                    res,
                    200,
                    JSON.stringify(summary),
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

                const storage = await reportRepository.health();

                return send(
                    res,
                    storage.status === "ok" ? 200 : 503,
                    JSON.stringify({
                        status: storage.status === "ok" ? "ok" : "degraded",
                        dashboard:
                            "v68",
                        liveApi:
                            "http://localhost:3100",
                        reportStore:
                            storage.store,
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

/*
==================================================
 START
==================================================
*/

server.listen(
    PORT,
    HOST,
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
