import { finalPath, prettySize } from '../files/folders.js'

export function FileReview({ items, prefix, validation, open, onOpenChange, onUpdatePath, onRemove }) {
  if (!items.length) return null

  return (
    <details className="review-panel" open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
      <summary>
        <span>Review paths</span>
        <span className="review-count">{items.length} file{items.length === 1 ? '' : 's'}</span>
      </summary>
      <div className="file-list">
        {items.map((item) => {
          const final = finalPath(item, prefix, false)
          const conflict = !final || (validation.counts.get(final) || 0) > 1
          return (
            <article className={`file-row ${conflict ? 'has-conflict' : ''}`} key={item.id}>
              <div className="file-row-head">
                <div className="file-symbol" aria-hidden="true">{item.virtual ? '+' : '⌘'}</div>
                <div className="file-copy">
                  <strong>{item.file.name}</strong>
                  <span>{prettySize(item.file.size)}{item.virtual ? ' · generated' : ''}{item.selectionRoot ? ' · folder' : ''}</span>
                </div>
                <button type="button" className="remove-file" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.file.name}`}>×</button>
              </div>
              <div className="path-grid">
                <div className="path-side">
                  <span className="micro-label">Import from</span>
                  <code title={item.sourcePath}>{item.sourcePath || item.file.name}</code>
                </div>
                <span className="path-arrow" aria-hidden="true">→</span>
                <label className="path-side">
                  <span className="micro-label">GitHub path</span>
                  <input
                    className={conflict ? 'input-invalid' : ''}
                    value={item.path}
                    onChange={(event) => onUpdatePath(item.id, event.target.value)}
                    aria-label={`GitHub destination for ${item.file.name}`}
                  />
                </label>
              </div>
            </article>
          )
        })}
      </div>
    </details>
  )
}
