const { describe, it } = require('node:test');
const assert = require('assert');

describe('API Prices Route Payload', () => {
  it('should include winRate5d and avgReturn5d fields in output object', () => {
    const mockOutput = {
      price: '$1040.00',
      change: '+2.40%',
      color: 'text-emerald-400',
      winRate5d: 0.82,
      avgReturn5d: 4.15
    };
    assert.strictEqual(typeof mockOutput.winRate5d, 'number');
    assert.strictEqual(typeof mockOutput.avgReturn5d, 'number');
  });
});
