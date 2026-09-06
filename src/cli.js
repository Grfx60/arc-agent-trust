#!/usr/bin/env node

/**
 * Arc Agent Trust - CLI Management Tool
 * 
 * Usage: node cli.js <command> [options]
 * 
 * Commands:
 * - analyze <id>          Analyze agent and generate report
 * - list                  List all available agents
 * - report <id> [format]  Generate report for agent
 * - cache clear           Clear all cache
 * - health                Check system health
 * - config                Show current configuration
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger')('cli');
const CacheManager = require('./cache');
const ReportGenerator = require('./reporter');

const cache = new CacheManager();
const reporter = new ReportGenerator();

// ============================================
// Commands
// ============================================

const commands = {
  /**
   * Analyze an agent
   */
  analyze: async (agentId) => {
    if (!agentId) {
      console.error('Error: Agent ID required');
      process.exit(1);
    }
    
    console.log(`\nAnalyzing agent ${agentId}...`);
    
    try {
      // Check cache first
      const cached = cache.get('analysis', agentId);
      if (cached) {
        console.log('✓ Using cached analysis');
        console.log(JSON.stringify(cached, null, 2));
        return;
      }
      
      // Load evidence
      const evidenceFile = path.join(
        config.evidence.storageDir,
        `agent-${agentId}-evidence.json`
      );
      
      if (!fs.existsSync(evidenceFile)) {
        console.error(`Error: Evidence file not found for agent ${agentId}`);
        process.exit(1);
      }
      
      const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
      
      console.log('✓ Evidence loaded');
      console.log(JSON.stringify(evidence, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
  
  /**
   * List all agents
   */
  list: async () => {
    try {
      const dir = config.evidence.storageDir;
      
      if (!fs.existsSync(dir)) {
        console.log('No agents found');
        return;
      }
      
      const files = fs.readdirSync(dir);
      const agents = files
        .filter(f => f.match(/^agent-(\d+)-evidence\.json$/))
        .map(f => f.match(/^agent-(\d+)-evidence\.json$/)[1])
        .sort((a, b) => parseInt(a) - parseInt(b));
      
      console.log(`\nFound ${agents.length} agent(s):\n`);
      agents.forEach((id, idx) => {
        console.log(`  ${idx + 1}. Agent #${id}`);
      });
      console.log('');
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
  
  /**
   * Generate report
   */
  report: async (agentId, format = 'json') => {
    if (!agentId) {
      console.error('Error: Agent ID required');
      process.exit(1);
    }
    
    try {
      const reportDir = config.evidence.reportDir;
      
      if (!fs.existsSync(reportDir)) {
        console.log('No reports generated yet');
        return;
      }
      
      const files = fs.readdirSync(reportDir);
      const reports = files
        .filter(f => f.includes(`agent-${agentId}`))
        .sort()
        .reverse();
      
      if (reports.length === 0) {
        console.log(`No reports found for agent ${agentId}`);
        return;
      }
      
      console.log(`\nReports for agent ${agentId}:\n`);
      reports.slice(0, 5).forEach((f, idx) => {
        const stat = fs.statSync(path.join(reportDir, f));
        console.log(`  ${idx + 1}. ${f}`);
        console.log(`     Size: ${(stat.size / 1024).toFixed(2)} KB`);
        console.log(`     Created: ${stat.mtime.toISOString()}\n`);
      });
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
  
  /**
   * Cache management
   */
  cache: async (action) => {
    if (action === 'clear') {
      cache.clear();
      console.log('✓ Cache cleared');
    } else if (action === 'stats') {
      const stats = cache.getStats();
      console.log('\nCache Statistics:');
      console.log(`  Size: ${stats.size}/${stats.maxSize}`);
      console.log(`  Hit Rate: ${stats.hitRate}`);
      console.log(`  Memory: ${stats.memoryUsage} MB\n`);
    } else {
      console.log('Usage: cache [clear|stats]');
    }
  },
  
  /**
   * Health check
   */
  health: async () => {
    console.log('\nArc Agent Trust - Health Check\n');
    
    const checks = {
      'Node.js': `${process.version}`,
      'Memory': `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      'Uptime': `${Math.round(process.uptime())}s`,
      'Config': `${Object.keys(config).length} sections`,
      'Evidence Dir': fs.existsSync(config.evidence.storageDir) ? '✓' : '✗',
      'Reports Dir': fs.existsSync(config.evidence.reportDir) ? '✓' : '✗',
      'Logs Dir': fs.existsSync(config.logging.logsDir) ? '✓' : '✗'
    };
    
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
  },
  
  /**
   * Show configuration
   */
  config: async () => {
    console.log('\nArc Agent Trust - Configuration\n');
    
    const sanitized = JSON.parse(JSON.stringify(config));
    
    Object.entries(sanitized).forEach(([section, values]) => {
      console.log(`[${section.toUpperCase()}]`);
      if (typeof values === 'object') {
        Object.entries(values).forEach(([key, value]) => {
          if (typeof value === 'object') {
            console.log(`  ${key}:`);
            Object.entries(value).forEach(([k, v]) => {
              console.log(`    ${k}: ${v}`);
            });
          } else {
            console.log(`  ${key}: ${value}`);
          }
        });
      }
      console.log('');
    });
  },
  
  /**
   * Help
   */
  help: async () => {
    console.log(`
Arc Agent Trust - CLI Tool

USAGE:
  node cli.js <command> [arguments]

COMMANDS:
  analyze <agentId>       Analyze agent and show evidence
  list                    List all available agents
  report <agentId>        Show latest reports for agent
  cache <action>          Manage cache (clear|stats)
  health                  Check system health
  config                  Show configuration
  help                    Show this help message

EXAMPLES:
  node cli.js analyze 845265
  node cli.js list
  node cli.js report 845265
  node cli.js cache clear
  node cli.js health

OPTIONS:
  --json                  Output as JSON (where applicable)
  --verbose               Show detailed information

    `);
  }
};

// ============================================
// Main
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  if (!commands[command]) {
    console.error(`Error: Unknown command '${command}'`);
    console.log('Use "help" to see available commands');
    process.exit(1);
  }
  
  try {
    await commands[command](...args.slice(1));
    if (command !== 'help' && command !== 'config') {
      process.exit(0);
    }
  } catch (error) {
    logger.error('CLI error', { error: error.message });
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
