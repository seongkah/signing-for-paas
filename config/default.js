// Configuration file for TikTok signing server POC

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  signature: {
    library: process.env.SIGNATURE_LIBRARY || 'signtok'
  }
};