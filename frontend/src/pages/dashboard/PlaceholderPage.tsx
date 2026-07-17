function PlaceholderPage({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="placeholder-page">
      <div className="empty-state">
        <div className="empty-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default PlaceholderPage
