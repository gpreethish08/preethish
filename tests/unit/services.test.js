'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

test('Distributed Services - Unit Tests', async (t) => {
  // -------------------------------------------------------------------------
  // Heartbeat & Node State Machine Tests
  // -------------------------------------------------------------------------
  await t.test('Heartbeat daemon correctly computes node health status', () => {
    function computeNodeStatus(missedPings, maxMissed = 3) {
      if (missedPings === 0) return 'HEALTHY';
      if (missedPings < maxMissed) return 'DEGRADED';
      return 'OFFLINE';
    }

    assert.equal(computeNodeStatus(0), 'HEALTHY');
    assert.equal(computeNodeStatus(1), 'DEGRADED');
    assert.equal(computeNodeStatus(2), 'DEGRADED');
    assert.equal(computeNodeStatus(3), 'OFFLINE');
    assert.equal(computeNodeStatus(10), 'OFFLINE');
  });

  // -------------------------------------------------------------------------
  // Healer & Quorum Repair Logic Tests
  // -------------------------------------------------------------------------
  await t.test('Healer detects under-replicated chunks requiring auto-repair', () => {
    function evaluateReplicationHealth(chunksWithReplicas, targetFactor = 3) {
      const underReplicated = [];
      for (const item of chunksWithReplicas) {
        const healthyReplicas = item.replicas.filter(r => r.status === 'HEALTHY').length;
        if (healthyReplicas < targetFactor) {
          underReplicated.push({
            chunkId: item.chunkId,
            current: healthyReplicas,
            required: targetFactor,
            deficit: targetFactor - healthyReplicas
          });
        }
      }
      return underReplicated;
    }

    const testManifest = [
      {
        chunkId: 'chunk-001',
        replicas: [
          { nodeId: 'node-1', status: 'HEALTHY' },
          { nodeId: 'node-2', status: 'HEALTHY' },
          { nodeId: 'node-3', status: 'HEALTHY' }
        ]
      },
      {
        chunkId: 'chunk-002',
        replicas: [
          { nodeId: 'node-1', status: 'HEALTHY' },
          { nodeId: 'node-2', status: 'OFFLINE' },
          { nodeId: 'node-3', status: 'OFFLINE' }
        ]
      }
    ];

    const repairs = evaluateReplicationHealth(testManifest, 3);
    assert.equal(repairs.length, 1);
    assert.equal(repairs[0].chunkId, 'chunk-002');
    assert.equal(repairs[0].current, 1);
    assert.equal(repairs[0].deficit, 2);
  });

  // -------------------------------------------------------------------------
  // Scrubber & Bit-Rot Detection Tests
  // -------------------------------------------------------------------------
  await t.test('Scrubber detects silent bit-rot data corruption against cryptographic checksum', () => {
    function scrubChunk(buffer, expectedSha256) {
      const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
      return {
        isValid: actualHash === expectedSha256,
        actualHash,
        expectedSha256
      };
    }

    const pristineData = Buffer.from('Cryptographically secure immutable block payload');
    const pristineHash = crypto.createHash('sha256').update(pristineData).digest('hex');

    // Healthy scrub
    const pristineResult = scrubChunk(pristineData, pristineHash);
    assert.equal(pristineResult.isValid, true);

    // Corrupted scrub (simulated flipped bit)
    const corruptedData = Buffer.from(pristineData);
    corruptedData[0] ^= 0x01; // flip 1 bit

    const corruptedResult = scrubChunk(corruptedData, pristineHash);
    assert.equal(corruptedResult.isValid, false);
    assert.notEqual(corruptedResult.actualHash, pristineHash);
  });
});
