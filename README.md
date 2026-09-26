# 🛡️ Vault: Distributed Object Storage Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Storage Engine](https://img.shields.io/badge/Storage-9--Node%20Cluster-orange.svg)]()
[![Durability](https://img.shields.io/badge/Durability-99.999999999%25-brightgreen.svg)]()

> **Vault** is an enterprise-grade distributed object storage system — combining the user-friendly experience of **Google Drive** with the high durability, multi-region quorum, cryptographic SHA-256 chunking, and self-healing resilience of **Amazon S3**.

---

## 🏗️ Repository Architecture (Monorepo)

```
Vault_app/
├── frontend/                     # Modern Glassmorphic Web App & Storage Engine
│   ├── dashboard.html            # Real-time 9-Node Topology Map & Live Telemetry
│   ├── files.html                # Google Drive-Style Virtual Folders & File Manager
│   ├── cluster.html              # Node Inspector, Latency Heatmaps & Health Matrices
│   ├── chaos.html                # Chaos Engineering Studio (Bit-rot & Node Kill Lab)
│   ├── settings.html             # Zero-Knowledge Encryption & Policy Configuration
│   ├── vault-storage.js          # Persistent IndexedDB Blob Engine & Multi-Node Sharding
│   ├── vault-core.js             # Supabase Sync & REST Client Engine
│   └── sw.js                     # Progressive Web App (PWA) Offline Service Worker
│
└── backend/                      # Distributed Ingress Gateway & Storage Nodes
    ├── server.js                 # Gateway API Coordinator (:3000) & WebSocket Emitter
    ├── storage-node.js           # Lightweight HTTP Storage Node Engine (:9001 - :9009)
    ├── db/
    │   ├── init.js               # SQLite Schema with WAL mode & Foreign Key Cascade
    │   └── queries.js            # Optimized Precompiled SQL Queries
    ├── routes/
    │   ├── objects.js            # Chunking, Quorum Placement, Upload & Reassembly
    │   ├── cluster.js            # Node Registration & Telemetry Aggregator
    │   └── chaos.js              # Failure Injection & Chaos Testing API
    ├── services/
    │   ├── chunker.js            # Cryptographic SHA-256 Chunk Slicer (4MB Shards)
    │   ├── heartbeat.js          # 5-Second TCP Health Ping Daemon
    │   ├── healer.js             # Background Auto-Repair & Re-Replication Worker
    │   └── scrubber.js           # Anti-Bit-Rot Periodic Checksum Validator
    └── scripts/
        ├── register-nodes.js     # Cluster Node Auto-Discovery Script
        └── start-nodes.ps1       # 1-Click Multi-Node PowerShell Cluster Launcher
```

---

## ⚡ Core Features & Distributed Capabilities

### 1. Multi-Region 9-Node Cluster Topology
- 🟠 **Gateway Coordinator (`:3000`)**: Central ingress coordinator managing authentication, chunk routing, and quorum commits.
- 🟢 **Zone 1 Primary SSD Tier (`:9001 - :9003`)**: Node Alpha, Beta, Gamma (**US-East**). Handles high-throughput primary reads/writes.
- 🟣 **Zone 2 Multi-AZ Tier (`:9004 - :9006`)**: Node Delta, Epsilon, Zeta (**US-West**). Multi-region failover nodes.
- 🟡 **Zone 3 Disaster Recovery Tier (`:9007 - :9009`)**: Node Eta, Theta, Iota (**EU/AP**). Geo-distributed quorum & split-brain prevention.

### 2. High-Throughput Chunk Sharding & Small-File Broadcast Policy
- **Files $\ge 5\text{MB}$**: Dynamically sharded into **4MB chunks** with independent cryptographic SHA-256 hashes distributed across $3\times$ or $5\times$ Quorum nodes.
- **Files $< 5\text{MB}$**: Atomic broadcast across **ALL 9 cluster nodes** for instant retrieval without reassembly overhead.

### 3. Google Drive-Style Virtual Hierarchical Folders
- Native single/multi-file uploads (`<input type="file">`).
- Directory uploads (`webkitdirectory`) preserving directory names and hierarchies.
- 1-click **Download Folder as `.ZIP`** reassembled in real-time from distributed chunks using `JSZip`.

### 4. Self-Healing & Active Scrubber
- **Heartbeat Daemon (5s)**: Tracks node availability and marks missed nodes as `DEGRADED` or `OFFLINE`.
- **Healer Daemon (10s)**: Automatically detects under-replicated chunks and replicates them to healthy nodes.
- **Bit-Rot Scrubber (1hr)**: Validates physical chunk checksums against database manifests.

### 5. Chaos Engineering Studio
- Real-time simulation of node outages, bit-rot injection, and network partitions with live visual healing logs.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- PowerShell (on Windows) or Bash

### 1. Installation
Clone the repository:
```bash
git clone https://github.com/naresh-coderrr/Vault_app.git
cd Vault_app
```

Install backend dependencies:
```bash
npm run install:backend
```

### 2. Launch Storage Cluster & Gateway
To launch the 3 storage nodes and gateway in one command (PowerShell):
```bash
npm run start:cluster
```
Or start manually:
```bash
# Terminal 1: Node Alpha
node backend/storage-node.js --port=9001 --dir=./backend/node_data/node1 --name=Node-Alpha

# Terminal 2: Node Beta
node backend/storage-node.js --port=9002 --dir=./backend/node_data/node2 --name=Node-Beta

# Terminal 3: Node Gamma
node backend/storage-node.js --port=9003 --dir=./backend/node_data/node3 --name=Node-Gamma

# Terminal 4: Gateway API
cd backend && node server.js
```

### 3. Register Storage Nodes
In another terminal:
```bash
npm run register:nodes
```

### 4. Access the Web Application
Open your browser and navigate to:
- **Dashboard**: `http://localhost:3000/dashboard.html` (or open `frontend/dashboard.html`)
- **File Manager**: `http://localhost:3000/files.html` (or open `frontend/files.html`)
- **Cluster Health**: `http://localhost:3000/cluster.html`
- **Chaos Studio**: `http://localhost:3000/chaos.html`

---

## 📡 Gateway API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/objects/upload` | Multipart file upload with configurable quorum replication (`2x`, `3x`, `5x`) |
| `GET` | `/api/v1/objects` | List all stored file objects with replica health details |
| `GET` | `/api/v1/objects/:id` | Fetch file metadata and physical chunk distribution map |
| `GET` | `/api/v1/objects/:id/download` | Reassembles chunks in real-time and streams binary back to client |
| `DELETE` | `/api/v1/objects/:id` | Cascading delete across all storage nodes |
| `GET` | `/api/v1/cluster/health` | Cluster health score, node statuses, and under-replicated chunk counts |
| `POST` | `/api/v1/chaos/kill-node` | Simulates node hardware failure |
| `POST` | `/api/v1/chaos/inject-corruption` | Simulates bit-rot corruption on a specific chunk |

---

## 🔒 Security & Durability
- **Cryptographic Hashing**: SHA-256 computed on client and verified on every storage node.
- **Fail-Safe Persistence**: Dual storage layers utilizing **IndexedDB** for physical local persistence, **SQLite (WAL)** for metadata, and **Node HTTP endpoints** for network storage.
- **Zero-Knowledge Encryption**: AES-256-GCM client-side encryption support.

---

## 📜 License
Distributed under the **MIT License**. Created by [Naresh](https://github.com/naresh-coderrr).
