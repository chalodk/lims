/**
 * Authentication-related constants
 */

/**
 * Time in seconds before token expiration to trigger proactive refresh
 * Default: 300 seconds (5 minutes)
 */
export const TOKEN_REFRESH_THRESHOLD_SECONDS = 300

/**
 * Interval in milliseconds for checking if token needs refresh
 * Default: 60000ms (1 minute)
 */
export const TOKEN_REFRESH_CHECK_INTERVAL_MS = 60000
