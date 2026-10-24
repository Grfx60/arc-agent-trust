/**
 * Arc Agent Trust — PDF Report Generator
 *
 * Server-side'da print-ready HTML üretir.
 * Tarayıcı print dialog'u ile PDF'e dönüştürülür (window.print()).
 * Ayrıca /api/report/:agentId/pdf endpoint'i bu HTML'i döndürür.
 */

'use strict';

function decisionColor(decision) {
  if (decision === 'TRUST')     return '#4ade80';
  if (decision === 'HIGH_RISK') return '#f87171';
  return '#facc15';
}

function decisionBg(decision) {
  if (decision === 'TRUST')     return '#052e16';
  if (decision === 'HIGH_RISK') return '#450a0a';
  return '#1c1400';
}

function signalIcon(status) {
  if (status === 'POSITIVE') return '✓';
  if (status === 'NEGATIVE') return '✗';
  return '?';
}

function generateReportHTML(report) {
  const trust    = report.trust || {};
  const identity = report.identity || {};
  const metrics  = report.metrics || {};
  const safety   = report.safety || {};
  const evidence = report.evidence || [];
  const onChain  = report.onChain || {};

  const decision     = trust.decision || 'UNKNOWN';
  const score        = trust.score ?? '?';
  const risk         = trust.riskScore ?? '?';
  const confidence   = trust.confidence ?? '?';
  const coverage     = trust.evidenceCoverage ?? '?';
  const analyzedAt   = report.analyzedAt ? new Date(report.analyzedAt).toLocaleString('tr-TR') : 'N/A';
  const durationSec  = report.analysisDurationMs ? (report.analysisDurationMs / 1000).toFixed(1) : '?';

  const positiveEvidence = evidence.filter(e => e.status === 'POSITIVE');
  const negativeEvidence = evidence.filter(e => e.status === 'NEGATIVE');
  const unknownEvidence  = evidence.filter(e => e.status === 'UNKNOWN');

  const apiStatus = report.apiStatus || {};

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arc Agent Trust Report — Agent #${report.agentId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #fff;
      color: #1a1a2e;
      font-size: 12px;
      line-height: 1.5;
    }
    .page { max-width: 800px; margin: 0 auto; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
    .logo { font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .logo span { color: #6366f1; }
    .meta { text-align: right; color: #6b7280; font-size: 11px; }
    .title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
    .decision-badge {
      display: inline-block; padding: 6px 18px; border-radius: 6px;
      font-weight: 700; font-size: 14px; letter-spacing: .05em;
      color: ${decisionColor(decision)}; background: ${decisionBg(decision)};
      border: 1px solid ${decisionColor(decision)}40;
      margin-bottom: 20px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .score-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
    .score-card .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
    .score-card .value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
    .info-row { display: flex; gap: 8px; margin-bottom: 4px; }
    .info-label { width: 160px; color: #6b7280; flex-shrink: 0; }
    .info-value { color: #1a1a2e; font-family: monospace; font-size: 11px; word-break: break-all; }
    .evidence-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .evidence-table th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-weight: 600; color: #374151; }
    .evidence-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .unknown  { color: #d97706; }
    .safety-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .safety-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
    .safety-item .s-label { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
    .safety-item .s-value { font-size: 12px; font-weight: 600; }
    .not-est { color: #6b7280; }
    .possible { color: #d97706; }
    .detected { color: #dc2626; }
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #9ca3af; font-size: 10px; display: flex; justify-content: space-between; }
    .qr-placeholder { width: 60px; height: 60px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #9ca3af; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
    .print-btn { background: #6366f1; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; cursor: pointer; margin-bottom: 16px; }
    .api-status { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; margin-bottom: 12px; }
    .api-ok  { color: #059669; } .api-err { color: #dc2626; }
  </style>
</head>
<body>
<div class="page">
  <button class="print-btn no-print" onclick="window.print()">PDF Olarak Kaydet</button>

  <div class="header">
    <div>
      <div class="logo">Arc Agent <span>Trust</span></div>
      <div style="color:#6b7280;font-size:11px;margin-top:2px">ERC-8004 Trust Assessment Report</div>
    </div>
    <div class="meta">
      <div>Report ID: AAT-${report.agentId}-${Date.now().toString(36).toUpperCase()}</div>
      <div>Generated: ${analyzedAt}</div>
      <div>Duration: ${durationSec}s</div>
      <div>Network: ${report.network || 'Arc Testnet'}</div>
    </div>
  </div>

  <div class="title">Agent #${report.agentId}</div>
  <div class="subtitle">
    Owner: <span style="font-family:monospace;font-size:11px">${identity.owner || 'Unknown'}</span>
    ${identity.agentWallet ? ` · Wallet: <span style="font-family:monospace;font-size:11px">${identity.agentWallet}</span>` : ''}
  </div>

  <div class="decision-badge">${decision}</div>

  <div class="grid">
    <div class="score-card"><div class="label">Trust Score</div><div class="value" style="color:${decisionColor(decision)}">${score}</div></div>
    <div class="score-card"><div class="label">Risk Score</div><div class="value">${risk}</div></div>
    <div class="score-card"><div class="label">Confidence</div><div class="value">${confidence}</div></div>
    <div class="score-card"><div class="label">Coverage</div><div class="value">${typeof coverage === 'number' ? coverage.toFixed(1) : coverage}%</div></div>
  </div>

  <div class="section">
    <div class="section-title">Evidence Summary</div>
    <div style="display:flex;gap:16px;margin-bottom:8px;font-size:12px">
      <span class="positive">✓ Positive: ${metrics.positiveSignals ?? positiveEvidence.length}</span>
      <span class="negative">✗ Negative: ${metrics.negativeSignals ?? negativeEvidence.length}</span>
      <span class="unknown">? Unknown: ${metrics.unknownSignals ?? unknownEvidence.length}</span>
    </div>
    <table class="evidence-table">
      <thead><tr><th>Signal</th><th>Category</th><th>Status</th><th>Weight</th></tr></thead>
      <tbody>
        ${evidence.map(e => `
        <tr>
          <td>${signalIcon(e.status)} ${e.signal}${e.detail ? ` <span style="color:#9ca3af">(${e.detail})</span>` : ''}</td>
          <td>${e.category || '-'}</td>
          <td class="${e.status === 'POSITIVE' ? 'positive' : e.status === 'NEGATIVE' ? 'negative' : 'unknown'}">${e.status}</td>
          <td>${e.weight}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Safety Assessment</div>
    <div class="safety-grid">
      ${[
        ['Fraud', safety.fraud],
        ['Maliciousness', safety.maliciousness],
        ['Manipulation', safety.manipulation],
        ['Sybil', safety.sybil],
        ['Blacklist Severity', safety.blacklistSeverity],
        ['Critical Negatives', safety.criticalNegativeCount ?? 0],
      ].map(([label, val]) => `
      <div class="safety-item">
        <div class="s-label">${label}</div>
        <div class="s-value ${val === 'NOT_ESTABLISHED' || val === 'NONE' || val === 0 ? 'not-est' : val === 'POSSIBLE' || val === 'SUSPECTED' || val === 'MODERATE' ? 'possible' : 'detected'}">${val ?? 'N/A'}</div>
      </div>`).join('')}
    </div>
  </div>

  ${onChain.reputation || onChain.validation ? `
  <div class="section">
    <div class="section-title">On-Chain Registry Data</div>
    <div class="info-row"><span class="info-label">Reputation Feedbacks:</span><span class="info-value">${onChain.reputation?.feedbackCount ?? 0}</span></div>
    <div class="info-row"><span class="info-label">Avg Reputation Score:</span><span class="info-value">${onChain.reputation?.averageScore ?? 'N/A'}</span></div>
    <div class="info-row"><span class="info-label">Validation Count:</span><span class="info-value">${onChain.validation?.validationCount ?? 0}</span></div>
    <div class="info-row"><span class="info-label">Recent Events (2k blk):</span><span class="info-value">Feedbacks: ${onChain.events?.feedbacks?.length ?? 0} · Validations: ${onChain.events?.validations?.length ?? 0}</span></div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Data Source Status</div>
    <div class="api-status">
      ${Object.entries(apiStatus).map(([k, v]) => `<span class="${v === 'ok' ? 'api-ok' : 'api-err'}">${v === 'ok' ? '✓' : '✗'} ${k}</span>`).join('')}
    </div>
  </div>

  <div class="footer">
    <div>
      <div>Arc Agent Trust v66 · ${report.network || 'Arc Testnet'} · Chain ID ${report.chainId}</div>
      <div>Identity Registry: ${report.registries?.identity}</div>
      <div>This report is generated automatically and reflects on-chain state at analysis time.</div>
    </div>
    <div class="qr-placeholder">QR</div>
  </div>
</div>
</body>
</html>`;
}

module.exports = { generateReportHTML };
