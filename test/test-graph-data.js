const assert = require('assert');
const path = require('path');
const {
	loadGraph,
	loadReportDerivedGraph,
	summarizeGraph
} = require('../src/graph-data');

const graphDir = process.cwd();
const graph = loadGraph(graphDir, '845265');

assert.ok(graph);
const summary = summarizeGraph(graph);
assert.equal(summary.agentId, '845265');
assert.equal(summary.nodeCount, 3);
assert.equal(summary.edgeCount, 5);
assert.equal(summary.graphRisk, 'HIGH');
assert.equal(summary.overlapCount, 1);
assert.equal(summary.edges.length, 5);
assert.equal(loadGraph(graphDir, 'not-an-agent'), null);
assert.equal(loadGraph(graphDir, '999999999'), null);

const derived = loadReportDerivedGraph(path.join(graphDir, 'reports'), '887060');
assert.ok(derived);
assert.equal(derived.assessment.graphRisk, 'UNKNOWN');
assert.ok(derived.nodes.length >= 2);
assert.ok(derived.edges.length >= 1);
assert.equal(summarizeGraph(derived).graphRisk, 'UNKNOWN');

console.log('Graph data assertions passed.');