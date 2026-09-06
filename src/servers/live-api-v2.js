/**
 * Arc Agent Trust - Enhanced Live API Server v2
 * 
 * Features:
 * - Comprehensive error handling
 * - Rate limiting (100 req/minute per IP)
 * - Request validation
 * - Structured response format
 * - Health checks
 * - Request logging
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const config = require('./config');
const logger = require('./logger')('live-api');

const PORT = config.servers.liveApi.port;
const HOST = config.servers.liveApi.host;

// ============================================
// Rate Limiting Store
// ============================================

const rateLimitStore = new Map();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.socket.remoteAddress;
}

function checkRateLimit(ip, limit = 100, window = 60000) {
  const now = Date.now();
  const windowStart = now - window;
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }
  
  let requests = rateLimitStore.get(ip);
  requests = requests.filter(t => t > windowStart);
  requests.push(now);
  rateLimitStore.set(ip, requests);
  
  return requests.length <= limit;
}

// ============================================
// Response Helpers
// ============================================

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, statusCode, code, message, details = {}) {
  sendJson(res, statusCode, {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...details
    }
  });
}

// ============================================
// Analysis Engine Subprocess
// ============================================

function analyzeAgent(agentId, callback) {
  const enginePath = path.join(__dirname, '../engines/trust-engine.js');
  
  let output = '';
  let errorOutput = '';
  
  const subprocess = spawn('node', [enginePath], {
    env: { ...process.env, AGENT_ID: agentId }
  });
  
  subprocess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  subprocess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  // Timeout after 30 seconds
  const timeout = setTimeout(() => {
    subprocess.kill();
    callback(new Error('Analysis timeout (30s)'), null);
  }, 30000);
  
  subprocess.on('close', (code) => {
    clearTimeout(timeout);
    
    if (code !== 0) {
      logger.error('Analysis process failed', { agentId, code, error: errorOutput });
      callback(new Error(`Engine exited with code ${code}`), null);
      return;
    }
    
    try {
      // Try to parse JSON from output
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        callback(null, result);
      } else {
        callback(new Error('Invalid engine output format'), null);
      }
    } catch (e) {
      logger.error('Failed to parse analysis result', { agentId, error: e.message });
      callback(e, null);
    }
  });
}

// ============================================
// Route Handlers
// ============================================

function handleHealthCheck(req, res) {
  sendJson(res, 200, {
    success: true,
    status: 'ok',
    server: 'live-api-v2',
    uptime: process.uptime(),
    network: config.blockchain.network,
    timestamp: new Date().toISOString()
  });
}

function handleLiveAnalysis(req, res, url) {
  const clientIp = getClientIp(req);
  const agentId = url.searchParams.get('id');
  
  // Request validation
  if (!agentId) {
    return sendError(res, 400, 'INVALID_REQUEST', 'Missing required parameter: id');
  }
  
  if (!/^\d+$/.test(agentId)) {
    return sendError(res, 400, 'INVALID_AGENT_ID', 'Agent ID must be numeric', {
      provided: agentId
    });
  }
  
  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return sendError(res, 429, 'RATE_LIMITED', 
      'Too many requests. Limit: 100/minute',
      { retryAfter: 60 }
    );
  }
  
  logger.info('Analyzing agent', { agentId, clientIp });
  
  analyzeAgent(agentId, (error, result) => {
    if (error) {
      logger.error('Analysis failed', { agentId, error: error.message });
      return sendError(res, 500, 'ANALYSIS_FAILED', 
        'Failed to analyze agent: ' + error.message
      );
    }
    
    logger.info('Analysis successful', { 
      agentId, 
      decision: result.assessment?.decision 
    });
    
    sendJson(res, 200, {
      success: true,
      data: result
    });
  });
}

function handleListAgents(req, res) {
  try {
    const evidenceDir = config.evidence.storageDir;
    
    if (!fs.existsSync(evidenceDir)) {
      return sendJson(res, 200, {
        success: true,
        agents: [],
        count: 0
      });
    }
    
    const files = fs.readdirSync(evidenceDir);
    const agents = files
      .filter(f => f.match(/^agent-(\d+)-evidence\.json$/))
      .map(f => f.match(/^agent-(\d+)-evidence\.json$/)[1])
      .sort((a, b) => parseInt(a) - parseInt(b));
    
    sendJson(res, 200, {
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    logger.error('Failed to list agents', { error: error.message });
    sendError(res, 500, 'LIST_FAILED', 'Failed to list agents');
  }
}

function handleReportsHistory(req, res) {
  try {
    const agentId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('id');
    const reportDir = config.evidence.reportDir;
    
    if (!agentId) {
      return sendError(res, 400, 'INVALID_REQUEST', 'Missing parameter: id');
    }
    
    if (!fs.existsSync(reportDir)) {
      return sendJson(res, 200, {
        success: true,
        reports: [],
        count: 0
      });
    }
    
    const files = fs.readdirSync(reportDir);
    const reports = files
      .filter(f => f.includes(`agent-trust-${agentId}`) || f.includes(`-${agentId}-`))
      .map(f => ({
        file: f,
        path: path.join(reportDir, f),
        timestamp: fs.statSync(path.join(reportDir, f)).mtime.toISOString()
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    sendJson(res, 200, {
      success: true,
      agentId,
      reports,
      count: reports.length
    });
  } catch (error) {
    logger.error('Failed to get reports history', { error: error.message });
    sendError(res, 500, 'HISTORY_FAILED', 'Failed to get report history');
  }
}

function handleReportContent(req, res, url) {
  try {
    const file = url.searchParams.get('file');
    
    if (!file) {
      return sendError(res, 400, 'INVALID_REQUEST', 'Missing parameter: file');
    }
    
    // Security: prevent directory traversal
    if (file.includes('..') || file.includes('/')) {
      return sendError(res, 403, 'FORBIDDEN', 'Invalid file path');
    }
    
    const reportPath = path.join(config.evidence.reportDir, file);
    
    if (!fs.existsSync(reportPath)) {
      return sendError(res, 404, 'NOT_FOUND', 'Report file not found');
    }
    
    const content = fs.readFileSync(reportPath, 'utf8');
    const data = JSON.parse(content);
    
    sendJson(res, 200, {
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to read report', { error: error.message });
    sendError(res, 500, 'READ_FAILED', 'Failed to read report file');
  }
}

// ============================================
// OPTIONS Handler (CORS Preflight)
// ============================================

function handleOptions(req, res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

// ============================================
// Main Server
// ============================================

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Logging
  logger.debug(`${req.method} ${url.pathname}`);
  
  // Routes
  if (url.pathname === '/health') {
    return handleHealthCheck(req, res);
  }
  
  if (url.pathname === '/api/live-agent') {
    return handleLiveAnalysis(req, res, url);
  }
  
  if (url.pathname === '/api/agents') {
    return handleListAgents(req, res);
  }
  
  if (url.pathname === '/api/reports') {
    return handleReportsHistory(req, res);
  }
  
  if (url.pathname === '/api/report') {
    return handleReportContent(req, res, url);
  }
  
  // 404
  sendError(res, 404, 'NOT_FOUND', 'Endpoint not found', {
    path: url.pathname,
    available: [
      '/health',
      '/api/live-agent?id=<agentId>',
      '/api/agents',
      '/api/reports?id=<agentId>',
      '/api/report?file=<filename>'
    ]
  });
});

server.listen(PORT, HOST, () => {
  logger.info(`Arc Agent Trust Live API v2 READY`, {
    url: `http://${HOST}:${PORT}`,
    endpoints: [
      '/health (GET)',
      '/api/live-agent?id=<id> (GET)',
      '/api/agents (GET)',
      '/api/reports?id=<id> (GET)',
      '/api/report?file=<filename> (GET)'
    ]
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('     Arc Agent Trust - Live API Server v2');
  console.log('='.repeat(60));
  console.log(`Server: http://${HOST}:${PORT}`);
  console.log(`Network: ${config.blockchain.network}`);
  console.log(`Rate Limit: 100 requests/minute per IP`);
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down live-api server');
  server.close(() => {
    logger.info('Live-api server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
