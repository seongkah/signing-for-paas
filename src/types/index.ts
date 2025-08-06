// User Management Types
export interface User {
  id: string
  email: string
  tier: 'free' | 'api_key'
  createdAt: Date
  lastLogin?: Date
  isActive: boolean
}

export interface ApiKey {
  id: string
  userId: string
  keyHash: string
  name: string
  createdAt: Date
  lastUsed?: Date
  isActive: boolean
}

// Signature Generation Types
export interface SignatureRequest {
  roomUrl: string
  userId?: string
  apiKeyId?: string
}

export interface SignatureResult {
  success: boolean
  data?: SignatureData
  error?: string
  responseTimeMs: number
}

export interface SignatureData {
  signature: string
  signed_url: string
  'X-Bogus': string
  'x-tt-params': string
  navigator: NavigatorData
}

export interface NavigatorData {
  deviceScaleFactor: number
  user_agent: string
  browser_language: string
  browser_platform: string
  browser_name: string
  browser_version: string
}

// Monitoring and Analytics Types
export interface UsageMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  peakResponseTime: number
  requestsPerHour: number[]
}

export interface QuotaStatus {
  edgeFunctions: {
    used: number
    limit: number
    percentage: number
  }
  databaseStorage: {
    used: number
    limit: number
    percentage: number
  }
  bandwidth: {
    used: number
    limit: number
    percentage: number
  }
}

export interface ServiceMetrics {
  totalRequests: number
  successRate: number
  averageResponseTime: number
  quotaUsage: QuotaUsage
}

export interface QuotaUsage {
  supabaseEdgeFunctions: {
    used: number
    limit: number
    resetDate: Date
  }
  vercelBandwidth: {
    used: number
    limit: number
    resetDate: Date
  }
}

// Error Handling Types
export enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SIGNATURE_GENERATION_ERROR = 'SIGNATURE_GENERATION_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export interface ErrorResponse {
  success: false
  error: {
    type: ErrorType
    message: string
    details?: any
    code: string
    timestamp: Date
  }
}