const Signer = require('signtok');
const Logger = require('./Logger');

/**
 * SignatureGenerator class that wraps SignTok library
 * Provides a clean interface for generating TikTok signatures
 */
class SignatureGenerator {
  constructor(logLevel = 'INFO') {
    this.logger = new Logger(logLevel);
    
    try {
      this.logger.debug('Initializing SignTok Signer...');
      this.signer = new Signer();
      this.isInitialized = true;
      this.logger.info('SignatureGenerator initialized successfully');
    } catch (error) {
      this.isInitialized = false;
      this.initError = error;
      this.logger.logInitError('SignatureGenerator', error);
    }
  }

  /**
   * Validates if a URL is a valid TikTok live stream URL
   * @param {string} url - The URL to validate
   * @returns {boolean} - True if valid TikTok URL
   */
  isValidTikTokUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('tiktok.com');
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate signature for a TikTok room URL
   * @param {string} roomUrl - The TikTok live room URL
   * @returns {Object} - Formatted response with signature data or error
   */
  generateSignature(roomUrl) {
    const startTime = Date.now();
    
    this.logger.debug('Starting signature generation', { room_url: roomUrl });

    // Check if SignatureGenerator was initialized properly
    if (!this.isInitialized) {
      const responseTime = Date.now() - startTime;
      const error = 'SignatureGenerator initialization failed';
      const details = this.initError?.message || 'Unknown initialization error';
      
      this.logger.logSignatureFailure(roomUrl, error, responseTime, details);
      
      return {
        success: false,
        error: error,
        details: details
      };
    }

    // Validate input URL
    if (!roomUrl || typeof roomUrl !== 'string') {
      const responseTime = Date.now() - startTime;
      const error = 'Invalid input';
      const details = 'Room URL must be a non-empty string';
      
      this.logger.logSignatureFailure(roomUrl, error, responseTime, details);
      
      return {
        success: false,
        error: error,
        details: details
      };
    }

    // Validate TikTok URL format
    if (!this.isValidTikTokUrl(roomUrl)) {
      const responseTime = Date.now() - startTime;
      const error = 'Invalid room URL format';
      const details = 'URL must be a valid TikTok live stream URL';
      
      this.logger.logSignatureFailure(roomUrl, error, responseTime, details);
      
      return {
        success: false,
        error: error,
        details: details
      };
    }

    try {
      this.logger.debug('Calling SignTok signer.sign()', { room_url: roomUrl });
      
      // Generate signature using SignTok
      const signatureData = this.signer.sign(roomUrl);
      
      // Check if SignTok returned null (indicates failure)
      if (signatureData === null) {
        const responseTime = Date.now() - startTime;
        const error = 'Signature generation failed';
        const details = 'SignTok library failed to generate signature for the provided URL';
        
        this.logger.logSignatureFailure(roomUrl, error, responseTime, details);
        
        return {
          success: false,
          error: error,
          details: details
        };
      }

      this.logger.debug('SignTok signature generated, getting navigator data');

      // Get navigator data
      const navigatorData = this.signer.navigator();

      // Format response (replacing Utils.makePayload functionality)
      const payload = {
        status: "ok",
        data: {
          ...signatureData,
          navigator: navigatorData
        }
      };
      const parsedPayload = payload;

      const responseTime = Date.now() - startTime;
      
      // Log successful signature generation
      this.logger.logSignatureSuccess(roomUrl, responseTime, parsedPayload.data);

      // Return success response with additional metadata
      return {
        success: true,
        data: parsedPayload.data,
        timestamp: Date.now(),
        room_url: roomUrl
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = 'SignTok signature generation error';
      
      this.logger.logSignatureFailure(roomUrl, errorMessage, responseTime, {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Get current navigator information
   * @returns {Object} - Navigator data from SignTok
   */
  getNavigator() {
    if (!this.isInitialized) {
      return null;
    }
    
    try {
      return this.signer.navigator();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if the SignatureGenerator is ready to use
   * @returns {boolean} - True if initialized and ready
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Get initialization error if any
   * @returns {Error|null} - Initialization error or null if successful
   */
  getInitError() {
    return this.initError || null;
  }
}

module.exports = SignatureGenerator;