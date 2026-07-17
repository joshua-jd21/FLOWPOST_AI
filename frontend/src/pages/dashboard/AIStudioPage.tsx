import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type GenerationForm = {
  platform: string
  contentType: string
  tone: string
  audience: string
  prompt: string
  generateImage: boolean
}

type GenerationResult = {
  caption: string
  hashtags: string[]
  ctaSuggestions: string[]
  usedFallback: boolean
  fallbackReason?: string
  imageUrl?: string
  imagePrompt?: string
  imageProvider?: 'gemini' | 'pollinations'
  imageFallbackReason?: string
  imageError?: string
  historyId?: string
}

type GenerateCaptionResponse = GenerationResult & {
  history?: { _id?: string; id?: string }
  message?: string
}

type ProviderStatus = {
  provider: 'linkedin' | 'x' | 'instagram' | 'facebook'
  label: string
  status: 'connected' | 'disconnected' | 'needs_reauth'
  account: { verifiedAt?: string } | null
}

const initialForm: GenerationForm = {
  platform: 'LinkedIn',
  contentType: 'Promotional',
  tone: 'Professional',
  audience: 'Small business owners',
  prompt: 'Launch a new AI-powered social media scheduler for growing teams.',
  generateImage: true,
}

const platforms = ['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook']
const contentTypes = ['Promotional', 'Educational', 'Personal', 'Product Launch', 'Announcement', 'Storytelling']
const tones = ['Professional', 'Casual', 'Funny', 'Luxury', 'Friendly']

const platformToProvider = (platform: string): ProviderStatus['provider'] => {
  if (platform === 'LinkedIn') {
    return 'linkedin'
  }

  if (platform === 'X (Twitter)') {
    return 'x'
  }

  if (platform === 'Facebook') {
    return 'facebook'
  }

  return 'instagram'
}

function AIStudioPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<GenerationForm>(initialForm)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<ProviderStatus[]>([])

  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const activeProvider = platformToProvider(form.platform)
  const activeAccount = connectedAccounts.find((account) => account.provider === activeProvider)
  const canPublish = activeAccount?.status === 'connected' && Boolean(activeAccount.account?.verifiedAt)

  useEffect(() => {
    let ignore = false

    const loadAccounts = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/social/accounts`, {
          credentials: 'include',
        })
        const data = (await response.json().catch(() => ({ accounts: [] }))) as { accounts?: ProviderStatus[] }

        if (!ignore && response.ok) {
          setConnectedAccounts(data.accounts ?? [])
        }
      } catch {
        if (!ignore) {
          setConnectedAccounts([])
        }
      }
    }

    void loadAccounts()

    return () => {
      ignore = true
    }
  }, [apiUrl])

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    console.log('[AIStudio] Generate button submitted', {
      platform: form.platform,
      contentType: form.contentType,
      tone: form.tone,
      audience: form.audience,
      generateImage: form.generateImage,
      endpoint: `${apiUrl}/api/ai/generate-caption`,
    })
    setIsLoading(true)
    setError('')
    setImageError('')
    setStatusMessage('')
    setCopied(false)

    try {
      const response = await fetch(`${apiUrl}/api/ai/generate-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      console.log('[AIStudio] Generate caption HTTP status:', response.status)

      const data = (await response.json().catch(() => ({}))) as GenerateCaptionResponse
      console.log('[AIStudio] Generate caption response JSON:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to generate content right now.')
      }

      setResult({
        caption: data.caption || '',
        hashtags: data.hashtags || [],
        ctaSuggestions: data.ctaSuggestions || [],
        usedFallback: Boolean(data.usedFallback),
        fallbackReason: data.fallbackReason,
        imageUrl: data.imageUrl,
        imagePrompt: data.imagePrompt,
        imageProvider: data.imageProvider,
        imageFallbackReason: data.imageFallbackReason,
        imageError: data.imageError,
        historyId: data.history?._id || data.history?.id,
      })
      setImageError(data.imageError || '')
      setStatusMessage(data.imageFallbackReason || (data.usedFallback ? data.fallbackReason || 'Fallback content was generated and saved.' : 'Content generated and saved.'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate content right now.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateImage = async () => {
    console.log('[AIStudio] Regenerate image clicked', {
      endpoint: `${apiUrl}/api/ai/generate-image`,
      platform: form.platform,
    })
    setIsImageLoading(true)
    setImageError('')

    try {
      const response = await fetch(`${apiUrl}/api/ai/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, generateImage: true }),
      })
      console.log('[AIStudio] Generate image HTTP status:', response.status)

      const data = (await response.json().catch(() => ({}))) as GenerateCaptionResponse
      console.log('[AIStudio] Generate image response JSON:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to generate image right now.')
      }

      setResult((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          imageUrl: data.imageUrl,
          imagePrompt: data.imagePrompt,
          imageProvider: data.imageProvider,
          imageFallbackReason: data.imageFallbackReason,
          imageError: '',
          historyId: data.history?._id || data.history?.id || current.historyId,
        }
      })
      setStatusMessage(data.imageFallbackReason || 'Image regenerated and saved.')
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to generate image right now.')
    } finally {
      setIsImageLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.caption) {
      return
    }

    try {
      await navigator.clipboard.writeText(result.caption)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const handleDownloadImage = async () => {
    if (!result?.imageUrl) {
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/ai/download-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageUrl: result.imageUrl }),
      })

      if (!response.ok) {
        throw new Error('Unable to download image right now.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'postpilot-ai-thumbnail.jpg'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to download image right now.')
    }
  }

  const handlePublish = async () => {
    console.log('[AIStudio] Publish button clicked', {
      platform: form.platform,
      canPublish,
      hasCaption: Boolean(result?.caption),
      hasImage: Boolean(result?.imageUrl),
      connectedAccountStatus: activeAccount?.status,
      verified: Boolean(activeAccount?.account?.verifiedAt),
    })

    if (!result?.caption) {
      console.log('[AIStudio] Publish aborted: no generated caption')
      return
    }

    if (!canPublish) {
      console.log('[AIStudio] Publish blocked: account is not connected or verified')
      setError(`Connect and verify ${form.platform} through Zernio before publishing.`)
      return
    }

    setIsPublishing(true)
    setError('')
    setStatusMessage('')

    try {
      const payload = {
        platform: form.platform,
        caption: `${result.caption}\n\n${result.hashtags.join(' ')}`,
        media: result.imageUrl ? [{ url: result.imageUrl, type: 'image/jpeg', name: 'AI thumbnail' }] : [],
      }
      console.log('[AIStudio] Sending publish request', {
        endpoint: `${apiUrl}/api/social/publish`,
        payload,
      })

      const response = await fetch(`${apiUrl}/api/social/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      console.log('[AIStudio] Publish HTTP status:', response.status)
      const data = (await response.json().catch(() => ({}))) as { message?: string; publish?: { externalPostId?: string } }
      console.log('[AIStudio] Publish response JSON:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to publish through Zernio.')
      }

      setStatusMessage(data.publish?.externalPostId ? `Published through Zernio. External post: ${data.publish.externalPostId}` : 'Published through Zernio.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish through Zernio.')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">AI Content Studio</p>
          <h2>Create polished social posts in seconds.</h2>
          <p>Generate audience-ready captions with a professional brand voice for every channel.</p>
        </div>
        <div className="hero-pill">Signed in as {user?.name || 'creator'}</div>
      </div>

      <div className="content-grid ai-studio-grid">
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Content generator</p>
              <h3>Describe your campaign</h3>
            </div>
          </div>

          <form className="ai-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                <span>Platform</span>
                <select value={form.platform} onChange={(event) => setForm((value) => ({ ...value, platform: event.target.value }))}>
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Content type</span>
                <select value={form.contentType} onChange={(event) => setForm((value) => ({ ...value, contentType: event.target.value }))}>
                  {contentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Tone</span>
                <select value={form.tone} onChange={(event) => setForm((value) => ({ ...value, tone: event.target.value }))}>
                  {tones.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Target audience</span>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(event) => setForm((value) => ({ ...value, audience: event.target.value }))}
                  placeholder="e.g. startup founders"
                />
              </label>
            </div>

            <label>
              <span>Prompt</span>
              <textarea
                rows={5}
                value={form.prompt}
                onChange={(event) => setForm((value) => ({ ...value, prompt: event.target.value }))}
                placeholder="What should this post say?"
              />
            </label>

            <label className="image-toggle">
              <input
                type="checkbox"
                checked={form.generateImage}
                onChange={(event) => setForm((value) => ({ ...value, generateImage: event.target.checked }))}
              />
              <span>
                <strong>Generate Image</strong>
                <small>Create an AI thumbnail alongside the caption.</small>
              </span>
            </label>

            <div className="action-row">
              <button className="primary-btn" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    {form.generateImage ? 'Generating caption and image' : 'Generating'}
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </div>

            {error ? <p className="form-error">{error}</p> : null}
          </form>
        </section>

        <aside className="panel-card output-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Output</p>
              <h3>Ready-to-use content</h3>
            </div>
            {result ? (
              <div className="output-actions">
                <button className="ghost-btn" type="button" onClick={() => handleSubmit()} disabled={isLoading}>
                  Regenerate
                </button>
                <button className="ghost-btn" type="button" onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard/ai-history')}>
                  Open in AI History
                </button>
                <button className="primary-btn" type="button" onClick={() => void handlePublish()} disabled={isPublishing || !canPublish}>
                  {isPublishing ? 'Publishing' : 'Publish'}
                </button>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <div className="empty-state compact-state loading-state">
              <div className="loading-spinner" aria-hidden="true" />
              <p>{form.generateImage ? 'Generating and saving your caption and thumbnail...' : 'Generating and saving your caption...'}</p>
            </div>
          ) : result ? (
            <div className="output-stack">
              {!canPublish ? (
                <div className="notice-banner error">
                  Connect and verify {form.platform} through Zernio before publishing.
                </div>
              ) : null}
              <div className={`status-banner ${result.usedFallback ? 'fallback' : 'success'}`}>
                <span>{result.imageProvider === 'pollinations' ? 'Backup image engine used' : result.usedFallback ? 'Fallback content used' : 'Generated successfully'}</span>
                <p>{result.imageFallbackReason || (result.usedFallback ? result.fallbackReason || 'Gemini was unavailable, so fallback content was generated.' : statusMessage)}</p>
              </div>
              <div className="generated-output-grid">
                <div className="generated-image-card">
                  <div className="generated-image-frame">
                    {isImageLoading ? (
                      <div className="image-loading-state">
                        <div className="loading-spinner" aria-hidden="true" />
                        <p>Creating image...</p>
                      </div>
                    ) : result.imageUrl ? (
                      <img src={result.imageUrl} alt="AI-generated social media thumbnail" />
                    ) : (
                      <div className="image-empty-state">
                        <span>Image not generated</span>
                      </div>
                    )}
                  </div>
                  {imageError ? <p className="image-error">{imageError}</p> : null}
                  {result.imageProvider === 'pollinations' && result.imageFallbackReason ? <p className="image-note">{result.imageFallbackReason}</p> : null}
                  <div className="image-actions">
                    <button className="ghost-btn" type="button" onClick={handleDownloadImage} disabled={!result.imageUrl || isImageLoading}>
                      Download Image
                    </button>
                    <button className="ghost-btn" type="button" onClick={handleRegenerateImage} disabled={isImageLoading}>
                      {isImageLoading ? (
                        <>
                          <span className="btn-spinner" aria-hidden="true" />
                          Regenerating
                        </>
                      ) : (
                        'Regenerate Image'
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="output-label">Generated caption</p>
                  <p className="output-copy">{result.caption}</p>
                </div>
              </div>
              <div>
                <p className="output-label">Suggested hashtags</p>
                <div className="tag-row">
                  {result.hashtags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="output-label">CTA suggestions</p>
                <ul className="cta-list">
                  {result.ctaSuggestions.map((cta) => (
                    <li key={cta}>{cta}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="empty-state compact-state">
              <div className="empty-icon">✦</div>
              <p>Generate a caption and your copy, hashtags, and CTA ideas will appear here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default AIStudioPage
