// Main entry point for TikTok signing server POC
const config = require('../config/default');
const SignatureServer = require('./server');
const Logger = require('./Logger');

// Initialize logger for main process
const logger = new Logger(config.logging.level);

logger.info('TikTok Signing Server POC - Starting...', {
  port: config.server.port,
  host: config.server.host,
  log_level: config.logging.level,
  signature_library: config.signature.library
});

// Create and start the HTTP server with logging configuration
const server = new SignatureServer(config.server.port, config.logging.level);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error_message: error.message,
    error_stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

// Start the server
server.start()
  .then(() => {
    logger.info('HTTP API Server started successfully');
    logger.info('Ready to accept signature requests');
  })
  .catch((error) => {
    logger.error('Failed to start server', {
      error_message: error.message,
      error_stack: error.stack
    });
    process.exit(1);
  });