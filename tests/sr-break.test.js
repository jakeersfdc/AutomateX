const assert = require('node:assert');
const { describe, it } = require('node:test');
const { isBreakAbove, isBreakBelow } = require('../lib/engine/sr-break.js');

describe('Support/Resistance break detection', () => {
  it('returns true when price breaks above resistance', () => {
    assert.strictEqual(isBreakAbove(105, 100, 102), true);
    assert.strictEqual(isBreakAbove(102.1, 102, 102), true);
    assert.strictEqual(isBreakAbove(102, 102, 102), false);
    assert.strictEqual(isBreakAbove(101, 100, 102), false);
  });

  it('returns true when price breaks below support', () => {
    assert.strictEqual(isBreakBelow(95, 100, 98), true);
    assert.strictEqual(isBreakBelow(98, 98, 98), false);
    assert.strictEqual(isBreakBelow(99, 100, 98), false);
  });
});
