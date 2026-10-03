const assert = require('assert');
const { listCatalog } = require('../src/network-catalog');

const state = {
  nextBlock: 62270000n,
  latestBlock: 62277789n,
  complete: false,
  error: null,
  agents: {
    '12': { agentId: '12', owner: '0x12', active: true },
    '34': { agentId: '34', owner: '0x34', active: true },
    '56': { agentId: '56', owner: '0x56', active: true }
  }
};

const page = listCatalog(state, 2, 1);
assert.deepEqual(page.agents.map(agent => agent.agentId), ['34']);
assert.equal(page.total, 3);
assert.equal(page.complete, false);
assert.equal(page.nextBlock, '62270000');

console.log('Network catalog assertions passed.');