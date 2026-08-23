import { finalPath, cleanPath } from '../files/folders.js'
import { validateItems } from '../files/collisions.js'
import { githubRequest } from './api.js'
import { fileToBase64, getBranchState, initializeEmptyRepo, parseRepo } from './repository.js'

export async function pushAllToGitHub({
  token,
  repoValue,
  branchValue,
  messageValue,
  items,
  prefix,
  onStatus,
  onLog,
  onProgress,
}) {
  if (!items.length) throw new Error('Choose at least one file first.')

  const validation = validateItems(items, prefix)
  if (!validation.ok) {
    if (validation.duplicates.length) {
      throw new Error(
        `Exact destination-path collision: ${validation.duplicates.join(', ')}. ` +
        'Files with the same name are allowed when their folders differ. Change only the colliding full path, ' +
        'or import the containing folder so Crain can preserve its relative path.',
      )
    }
    throw new Error('Fix the highlighted destination paths before pushing.')
  }

  const { owner, repo, full } = parseRepo(repoValue)
  const branch = cleanPath(branchValue) || 'main'
  const message = messageValue.trim() || 'Upload files'
  if (!token.trim()) throw new Error('Enter your GitHub token first.')

  const paths = new Map()
  for (const item of items) {
    const path = finalPath(item, prefix)
    if (paths.has(path)) throw new Error(`Two files are targeting the same GitHub path: ${path}`)
    paths.set(path, item)
  }

  const maxProgress = items.length + 6
  let progress = 0
  const bump = () => {
    progress += 1
    onProgress?.(progress, maxProgress)
  }

  onStatus?.('Connecting to GitHub…', 'busy')
  onLog?.(`Repository: ${full}`)
  onLog?.(`Branch: ${branch}`)

  const repoInfo = await githubRequest(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  )
  bump()
  onLog?.('Repository access OK.')

  let branchState = await getBranchState(token, owner, repo, branch)
  bump()

  if (!branchState.exists) {
    const first = [...paths.entries()].find(([path]) => path === 'index.html') || [...paths.entries()][0]
    if (!first) throw new Error('No file is available to initialize the empty repository.')
    branchState = await initializeEmptyRepo({
      token,
      owner,
      repo,
      repoInfo,
      requestedBranch: branch,
      firstPath: first[0],
      firstFile: first[1].file,
      message,
      onStatus,
      onLog,
    })
    bump()
    onLog?.(`Repository initialized. Base commit: ${branchState.baseSha.slice(0, 7)}`)
  } else {
    onLog?.(`Base commit: ${branchState.baseSha.slice(0, 7)}`)
    bump()
  }

  const tree = []
  let done = 0
  for (const [path, item] of paths) {
    onStatus?.(`Uploading ${done + 1}/${items.length}: ${path}`, 'busy')
    const content = await fileToBase64(item.file)
    const blob = await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, encoding: 'base64' }),
      },
    )
    tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha })
    done += 1
    bump()
    onLog?.(`✓ ${path}`)
  }

  let commit = null
  let published = false
  const MAX_FAST_FORWARD_RETRIES = 4

  for (let attempt = 1; attempt <= MAX_FAST_FORWARD_RETRIES; attempt += 1) {
    onStatus?.(
      attempt === 1
        ? 'Checking latest branch…'
        : `Branch changed — retrying ${attempt}/${MAX_FAST_FORWARD_RETRIES}…`,
      'busy',
    )

    const latest = await getBranchState(token, owner, repo, branch)
    if (!latest.exists) throw new Error(`Branch "${branch}" disappeared while uploading.`)

    if (latest.baseSha !== branchState.baseSha) {
      onLog?.(
        `↻ Branch moved from ${branchState.baseSha.slice(0, 7)} to ${latest.baseSha.slice(0, 7)}. ` +
        'Rebuilding safely on latest commit.',
      )
    }
    branchState = latest

    onStatus?.('Creating Git tree…', 'busy')
    const newTree = await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: branchState.baseTreeSha, tree }),
      },
    )

    onStatus?.('Creating commit…', 'busy')
    commit = await githubRequest(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tree: newTree.sha, parents: [branchState.baseSha] }),
      },
    )

    const beforeUpdate = await getBranchState(token, owner, repo, branch)
    if (!beforeUpdate.exists) {
      throw new Error(`Branch "${branch}" disappeared before the final update.`)
    }

    if (beforeUpdate.baseSha !== branchState.baseSha) {
      onLog?.(`↻ Branch changed again to ${beforeUpdate.baseSha.slice(0, 7)} before publish. Retrying without force.`)
      branchState = beforeUpdate
      continue
    }

    onStatus?.('Updating branch…', 'busy')
    try {
      await githubRequest(
        token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: commit.sha, force: false }),
        },
      )
      published = true
      break
    } catch (error) {
      const messageText = String(error?.message || '').toLowerCase()
      const fastForwardRace =
        messageText.includes('not a fast forward') ||
        messageText.includes('not fast-forward') ||
        messageText.includes('fast forward')

      if (fastForwardRace && attempt < MAX_FAST_FORWARD_RETRIES) {
        onLog?.('↻ GitHub rejected the update because the branch moved. Fetching the newest HEAD and retrying safely…')
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt))
        continue
      }
      throw error
    }
  }

  if (!published) {
    throw new Error('The branch kept changing while this upload was finishing. Wait a few seconds, then press Upload & Push again.')
  }

  onProgress?.(maxProgress, maxProgress)
  onStatus?.(`Pushed ${commit.sha.slice(0, 7)} successfully`, 'ok')
  onLog?.('')
  onLog?.('SUCCESS')
  onLog?.(`Commit: ${commit.sha}`)
  onLog?.(`Repository: https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`)

  return { owner, repo, branch, commit }
}
