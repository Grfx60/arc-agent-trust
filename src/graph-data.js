const fs = require('fs');
const path = require('path');

function validAgentId(agentId) {
  return require('./agent-id').isValidAgentId(agentId);
}

function graphPath(graphDir, agentId) {
  return path.join(graphDir, `agent-${agentId}-graph.json`);
}

function loadGraph(graphDir, agentId) {
  if (!validAgentId(agentId)) return null;

  const filename = graphPath(graphDir, agentId);
  if (!fs.existsSync(filename)) return null;

  try {
    const graph = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return {
      agentId: String(graph.agentId || agentId),
      generatedAt: graph.generatedAt || null,
      nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
      edges: Array.isArray(graph.edges) ? graph.edges : [],
      relationships: graph.relationships || {},
      assessment: graph.assessment || {}
    };
  } catch {
    return null;
  }
}

function loadReportDerivedGraph(reportDir, agentId) {
  if (!validAgentId(agentId)) return null;

  const filename = path.join(reportDir, `agent-live-${agentId}-v66.json`);
  if (!fs.existsSync(filename)) return null;

  try {
    const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return deriveReportGraph(report, agentId);
  } catch {
    return null;
  }
}

function deriveReportGraph(report, agentId) {
    if (!report || !validAgentId(agentId)) return null;
    const agentNode = `agent:${agentId}`;
    const nodes = [{
      id: agentNode,
      type: 'AGENT',
      label: `Agent ${agentId}`
    }];
    const edges = [];
    const owner = report.identity?.owner || report.owner?.address;

    if (owner) {
      const ownerNode = `owner:${String(owner).toLowerCase()}`;
      nodes.push({ id: ownerNode, type: 'OWNER', label: owner });
      edges.push({ from: agentNode, to: ownerNode, type: 'OWNED_BY' });
    }

    const subjects = Array.isArray(report.arcscan?.subjects)
      ? report.arcscan.subjects
      : [];
    const providers = new Map();

    for (const subject of subjects) {
      const address = subject.client?.address;
      if (!address) continue;
      providers.set(String(address).toLowerCase(), address);
    }

    for (const [normalized, address] of providers) {
      const providerNode = `actor:${normalized}`;
      nodes.push({ id: providerNode, type: 'REPUTATION_PROVIDER', label: address });
      edges.push({ from: agentNode, to: providerNode, type: 'REPUTATION' });
    }

    return {
      agentId: String(report.agentId || agentId),
      generatedAt: report.analyzedAt || null,
      nodes,
      edges,
      relationships: {
        reputationProviders: [...providers.keys()],
        validators: [],
        overlappingActors: []
      },
      assessment: {
        graphRisk: 'UNKNOWN',
        nodeCount: nodes.length,
        edgeCount: edges.length,
        reputationProviderCount: providers.size,
        validatorCount: 0,
        overlapCount: 0
      },
      derived: true
    };
}

function summarizeGraph(graph) {
  if (!graph) return null;

  return {
    agentId: graph.agentId,
    generatedAt: graph.generatedAt,
    source: graph.derived ? 'REPORT_DERIVED' : 'GRAPH_FILE',
    derived: graph.derived === true,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    graphRisk: graph.assessment.graphRisk || 'UNKNOWN',
    reputationProviderCount: graph.assessment.reputationProviderCount
      ?? (graph.relationships.reputationProviders || []).length,
    validatorCount: graph.assessment.validatorCount
      ?? (graph.relationships.validators || []).length,
    overlapCount: graph.assessment.overlapCount
      ?? (graph.relationships.overlappingActors || []).length,
    nodes: graph.nodes.slice(0, 30),
    edges: graph.edges.slice(0, 50),
    overlappingActors: graph.relationships.overlappingActors || []
  };
}

module.exports = { deriveReportGraph, loadGraph, loadReportDerivedGraph, summarizeGraph };
