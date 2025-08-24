'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ApiKeyExamplesProps {
  hasApiKeys: boolean
  onCopy?: (text: string, message: string) => void
}

export function ApiKeyExamples({ hasApiKeys, onCopy }: ApiKeyExamplesProps) {
  const [activeExample, setActiveExample] = useState<'curl' | 'javascript' | 'tiktok-live' | 'python'>('curl')

  const copyToClipboard = (text: string) => {
    if (onCopy) {
      onCopy(text, 'Code example copied to clipboard!')
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  const apiKeyPlaceholder = hasApiKeys ? "YOUR_ACTUAL_API_KEY_HERE" : "Create an API key first"

  const examples = {
    curl: `# Basic signature request
curl -X POST https://signing-for-paas.vercel.app/api/signature \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeyPlaceholder}" \\
  -d '{
    "url": "https://www.tiktok.com/@username/live"
  }'

# EulerStream compatible endpoint
curl -X GET "https://signing-for-paas.vercel.app/api/webcast/fetch?client=ttlive-node&unique_id=username" \\
  -H "X-API-Key: ${apiKeyPlaceholder}"`,

    javascript: `// Using fetch API
const response = await fetch('https://signing-for-paas.vercel.app/api/signature', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${apiKeyPlaceholder}'
  },
  body: JSON.stringify({
    url: 'https://www.tiktok.com/@username/live'
  })
});

const data = await response.json();
console.log('Signature:', data);

// Using axios
import axios from 'axios';

const signature = await axios.post(
  'https://signing-for-paas.vercel.app/api/signature',
  { url: 'https://www.tiktok.com/@username/live' },
  {
    headers: {
      'X-API-Key': '${apiKeyPlaceholder}'
    }
  }
);`,

    'tiktok-live': `// TikTok Live Connector Integration (Node.js)
const { TikTokLiveConnection } = require('tiktok-live-connector');

// Set environment variable
process.env.SIGN_API_KEY = '${apiKeyPlaceholder}';
process.env.SIGN_API_URL = 'https://signing-for-paas.vercel.app/api';

// Create connection
const connection = new TikTokLiveConnection('username', {
  signProvider: 'eulerstream' // Uses your service instead of EulerStream
});

connection.on('connected', (state) => {
  console.log('🎉 Connected to TikTok Live!');
  console.log(\`Viewer count: \${state.viewerCount}\`);
});

connection.on('chat', (data) => {
  console.log(\`💬 \${data.uniqueId}: \${data.comment}\`);
});

connection.on('gift', (data) => {
  console.log(\`🎁 \${data.uniqueId} sent \${data.giftName}\`);
});

await connection.connect();`,

    python: `# Using requests library
import requests

# Basic signature request
response = requests.post(
    'https://signing-for-paas.vercel.app/api/signature',
    json={'url': 'https://www.tiktok.com/@username/live'},
    headers={'X-API-Key': '${apiKeyPlaceholder}'}
)

signature_data = response.json()
print(f"Signature: {signature_data}")

# Using httpx (async)
import httpx

async def get_signature():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'https://signing-for-paas.vercel.app/api/signature',
            json={'url': 'https://www.tiktok.com/@username/live'},
            headers={'X-API-Key': '${apiKeyPlaceholder}'}
        )
        return response.json()`
  }

  const exampleTitles = {
    curl: '🔧 cURL Commands',
    javascript: '🟨 JavaScript/Node.js',
    'tiktok-live': '📺 TikTok Live Connector',
    python: '🐍 Python'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Examples</CardTitle>
        <CardDescription>
          Ready-to-use code examples for integrating with the TikTok Signing Service
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {Object.entries(exampleTitles).map(([key, title]) => (
            <button
              key={key}
              onClick={() => setActiveExample(key as any)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeExample === key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {title}
            </button>
          ))}
        </div>

        {/* Example Content */}
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-900">{exampleTitles[activeExample]}</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(examples[activeExample])}
              disabled={!hasApiKeys}
            >
              📋 Copy Code
            </Button>
          </div>
          
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{examples[activeExample]}</code>
          </pre>

          {!hasApiKeys && (
            <div className="absolute inset-0 bg-gray-200 bg-opacity-75 rounded-lg flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 shadow-lg text-center">
                <p className="text-gray-700 font-medium">Create an API key to see working examples</p>
                <p className="text-sm text-gray-500 mt-1">Examples will update with your actual API key</p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>✅ Free Tier:</strong> 100 requests/day without API key
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>🚀 Unlimited:</strong> No limits with API key authentication
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>💡 Pro Tip:</strong> Set your API key as an environment variable (
            <code className="bg-yellow-100 px-1 rounded">TIKTOK_API_KEY</code>) 
            instead of hardcoding it in your application code.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}