import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/app.css'
import './styles/glass.css'
import './styles/responsive.css'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Crain startup error]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="fatal-screen">
        <div className="fatal-card">
          <strong>Crain couldn’t start</strong>
          <p>{String(this.state.error?.message || this.state.error)}</p>
          <button type="button" onClick={() => location.reload()}>Reload</button>
        </div>
      </main>
    )
  }
}

const rootNode = document.getElementById('root')

createRoot(rootNode).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
