'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  chunkFile,
  computeFileHash,
  assembleChunks
} = require('../../backend/services/chunker');

test('End-to-End Distributed Storage Workflow', async (t) => {
  await t.test('Full lifecycle: Ingestion -> Chunking -> Quorum Distribution -> Self-Healing -> Reassembly', () => {
    // 1. Ingestion: Generate a 6MB simulated binary file
    const sampleSize = 6 * 1024 * 1024;
    const testFileBuffer = Buffer.alloc(sampleSize);
    for (let i = 0; i < sampleSize; i += 1024) {
      testFileBuffer.write('VAULT_PAYLOAD_BLOCK_' + (i / 1024).toString().padStart(6, '0'), i);
    }
    const originalFileHash = computeFileHash(testFileBuffer);

    // 2. Cryptographic Chunking
    const chunks = chunkFile(testFileBuffer, 'e2e_dataset.dat');
    assert.ok(chunks.length >= 2, 'File exceeding threshold must be sharded');

    // 3. Cluster Quorum Distribution (Replication Factor = 3)
    const cluster = {
      'node-alpha':   new Map(),
      'node-beta':    new Map(),
      'node-gamma':   new Map(),
      'node-delta':   new Map(),
      'node-epsilon': new Map()
    };
    const nodeNames = Object.keys(cluster);

    for (const chunk of chunks) {
      // Pick 3 nodes round-robin
      for (let r = 0; r < 3; r++) {
        const targetNode = nodeNames[(chunk.index + r) % nodeNames.length];
        cluster[targetNode].set(chunk.checksum, Buffer.from(chunk.buffer));
      }
    }

    // Verify all chunks are replicated across 3 nodes
    for (const chunk of chunks) {
      let replicaCount = 0;
      for (const nodeName of nodeNames) {
        if (cluster[nodeName].has(chunk.checksum)) {
          replicaCount++;
        }
      }
      assert.equal(replicaCount, 3, `Chunk ${chunk.index} must have 3 replicas`);
    }

    // 4. Simulate Node Hardware Failure ('node-alpha' crashes)
    delete cluster['node-alpha'];

    // 5. Self-Healing: Fetch chunk replicas from surviving nodes
    const recoveredChunks = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      const targetChecksum = chunks[idx].checksum;
      let foundBuffer = null;

      for (const survivingNode of Object.values(cluster)) {
        if (survivingNode.has(targetChecksum)) {
          foundBuffer = survivingNode.get(targetChecksum);
          break;
        }
      }

      assert.ok(foundBuffer, `Chunk ${idx} must be retrievable from surviving quorum`);
      recoveredChunks.push({
        index: idx,
        buffer: foundBuffer,
        checksum: targetChecksum,
        size: foundBuffer.length
      });
    }

    // 6. Real-time Binary Reassembly
    const restoredBuffer = assembleChunks(recoveredChunks);
    const restoredHash = computeFileHash(restoredBuffer);

    // 7. Byte-for-byte Bit Integrity Verification
    assert.equal(restoredHash, originalFileHash);
    assert.equal(Buffer.compare(testFileBuffer, restoredBuffer), 0);
  });
});
