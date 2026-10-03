function calculateTrust(evidence) {
  let positiveWeight = 0;
  let negativeWeight = 0;
  let knownWeight = 0;
  let totalWeight = 0;
  const breakdown = [];

  for (const rawItem of Array.isArray(evidence) ? evidence : []) {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const rawWeight = Number(item.weight);
    const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 0;
    totalWeight += weight;

    if (item.status === "POSITIVE") {
      positiveWeight += weight;
      knownWeight += weight;
    }

    if (item.status === "NEGATIVE") {
      negativeWeight += weight;
      knownWeight += weight;
    }

    breakdown.push({
      category: item.category || "unknown",
      signal: item.signal || "UNKNOWN_SIGNAL",
      status: item.status || "UNKNOWN",
      weight
    });
  }

  const trustScore = knownWeight > 0
    ? Math.round((positiveWeight / knownWeight) * 100)
    : 0;
  const riskScore = knownWeight > 0
    ? Math.round((negativeWeight / knownWeight) * 100)
    : 0;
  const coverage = totalWeight === 0
    ? 0
    : (knownWeight / totalWeight) * 100;

  return {
    trustScore,
    riskScore,
    confidence: Math.round(Math.min(100, coverage)),
    knownWeight,
    unknownWeight: totalWeight - knownWeight,
    coverage: Math.round(coverage * 100) / 100,
    breakdown,
    totals: {
      positiveWeight,
      negativeWeight,
      knownWeight,
      unknownWeight: totalWeight - knownWeight,
      totalWeight
    }
  };
}

module.exports = { calculateTrust };
