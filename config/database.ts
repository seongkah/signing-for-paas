// Database configuration for different environments

import { config } from './environment';

export interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  connectionTimeout: number;
  idleTimeout: number;
  ssl: boolean;
  migrations: {
    directory: string;
    tableName: string;
  };
}

const getDatabaseConfig = (): DatabaseConfig => {
  const baseConfig: DatabaseConfig = {
    connectionString: config.supabase.url,
    poolSize: 10,
    connectionTimeout: 30000,
    idleTimeout: 600000,
    ssl: true,
    migrations: {
      directory: './supabase/migrations',
      tableName: 'schema_migrations',
    },
  };

  // Environment-specific overrides
  switch (config.nodeEnv) {
    case 'development':
      return {
        ...baseConfig,
        poolSize: 5,
        connectionTimeout: 60000, // Longer timeout for development
        ssl: false, // Local development might not use SSL
      };

    case 'staging':
      return {
        ...baseConfig,
        poolSize: 8,
        connectionTimeout: 20000,
      };

    case 'production':
      return {
        ...baseConfig,
        poolSize: 15,
        connectionTimeout: 10000, // Shorter timeout for production
        idleTimeout: 300000, // 5 minutes
      };

    default:
      return baseConfig;
  }
};

export const databaseConfig = getDatabaseConfig();

// Migration configuration
export const migrationConfig = {
  migrationsPath: 'supabase/migrations',
  seedPath: 'supabase/seed.sql',
  schemaPath: 'supabase/schema.sql',
};

// Connection pool settings for Supabase
export const supabasePoolConfig = {
  development: {
    max: 5,
    min: 1,
    acquire: 60000,
    idle: 10000,
  },
  staging: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  production: {
    max: 20,
    min: 5,
    acquire: 10000,
    idle: 5000,
  },
};