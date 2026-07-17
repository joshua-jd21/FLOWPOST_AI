import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Platform = 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook'
type PostStatus = 'draft' | 'scheduled' | 'published'

type MediaItem = {
  url: string
  type?: string
  name?: string
  size?: number
}

type PostForm = {
  title: string
  caption: string
  platform: Platform
  scheduledAt: string
  status: PostStatus
  media: MediaItem[]
}

type AIResponse = {
  caption?: string
  hashtags?: string[]
  ctaSuggestions?: string[]
  message?: string
}

const initialForm: PostForm = {
  title: '',
  caption: '',
  platform: 'Instagram',
  scheduledAt: '',
  status: 'draft',
  media: [],
}

const platforms: Platform[] = ['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook']

const toDateTimeLocal = (value: string) => {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 16)
}

const readMediaFile = (file: File): Promise<MediaItem> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        url: String(reader.result),
        type: file.type,
        name: file.name,
        size: file.size,
      })
    }
    reader.onerror = () => reject(new Error('Unable to read media file'))
    reader.readAsDataURL(file)
  })
}

function CreatePostPage() {
  const navigate = useNavigate()
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const [form, setForm] = useState<PostForm>(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleMediaChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const media = await readMediaFile(file)
      setForm((value) => ({ ...value, media: [media] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to attach media')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : '',
        status: form.scheduledAt ? 'scheduled' : form.status,
      }
      const response = await fetch(`${apiUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({ message: 'Unable to save post' }))

      if (!response.ok) {
        throw new Error(data.message || 'Unable to save post')
      }

      navigate('/dashboard/posts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save post')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateDraft = async () => {
    setIsGenerating(true)
    setError('')
    setSuccess('')

    try {
      const prompt = `${form.title || 'Create a premium social media post'} ${form.caption || 'for a new campaign launch'}`.trim()
      const response = await fetch(`${apiUrl}/api/ai/generate-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: form.platform,
          contentType: 'Post',
          tone: 'Premium, clear, and conversion-focused',
          audience: 'Social media audience',
          prompt: prompt.length >= 10 ? prompt : 'Create a premium social media post for a campaign launch',
          generateImage: false,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as AIResponse

      if (!response.ok || !data.caption) {
        throw new Error(data.message || 'Unable to generate content')
      }

      setForm((value) => ({
        ...value,
        title: value.title || 'AI-generated social post',
        caption: [data.caption, data.hashtags?.join(' ')].filter(Boolean).join('\n\n'),
      }))
      setSuccess('AI draft generated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiUrl}/api/social/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: form.platform,
          caption: form.caption,
          media: form.media,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { message?: string; publish?: { externalPostId?: string } }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to publish post')
      }

      setSuccess(data.publish?.externalPostId ? `Published. External post: ${data.publish.externalPostId}` : 'Published successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish post')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Create Post</p>
          <h2>Compose once, schedule everywhere.</h2>
          <p>Draft creator-ready posts with media, platform targeting, and launch timing.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-btn" type="button" onClick={() => void handleGenerateDraft()} disabled={isGenerating}>
            {isGenerating ? 'Generating' : 'Generate with AI'}
          </button>
          <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard/posts')}>
            View posts
          </button>
        </div>
      </div>

      <form className="panel-card scheduler-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Launch teaser" />
          </label>
          <label>
            <span>Platform</span>
            <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as Platform })}>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Caption</span>
          <textarea
            rows={6}
            value={form.caption}
            onChange={(event) => setForm({ ...form, caption: event.target.value })}
            placeholder="Write the post caption..."
          />
        </label>

        <div className="form-grid">
          <label>
            <span>Schedule time</span>
            <input
              type="datetime-local"
              value={toDateTimeLocal(form.scheduledAt)}
              onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
            />
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PostStatus })}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
        </div>

        <label>
          <span>Media</span>
          <input type="file" accept="image/*" onChange={handleMediaChange} />
        </label>

        {form.media[0] ? (
          <div className="media-preview">
            <img src={form.media[0].url} alt={form.media[0].name || 'Post media preview'} />
            <span>{form.media[0].name}</span>
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <div className="notice-banner success">{success}</div> : null}

        <div className="action-row">
          <button className="primary-btn" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save post'}
          </button>
          <button className="ghost-btn" type="button" onClick={() => void handlePublish()} disabled={isPublishing || !form.caption.trim()}>
            {isPublishing ? 'Publishing...' : 'Publish now'}
          </button>
          <button className="ghost-btn" type="button" onClick={() => setForm(initialForm)} disabled={isSaving}>
            Reset
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePostPage
