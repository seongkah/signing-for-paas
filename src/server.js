const express = require('express');
const SignatureGenerator = require('./SignatureGenerator');
const Logger = require('./Logger');

/**
 * Basic HTTP API Server for TikTok signature generation
 * Compatible with SignTok format for easy testing
 */
class SignatureServer {
  constructor(port = 3000, logLevel = 'INFO') {
    this.app = express();
    this.port = port;
    this.logger = new Logger(logLevel);
    this.signatureGenerator = new SignatureGenerator(logLevel);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Parse text/plain requests (SignTok compatible)
    this.app.use('/signature', express.text({ type: 'text/plain' }));
    
    // Parse JSON for other endpoints
    this.app.use(express.json());
    
    // Enhanced logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      // Log incoming request
      this.logger.logRequest(req.method, req.path, req.headers, req.body);
      
      // Override res.json to log responses
      const originalJson = res.json;
      res.json = (body) => {
        const responseTime = Date.now() - startTime;
        this.logger.logResponse(res.statusCode, responseTime, body.error || null);
        return originalJson.call(res, body);
      };
      
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const isReady = this.signatureGenerator.isReady();
      const initError = this.signatureGenerator.getInitError();
      
      this.logger.debug('Health check requested', {
        signature_generator_ready: isReady,
        init_error: initError ? initError.message : null
      });
      
      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        signature_generator_ready: isReady,
        init_error: initError ? initError.message : null
      });
    });

    // Main signature generation endpoint (SignTok compatible)
    this.app.post('/signature', (req, res) => {
      this.handleSignatureRequest(req, res);
    });

    // Alternative endpoint for JSON requests
    this.app.post('/sign', (req, res) => {
      const roomUrl = req.body.room_url || req.body.url;
      if (!roomUrl) {
        this.logger.warn('Missing room_url in JSON request', { body: req.body });
        return res.status(400).json({
          success: false,
          error: 'Missing room_url',
          details: 'Request body must contain room_url field'
        });
      }
      
      // Process the same way as /signature endpoint
      this.processSignatureGeneration(roomUrl, req, res);
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      this.logger.warn('404 - Endpoint not found', {
        method: req.method,
        path: req.path,
        user_agent: req.headers['user-agent']
      });
      
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        details: `${req.method} ${req.path} is not a valid endpoint`
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      this.logger.error('Unhandled server error', {
        error_message: error.message,
        error_stack: error.stack,
        request_path: req.path,
        request_method: req.method
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    });
  }

  /**
   * Handle signature generation requests (SignTok format)
   * Expects plain text body with room URL
   */
  handleSignatureRequest(req, res) {
    const startTime = Date.now();
    
    this.logger.debug('Processing /signature request', {
      content_type: req.headers['content-type'],
      body_length: req.body ? req.body.length : 0
    });
    
    // Validate Content-Type
    if (!req.is('text/plain')) {
      this.logger.warn('Invalid Content-Type for /signature endpoint', {
        received_content_type: req.headers['content-type'],
        expected: 'text/plain'
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid Content-Type',
        details: 'Content-Type must be text/plain for /signature endpoint'
      });
    }

    // Get room URL from plain text body
    const roomUrl = req.body;
    
    if (!roomUrl || typeof roomUrl !== 'string' || roomUrl.trim() === '') {
      this.logger.warn('Invalid request body for /signature endpoint', {
        body_type: typeof roomUrl,
        body_length: roomUrl ? roomUrl.length : 0
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: 'Request body must contain a valid room URL as plain text'
      });
    }

    this.processSignatureGeneration(roomUrl.trim(), req, res, startTime);
  }

  /**
   * Process signature generation and send response
   */
  processSignatureGeneration(roomUrl, req, res, startTime = Date.now()) {
    this.logger.debug('Processing signature generation', {
      room_url: roomUrl,
      user_agent: req.headers['user-agent']
    });
    
    // Validate TikTok URL format
    if (!this.isValidTikTokLiveUrl(roomUrl)) {
      this.logger.warn('Invalid TikTok URL format', {
        room_url: roomUrl,
        validation_failed: 'URL format check'
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid TikTok URL format',
        details: 'URL must be a valid TikTok live stream URL (e.g., https://www.tiktok.com/@username/live)'
      });
    }

    // Generate signature
    const result = this.signatureGenerator.generateSignature(roomUrl);
    const responseTime = Date.now() - startTime;

    // Return SignTok-compatible format
    if (result.success) {
      this.logger.info('HTTP signature request completed successfully', {
        room_url: roomUrl,
        response_time_ms: responseTime,
        endpoint: req.path
      });
      
      res.json({
        status: 'ok',
        data: result.data,
        response_time_ms: responseTime
      });
    } else {
      this.logger.error('HTTP signature request failed', {
        room_url: roomUrl,
        error: result.error,
        details: result.details,
        response_time_ms: responseTime,
        endpoint: req.path
      });
      
      res.status(500).json({
        status: 'error',
        error: result.error,
        details: result.details,
        response_time_ms: responseTime
      });
    }
  }

  /**
   * Validate TikTok live URL format
   * More specific validation than the general TikTok URL check
   */
  isValidTikTokLiveUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Must be TikTok domain
      if (!urlObj.hostname.includes('tiktok.com')) {
        return false;
      }

      // Should contain live stream indicators
      const path = urlObj.pathname.toLowerCase();
      const hasLiveIndicator = path.includes('/live') || 
                              urlObj.search.includes('live') ||
                              path.includes('/@'); // User profile URLs are also valid

      return hasLiveIndicator || path.length > 1; // Accept any TikTok URL with a path
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the server
   */
  start() {
    return new Promise((resolve, reject) => {
      // Check if SignatureGenerator is ready
      if (!this.signatureGenerator.isReady()) {
        const error = this.signatureGenerator.getInitError();
        this.logger.error('Server startup failed - SignatureGenerator not ready', {
          init_error: error?.message,
          error_stack: error?.stack
        });
        return reject(new Error(`SignatureGenerator initialization failed: ${error?.message}`));
      }

      this.server = this.app.listen(this.port, (error) => {
        if (error) {
          this.logger.error('Failed to start HTTP server', {
            port: this.port,
            error_message: error.message,
            error_stack: error.stack
          });
          return reject(error);
        }

        // Log successful server startup
        this.logger.logServerStart(this.port, this.signatureGenerator.isReady());
        
        this.logger.info('Server endpoints available', {
          health_check: `http://localhost:${this.port}/health`,
          signature_endpoint: `POST http://localhost:${this.port}/signature`,
          alternative_endpoint: `POST http://localhost:${this.port}/sign`
        });
        
        resolve(this.server);
      });
    });
  }

  /**
   * Stop the server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Server stopped gracefully');
          resolve();
        });
      } else {
        this.logger.debug('Server stop requested but no server instance found');
        resolve();
      }
    });
  }
}

module.exports = SignatureServer;