import type { MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

type ProviderKey = 'linkedin' | 'x' | 'instagram' | 'facebook'

type ConnectedAccount = {
  id: string
  provider: ProviderKey
  accountName: string
  profileImageUrl?: string
  status: 'connected' | 'disconnected' | 'needs_reauth'
  verifiedAt?: string
  scopes: string[]
  tokenExpiresAt?: string
  updatedAt?: string
}

type ProviderStatus = {
  provider: ProviderKey
  label: string
  configured: boolean
  integration?: string
  scopes: string[]
  status: 'connected' | 'disconnected' | 'needs_reauth'
  account: ConnectedAccount | null
}

type ZernioStartResponse = {
  configured: boolean | string
  authUrl?: string | null
  connectUrl?: string | null
  message?: string
  data?: {
    authUrl?: string | null
    connectUrl?: string | null
  }
}

const providerDescriptions: Record<ProviderKey, string> = {
  linkedin: 'Publish professional updates and campaign launches for business audiences.',
  x: 'Prepare short-form updates for real-time product and brand conversations.',
  instagram: 'Connect visual campaign channels for social content publishing.',
  facebook: 'Publish page updates and campaign announcements through Zernio automation.',
}

function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<ProviderStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState<ProviderKey | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const location = useLocation()

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/social/accounts`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({ accounts: [] }))) as { accounts?: ProviderStatus[]; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load connected accounts.')
      }

      setAccounts(data.accounts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load connected accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAccounts])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(location.search)
      const social = params.get('social')
      const provider = params.get('provider')

      if (social === 'connected') {
        setMessage(`${provider ? provider[0].toUpperCase() + provider.slice(1) : 'Account'} connected successfully.`)
        void loadAccounts()
      }

      if (social === 'failed') {
        setError('Zernio could not complete the social connection.')
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.search, loadAccounts])

  const handleConnect = async (provider: ProviderKey, event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()

    console.log('[ConnectedAccounts] Connect button clicked')
    console.log('[ConnectedAccounts] Selected provider:', provider)
    const endpoint = `${apiUrl}/api/social/zernio/${provider}/start`
    console.log('[ConnectedAccounts] API endpoint:', endpoint)

    setActiveProvider(provider)
    setMessage('')
    setError('')

    try {
      const response = await fetch(endpoint, {
        credentials: 'include',
      })
      console.log('[ConnectedAccounts] HTTP response status:', response.status)

      const data = (await response.json().catch(() => ({}))) as ZernioStartResponse
      console.log('[ConnectedAccounts] JSON response:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to start Zernio connection.')
      }

      const resolvedAuthUrl =
        (typeof data.authUrl === 'string' && data.authUrl.trim()) ||
        (typeof data.connectUrl === 'string' && data.connectUrl.trim()) ||
        (typeof data.data?.authUrl === 'string' && data.data.authUrl.trim()) ||
        (typeof data.data?.connectUrl === 'string' && data.data.connectUrl.trim()) ||
        ''

      console.log('[ConnectedAccounts] authUrl present:', Boolean(resolvedAuthUrl))
      console.log('[ConnectedAccounts] exact authUrl candidate:', resolvedAuthUrl || null)

      if (!data.configured || !resolvedAuthUrl) {
        setError(data.message || 'Zernio setup is required before this account can be connected.')
        return
      }

      console.log('[ConnectedAccounts] Redirecting to authUrl via window.location.assign:', resolvedAuthUrl)
      window.location.assign(resolvedAuthUrl)
      console.log('[ConnectedAccounts] Redirect call issued successfully')
    } catch (err) {
      console.error('[ConnectedAccounts] Connect flow error:', err)
      setError(err instanceof Error ? err.message : 'Unable to start Zernio connection.')
    } finally {
      setActiveProvider(null)
    }
  }

  const handleDisconnect = async (provider: ProviderKey) => {
    setActiveProvider(provider)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/social/accounts/${provider}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to disconnect account.')
      }

      setMessage('Account disconnected.')
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disconnect account.')
    } finally {
      setActiveProvider(null)
    }
  }

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Social Integrations</p>
          <h2>Connect your publishing channels.</h2>
          <p>Connect LinkedIn, Instagram, X, and Facebook through Zernio so every verified channel follows one secure publishing architecture.</p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => void loadAccounts()} disabled={isLoading}>
          Refresh
        </button>
      </div>

      {message ? <div className="notice-banner success">{message}</div> : null}
      {error ? <div className="notice-banner error">{error}</div> : null}

      <div className="accounts-grid">
        {isLoading ? (
          <section className="panel-card account-loading-card">
            <div className="loading-spinner" aria-hidden="true" />
            <p>Checking connected accounts...</p>
          </section>
        ) : (
          accounts.map((item) => {
            const isConnected = item.status === 'connected'
            const isBusy = activeProvider === item.provider

            return (
              <section className="panel-card social-account-card" key={item.provider}>
                <div className="account-card-header">
                  {item.account?.profileImageUrl ? (
                    <img className="provider-avatar" src={item.account.profileImageUrl} alt={`${item.account.accountName} profile`} />
                  ) : (
                    <div className={`provider-mark ${item.provider}`}>{item.label.slice(0, 1)}</div>
                  )}
                  <div>
                    <p className="eyebrow">{item.configured ? 'Zernio ready' : 'Zernio setup required'}</p>
                    <h3>{item.label}</h3>
                  </div>
                  <span className={`status-pill ${item.status}`}>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>

                <p className="account-description">{providerDescriptions[item.provider]}</p>

                <div className="account-detail-list">
                  <div>
                    <span>Account</span>
                    <strong>{item.account?.accountName || 'Not connected'}</strong>
                  </div>
                  <div>
                    <span>Verification</span>
                    <strong>{item.account?.verifiedAt ? 'Verified by Zernio' : 'Not verified'}</strong>
                  </div>
                  <div>
                    <span>Scopes</span>
                    <strong>{item.scopes.join(', ')}</strong>
                  </div>
                </div>

                <div className="account-actions">
                  {isConnected ? (
                    <button className="ghost-btn" type="button" onClick={() => void handleDisconnect(item.provider)} disabled={isBusy}>
                      {isBusy ? 'Disconnecting' : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={(event) => void handleConnect(item.provider, event)}
                      disabled={isBusy}
                    >
                      {isBusy ? 'Redirecting' : 'Connect'}
                    </button>
                  )}
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ConnectedAccountsPage
