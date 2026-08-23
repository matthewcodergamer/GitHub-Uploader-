import { useState } from 'react'
import { GitHubIcon } from '../icons/GitHubIcon.jsx'
import { RepoPicker } from './RepoPicker.jsx'

function HelpTip({ children, label }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`help-tip ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="help-button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      <span className="help-popover">{children}</span>
    </span>
  )
}

export function GitHubSetup({ uploader }) {
  const {
    repo, setRepo,
    branch, setBranch,
    message, setMessage,
    token, setToken,
    rememberToken, setRememberToken,
    tokenVisible, setTokenVisible,
    githubUser,
    repos,
    repoPickerOpen, setRepoPickerOpen,
    repoSearch, setRepoSearch,
    repoTestText,
    saveConnectionSettings,
    forgetConnection,
    loadMyRepos,
    selectRepo,
    testRepoAccess,
    busy,
  } = uploader

  return (
    <section className="panel github-panel">
      <div className="section-title">
        <span className="step-chip">1</span>
        <h2>GitHub</h2>
      </div>

      <div className="form-grid">
        <div className="field-group field-group--full">
          <div className="field-label-row">
            <label htmlFor="repo">Repository</label>
            <HelpTip label="Repository help">
              Type <strong>owner/repo</strong>, paste a GitHub repository URL, or browse your repositories after connecting.
            </HelpTip>
          </div>
          <div className="stack-on-mobile repo-entry-row">
            <input
              id="repo"
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              onBlur={() => saveConnectionSettings(false)}
              placeholder="matthewcodergamer/arena-pocket-ide"
              autoComplete="off"
            />
            <button type="button" className="accent-button" onClick={loadMyRepos} disabled={busy}>
              Browse My Repos
            </button>
          </div>
          <RepoPicker
            open={repoPickerOpen}
            repos={repos}
            search={repoSearch}
            onSearch={setRepoSearch}
            onClose={() => setRepoPickerOpen(false)}
            onSelect={selectRepo}
          />
        </div>

        <div className="field-group">
          <label htmlFor="branch">Branch</label>
          <input
            id="branch"
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            onBlur={() => saveConnectionSettings(false)}
            placeholder="main"
          />
        </div>

        <div className="field-group">
          <label htmlFor="message">Commit message</label>
          <input id="message" value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>

        <div className="field-group field-group--full">
          <div className="field-label-row">
            <label htmlFor="token">GitHub token</label>
            <HelpTip label="Token help">
              Use a fine-grained personal access token with repository access and <strong>Contents: Read and write</strong>. Workflow uploads also need workflow permission.
            </HelpTip>
          </div>

          <div className="token-row">
            <input
              id="token"
              type={tokenVisible ? 'text' : 'password'}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="off"
              spellCheck="false"
              placeholder="Fine-grained GitHub token"
            />
            <button type="button" className="secondary-button token-toggle" onClick={() => setTokenVisible((value) => !value)}>
              {tokenVisible ? 'Hide' : 'Show'}
            </button>
          </div>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(event) => setRememberToken(event.target.checked)}
            />
            <span>Remember token on this device</span>
          </label>

          <div className="connection-actions">
            <button type="button" className="accent-button" onClick={() => saveConnectionSettings(true)}>Save Connection</button>
            <button type="button" className="quiet-button" onClick={forgetConnection}>Forget Saved Token</button>
          </div>

          <div className="account-row">
            <div className="account-avatar">
              {githubUser?.avatar_url ? (
                <img src={githubUser.avatar_url} alt="" />
              ) : (
                <GitHubIcon />
              )}
            </div>
            <div className="account-copy">
              <strong>{githubUser ? (githubUser.name ? `${githubUser.name} (@${githubUser.login})` : `@${githubUser.login}`) : 'Not connected'}</strong>
              <span>{githubUser ? `${githubUser.public_repos ?? 0} public repos · GitHub connection ready` : 'Enter your token, then test access or browse repositories.'}</span>
            </div>
            <button type="button" className="text-action" onClick={testRepoAccess} disabled={busy}>Connect</button>
          </div>

          <p className="connection-note">{repoTestText}</p>
        </div>
      </div>
    </section>
  )
}
