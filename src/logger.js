/**
 * Arc Agent Trust - Centralized Logging System
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');

// Ensure logs directory exists
const logsDir = config.logging.logsDir;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

const COLORS = {
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  fatal: '\x1b[35m',   // Magenta
  reset: '\x1b[0m'
};

class Logger {
  constructor(module = 'app') {
    this.module = module;
    this.level = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
  }

  _format(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      ...(data && { data })
    };
    return logEntry;
  }

  _write(level, message, data = null) {
    if (LOG_LEVELS[level] < this.level) {
      return;
    }

    const logEntry = this._format(level, message, data);

    // Console output
    if (config.features.enableLogging) {
      const color = COLORS[level];
      const reset = COLORS.reset;
      const timestamp = logEntry.timestamp;
      const prefix = `[${timestamp}] ${color}${level.toUpperCase()}${reset}`;
      
      if (config.logging.format === 'json') {
        console.log(JSON.stringify(logEntry));
      } else {
        console.log(`${prefix} [${logEntry.module}] ${message}`, data ? data : '');
      }
    }

    // File logging
    if (config.features.enableLogging && config.logging.file) {
      try {
        const logLine = config.logging.format === 'json' 
          ? JSON.stringify(logEntry)
          : `${logEntry.timestamp} ${level.toUpperCase()} [${logEntry.module}] ${message} ${data ? JSON.stringify(data) : ''}`;
        
        fs.appendFileSync(config.logging.file, logLine + '\n');
      } catch (e) {
        console.error('Failed to write to log file:', e.message);
      }
    }
  }

  debug(message, data = null) {
    this._write('debug', message, data);
  }

  info(message, data = null) {
    this._write('info', message, data);
  }

  warn(message, data = null) {
    this._write('warn', message, data);
  }

  error(message, data = null) {
    this._write('error', message, data);
  }

  fatal(message, data = null) {
    this._write('fatal', message, data);
  }
}

module.exports = (module = 'app') => new Logger(module);
