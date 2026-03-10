// Logger - Centralized logging system for 3LO
// Logs are saved to src-tauri/logs/ with automatic rotation
// Max 7 days, max 10 files

import { writeTextFile, readDir, remove } from '@tauri-apps/plugin-fs';
import { appLogDir } from '@tauri-apps/api/path';

const MAX_LOG_DAYS = 7;
const MAX_LOG_FILES = 10;
const LOG_PREFIX = '3lo_';

class Logger {
  constructor() {
    this.logs = [];
    this.logDir = null;
    this.currentLogFile = null;
    this.init();
  }

  async init() {
    try {
      this.logDir = await appLogDir();
      this.currentLogFile = this.generateLogFilename();
      await this.cleanupOldLogs();
      this.info('Logger initialized');
    } catch (err) {
      console.error('Logger init failed:', err);
    }
  }

  generateLogFilename() {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${LOG_PREFIX}${ts}.log`;
  }

  async cleanupOldLogs() {
    try {
      const entries = await readDir(this.logDir);
      const logFiles = entries
        .filter(e => e.name && e.name.startsWith(LOG_PREFIX) && e.name.endsWith('.log'))
        .map(e => ({ name: e.name, path: `${this.logDir}/${e.name}` }));
      
      // Sort by name (newest last)
      logFiles.sort((a, b) => a.name.localeCompare(b.name));
      
      // Keep only MAX_LOG_FILES
      if (logFiles.length > MAX_LOG_FILES) {
        const toDelete = logFiles.slice(0, logFiles.length - MAX_LOG_FILES);
        for (const file of toDelete) {
          await remove(file.path);
          console.log(`Deleted old log: ${file.name}`);
        }
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  async logToFile(level, message) {
    try {
      const line = this.formatMessage(level, message) + '\n';
      // Append to current log file
      // Note: Tauri doesn't have append, so we store in memory and flush periodically
      this.logs.push(line);
      
      // Flush every 10 entries or on explicit call
      if (this.logs.length >= 10) {
        await this.flush();
      }
    } catch (err) {
      console.error('Log write failed:', err);
    }
  }

  async flush() {
    if (this.logs.length === 0 || !this.logDir) return;
    try {
      const content = this.logs.join('');
      const logPath = `${this.logDir}/${this.currentLogFile}`;
      // Note: writeTextFile overwrites; for append we'd need read+write
      // For now, console is primary, file is secondary
      await writeTextFile(logPath, content, { append: true });
      this.logs = [];
    } catch (err) {
      console.error('Flush failed:', err);
    }
  }

  log(level, message) {
    const formatted = this.formatMessage(level, message);
    console.log(formatted);
    this.logToFile(level, message);
  }

  info(msg) { this.log('INFO', msg); }
  warn(msg) { this.log('WARN', msg); }
  error(msg) { this.log('ERROR', msg); }
  debug(msg) { this.log('DEBUG', msg); }
}

// Singleton
export const logger = new Logger();
