'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-client'
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard'
import { ComprehensiveMonitoring } from '@/components/monitoring/ComprehensiveMonitoring'
import { ApiKeyExamples } from '@/components/ApiKeyExamples'

interface ApiKey {
  id: string
  name: string
  key_hash: string
  created_at: string
  last_used: string | null
  is_active: boolean
}

interface UserProfile {
  id: string
  email: string
  tier: 'free' | 'api_key'
  created_at: string
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'api-keys'>('overview')
  const [copySuccess, setCopySuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
      } else {
        setUserProfile(profile)
      }

      // Fetch API keys
      const { data: keys, error: keysError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (keysError) {
        console.error('API keys error:', keysError)
      } else {
        setApiKeys(keys || [])
      }
    } catch (err) {
      setError('Failed to load user data')
      console.error('Error fetching user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      setError('API key name is required')
      return
    }

    setCreatingKey(true)
    setError('')

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create API key')
      }

      setNewApiKey(result.data.key)
      setNewKeyName('')
      await fetchUserData() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setCreatingKey(false)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete API key')
      }

      await fetchUserData() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key')
    }
  }

  const copyToClipboard = (text: string, successMessage = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(successMessage)
      setTimeout(() => setCopySuccess(''), 3000) // Clear after 3 seconds
    }).catch(() => {
      setCopySuccess('Failed to copy')
      setTimeout(() => setCopySuccess(''), 3000)
    })
  }

  // Helper function to mask API keys for display
  const maskApiKey = (keyId: string, actualKey?: string) => {
    if (actualKey) {
      // For newly created keys, show partial masking: sk_053c...5ba
      const start = actualKey.substring(0, 7) // "sk_053c"
      const end = actualKey.substring(actualKey.length - 4) // last 4 chars
      return `${start}...${end}`
    }
    // For existing keys, create a consistent mask from the key ID
    const shortId = keyId.substring(0, 8)
    return `sk_${shortId.substring(0, 4)}...****`
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user?.email}</p>
              </div>
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            </div>
            
            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('monitoring')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'monitoring'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Monitoring & Analytics
                </button>
                <button
                  onClick={() => setActiveTab('api-keys')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'api-keys'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  API Keys
                </button>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {copySuccess && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  ✅ {copySuccess}
                </AlertDescription>
              </Alert>
            )}

            {newApiKey && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-green-800 flex items-center">
                        🎉 API Key Created Successfully!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Your new API key is ready to use. Copy it now and store it securely.
                      </p>
                    </div>
                    
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">API Key:</label>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => copyToClipboard(newApiKey, 'API key copied to clipboard!')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            📋 Copy Key
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const blob = new Blob([`API Key: ${newApiKey}\nCreated: ${new Date().toISOString()}\nService: TikTok Signing Service`], { type: 'text/plain' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'tiktok-api-key.txt'
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                          >
                            💾 Download
                          </Button>
                        </div>
                      </div>
                      <code className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono break-all border">
                        {newApiKey}
                      </code>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-semibold text-red-800 text-sm">🔒 Security Important:</p>
                      <ul className="text-sm text-red-700 mt-1 space-y-1">
                        <li>• This key will <strong>never be shown again</strong> after you dismiss this message</li>
                        <li>• Store it in a secure password manager or environment variables</li>
                        <li>• Never commit API keys to version control systems</li>
                        <li>• Use environment variables in production applications</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-semibold text-blue-800 text-sm">📘 Usage Example:</p>
                      <pre className="text-xs bg-blue-100 p-2 rounded mt-2 overflow-x-auto">
{`curl -X POST https://signing-for-paas.vercel.app/api/signature \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${newApiKey}" \\
  -d '{"url": "https://www.tiktok.com/@username/live"}'`}
                      </pre>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <p className="text-xs text-gray-600">
                        💡 Need help? Check the integration examples below.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setNewApiKey('')}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        I&apos;ve Saved It - Dismiss
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Information</CardTitle>
                      <CardDescription>Your account details and tier</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Email</Label>
                        <p className="text-sm text-gray-600">{userProfile?.email}</p>
                      </div>
                      <div>
                        <Label>Account Tier</Label>
                        <p className="text-sm text-gray-600 capitalize">
                          {userProfile?.tier || 'free'}
                        </p>
                      </div>
                      <div>
                        <Label>Member Since</Label>
                        <p className="text-sm text-gray-600">
                          {userProfile?.created_at 
                            ? new Date(userProfile.created_at).toLocaleDateString()
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usage Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Statistics</CardTitle>
                      <CardDescription>Your API usage this month</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Requests This Month</Label>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                      <div>
                        <Label>Success Rate</Label>
                        <p className="text-2xl font-bold">100%</p>
                      </div>
                      <div>
                        <Label>Average Response Time</Label>
                        <p className="text-2xl font-bold">0ms</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Start Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                    <CardDescription>
                      Get started with the TikTok Signing Service
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold">API Endpoint</h4>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        POST https://signing-for-paas.vercel.app/api/signature
                      </code>
                    </div>
                    <div>
                      <h4 className="font-semibold">Example Request</h4>
                      <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`curl -X POST https://signing-for-paas.vercel.app/api/signature \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"url": "https://www.tiktok.com/@username/live"}'`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <ComprehensiveMonitoring />
                <MonitoringDashboard />
              </div>
            )}

            {activeTab === 'api-keys' && (
              <div className="space-y-6">
                {/* API Keys Management */}
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for unlimited access to the signature generation service
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Create New API Key */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold mb-4">Create New API Key</h3>
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="keyName">API Key Name</Label>
                        <Input
                          id="keyName"
                          placeholder="e.g., Production Server, Development"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          disabled={creatingKey}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={createApiKey} 
                          disabled={creatingKey || !newKeyName.trim()}
                        >
                          {creatingKey ? 'Creating...' : 'Create Key'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Existing API Keys */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Your API Keys</h3>
                    {apiKeys.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No API keys created yet. Create your first API key above.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {apiKeys.map((key) => (
                          <div key={key.id} className="border rounded-lg p-4 bg-white shadow-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900 flex items-center">
                                    {key.name}
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Active
                                    </span>
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <code className="text-sm bg-gray-100 px-2 py-1 rounded border font-mono">
                                      {maskApiKey(key.id)}
                                    </code>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => copyToClipboard(`Example with your API key:\n\ncurl -X POST https://signing-for-paas.vercel.app/api/signature \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: YOUR_ACTUAL_API_KEY_HERE" \\\n  -d '{"url": "https://www.tiktok.com/@username/live"}'`, 'Code example copied to clipboard!')}
                                      className="text-xs"
                                    >
                                      📋 Copy Example
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Created:</span>
                                    <p className="font-medium">{new Date(key.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Last used:</span>
                                    <p className="font-medium">
                                      {key.last_used 
                                        ? new Date(key.last_used).toLocaleDateString()
                                        : 'Never'
                                      }
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                  <p className="text-xs text-blue-700">
                                    💡 <strong>Usage:</strong> Add <code className="bg-blue-100 px-1 rounded">X-API-Key: YOUR_KEY</code> to your requests for unlimited access
                                  </p>
                                </div>
                              </div>
                              
                              <div className="ml-4">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => deleteApiKey(key.id)}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Integration Examples */}
              <ApiKeyExamples hasApiKeys={apiKeys.length > 0} onCopy={copyToClipboard} />
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}