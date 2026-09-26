'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('Storage Engine & Hierarchy - Unit Tests', async (t) => {
  // -------------------------------------------------------------------------
  // Virtual Folder Hierarchy Tests
  // -------------------------------------------------------------------------
  await t.test('Folder hierarchy builds valid nested breadcrumb paths', () => {
    const folders = [
      { id: 'f1', name: 'Engineering', parentId: null },
      { id: 'f2', name: 'Frontend', parentId: 'f1' },
      { id: 'f3', name: 'Components', parentId: 'f2' }
    ];

    function getBreadcrumbs(targetFolderId, folderList) {
      const breadcrumbs = [];
      let currentId = targetFolderId;

      while (currentId) {
        const found = folderList.find(f => f.id === currentId);
        if (!found) break;
        breadcrumbs.unshift({ id: found.id, name: found.name });
        currentId = found.parentId;
      }
      return breadcrumbs;
    }

    const path = getBreadcrumbs('f3', folders);
    assert.equal(path.length, 3);
    assert.equal(path[0].name, 'Engineering');
    assert.equal(path[1].name, 'Frontend');
    assert.equal(path[2].name, 'Components');

    const pathString = '/' + path.map(p => p.name).join('/');
    assert.equal(pathString, '/Engineering/Frontend/Components');
  });

  // -------------------------------------------------------------------------
  // Small vs Large File Storage Policy Tests
  // -------------------------------------------------------------------------
  await t.test('Storage policy classifies files correctly by threshold', () => {
    const SMALL_FILE_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB

    function determinePlacementPolicy(fileSizeBytes) {
      if (fileSizeBytes < SMALL_FILE_THRESHOLD_BYTES) {
        return {
          strategy: 'BROADCAST_ALL',
          description: 'Small file broadcasted across all 9 cluster nodes for zero-reassembly instant retrieval'
        };
      }
      return {
        strategy: 'SHARDED_QUORUM',
        description: 'Large file sliced into 4MB shards with SHA-256 verification and distributed across quorum nodes'
      };
    }

    const docSize = 1.2 * 1024 * 1024; // 1.2 MB
    const videoSize = 48 * 1024 * 1024; // 48 MB

    assert.equal(determinePlacementPolicy(docSize).strategy, 'BROADCAST_ALL');
    assert.equal(determinePlacementPolicy(videoSize).strategy, 'SHARDED_QUORUM');
  });

  // -------------------------------------------------------------------------
  // Multi-Region Zone Quorum Distribution Tests
  // -------------------------------------------------------------------------
  await t.test('Multi-region placement ensures cross-zone fault tolerance', () => {
    const clusterNodes = [
      { id: 'node-alpha', zone: 'us-east-1a' },
      { id: 'node-beta', zone: 'us-east-1b' },
      { id: 'node-gamma', zone: 'us-east-1c' },
      { id: 'node-delta', zone: 'us-west-2a' },
      { id: 'node-epsilon', zone: 'us-west-2b' },
      { id: 'node-zeta', zone: 'eu-central-1a' },
      { id: 'node-eta', zone: 'eu-central-1b' },
      { id: 'node-theta', zone: 'ap-south-1a' },
      { id: 'node-iota', zone: 'ap-south-1b' }
    ];

    function selectQuorumNodes(nodes, count = 3) {
      // Pick nodes from distinct zones when possible
      const selected = [];
      const usedZones = new Set();

      for (const node of nodes) {
        const region = node.zone.split('-')[0] + '-' + node.zone.split('-')[1]; // e.g. us-east, us-west
        if (!usedZones.has(region) && selected.length < count) {
          selected.push(node);
          usedZones.add(region);
        }
      }
      return selected;
    }

    const placement = selectQuorumNodes(clusterNodes, 3);
    assert.equal(placement.length, 3);
    const zones = new Set(placement.map(n => n.zone.split('-')[0] + '-' + n.zone.split('-')[1]));
    assert.equal(zones.size, 3); // 3 distinct regions
  });
});
