// Environment-specific configuration for TikTok Signing PaaS

export interface EnvironmentConfig {
  nodeEnv: string;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  enableAnalytics: boolean;
  rateLimitEnabled: boolean;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  secureCookies: boolean;
  httpsOnly: boolean;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  nextAuth: {
    url: string;
    secret: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    enableMetrics: boolean;
    enableErrorTracking: boolean;
  };
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Base configuration
  const baseConfig: EnvironmentConfig = {
    nodeEnv,
    debug: process.env.DEBUG === 'true',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
    maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '500'),
    maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '5000'),
    secureCookies: process.env.SECURE_COOKIES === 'true',
    httpsOnly: process.env.HTTPS_ONLY === 'true',
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    nextAuth: {
      url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      secret: process.env.NEXTAUTH_SECRET || '',
    },
    cors: {
      origin: '*',
      credentials: false,
    },
    monitoring: {
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      enableMetrics: true,
      enableErrorTracking: true,
    },
  };

  // Environment-specific overrides
  // Handle staging as a special case since NODE_ENV doesn't include it
  const environment = process.env.ENVIRONMENT || nodeEnv;
  
  switch (environment as string) {
    case 'development':
      return {
        ...baseConfig,
        debug: true,
        logLevel: 'debug',
        enableAnalytics: false,
        rateLimitEnabled: false,
        secureCookies: false,
        httpsOnly: false,
        cors: {
          origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
          credentials: true,
        },
        monitoring: {
          ...baseConfig.monitoring,
          healthCheckInterval: 60000, // 1 minute in dev
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        debug: false,
        logLevel: 'info',
        enableAnalytics: true,
        rateLimitEnabled: true,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000,
        secureCookies: true,
        httpsOnly: true,
        cors: {
          origin: [
            'https://your-staging-app.vercel.app',
            'https://*.vercel.app',
          ],
          credentials: true,
        },
      };

    case 'production':
      return {
        ...baseConfig,
        debug: false,
        logLevel: 'error',
        enableAnalytics: true,
        rateLimitEnabled: true,
        maxRequestsPerHour: 500,
        maxRequestsPerDay: 5000,
        secureCookies: true,
        httpsOnly: true,
        cors: {
          origin: [
            'https://your-production-app.vercel.app',
            // Add your custom domain here
          ],
          credentials: true,
        },
        monitoring: {
          ...baseConfig.monitoring,
          healthCheckInterval: 15000, // 15 seconds in production
        },
      };

    default:
      return baseConfig;
  }
};

export const config = getEnvironmentConfig();

// Validation function to ensure required environment variables are set
export const validateEnvironmentConfig = (): void => {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate Supabase URL format
  if (config.supabase.url && !config.supabase.url.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
  }

  // Validate NextAuth URL format
  if (config.nextAuth.url && !config.nextAuth.url.startsWith('http')) {
    throw new Error('NEXTAUTH_URL must be a valid HTTP/HTTPS URL');
  }
};

// Helper functions for environment checks
export const isDevelopment = () => config.nodeEnv === 'development';
export const isStaging = () => config.nodeEnv === 'staging';
export const isProduction = () => config.nodeEnv === 'production';
export const isDebugEnabled = () => config.debug;

// Export specific configurations for different parts of the app
export const supabaseConfig = config.supabase;
export const authConfig = config.nextAuth;
export const corsConfig = config.cors;
export const monitoringConfig = config.monitoring;
export const rateLimitConfig = {
  enabled: config.rateLimitEnabled,
  maxRequestsPerHour: config.maxRequestsPerHour,
  maxRequestsPerDay: config.maxRequestsPerDay,
};