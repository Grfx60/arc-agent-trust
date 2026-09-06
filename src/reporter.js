/**
 * Arc Agent Trust - Advanced Reporting System
 * 
 * Features:
 * - Multi-format reports (JSON, CSV, HTML)
 * - Comparison reports
 * - Historical trend analysis
 * - Executive summary
 * - Risk breakdown
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger')('reporter');
const config = require('./config');

class ReportGenerator {
  constructor() {
    this.reportDir = config.evidence.reportDir;
    
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }
  
  /**
   * Generate full report
   */
  generateReport(agentId, assessment, format = 'json') {
    const timestamp = new Date().toISOString();
    const report = {
      metadata: {
        version: '2.0',
        generatedAt: timestamp,
        reportFormat: format,
        agentId,
        network: config.blockchain.network
      },
      executive_summary: this._generateExecutiveSummary(agentId, assessment),
      assessment,
      risk_breakdown: this._generateRiskBreakdown(assessment),
      recommendations: this._generateRecommendations(assessment),
      audit_trail: {
        generated: timestamp,
        engine: 'trust-engine-v66',
        config_version: config.trustEngine
      }
    };
    
    // Save report
    const filename = this._saveReport(agentId, report, format);
    logger.info('Report generated', { agentId, format, filename });
    
    return { report, filename };
  }
  
  /**
   * Generate executive summary
   */
  _generateExecutiveSummary(agentId, assessment) {
    const decision = assessment.assessment.decision;
    const risk = assessment.assessment.risk.observed;
    const confidence = assessment.assessment.confidence.evidence;
    
    const riskLevel = risk < 25 ? 'LOW' : risk < 50 ? 'MEDIUM' : 'HIGH';
    const confidenceLevel = confidence > 70 ? 'HIGH' : confidence > 50 ? 'MEDIUM' : 'LOW';
    
    return {
      agentId,
      decision,
      riskLevel,
      confidenceLevel,
      riskScore: risk.toFixed(1),
      confidenceScore: confidence.toFixed(1),
      summary: this._generateSummaryText(decision, riskLevel, confidenceLevel),
      recommendations: this._getRecommendationText(decision)
    };
  }
  
  /**
   * Generate risk breakdown
   */
  _generateRiskBreakdown(assessment) {
    const signals = assessment.signals;
    
    return {
      positive_signals: {
        count: signals.positive,
        weight: 'Positive factors supporting agent trustworthiness'
      },
      risk_signals: {
        count: signals.risk,
        weight: 'Risk factors against agent trustworthiness',
        details: signals.details.risk.map(s => ({
          type: s.code,
          message: s.message
        }))
      },
      uncertainty_signals: {
        count: signals.uncertainty,
        weight: 'Uncertain or unknown factors',
        details: signals.details.uncertainty.map(s => ({
          type: s.code,
          message: s.message
        }))
      }
    };
  }
  
  /**
   * Generate recommendations
   */
  _generateRecommendations(assessment) {
    const decision = assessment.assessment.decision;
    const risk = assessment.assessment.risk.observed;
    const independence = assessment.assessment.confidence.independence;
    
    const recommendations = [];
    
    // Decision-based
    if (decision === 'ALLOW') {
      recommendations.push({
        priority: 'HIGH',
        action: 'Proceed with agent utilization',
        rationale: 'Agent has passed trust assessment with low risk'
      });
    } else if (decision === 'REVIEW') {
      recommendations.push({
        priority: 'HIGH',
        action: 'Manual review required',
        rationale: 'Agent requires human oversight before full integration'
      });
      
      if (independence < 50) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Collect more independent evidence',
          rationale: 'Current evidence has potential actor overlap'
        });
      }
    } else if (decision === 'BLOCK') {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Block agent operations',
        rationale: 'Critical evidence missing or high risk detected'
      });
    }
    
    // Risk-based
    if (risk > 60) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Increase monitoring',
        rationale: 'High observed risk requires active monitoring'
      });
    }
    
    // Independence-based
    if (independence < 40) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Seek independent validator confirmation',
        rationale: 'Current evidence sources lack independence'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate summary text
   */
  _generateSummaryText(decision, riskLevel, confidenceLevel) {
    const texts = {
      'ALLOW|LOW|HIGH': 'Agent demonstrates trustworthy characteristics with low risk and high confidence.',
      'REVIEW|MEDIUM|MEDIUM': 'Agent requires review due to moderate risk or medium confidence levels.',
      'REVIEW|HIGH|LOW': 'Insufficient evidence to make confident decision. Manual review necessary.',
      'BLOCK|HIGH|ANY': 'Critical evidence missing or high risk detected. Agent should not proceed.'
    };
    
    const key = Object.keys(texts).find(k => {
      const [d, r, c] = k.split('|');
      return d === decision && (r === riskLevel || r === 'ANY') && (c === confidenceLevel || c === 'ANY');
    });
    
    return texts[key] || 'Additional evidence required for comprehensive assessment.';
  }
  
  /**
   * Get recommendation text
   */
  _getRecommendationText(decision) {
    const texts = {
      'ALLOW': 'Agent is approved for operations.',
      'REVIEW': 'Request manual review by authorized personnel.',
      'BLOCK': 'Agent must not be used. Investigate before reconsideration.'
    };
    
    return texts[decision] || 'Contact support for guidance.';
  }
  
  /**
   * Save report to file
   */
  _saveReport(agentId, report, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename, content;
    
    if (format === 'json') {
      filename = `agent-${agentId}-report-${timestamp}.json`;
      content = JSON.stringify(report, null, 2);
    } else if (format === 'csv') {
      filename = `agent-${agentId}-report-${timestamp}.csv`;
      content = this._generateCsv(report);
    } else if (format === 'html') {
      filename = `agent-${agentId}-report-${timestamp}.html`;
      content = this._generateHtml(report);
    }
    
    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, content);
    
    return filename;
  }
  
  /**
   * Generate CSV format
   */
  _generateCsv(report) {
    const lines = [];
    const meta = report.metadata;
    const exec = report.executive_summary;
    const assess = report.assessment.assessment;
    
    lines.push('Arc Agent Trust - Report');
    lines.push(`Generated,${meta.generatedAt}`);
    lines.push(`Agent ID,${meta.agentId}`);
    lines.push(`Network,${meta.network}`);
    lines.push('');
    lines.push('Executive Summary');
    lines.push(`Decision,${exec.decision}`);
    lines.push(`Risk Level,${exec.riskLevel}`);
    lines.push(`Risk Score,${exec.riskScore}`);
    lines.push(`Confidence Level,${exec.confidenceLevel}`);
    lines.push(`Confidence Score,${exec.confidenceScore}`);
    lines.push('');
    lines.push('Assessment Details');
    lines.push(`Observed Risk,${assess.risk.observed.toFixed(1)}`);
    lines.push(`Uncertainty,${assess.risk.uncertainty.toFixed(1)}`);
    lines.push(`Independence Score,${assess.confidence.independence.toFixed(1)}`);
    
    return lines.join('\n');
  }
  
  /**
   * Generate HTML format
   */
  _generateHtml(report) {
    const exec = report.executive_summary;
    const assess = report.assessment.assessment;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arc Agent Trust Report - ${exec.agentId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; margin-bottom: 10px; }
    h2 { color: #34495e; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
    .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .metric { display: inline-block; margin-right: 30px; margin-bottom: 10px; }
    .metric-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
    .decision-allow { color: #27ae60; }
    .decision-review { color: #f39c12; }
    .decision-block { color: #e74c3c; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #34495e; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ecf0f1; }
    tr:hover { background: #f9f9f9; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Arc Agent Trust Assessment Report</h1>
    <p style="color: #7f8c8d;">Agent ID: ${exec.agentId} | Generated: ${report.metadata.generatedAt}</p>
    
    <div class="summary">
      <h2>Executive Summary</h2>
      <div class="metric">
        <div class="metric-label">Decision</div>
        <div class="metric-value decision-${exec.decision.toLowerCase()}">${exec.decision}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Risk Score</div>
        <div class="metric-value">${exec.riskScore}/100</div>
      </div>
      <div class="metric">
        <div class="metric-label">Confidence</div>
        <div class="metric-value">${exec.confidenceScore}/100</div>
      </div>
      <div style="clear: both; margin-top: 10px; color: #2c3e50;">
        ${exec.summary}
      </div>
    </div>
    
    <h2>Assessment Metrics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Observed Risk</td>
        <td>${assess.risk.observed.toFixed(1)}/100</td>
      </tr>
      <tr>
        <td>Uncertainty</td>
        <td>${assess.risk.uncertainty.toFixed(1)}/100</td>
      </tr>
      <tr>
        <td>Independence Score</td>
        <td>${assess.confidence.independence.toFixed(1)}/100</td>
      </tr>
    </table>
    
    <h2>Recommendations</h2>
    <ul>
      ${report.recommendations.map(r => `
        <li><strong>[${r.priority}]</strong> ${r.action} - ${r.rationale}</li>
      `).join('')}
    </ul>
    
    <div class="footer">
      <p>Report generated by Arc Agent Trust System v${report.metadata.version}</p>
      <p>Network: ${report.metadata.network} | Engine: ${report.audit_trail.engine}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return html;
  }
}

module.exports = ReportGenerator;
