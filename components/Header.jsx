import { CrainAppIcon } from '../icons/CrainAppIcon.jsx'

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 15.2A8.4 8.4 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function Header({ theme, onToggleTheme }) {
  return (
    <header className="app-header">
      <div className="brand">
        <CrainAppIcon />
        <div className="brand-copy">
          <h1>Crain</h1>
          <p>GitHub Uploader</p>
        </div>
      </div>

      <div className="header-actions">
        <span className="version-pill">v16.1</span>
        <button className="icon-button theme-toggle" type="button" onClick={onToggleTheme} aria-label="Switch appearance">
          {theme === 'light' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
