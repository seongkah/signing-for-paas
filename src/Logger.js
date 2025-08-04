/**
 * Simple logging system for TikTok signature server
 * Provides structured logging with timestamps and log levels
 */
class Logger {
  constructor(logLevel = 'INFO') {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.logLevel = this.parseLogLevel(logLevel);
  }

  /**
   * Parse log level string to number
   */
  parseLogLevel(level) {
    const upperLevel = level.toUpperCase();
    return this.levels[upperLevel] !== undefined ? this.levels[upperLevel] : this.levels.INFO;
  }

  /**
   * Check if message should be logged based on current log level
   */
  shouldLog(messageLevel) {
    return this.levels[messageLevel] >= this.logLevel;
  }

  /**
   * Format log message with timestamp and level
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      logEntry += ` | ${JSON.stringify(data)}`;
    }
    
    return logEntry;
  }

  /**
   * Log debug messages
   */
  debug(message, data = null) {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  /**
   * Log info messages
   */
  info(message, data = null) {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  /**
   * Log warning messages
   */
  warn(message, data = null) {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  /**
   * Log error messages
   */
  error(message, data = null) {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  /**
   * Log successful signature generation with response time
   */
  logSignatureSuccess(roomUrl, responseTime, signatureData = null) {
    const data = {
      room_url: roomUrl,
      response_time_ms: responseTime,
      signature_fields: signatureData ? Object.keys(signatureData) : null
    };
    
    this.info(`Signature generated successfully`, data);
  }

  /**
   * Log signature generation failure with detailed error information
   */
  logSignatureFailure(roomUrl, error, responseTime, errorDetails = null) {
    const data = {
      room_url: roomUrl,
      response_time_ms: responseTime,
      error_message: error,
      error_details: errorDetails,
      error_type: this.categorizeError(error)
    };
    
    this.error(`Signature generation failed`, data);
  }

  /**
   * Log HTTP request details
   */
  logRequest(method, path, headers = null, body = null) {
    const data = {
      method,
      path,
      content_type: headers ? headers['content-type'] : null,
      body_length: body ? body.length : 0
    };
    
    this.debug(`HTTP request received`, data);
  }

  /**
   * Log HTTP response details
   */
  logResponse(statusCode, responseTime, error = null) {
    const data = {
      status_code: statusCode,
      response_time_ms: responseTime,
      error: error
    };
    
    if (statusCode >= 400) {
      this.warn(`HTTP response sent`, data);
    } else {
      this.debug(`HTTP response sent`, data);
    }
  }

  /**
   * Log TikTok rejection responses for analysis
   */
  logTikTokRejection(roomUrl, rejectionResponse, signatureData = null) {
    const data = {
      room_url: roomUrl,
      rejection_response: rejectionResponse,
      signature_used: signatureData ? {
        has_signature: !!signatureData.signature,
        has_x_bogus: !!signatureData['X-Bogus'],
        has_signed_url: !!signatureData.signed_url
      } : null
    };
    
    this.error(`TikTok rejected signature`, data);
  }

  /**
   * Log server startup information
   */
  logServerStart(port, signatureGeneratorReady) {
    const data = {
      port,
      signature_generator_ready: signatureGeneratorReady,
      log_level: Object.keys(this.levels).find(key => this.levels[key] === this.logLevel)
    };
    
    this.info(`TikTok Signature Server started`, data);
  }

  /**
   * Log initialization errors with detailed information
   */
  logInitError(component, error) {
    const data = {
      component,
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name
    };
    
    this.error(`Component initialization failed`, data);
  }

  /**
   * Categorize error types for better analysis
   */
  categorizeError(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('invalid') || message.includes('malformed')) {
      return 'validation_error';
    } else if (message.includes('timeout') || message.includes('network')) {
      return 'network_error';
    } else if (message.includes('signtok') || message.includes('signature')) {
      return 'signature_generation_error';
    } else if (message.includes('tiktok')) {
      return 'tiktok_api_error';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(metrics) {
    this.info(`Performance metrics`, metrics);
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level) {
    this.logLevel = this.parseLogLevel(level);
    this.info(`Log level changed to ${level.toUpperCase()}`);
  }

  /**
   * Log when a signature is used to connect to TikTok and gets rejected
   * This helps analyze patterns in TikTok's rejection behavior
   */
  logTikTokConnectionAttempt(roomUrl, signatureData, success, rejectionDetails = null) {
    const data = {
      room_url: roomUrl,
      connection_success: success,
      signature_fields: signatureData ? Object.keys(signatureData) : null,
      rejection_details: rejectionDetails
    };

    if (success) {
      this.info('TikTok connection successful', data);
    } else {
      this.logTikTokRejection(roomUrl, rejectionDetails, signatureData);
    }
  }
}

module.exports = Logger;