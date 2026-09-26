'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  chunkFile,
  computeFileHash,
  verifyChunk,
  assembleChunks,
  getChunkSize,
  toChunkManifest,
  CHUNK_SIZE
} = require('../../backend/services/chunker');

test('Chunker Service - Unit Tests', async (t) => {
  await t.test('chunkFile throws TypeError when input is not a Buffer', () => {
    assert.throws(() => chunkFile('not a buffer', 'test.txt'), {
      name: 'TypeError',
      message: /must be a Buffer/
    });
    assert.throws(() => chunkFile(null, 'test.txt'), {
      name: 'TypeError'
    });
  });

  await t.test('computeFileHash computes valid 64-char SHA-256 hex string', () => {
    const data = Buffer.from('Vault Distributed Object Storage Test Payload');
    const expectedHash = crypto.createHash('sha256').update(data).digest('hex');
    const hash = computeFileHash(data);

    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
    assert.equal(hash, expectedHash);
  });

  await t.test('chunkFile slices single small buffer correctly', () => {
    const smallData = Buffer.from('Small document content under chunk size threshold');
    const chunks = chunkFile(smallData, 'doc.txt');

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].index, 0);
    assert.equal(chunks[0].size, smallData.length);
    assert.equal(chunks[0].checksum, computeFileHash(smallData));
    assert.deepEqual(chunks[0].buffer, smallData);
  });

  await t.test('chunkFile slices large buffer exceeding chunk size', () => {
    // Generate data larger than 1 chunk (e.g., 2.5 chunks)
    const testChunkSize = getChunkSize();
    const totalSize = Math.floor(testChunkSize * 2.5);
    const largeData = Buffer.alloc(totalSize, 'A');

    const chunks = chunkFile(largeData, 'archive.bin');
    assert.equal(chunks.length, 3);

    assert.equal(chunks[0].index, 0);
    assert.equal(chunks[0].size, testChunkSize);

    assert.equal(chunks[1].index, 1);
    assert.equal(chunks[1].size, testChunkSize);

    assert.equal(chunks[2].index, 2);
    assert.equal(chunks[2].size, totalSize - (testChunkSize * 2));

    // Verify each chunk checksum
    for (const chunk of chunks) {
      assert.equal(verifyChunk(chunk.buffer, chunk.checksum), true);
    }
  });

  await t.test('verifyChunk accurately validates integrity and detects bit-rot', () => {
    const validData = Buffer.from('Sensitive financial ledger record');
    const validChecksum = computeFileHash(validData);

    assert.equal(verifyChunk(validData, validChecksum), true);

    // Tampered payload (simulated bit-rot)
    const corruptedData = Buffer.from('Sensitive financial ledger recore'); // last byte changed
    assert.equal(verifyChunk(corruptedData, validChecksum), false);
  });

  await t.test('assembleChunks restores original buffer byte-for-byte', () => {
    const original = Buffer.from('Distributed S3-compatible chunk reassembly test payload');
    const chunks = chunkFile(original, 'sample.data');
    const reassembled = assembleChunks(chunks);

    assert.equal(Buffer.compare(original, reassembled), 0);
  });

  await t.test('assembleChunks detects missing or disordered chunks', () => {
    const original = Buffer.alloc(getChunkSize() * 3, 'Z');
    const chunks = chunkFile(original, 'test.bin');

    // Remove middle chunk
    const incompleteChunks = [chunks[0], chunks[2]];
    assert.throws(() => assembleChunks(incompleteChunks), {
      message: /Missing chunk at index 1/
    });
  });

  await t.test('toChunkManifest strips raw buffers while preserving metadata', () => {
    const data = Buffer.from('Manifest metadata serialization test');
    const chunks = chunkFile(data, 'file.txt');
    const manifest = toChunkManifest(chunks);

    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].index, 0);
    assert.equal(manifest[0].size, data.length);
    assert.equal(typeof manifest[0].checksum, 'string');
    assert.equal(manifest[0].buffer, undefined);
  });
});
