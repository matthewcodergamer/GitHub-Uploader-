import { cleanPath, encodeRepoPath } from '../files/folders.js'
import { githubRequest } from './api.js'

export function parseRepo(value) {
  let normalized = String(value || '').trim()
  normalized = normalized
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length < 2) {
    throw new Error('Repository must look like owner/repo or a GitHub repository URL.')
  }
  return { owner: parts[0], repo: parts[1], full: `${parts[0]}/${parts[1]}` }
}

export async function getBranchState(token, owner, repo, branch) {
  try {
    const ref = await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
    )
    const baseSha = ref.object.sha
    const commit = await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${baseSha}`,
    )
    return { exists: true, baseSha, baseTreeSha: commit.tree.sha }
  } catch (error) {
    if (error.status === 404 || error.status === 409) {
      return { exists: false, baseSha: null, baseTreeSha: null }
    }
    throw error
  }
}

export async function ensureRequestedBranch({ token, owner, repo, repoInfo, requestedBranch, onLog }) {
  const requested = cleanPath(requestedBranch) || 'main'
  const existing = await getBranchState(token, owner, repo, requested)
  if (existing.exists) return existing

  const defaultBranch = repoInfo.default_branch || 'main'
  const defaultState = await getBranchState(token, owner, repo, defaultBranch)
  if (!defaultState.exists) return null

  if (requested === defaultBranch) return defaultState

  onLog?.(`Branch "${requested}" does not exist. Creating it from ${defaultBranch}…`)
  try {
    await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${requested}`, sha: defaultState.baseSha }),
      },
    )
  } catch (error) {
    // If another client created it in the same moment, simply resolve it below.
    if (error.status !== 422) throw error
  }

  const created = await getBranchState(token, owner, repo, requested)
  if (!created.exists) throw new Error(`Could not create branch "${requested}".`)
  return created
}

export async function verifyPublishedCommit(token, owner, repo, branch, expectedSha) {
  const state = await getBranchState(token, owner, repo, branch)
  if (!state.exists) throw new Error(`GitHub accepted the upload, but branch "${branch}" could not be verified afterward.`)
  return {
    verified: state.baseSha === expectedSha,
    actualSha: state.baseSha,
  }
}

export async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function initializeEmptyRepo({ token, owner, repo, repoInfo, requestedBranch, firstPath, firstFile, message, onStatus, onLog }) {
  const defaultBranch = repoInfo.default_branch || 'main'
  onStatus?.('Initializing empty repository…', 'busy')
  onLog?.(`Repository is empty. Initializing "${defaultBranch}" with ${firstPath}…`)

  const content = await fileToBase64(firstFile)
  await githubRequest(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(firstPath)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${message} — initialize repository`,
        content,
      }),
    },
  )

  let base = await getBranchState(token, owner, repo, defaultBranch)
  if (!base.exists) {
    throw new Error('GitHub initialized the repository, but the default branch could not be found.')
  }

  if (requestedBranch !== defaultBranch) {
    onLog?.(`Creating branch "${requestedBranch}" from ${defaultBranch}…`)
    await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${requestedBranch}`, sha: base.baseSha }),
      },
    )
    base = await getBranchState(token, owner, repo, requestedBranch)
  }
  return base
}

export { cleanPath }
