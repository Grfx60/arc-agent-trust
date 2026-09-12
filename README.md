# 🔐 Arc Agent Trust — Blockchain Agent Assessment System

**Version:** 2.0.0  
**Network:** Arc Testnet  
**Status:** Production Ready  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [API Reference](#api-reference)
8. [Project Structure](#project-structure)
9. [Development](#development)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Arc Agent Trust is a comprehensive **blockchain-based agent authentication and risk management system** designed for the Arc Testnet. It provides multi-layered trust assessment for on-chain agents by analyzing:

- **Identity Evidence** — Owner information, metadata URIs
- **Reputation Data** — Client feedback scores, revocation history
- **Validation Records** — On-chain validator confirmations
- **Graph Analysis** — Relationship mapping and structural risk
- **Anomaly Detection** — Historical behavior pattern analysis

**Primary Use Case:** Assess whether an agent on Arc Testnet is trustworthy, risky, or requires review before allowing its operations.

---

## ✨ Features

### Core Capabilities

✅ **Multi-Factor Trust Scoring**
- Normalized 0-100 risk scale
- Dynamic thresholds based on data quality
- Sigmoid-based smooth decision curves

✅ **Comprehensive Evidence Analysis**
- Identity verification
- Reputation scoring with feedback quality metrics
- Validation history and response consistency
- Independence verification

✅ **Advanced Risk Assessment**
- Actor overlap detection (same entity as provider + validator)
- Structural graph analysis
- Anomaly detection
- Correlation-based risk factors

✅ **Real-Time Analysis**
- Live API for on-demand agent analysis
- Concurrent request handling
- Subprocess-based processing for reliability

✅ **Blockchain Integration**
- Viem integration for Arc Testnet RPC
- Smart contract queries (Identity Registry, Validator Registry)
- On-chain evidence collection

✅ **Web Dashboard**
- Beautiful dark-themed UI
- Real-time trust score visualization
- Report history and comparison
- JSON export capability

### Architecture Features

✅ **Modular Design**
- Separate engines for different analysis types
- Pluggable analyzers and collectors
- Centralized configuration management

✅ **Comprehensive Logging**
- Structured JSON logging
- Log level control
- File and console output

✅ **Production Ready**
- Error handling and recovery
- Environment-based configuration
- dotenv support
- Organized folder structure

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│         Arc Agent Trust — System Architecture        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. DATA COLLECTION LAYER                           │
│     ├─ Blockchain RPC (Arc Testnet)                │
│     ├─ Evidence Collector                          │
│     ├─ Validator Analyzer                          │
│     └─ Reviewer Discovery                          │
│                                                      │
│  2. ANALYSIS ENGINES                               │
│     ├─ Trust Engine (v67)                          │
│     ├─ Risk Engine                                 │
│     └─ Graph Engine (Relationship Analysis)        │
│                                                      │
│  3. EVIDENCE PROCESSORS                            │
│     ├─ Evidence Analyzer                           │
│     ├─ Validator Analyzer                          │
│     └─ Reviewer Analyzer                           │
│                                                      │
│  4. API LAYER                                      │
│     ├─ Live API Server (Port 3100)                │
│     ├─ Dashboard Server (Port 3000)               │
│     └─ JSON Report Generation                     │
│                                                      │
│  5. OUTPUT LAYER                                   │
│     ├─ Web Dashboard                              │
│     ├─ JSON Reports                               │
│     └─ Console Output                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ (test with `node --version`)
- **npm** 9+ (test with `npm --version`)
- **Arc Testnet RPC Access** (default: https://testnet.arcdev.io/rpc)

### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/arc-agent-trust.git
   cd arc-agent-trust
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create Required Directories**
   ```bash
   mkdir -p logs reports evidence .cache
   ```

5. **Verify Installation**
   ```bash
   npm test
   ```

---

## ⚙️ Configuration

### Environment Variables

Configuration is managed via `.env` file. See `.env.example` for all options.

**Key Configuration Groups:**

#### Server Configuration
```
DASHBOARD_PORT=3000          # Web dashboard port
LIVE_API_PORT=3100           # Analysis API port
DASHBOARD_HOST=0.0.0.0       # Listen address
```

#### Blockchain Configuration
```
ARC_RPC_URL=<your-rpc-url>   # Arc Testnet RPC endpoint
IDENTITY_REGISTRY=<address>  # Smart contract address
VALIDATOR_REGISTRY=<address> # Smart contract address
```

#### Trust Engine Thresholds
```
RISK_ALLOW=20                # Risk score to allow
RISK_REVIEW=50               # Risk score to review
RISK_BLOCK=75                # Risk score to block

CONF_HIGH=75                 # Confidence threshold
CONF_MEDIUM=50
CONF_LOW=25
```

#### Logging Configuration
```
LOG_LEVEL=info               # debug|info|warn|error|fatal
LOG_FORMAT=json              # json|text
LOG_FILE=./logs/app.log      # Log file path
```

#### Feature Flags
```
ENABLE_CACHE=true            # Enable response caching
ENABLE_GRAPH=true            # Enable graph analysis
ENABLE_VALIDATOR=true        # Enable validator analysis
DEBUG=false                  # Debug mode
```

---

## 📖 Usage

### Start Services

**Start All Services**
```bash
npm start
```

**Start Dashboard Only**
```bash
npm run start:dashboard
# Access at http://localhost:3000
```

**Start API Only**
```bash
npm run start:api
# Available at http://localhost:3100
```

### Free Vercel deployment

This project can be deployed as a static dashboard plus Vercel Node.js
functions. The dashboard calls the same-origin `/api/live-agent` function, so
no second server or public port is needed.

1. Push the repository to GitHub and import it in Vercel.
2. Select **Other** as the framework preset and leave the build command empty.
3. Deploy. The dashboard is served from `public/`; `/api/health` and
   `/api/live-agent?id=<agentId>` are deployed as serverless functions.

The included `vercel.json` limits a live analysis to 60 seconds, which is
within the Vercel Hobby function limit. Serverless files are ephemeral, so
reports are returned to the browser but are not retained between requests. Set
`SAVE_REPORTS=true` only when using a persistent runtime such as Docker.

### Docker deployment

The repository includes a production Dockerfile. It exposes the dashboard on
port `3000`; the live API remains available internally on port `3100` and is
proxied by the dashboard.

```bash
docker build -t arc-agent-trust .
docker run --rm -p 3000:3000 --env-file .env arc-agent-trust
```

For platforms that provide a single `PORT` environment variable, set
`DASHBOARD_PORT=$PORT` and keep `LIVE_API_PORT=3100`.

### Analyze an Agent

**Via API**
```bash
curl "http://localhost:3100/api/live-agent?id=845265"
```

**Returns:**
```json
{
  "agentId": "845265",
  "decision": "REVIEW",
  "risk": 17.1,
  "confidence": 61.0,
  "independence": 55.0,
  "evidence": {
    "identity": true,
    "feedbacks": 3,
    "validators": 1
  }
}
```

**CLI Analysis**
```bash
AGENT_ID=845265 npm run analyze
```

### Run Tests

```bash
npm test              # Run quick test matrix
npm run test:risk     # Test risk engine with 12 scenarios
npm run test:arc      # Test Arc Testnet connectivity
```

---

## 🔌 API Reference

### Live Analysis Endpoint

**Endpoint:** `GET /api/live-agent`

**Parameters:**
- `id` (required): Agent ID (numeric)

**Response:**
```json
{
  "schemaVersion": "1.0",
  "timestamp": "2026-08-29T12:30:45Z",
  "agentId": "845265",
  "assessment": {
    "decision": "ALLOW|REVIEW|BLOCK",
    "confidence": {
      "evidence": 61.0,
      "independence": 55.0
    },
    "risk": {
      "observed": 17.1,
      "uncertainty": 13.0
    }
  },
  "evidence": {
    "identity": {...},
    "reputation": {...},
    "validation": {...},
    "independence": {...}
  },
  "signals": {
    "positive": 4,
    "risk": 1,
    "uncertainty": 3
  }
}
```

### Local Report Endpoint

**Endpoint:** `GET /api/agent`

**Parameters:**
- `id` (required): Agent ID

**Returns:** Cached report from `/reports` directory

### Health Check

**Endpoint:** `GET /health`

**Returns:**
```json
{
  "status": "ok",
  "dashboard": "v68",
  "network": "Arc Testnet"
}
```

---

## 📁 Project Structure

```
arc-agent-trust/
├── src/                          # Source code
│   ├── servers/
│   │   ├── dashboard.js         # Web dashboard server
│   │   └── live-api.js          # Live analysis API
│   ├── engines/
│   │   ├── trust-engine.js      # Main trust computation
│   │   ├── risk-engine.js       # Risk scoring algorithm
│   │   └── graph-engine.js      # Graph analysis
│   ├── analyzers/
│   │   ├── evidence.js          # Evidence processor
│   │   ├── validator.js         # Validator analyzer
│   │   └── reviewer.js          # Reviewer credibility
│   ├── collectors/
│   │   └── evidence.js          # Blockchain data collector
│   ├── utils/
│   │   └── blockchain-check.js  # Blockchain utilities
│   ├── config.js                # Centralized configuration
│   └── logger.js                # Logging system
│
├── test/                         # Test suite
│   ├── test-arc.js              # Arc testnet tests
│   ├── test-risk-engine-v6.js   # Risk engine tests
│   └── utils.js                 # Test utilities
│
├── public/                       # Web dashboard assets
│   ├── index.html               # Dashboard UI
│   └── logo.png                 # Logo
│
├── evidence/                     # Evidence data storage
├── reports/                      # Generated reports
├── logs/                         # Application logs
├── archive/                      # Historical versions
│
├── package.json                 # npm configuration
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

---

## 🔨 Development

### Adding New Analyzers

Create a new analyzer in `src/analyzers/your-analyzer.js`:

```javascript
const logger = require('../logger')('your-analyzer');

class YourAnalyzer {
  analyze(evidence) {
    logger.info('Analyzing evidence', { agentId: evidence.agentId });
    
    // Your analysis logic
    return {
      score: 0,
      findings: []
    };
  }
}

module.exports = YourAnalyzer;
```

### Adding New Engines

Create a new engine in `src/engines/your-engine.js`:

```javascript
const logger = require('../logger')('your-engine');
const config = require('../config');

class YourEngine {
  compute(evidence) {
    logger.info('Computing with your engine');
    
    // Your computation logic
    return {
      risk: 0,
      confidence: 0
    };
  }
}

module.exports = YourEngine;
```

### Running with Debug Mode

```bash
DEBUG=true LOG_LEVEL=debug npm start
```

---

## 🐛 Troubleshooting

### Connection Issues

**Error:** `Cannot connect to Arc Testnet RPC`
- Check `ARC_RPC_URL` in `.env`
- Verify network connectivity
- Test: `curl https://testnet.arcdev.io/rpc`

**Error:** `EADDRINUSE: address already in use :::3000`
- Port 3000 is already in use
- Change `DASHBOARD_PORT` in `.env`
- Or kill existing process: `lsof -ti:3000 | xargs kill -9`

### Analysis Issues

**Error:** `Evidence file not found`
- Ensure `agent-<ID>-evidence.json` exists in root or `evidence/` directory
- Check file permissions

**Error:** `Risk score calculation failed`
- Check evidence file format (must be valid JSON)
- Review logs: `tail -f logs/app.log`
- Run tests: `npm test`

### Performance Issues

**Dashboard is slow**
- Check `ENABLE_CACHE=true` in `.env`
- Restart services
- Check system resources

**API timeouts**
- Increase subprocess timeout
- Check Arc Testnet RPC performance
- Review logs for bottlenecks

---

## 📊 Decision Logic

### Risk Assessment

| Risk Score | Status | Action |
|-----------|--------|--------|
| 0-15 | ✅ Very Low | Likely ALLOW |
| 16-40 | ⚠️ Low-Medium | Likely REVIEW |
| 41-60 | ⚠️ Medium-High | Likely REVIEW |
| 61-75 | 🔴 High | Likely BLOCK |
| 76-100 | 🔴🔴 Critical | BLOCK |

### Confidence Levels

- **High (75-100):** Sufficient evidence for confident decision
- **Medium (50-74):** Moderate evidence, some gaps
- **Low (0-49):** Insufficient evidence, requires review

### Final Decisions

- **🟢 ALLOW:** Risk < 15, Confidence > 70, No critical red flags
- **🟡 REVIEW:** Material uncertainty or moderate risk
- **🔴 BLOCK:** Critical evidence missing or high risk detected

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

For issues, questions, or contributions:

1. Check existing issues on GitHub
2. Review logs: `logs/app.log`
3. Run tests: `npm test`
4. Enable debug mode: `DEBUG=true npm start`

---

**Last Updated:** 2026-08-29  
**Maintained By:** Arc Trust Team  
**Status:** ✅ Production Ready
