import { useEffect, useState } from 'react'
import { Header } from './components/Header.jsx'
import { GitHubSetup } from './components/GitHubSetup.jsx'
import { ProjectPicker } from './components/ProjectPicker.jsx'
import { PushPanel } from './components/PushPanel.jsx'
import { useCrainUploader } from './hooks/useCrainUploader.js'

function getInitialTheme() {
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'light' || fromDom === 'dark') return fromDom
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function App() {
  const uploader = useCrainUploader()
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.getElementById('themeColor')?.setAttribute('content', theme === 'light' ? '#f5f5f7' : '#07070a')
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { localStorage.setItem('crainAppearanceV1', next) } catch {}
  }

  return (
    <main className="app-shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <div className="desktop-layout">
        <GitHubSetup uploader={uploader} />
        <div className="desktop-side">
          <ProjectPicker uploader={uploader} />
          <PushPanel uploader={uploader} />
        </div>
      </div>
      <footer>Crain • direct GitHub upload • React v16</footer>
    </main>
  )
}
