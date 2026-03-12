/**
 * Logger centralizzato per 3LO
 * Per ora: logga in console con struttura
 * In futuro: salverà su file
 */

// Livelli di log
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Livello minimo (DEBUG = logga tutto)
const MIN_LEVEL = LEVELS.INFO;

// Stile console per ogni livello
const STYLES = {
  DEBUG: 'color: gray',
  INFO: 'color: #2196F3',
  WARN: 'color: #FF9800',
  ERROR: 'color: #f44336; font-weight: bold'
};

/**
 * Logga un messaggio
 * @param {string} level - DEBUG, INFO, WARN, ERROR
 * @param {string} source - Origine del log (es. 'home', 'db', 'import')
 * @param {string} message - Messaggio
 * @param {object} data - Dati aggiuntivi (opzionale)
 */
function log(level, source, message, data = null) {
  // Se il livello è sotto il minimo, non loggare
  if (LEVELS[level] < MIN_LEVEL) return;
  
  const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
  const style = STYLES[level] || 'color: inherit';
  
  // Prefisso con emoji
  const emoji = { DEBUG: '🔍', INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌' }[level] || '•';
  
  // Log in console
  const prefix = `${emoji} [${timestamp}] [${source}]`;
  
  if (data) {
    console.log(`%c${prefix} ${message}`, style, data);
  } else {
    console.log(`%c${prefix} ${message}`, style);
  }
}

/**
 * Logger singleton
 */
const logger = {
  debug: (source, message, data) => log('DEBUG', source, message, data),
  info: (source, message, data) => log('INFO', source, message, data),
  warn: (source, message, data) => log('WARN', source, message, data),
  error: (source, message, data) => log('ERROR', source, message, data)
};

export default logger;
export { log };