function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.CORS_ORIGIN) res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  res.statusCode = 204;
  if (process.env.CORS_ORIGIN) res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end();
  return true;
}

module.exports = { sendJson, handleOptions };
