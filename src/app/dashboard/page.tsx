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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
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
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {newApiKey && (
              <Alert className="mb-6">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Your new API key has been created:</p>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">
                        {newApiKey}
                      </code>
                      <Button 
                        size="sm" 
                        onClick={() => copyToClipboard(newApiKey)}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-yellow-600">
                      ⚠️ Save this key now - you won&apos;t be able to see it again!
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setNewApiKey('')}
                    >
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

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

            {/* API Keys Management */}
            <Card className="mt-6">
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
                        <div key={key.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold">{key.name}</h4>
                              <p className="text-sm text-gray-500">
                                Created: {new Date(key.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                Last used: {key.last_used 
                                  ? new Date(key.last_used).toLocaleDateString()
                                  : 'Never'
                                }
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                Key ID: {key.id}
                              </p>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => deleteApiKey(key.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Card className="mt-6">
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
                    POST {window.location.origin}/api/signature
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold">Example Request</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`curl -X POST ${window.location.origin}/api/signature \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"roomUrl": "https://www.tiktok.com/@username/live"}'`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}