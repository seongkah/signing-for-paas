# TikTok Signing PaaS

A cloud-hosted Platform-as-a-Service (PaaS) solution that provides public API endpoints for TikTok signature generation as a replacement for EulerStream. Built with Next.js frontend on Vercel and Supabase backend services.

## Features

- 🌐 **Cloud-hosted**: Next.js frontend on Vercel with unique FQDN
- 🔐 **Authentication**: Email-based authentication via Supabase Auth
- 📊 **Real-time Dashboard**: Monitor signature generation metrics and service health
- 🔑 **API Key Management**: Tiered access with free tier limits and unlimited API keys
- 🚀 **Edge Functions**: Serverless signature generation via Supabase Edge Functions
- 📈 **Usage Analytics**: Comprehensive logging and quota tracking
- 🔄 **EulerStream Replacement**: Drop-in replacement for TikTok Live Connector projects

## Architecture

- **Frontend**: Next.js with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Supabase Edge Functions for API processing
- **Database**: Supabase PostgreSQL for authentication and data storage
- **Deployment**: Vercel for frontend hosting, Supabase for backend services

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tiktok-signing-paas

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
```

### Environment Setup

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Generate Signature
- **POST** `/api/signature`
- **Body**: `{ "roomUrl": "https://www.tiktok.com/@username/live" }`
- **Headers**: `Authorization: Bearer <token>` or `X-API-Key: <api-key>`

### Health Check
- **GET** `/api/health`

## Integration with TikTok Live Connector

Replace EulerStream with this service:

```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

// Before (using EulerStream)
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream'
});

// After (using this service)
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/signature'
});
```

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Setup

1. Create a new Supabase project
2. Run database migrations (coming in task 2)
3. Deploy Edge Functions (coming in task 3)

## Free Tier Limits

- **Vercel**: 100GB bandwidth, unlimited builds
- **Supabase**: 500MB database, 2GB bandwidth, 2M Edge Function invocations
- **Free Users**: Limited API calls based on quotas
- **API Key Users**: Unlimited access

## Development Roadmap

This project follows a structured implementation plan:

1. ✅ **Project Setup**: Next.js + Supabase integration
2. 🔄 **Database Schema**: User management and logging tables
3. 🔄 **Edge Functions**: Signature generation logic
4. 🔄 **Authentication**: User registration and API key management
5. 🔄 **Rate Limiting**: Quota tracking and enforcement
6. 🔄 **Dashboard**: Real-time monitoring interface
7. 🔄 **API Compatibility**: EulerStream replacement layer
8. 🔄 **Error Handling**: Comprehensive error management
9. 🔄 **Monitoring**: Health checks and alerting
10. 🔄 **Documentation**: Integration guides and examples

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details