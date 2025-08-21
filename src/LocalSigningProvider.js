const axios = require('axios');

/**
 * Custom signing provider that uses our localhost signing server
 * instead of EulerStream for TikTok Live Connector integration
 */
class LocalSigningProvider {
  constructor(serverUrl = 'http://localhost:3000', logger = null) {
    this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.logger = logger;
  }

  /**
   * Custom signedWebSocketProvider function for TikTok Live Connector
   * This replaces the default EulerStream signing
   * 
   * @param {Object} params - Parameters from TikTok Live Connector
   * @param {string} params.roomId - Room ID to connect to
   * @param {string} params.uniqueId - Unique ID (username) to connect to
   * @param {string[]} params.preferredAgentIds - Preferred agent IDs
   * @param {string} params.sessionId - Session ID for authentication
   * @returns {Promise<Object>} ProtoMessageFetchResult-like object
   */
  async signedWebSocketProvider(params) {
    const { roomId, uniqueId, preferredAgentIds, sessionId } = params;
    
    if (this.logger) {
      this.logger.info('LocalSigningProvider: Attempting to sign WebSocket URL', {
        room_id: roomId,
        unique_id: uniqueId,
        preferred_agent_ids: preferredAgentIds,
        has_session_id: !!sessionId
      });
    }

    try {
      // Construct the TikTok URL based on available parameters
      let tiktokUrl;
      if (uniqueId) {
        tiktokUrl = `https://www.tiktok.com/@${uniqueId}/live`;
      } else if (roomId) {
        // For room ID, we'll use a generic format - this might need adjustment
        tiktokUrl = `https://www.tiktok.com/live/${roomId}`;
      } else {
        throw new Error('Either roomId or uniqueId must be provided');
      }

      if (this.logger) {
        this.logger.debug('LocalSigningProvider: Constructed TikTok URL', {
          tiktok_url: tiktokUrl,
          server_url: this.serverUrl
        });
      }

      // Call our local signing server (using eulerstream endpoint for compatibility)
      const response = await axios.post(
        `${this.serverUrl}/eulerstream`,
        { url: tiktokUrl },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TikTok-Live-Connector-LocalSigning/1.0.0'
          },
          timeout: 30000 // 30 second timeout for initial signature generation
        }
      );

      if (this.logger) {
        this.logger.debug('LocalSigningProvider: Received response from signing server', {
          status: response.status,
          response_time: response.data.response_time_ms
        });
      }

      if (response.data.success !== true) {
        throw new Error(`Signing server returned error: ${response.data.error || response.data.message}`);
      }

      const signatureData = response.data.data;

      // Transform our signature response into the format expected by TikTok Live Connector
      // The TikTok Live Connector expects a WebSocket URL, not the page URL
      // We need to construct the proper WebSocket URL that TikTok uses for live streaming
      
      // TikTok uses different WebSocket endpoints, this is a common one
      const wsUrl = 'wss://webcast5-ws-web-lf.tiktok.com/webcast/im/push/v2/';
      
      // Parse the signed URL to extract parameters (if it's a valid URL)
      const wsParams = {};
      
      try {
        const signedUrl = new URL(signatureData.signed_url);
        // Copy parameters from the signed URL
        signedUrl.searchParams.forEach((value, key) => {
          wsParams[key] = value;
        });
      } catch (urlError) {
        // If signed_url is not a valid URL, just use empty params
        if (this.logger) {
          this.logger.debug('LocalSigningProvider: signed_url is not a valid URL, using direct signature data');
        }
      }
      
      // Add additional required parameters for WebSocket connection
      wsParams['X-Bogus'] = signatureData['X-Bogus'];
      wsParams['signature'] = signatureData.signature;
      
      // Add standard WebSocket parameters that TikTok expects
      wsParams['compress'] = 'gzip';
      wsParams['version_code'] = '180800';
      wsParams['webcast_sdk_version'] = '1.3.0';
      wsParams['update_version_code'] = '1.3.0';
      
      // Add parameters required by TikTok Live Connector
      if (sessionId) {
        wsParams['tt-target-idc'] = 'useast1a'; // Default IDC for US East
        wsParams['sessionId'] = sessionId;
      }
      
      // Add room and user parameters
      if (roomId) {
        wsParams['room_id'] = roomId;
      }
      if (uniqueId) {
        wsParams['unique_id'] = uniqueId;
      }
      
      // Add agent preferences if provided
      if (preferredAgentIds && preferredAgentIds.length > 0) {
        wsParams['preferred_agent_ids'] = preferredAgentIds.join(',');
      }
      
      // Create the ProtoMessageFetchResult-like object
      const mockProtoResult = {
        wsUrl: wsUrl,
        wsParams: wsParams,
        cursor: '', // This would normally come from the initial fetch response
        internalExt: '', // This would normally come from the initial fetch response
        messages: [] // Initial messages would go here
      };

      if (this.logger) {
        this.logger.info('LocalSigningProvider: Successfully created mock proto result', {
          has_ws_url: !!mockProtoResult.wsUrl,
          has_signature: !!signatureData.signature,
          has_x_bogus: !!signatureData['X-Bogus']
        });
      }

      return mockProtoResult;

    } catch (error) {
      if (this.logger) {
        this.logger.error('LocalSigningProvider: Failed to sign WebSocket URL', {
          error_message: error.message,
          error_code: error.code,
          server_url: this.serverUrl,
          params: params
        });
      }

      // Re-throw with more context
      throw new Error(`Local signing provider failed: ${error.message}`);
    }
  }

  /**
   * Test the connection to the local signing server
   * @returns {Promise<boolean>} True if server is reachable and healthy
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.serverUrl}/health`, {
        timeout: 30000
      });
      
      const isHealthy = response.status === 200 && response.data.status === 'healthy';
      
      if (this.logger) {
        this.logger.info('LocalSigningProvider: Health check result', {
          server_url: this.serverUrl,
          status: response.status,
          healthy: isHealthy,
          signature_generator_ready: response.data.signature_generator_ready
        });
      }
      
      return isHealthy;
    } catch (error) {
      if (this.logger) {
        this.logger.error('LocalSigningProvider: Health check failed', {
          server_url: this.serverUrl,
          error_message: error.message,
          error_code: error.code
        });
      }
      return false;
    }
  }
}

module.exports = LocalSigningProvider;