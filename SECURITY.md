# 🛡️ Security Policy

## Supported Versions

The Vault Distributed Object Storage Platform actively maintains and delivers security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 5.2.x   | :white_check_mark: |
| 5.0.x   | :white_check_mark: |
| < 5.0   | :x:                |

## Cryptographic Guarantees & Threat Model

* **Immutable Chunk Verification**: All file blocks are sliced into configurable 4MB binary shards, hashed using native SHA-256 (`crypto.subtle`), and verified against database manifests upon retrieval.
* **Anti-Bit-Rot Scrubber**: Physical storage nodes are continuously scrubbed to detect and quarantine silent hardware bit flips.
* **Sliding-Window Rate Limiting**: The Gateway API restricts burst incoming requests (300 req/min per IP) to mitigate Distributed Denial of Service (DDoS) and credential stuffing attacks.
* **Zero-Knowledge Encryption**: AES-256-GCM client-side encryption options guarantee node operators cannot inspect stored object payloads.
* **Strict HTTP Security Headers**: Configured with OWASP Top 10 recommendations including Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options (SAMEORIGIN), and X-Content-Type-Options (nosniff).

## Reporting a Vulnerability

If you discover a security vulnerability within this project:
1. Please open a confidential advisory or contact the maintainers directly.
2. Provide reproduction steps, potential impact, and target environment details.
3. We follow responsible disclosure practices and respond to critical reports within 24 hours.
