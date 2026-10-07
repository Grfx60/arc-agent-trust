/**
 * Arc Agent Trust - Central Configuration
 * 
 * All environment variables and constants in one place
 */

require('dotenv').config();

const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

function port(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
}

module.exports = {
  // Server Configuration
  servers: {
    dashboard: {
      // Render'da PORT=10000 gelir, DASHBOARD_PORT öncelikli, sonra PORT, sonra 5173
      port: port(process.env.DASHBOARD_PORT || process.env.PORT, 5173),
      host: process.env.DASHBOARD_HOST || '0.0.0.0',
      publicDir: path.resolve(projectRoot, process.env.PUBLIC_DIR || 'public')
    },
    liveApi: {
      // Live API her zaman iç ağda sabit port — Render'ın PORT'undan etkilenmemeli
      port: port(process.env.LIVE_API_PORT, 3100),
      host: process.env.LIVE_API_HOST || '127.0.0.1'
    }
  },

  // Blockchain Configuration
  // NETWORK=mainnet ile mainnet'e geçilir, varsayılan testnet
  blockchain: (() => {
    const isMainnet = (process.env.NETWORK || process.env.BLOCKCHAIN_NETWORK || '').toLowerCase().includes('mainnet');
    return {
      network:    isMainnet ? 'Arc Mainnet' : 'Arc Testnet',
      chainId:    isMainnet ? 5042 : 5042002,
      isMainnet,
      rpcUrl: process.env.ARC_RPC_URL || (
        isMainnet ? 'https://rpc.mainnet.arc.io' : 'https://rpc.testnet.arc.io'
      ),
      arcScanApi: process.env.ARC_SCAN_API || (
        isMainnet ? 'https://api.arc-scan.org' : 'https://api-testnet.arc-scan.org'
      ),
      contracts: {
        identityRegistry: process.env.IDENTITY_REGISTRY || (
          isMainnet
            ? '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
            : '0x8004A818BFB912233c491871b3d84c89A494BD9e'
        ),
        validatorRegistry: process.env.VALIDATOR_REGISTRY || (
          isMainnet
            ? '0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58'
            : '0x8004Cb1BF31DAf7788923b405b754f57acEB4272'
        ),
        reputationRegistry: process.env.REPUTATION_REGISTRY || (
          isMainnet
            ? '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
            : '0x8004B663056A597Dffe9eCcC1965A193B7388713'
        )
      }
    };
  })(),

  // Evidence Configuration
  evidence: {
    storageDir: path.resolve(projectRoot, process.env.EVIDENCE_DIR || 'evidence'),
    reportDir: path.resolve(projectRoot, process.env.REPORT_DIR || 'reports'),
    cacheDir: path.resolve(projectRoot, process.env.CACHE_DIR || '.cache')
  },

  // Trust Engine Configuration
  trustEngine: {
    primaryAgent: process.env.PRIMARY_AGENT_ID || '845265',
    riskThresholds: {
      allow: parseFloat(process.env.RISK_ALLOW || '20'),
      review: parseFloat(process.env.RISK_REVIEW || '50'),
      block: parseFloat(process.env.RISK_BLOCK || '75')
    },
    confidenceThresholds: {
      high: parseFloat(process.env.CONF_HIGH || '75'),
      medium: parseFloat(process.env.CONF_MEDIUM || '50'),
      low: parseFloat(process.env.CONF_LOW || '25')
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: path.resolve(projectRoot, process.env.LOG_FILE || 'logs/app.log'),
    logsDir: path.resolve(projectRoot, 'logs')
  },

  // Feature Flags
  features: {
    enableCache: process.env.ENABLE_CACHE === 'true',
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    enableGraphAnalysis: process.env.ENABLE_GRAPH !== 'false',
    enableValidatorAnalysis: process.env.ENABLE_VALIDATOR !== 'false',
    debugMode: process.env.DEBUG === 'true'
  }
};
