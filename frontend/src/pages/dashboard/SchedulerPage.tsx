import { useEffect, useMemo, useState } from 'react'

type Platform = 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook'
type PostStatus = 'draft' | 'scheduled' | 'published'

type Post = {
  id: string
  title: string
  caption: string
  platform: Platform
  media: Array<{ url: string; type?: string; name?: string; size?: number }>
  scheduledAt?: string
  status: PostStatus
  publishedAt?: string
  externalPostId?: string
  publishError?: string
  updatedAt: string
}

type PostForm = {
  title: string
  caption: string
  platform: Platform
  scheduledAt: string
  status: Exclude<PostStatus, 'published'>
  media: Post['media']
}

type ProviderStatus = {
  provider: 'linkedin' | 'x' | 'instagram' | 'facebook'
  status: 'connected' | 'disconnected' | 'needs_reauth'
  account: { verifiedAt?: string } | null
}

const platforms: Platform[] = ['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook']

const initialPostForm: PostForm = {
  title: '',
  caption: '',
  platform: 'Instagram',
  scheduledAt: '',
  status: 'draft',
  media: [],
}

const platformToProvider = (platform: Platform): ProviderStatus['provider'] => {
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

const formatSchedule = (value?: string) => {
  if (!value) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const toDateTimeLocal = (value?: string) => {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 16)
}

const readMediaFile = (file: File): Promise<Post['media'][number]> => {
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

function SchedulerPage() {
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeView, setActiveView] = useState<'create' | 'scheduled' | 'draft' | 'published'>('create')
  const [postForm, setPostForm] = useState<PostForm>(initialPostForm)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishingPostId, setPublishingPostId] = useState('')
  const [connectedAccounts, setConnectedAccounts] = useState<ProviderStatus[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadPosts = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/posts`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({ posts: [] }))) as { posts?: Post[]; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load posts')
      }

      setPosts(data.posts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/social/accounts`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({ accounts: [] }))) as { accounts?: ProviderStatus[] }

      if (response.ok) {
        setConnectedAccounts(data.accounts ?? [])
      }
    } catch {
      setConnectedAccounts([])
    }
  }

  useEffect(() => {
    void loadPosts()
    void loadAccounts()
  }, [])

  const visiblePosts = posts.filter((post) => post.status === activeView)

  const handleMediaChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const media = await readMediaFile(file)
      setPostForm((value) => ({ ...value, media: [media] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to attach media')
    }
  }

  const buildSavePayload = (status: Exclude<PostStatus, 'published'>) => ({
    ...postForm,
    scheduledAt: status === 'scheduled' && postForm.scheduledAt ? new Date(postForm.scheduledAt).toISOString() : '',
    status,
  })

  const handleSavePost = async (status: Exclude<PostStatus, 'published'>) => {
    if (status === 'scheduled' && !postForm.scheduledAt) {
      setError('Choose a schedule time before scheduling a post.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildSavePayload(status)),
      })
      const data = (await response.json().catch(() => ({ message: 'Unable to create post' }))) as { post?: Post; message?: string }

      if (!response.ok || !data.post) {
        throw new Error(data.message || 'Unable to create post')
      }

      setPosts((value) => [data.post as Post, ...value])
      setPostForm(initialPostForm)
      setMessage(status === 'scheduled' ? 'Post scheduled.' : 'Draft saved.')
      setActiveView(status === 'scheduled' ? 'scheduled' : 'draft')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create post')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (postForm.scheduledAt) {
      await handleSavePost('scheduled')
      return
    }

    await handleSavePost('draft')
  }

  const handlePublishNow = async () => {
    const provider = platformToProvider(postForm.platform)
    const account = connectedAccounts.find((entry) => entry.provider === provider)

    if (!postForm.title.trim() || !postForm.caption.trim()) {
      setError('Title and caption are required before publishing.')
      return
    }

    if (!account || account.status !== 'connected' || !account.account?.verifiedAt) {
      setError(`Connect and verify ${postForm.platform} through Zernio before publishing.`)
      return
    }

    setIsPublishing(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/social/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: postForm.title.trim(),
          platform: postForm.platform,
          caption: postForm.caption,
          media: postForm.media,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { message?: string; post?: Post; publish?: { externalPostId?: string } }

      if (!response.ok || !data.post) {
        throw new Error(data.message || 'Unable to publish post')
      }

      setMessage(data.publish?.externalPostId ? `Post published through Zernio: ${data.publish.externalPostId}` : 'Post published through Zernio.')
      setPostForm(initialPostForm)
      setActiveView('published')
      await loadPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish post')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async (postId: string) => {
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({ message: 'Unable to delete post' }))

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete post')
      }

      setPosts((value) => value.filter((post) => post.id !== postId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete post')
    }
  }

  const handlePublish = async (postId: string) => {
    const post = posts.find((entry) => entry.id === postId)
    const provider = post ? platformToProvider(post.platform) : null
    const account = provider ? connectedAccounts.find((entry) => entry.provider === provider) : null

    if (!post || account?.status !== 'connected' || !account.account?.verifiedAt) {
      setError(`Connect and verify ${post?.platform || 'this platform'} through Zernio before publishing.`)
      return
    }

    setPublishingPostId(postId)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/posts/${postId}/publish`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as { post?: Post; publish?: { externalPostId?: string }; message?: string }

      if (!response.ok || !data.post) {
        throw new Error(data.message || 'Unable to publish post through Zernio')
      }

      setPosts((value) => value.map((post) => (post.id === data.post?.id ? data.post : post)))
      setMessage(data.publish?.externalPostId ? `Post published through Zernio: ${data.publish.externalPostId}` : 'Post published through Zernio.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish post through Zernio')
    } finally {
      setPublishingPostId('')
    }
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!editingPost) {
      return
    }

    setError('')

    try {
      const payload = {
        title: editingPost.title,
        caption: editingPost.caption,
        platform: editingPost.platform,
        media: editingPost.media,
        scheduledAt: editingPost.scheduledAt ? new Date(editingPost.scheduledAt).toISOString() : '',
        status: editingPost.scheduledAt ? 'scheduled' : editingPost.status,
      }
      const response = await fetch(`${apiUrl}/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({ message: 'Unable to update post' }))) as { post?: Post; message?: string }

      if (!response.ok || !data.post) {
        throw new Error(data.message || 'Unable to update post')
      }

      setPosts((value) => value.map((post) => (post.id === data.post?.id ? data.post : post)))
      setEditingPost(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update post')
    }
  }

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Posts</p>
          <h2>Create, schedule, publish, and refine every post.</h2>
          <p>Manage drafts, scheduled content, publishing, edits, and post cleanup from one central module.</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => setActiveView('create')}>
          New post
        </button>
      </div>

      <div className="scheduler-tabs">
        <button className={activeView === 'create' ? 'active' : ''} type="button" onClick={() => setActiveView('create')}>
          Create
        </button>
        <button className={activeView === 'scheduled' ? 'active' : ''} type="button" onClick={() => setActiveView('scheduled')}>
          Scheduled
        </button>
        <button className={activeView === 'draft' ? 'active' : ''} type="button" onClick={() => setActiveView('draft')}>
          Drafts
        </button>
        <button className={activeView === 'published' ? 'active' : ''} type="button" onClick={() => setActiveView('published')}>
          Published
        </button>
      </div>

      {error ? <div className="notice-banner error">{error}</div> : null}
      {message ? <div className="notice-banner success">{message}</div> : null}

      <div className="scheduler-grid">
        <section className="panel-card scheduler-list">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{activeView === 'create' ? 'Composer' : activeView === 'scheduled' ? 'Upcoming' : activeView === 'published' ? 'Published archive' : 'Draft queue'}</p>
              <h3>{activeView === 'create' ? 'Create post' : activeView === 'scheduled' ? 'Scheduled posts' : activeView === 'published' ? 'Published posts' : 'Drafts'}</h3>
            </div>
            <button className="ghost-btn" type="button" onClick={() => void loadPosts()}>
              Refresh
            </button>
          </div>

          {activeView === 'create' ? (
      <form className="ai-form posts-create-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  <span>Title</span>
                  <input value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} placeholder="Launch teaser" />
                </label>
                <label>
                  <span>Platform</span>
                  <select value={postForm.platform} onChange={(event) => setPostForm({ ...postForm, platform: event.target.value as Platform })}>
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
                <textarea rows={7} value={postForm.caption} onChange={(event) => setPostForm({ ...postForm, caption: event.target.value })} placeholder="Write the post caption..." />
              </label>

              <div className="form-grid">
                <label>
                  <span>Schedule time</span>
                  <input type="datetime-local" value={postForm.scheduledAt} onChange={(event) => setPostForm({ ...postForm, scheduledAt: event.target.value })} />
                </label>
                <label>
                  <span>Status</span>
                  <select value={postForm.status} onChange={(event) => setPostForm({ ...postForm, status: event.target.value as PostForm['status'] })}>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Media</span>
                <input type="file" accept="image/*" onChange={handleMediaChange} />
              </label>

              {postForm.media[0] ? (
                <div className="media-preview">
                  <img src={postForm.media[0].url} alt={postForm.media[0].name || 'Post media preview'} />
                  <span>{postForm.media[0].name}</span>
                </div>
              ) : null}

              <div className="action-row">
                <button className="primary-btn" type="button" onClick={() => void handleSavePost('draft')} disabled={isSaving || isPublishing}>
                  {isSaving ? 'Saving...' : 'Save draft'}
                </button>
                <button className="primary-btn" type="button" onClick={() => void handleSavePost('scheduled')} disabled={isSaving || isPublishing}>
                  {isSaving ? 'Saving...' : 'Schedule'}
                </button>
                <button className="primary-btn" type="button" onClick={() => void handlePublishNow()} disabled={isSaving || isPublishing}>
                  {isPublishing ? 'Publishing...' : 'Publish now'}
                </button>
                <button className="ghost-btn" type="button" onClick={() => setPostForm(initialPostForm)} disabled={isSaving}>
                  Reset
                </button>
              </div>
            </form>
          ) : isLoading ? (
            <div className="empty-state compact-state">
              <div className="loading-spinner" />
              <p>Loading posts...</p>
            </div>
          ) : visiblePosts.length ? (
            <div className="post-list">
              {visiblePosts.map((post) => (
                <article className="post-card" key={post.id}>
                  {post.media[0] ? <img src={post.media[0].url} alt={post.media[0].name || post.title} /> : <div className="post-media-empty">No media</div>}
                  <div>
                    <div className="post-card-header">
                      <span className="tag-pill">{post.platform}</span>
                      <span className={`status-pill ${post.status}`}>{post.status}</span>
                    </div>
                    <h4>{post.title}</h4>
                    <p>{post.caption}</p>
                    <span>{formatSchedule(post.scheduledAt)}</span>
                    <div className="post-actions">
                      <button className="ghost-btn" type="button" onClick={() => setEditingPost(post)}>
                        Edit
                      </button>
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => void handlePublish(post.id)}
                        disabled={publishingPostId === post.id || !connectedAccounts.some((account) => account.provider === platformToProvider(post.platform) && account.status === 'connected' && account.account?.verifiedAt)}
                      >
                        {publishingPostId === post.id ? 'Publishing' : 'Publish now'}
                      </button>
                      <button className="ghost-btn danger-btn" type="button" onClick={() => void handleDelete(post.id)}>
                        Delete
                      </button>
                    </div>
                    {post.externalPostId ? <span>Published ID: {post.externalPostId}</span> : null}
                    {post.publishError ? <span className="image-error">{post.publishError}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-state">
              <div className="empty-icon">◍</div>
              <p>No {activeView === 'scheduled' ? 'scheduled posts' : activeView === 'published' ? 'published posts' : 'drafts'} yet.</p>
            </div>
          )}
        </section>

        <aside className="panel-card scheduler-editor">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Edit post</p>
              <h3>{editingPost ? 'Update details' : 'Select a post'}</h3>
            </div>
          </div>

          {editingPost ? (
            <form className="ai-form" onSubmit={handleUpdate}>
              <label>
                <span>Title</span>
                <input value={editingPost.title} onChange={(event) => setEditingPost({ ...editingPost, title: event.target.value })} />
              </label>
              <label>
                <span>Platform</span>
                <select value={editingPost.platform} onChange={(event) => setEditingPost({ ...editingPost, platform: event.target.value as Platform })}>
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Caption</span>
                <textarea value={editingPost.caption} onChange={(event) => setEditingPost({ ...editingPost, caption: event.target.value })} rows={5} />
              </label>
              <label>
                <span>Schedule time</span>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(editingPost.scheduledAt)}
                  onChange={(event) => setEditingPost({ ...editingPost, scheduledAt: event.target.value })}
                />
              </label>
              <div className="action-row">
                <button className="primary-btn" type="submit">
                  Save changes
                </button>
                <button className="ghost-btn" type="button" onClick={() => setEditingPost(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state compact-state">
              <div className="empty-icon">✎</div>
              <p>Choose a scheduled post or draft to edit it here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default SchedulerPage
