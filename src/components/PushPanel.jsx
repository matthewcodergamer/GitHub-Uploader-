import { UploadIcon } from '../icons/UploadIcon.jsx'
import { LiquidGlass } from './LiquidGlass.jsx'

export function PushPanel({ uploader }) {
  const { status, statusType, error, progress, logLines, busy, pushAll } = uploader

  return (
    <section className="panel push-panel">
      <div className="section-title">
        <span className="step-chip">3</span>
        <h2>Push</h2>
      </div>

      <div className="push-status-row">
        <div className="status-line">
          <span className={`status-dot ${statusType ? `status-dot--${statusType}` : ''}`} />
          <span>{status}</span>
        </div>
      </div>

      <LiquidGlass className="push-glass" variant="prominent" radius={20}>
        <button type="button" className="push-button" onClick={pushAll} disabled={busy}>
          <UploadIcon />
          <span>{busy ? 'Uploading…' : 'Upload & Push'}</span>
        </button>
      </LiquidGlass>

      {error && <div className="error-message">{error}</div>}
      <progress value={progress.value} max={progress.max} />

      <details className="log-panel">
        <summary>Upload details</summary>
        <pre>{logLines.length ? logLines.join('\n') : 'Working…'}</pre>
      </details>
    </section>
  )
}
