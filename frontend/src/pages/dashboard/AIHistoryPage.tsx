import { useEffect, useMemo, useState } from 'react'

type HistoryInput = {
  platform?: string
  contentType?: string
  tone?: string
  audience?: string
  prompt?: string
}

type HistoryOutput = {
  caption?: string
  hashtags?: string[]
  ctaSuggestions?: string[]
  usedFallback?: boolean
  fallbackReason?: string
  imageUrl?: string
  imagePrompt?: string
  imageProvider?: 'gemini' | 'pollinations'
  imageFallbackReason?: string
  imageError?: string
}

type HistoryEntry = {
  id: string
  type: 'caption' | 'image' | 'post'
  input: HistoryInput
  output: HistoryOutput
  createdAt?: string
}

const formatDate = (value?: string) => {
  if (!value) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function AIHistoryPage() {
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState('')

  const loadHistory = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/ai/history`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({ history: [] }))) as { history?: HistoryEntry[]; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load AI history')
      }

      setHistory(data.history ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load AI history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [apiUrl])

  const handleDownload = async (entry: HistoryEntry) => {
    if (!entry.output.imageUrl) {
      return
    }

    setDownloadingId(entry.id)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/ai/download-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageUrl: entry.output.imageUrl }),
      })

      if (!response.ok) {
        throw new Error('Unable to download image right now.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `postpilot-history-${entry.id}.jpg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download image right now.')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">AI History</p>
          <h2>Your generated captions and thumbnails, organized.</h2>
          <p>Review saved AI Studio outputs, reuse captions, download thumbnails, and track fallback generations.</p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => void loadHistory()}>
          Refresh
        </button>
      </div>

      {error ? <div className="notice-banner error">{error}</div> : null}

      {isLoading ? (
        <div className="panel-card empty-state compact-state loading-state">
          <div className="loading-spinner" aria-hidden="true" />
          <p>Loading generated content...</p>
        </div>
      ) : history.length ? (
        <div className="history-grid">
          {history.map((entry) => (
            <article key={entry.id} className="panel-card history-card">
              <div className="history-card-header">
                <div>
                  <p className="eyebrow">{entry.input.platform || entry.type}</p>
                  <h3>{entry.input.contentType || 'Generated content'}</h3>
                </div>
                <span className={`status-chip ${entry.output.usedFallback ? 'fallback' : 'success'}`}>
                  {entry.output.imageProvider === 'pollinations' ? 'Backup image' : entry.output.usedFallback ? 'Fallback' : 'AI'}
                </span>
              </div>

              <div className="history-media-frame">
                {entry.output.imageUrl ? (
                  <img src={entry.output.imageUrl} alt="Generated thumbnail" />
                ) : (
                  <span>No thumbnail</span>
                )}
              </div>

              <p className="history-caption">{entry.output.caption || 'Image-only generation'}</p>
              {entry.input.prompt ? (
                <div className="history-prompt">
                  <span>Prompt</span>
                  <p>{entry.input.prompt}</p>
                </div>
              ) : null}

              {entry.output.hashtags?.length ? (
                <div className="tag-row">
                  {entry.output.hashtags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {entry.output.ctaSuggestions?.length ? (
                <div className="history-cta-list">
                  {entry.output.ctaSuggestions.map((cta) => (
                    <span key={cta}>{cta}</span>
                  ))}
                </div>
              ) : null}

              {entry.output.fallbackReason ? <p className="image-error">{entry.output.fallbackReason}</p> : null}
              {entry.output.imageFallbackReason ? <p className="image-note">{entry.output.imageFallbackReason}</p> : null}
              {entry.output.imageError ? <p className="image-error">{entry.output.imageError}</p> : null}

              <div className="history-card-footer">
                <span>{formatDate(entry.createdAt)}</span>
                <button className="ghost-btn" type="button" onClick={() => void handleDownload(entry)} disabled={!entry.output.imageUrl || downloadingId === entry.id}>
                  {downloadingId === entry.id ? 'Downloading' : 'Download Image'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel-card empty-state">
          <div className="empty-icon">✦</div>
          <h2>No AI generations yet</h2>
          <p>Generate captions or thumbnails in AI Studio and they will appear here.</p>
        </div>
      )}
    </div>
  )
}

export default AIHistoryPage
