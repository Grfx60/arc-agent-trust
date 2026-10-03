const MAX_AGENT_ID = (1n << 256n) - 1n;

function isValidAgentId(value) {
  const text = String(value ?? '');
  return /^\d{1,78}$/.test(text) && BigInt(text) <= MAX_AGENT_ID;
}

function normalizeAgentId(value) {
  return isValidAgentId(value) ? String(BigInt(value)) : null;
}

module.exports = { isValidAgentId, normalizeAgentId, MAX_AGENT_ID };
