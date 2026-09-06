/**
 * Arc Agent Trust - Central Configuration
 * 
 * All environment variables and constants in one place
 */

require('dotenv').config();

module.exports = {
  // Server Configuration
  servers: {
    dashboard: {
      port: parseInt(process.env.DASHBOARD_PORT || '3000'),
      host: process.env.DASHBOARD_HOST || 'localhost',
      publicDir: process.env.PUBLIC_DIR || './public'
    },
    liveApi: {
      port: parseInt(process.env.LIVE_API_PORT || '3100'),
      host: process.env.LIVE_API_HOST || 'localhost'
    }
  },

  // Blockchain Configuration
  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || 'Arc Testnet',
    rpcUrl: process.env.ARC_RPC_URL || 'https://testnet.arcdev.io/rpc',
    contracts: {
      identityRegistry: process.env.IDENTITY_REGISTRY || '0x8004be9A59F5Bd7B2F87Be6A8CdE1aF6d6F5cA3a',
      validatorRegistry: process.env.VALIDATOR_REGISTRY || '0xE18F822B5c965D84a65f6b3aaCc8DfF5dEe6Ff8f'
    }
  },

  // Evidence Configuration
  evidence: {
    storageDir: process.env.EVIDENCE_DIR || './evidence',
    reportDir: process.env.REPORT_DIR || './reports',
    cacheDir: process.env.CACHE_DIR || './.cache'
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
    file: process.env.LOG_FILE || './logs/app.log',
    logsDir: './logs'
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
