export function RepoPicker({ open, repos, search, onSearch, onClose, onSelect }) {
  if (!open) return null

  const query = search.trim().toLowerCase()
  const filtered = repos.filter((repo) => {
    const haystack = [repo.full_name, repo.name, repo.description || ''].join(' ').toLowerCase()
    return !query || haystack.includes(query)
  })

  return (
    <div className="repo-picker">
      <div className="repo-picker-head">
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search your GitHub repositories…"
          autoComplete="off"
        />
        <button type="button" className="secondary-button compact-button" onClick={onClose}>Close</button>
      </div>
      <div className="repo-list">
        {!repos.length && <div className="empty-list">Loading your repositories…</div>}
        {!!repos.length && !filtered.length && <div className="empty-list">No matching repositories.</div>}
        {filtered.map((repo) => {
          const updated = repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : ''
          return (
            <button key={repo.id || repo.full_name} type="button" className="repo-item" onClick={() => onSelect(repo)}>
              <span className="repo-item-main">
                <strong>{repo.full_name}</strong>
                <span>{repo.description || 'No description'}</span>
              </span>
              <span className="repo-meta">{repo.private ? 'Private' : 'Public'}{updated ? ` · ${updated}` : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
