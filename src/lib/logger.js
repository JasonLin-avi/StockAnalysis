// Why: Centralized logging utility to output structured server logs.
// Helps trace route invocation, external API request/response statuses, and debug problems.

function safeStringify(obj, maxLen = 300) {
  try {
    const str = JSON.stringify(obj);
    if (str.length > maxLen) {
      return str.substring(0, maxLen) + `... (truncated, total length: ${str.length})`;
    }
    return str;
  } catch (e) {
    return String(obj);
  }
}

const logger = {
  info(context, message, data = null) {
    const time = new Date().toISOString();
    const dataStr = data ? ` | Data: ${safeStringify(data)}` : '';
    console.log(`[${time}] [INFO] [${context}] ${message}${dataStr}`);
  },
  error(context, message, error = null) {
    const time = new Date().toISOString();
    let errStr = '';
    if (error) {
      errStr = ` | Error: ${error.message || error}`;
      if (error.cause) {
        // Why: Node.js undici fetch errors store the underlying system error (e.g. ENOTFOUND, ECONNREFUSED) in error.cause.
        const causeStr = error.cause.message || (typeof error.cause === 'object' ? JSON.stringify(error.cause) : String(error.cause));
        errStr += ` | Cause: ${causeStr}`;
      }
      if (error.stack) {
        errStr += `\nStack: ${error.stack}`;
      }
    }
    console.error(`[${time}] [ERROR] [${context}] ${message}${errStr}`);
  },
  warn(context, message, data = null) {
    const time = new Date().toISOString();
    const dataStr = data ? ` | Data: ${safeStringify(data)}` : '';
    console.warn(`[${time}] [WARN] [${context}] ${message}${dataStr}`);
  }
};

module.exports = logger;
