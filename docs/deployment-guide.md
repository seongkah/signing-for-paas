# Deployment Guide - TikTok Signing PaaS

This guide covers the deployment process for the TikTok Signing PaaS across different environments.

## Prerequisites

Before deploying, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** package manager
3. **Supabase CLI** (`npm install -g supabase`)
4. **Vercel CLI** (`npm install -g vercel`)
5. **Git** for version control

## Environment Setup

### 1. Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd tiktok-signing-paas

# Setup development environment
npm run setup:dev

# Start local development
npm run dev
npm run supabase:start
```

### 2. Staging Environment

```bash
# Validate staging configuration
npm run setup:staging

# Deploy to staging
npm run deploy:staging
```

### 3. Production Environment

```bash
# Validate production configuration
npm run setup:prod

# Deploy to production
npm run deploy:prod
```

## Environment Variables

### Required Variables

All environments require these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NODE_ENV=development|staging|production
```

### Optional Variables

```bash
DEBUG=true|false
LOG_LEVEL=debug|info|warn|error|fatal
ENABLE_ANALYTICS=true|false
RATE_LIMIT_ENABLED=true|false
MAX_REQUESTS_PER_HOUR=500
MAX_REQUESTS_PER_DAY=5000
SECURE_COOKIES=true|false
HTTPS_ONLY=true|false
```

## Deployment Process

### Vercel Deployment

1. **Connect Repository**
   ```bash
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   ```bash
   # Via Vercel CLI
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add NEXTAUTH_SECRET
   
   # Or via Vercel Dashboard
   # Go to Project Settings > Environment Variables
   ```

3. **Deploy**
   ```bash
   # Development/Preview
   vercel
   
   # Production
   vercel --prod
   ```

### Supabase Edge Functions Deployment

1. **Login to Supabase**
   ```bash
   supabase login
   ```

2. **Link Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Deploy Functions**
   ```bash
   supabase functions deploy generate-signature
   supabase functions deploy health-check
   ```

### Database Migrations

1. **Run Migrations**
   ```bash
   # Development
   npm run migrate:dev
   
   # Staging
   npm run migrate:staging
   
   # Production
   npm run migrate:prod
   ```

2. **Seed Database (Development Only)**
   ```bash
   npm run db:seed
   ```

## Environment-Specific Configurations

### Development
- Debug logging enabled
- Rate limiting disabled
- Local CORS settings
- Extended timeouts
- Hot reloading enabled

### Staging
- Info level logging
- Rate limiting enabled (relaxed)
- Staging domain CORS
- Production-like settings
- Analytics enabled

### Production
- Error level logging only
- Strict rate limiting
- Production domain CORS
- Optimized performance
- Security headers enabled

## Monitoring and Health Checks

### Health Check Endpoints

- `/api/health` - Basic health check
- `/api/admin/system-health` - Detailed system health
- `/api/admin/monitoring` - Service monitoring data

### Monitoring Dashboard

Access the monitoring dashboard at:
- Development: `http://localhost:3000/dashboard`
- Staging: `https://your-staging-app.vercel.app/dashboard`
- Production: `https://your-production-app.vercel.app/dashboard`

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   ```bash
   npm run validate:env development
   ```

2. **Build Failures**
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```

3. **Database Connection Issues**
   ```bash
   npm run supabase:status
   supabase db ping
   ```

4. **Edge Function Deployment Issues**
   ```bash
   supabase functions list
   supabase logs --type edge
   ```

### Rollback Procedures

1. **Vercel Rollback**
   ```bash
   vercel rollback [deployment-url]
   ```

2. **Database Rollback**
   ```bash
   supabase db reset
   # Then restore from backup
   ```

## Security Considerations

### Production Security Checklist

- [ ] HTTPS enforced
- [ ] Secure cookies enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Environment variables secured
- [ ] Database RLS policies active
- [ ] API keys properly hashed
- [ ] Error messages sanitized

### Environment Variable Security

- Never commit `.env` files to version control
- Use Vercel's environment variable encryption
- Rotate secrets regularly
- Use different secrets for each environment
- Monitor for exposed credentials

## Performance Optimization

### Production Optimizations

1. **Next.js Optimizations**
   - Static generation where possible
   - Image optimization enabled
   - Bundle analysis and optimization
   - Code splitting implemented

2. **Supabase Optimizations**
   - Connection pooling configured
   - Query optimization
   - Proper indexing
   - RLS policy optimization

3. **Vercel Optimizations**
   - Edge functions for global distribution
   - CDN caching configured
   - Compression enabled
   - Analytics tracking

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Check error logs
   - Monitor performance metrics
   - Review usage analytics
   - Update dependencies

2. **Monthly**
   - Clean old logs
   - Review security settings
   - Update documentation
   - Performance optimization review

3. **Quarterly**
   - Security audit
   - Dependency security review
   - Backup verification
   - Disaster recovery testing

## Support and Documentation

- **API Documentation**: `/docs/api-reference.md`
- **Integration Guide**: `/docs/integration-guide.md`
- **Troubleshooting**: `/docs/troubleshooting-guide.md`
- **Performance Guide**: `/docs/performance-guide.md`

For additional support, check the monitoring dashboard or review the error logs in the Supabase dashboard.