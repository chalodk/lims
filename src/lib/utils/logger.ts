/**
 * Utility for conditional logging based on environment
 * Logs only in development mode, except for errors which always log
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Log function that only outputs in development mode
 */
export const log = isDev ? console.log : () => {}

/**
 * Error logging function that always outputs
 */
export const logError = console.error

/**
 * Conditionally log based on environment
 */
export const conditionalLog = {
  dev: log,
  error: logError,
  warn: isDev ? console.warn : () => {},
  info: isDev ? console.info : () => {},
}
