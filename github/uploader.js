import { finalPath, cleanPath } from '../files/folders.js'
import { validateItems } from '../files/collisions.js'
import { githubRequest } from './api.js'
import {
  ensureRequestedBranch,
  fileToBase64,
  initializeEmptyRepo,
  parseRepo,
  verifyPublishedCommit,
} from './repository.js'

const MAX_GITHUB_BLOB_BYTES = 100 * 1024 * 1024
const BLOB_CONCURRENCY = 4

function dirname(path) {
  const clean = cleanPath(path)
  const slash = clean.lastIndexOf('/')
  return slash < 0 ? '' : clean.slice(0, slash)
}

function joinPath(base, child) {
  return cleanPath([base, child].filter(Boolean).join('/'))
}

function cloneTextItem(item, text, type = 'text/plain') {
  const name = item?.file?.name || 'file.txt'
  return {
    ...item,
    file: new File([text], name, {
      type: item?.file?.type || type,
      lastModified: Date.now(),
    }),
  }
}

async function applySafeProjectRepairs(paths, onLog) {
  const repaired = new Map(paths)

  for (const [indexPath, item] of paths) {
    if (!/(^|\/)index\.html?$/i.test(indexPath) || !item?.file?.text) continue

    let text
    try { text = await item.file.text() } catch { continue }
    const dir = dirname(indexPath)

    // Common Vite deployment mistake: index.html points at src/main.jsx but the
    // selected/uploaded project actually contains main.jsx beside index.html.
    // Repair only when the referenced file is definitely absent and the sibling
    // entry is definitely present, so Crain never guesses over a valid layout.
    const candidates = [
      ['jsx', 'main.jsx'],
      ['tsx', 'main.tsx'],
      ['js', 'main.js'],
      ['ts', 'main.ts'],
    ]

    for (const [ext, siblingName] of candidates) {
      const expected = joinPath(dir, `src/main.${ext}`)
      const sibling = joinPath(dir, siblingName)
      if (repaired.has(expected) || !repaired.has(sibling)) continue

      const moduleSrc = new RegExp(`(\\bsrc\\s*=\\s*["'])\\/?(?:\\.\\/)?src\\/main\\.${ext}(["'])`, 'i')
      if (!moduleSrc.test(text)) continue

      text = text.replace(moduleSrc, `$1./${siblingName}$2`)
      repaired.set(indexPath, cloneTextItem(item, text, 'text/html'))
      onLog?.(`AUTO-FIX: ${indexPath} pointed to src/main.${ext}, but the uploaded entry is ${sibling}. Repaired the Vite entry path automatically.`)
      break
    }
  }

  return repaired
}

function preflightPaths(paths) {
  let totalBytes = 0
  for (const [path, item] of paths) {
    const size = Number(item?.file?.size || 0)
    totalBytes += size
    if (size > MAX_GITHUB_BLOB_BYTES) {
      const mb = (size / (1024 * 1024)).toFixed(1)
      throw new Error(`${path} is ${mb} MB. GitHub rejects individual Git objects over 100 MB. Use Git LFS or remove that file before pushing.`)
    }
  }
  return totalBytes
}

async function mapWithConcurrency(entries, limit, worker) {
  const results = new Array(entries.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, Math.max(1, entries.length)) }, async () => {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= entries.length) return
      results[index] = await worker(entries[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

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

  let paths = new Map()
  for (const item of items) {
    const path = finalPath(item, prefix)
    if (paths.has(path)) throw new Error(`Two files are targeting the same GitHub path: ${path}`)
    paths.set(path, item)
  }

  onStatus?.('Preflight checking project…', 'busy')
  paths = await applySafeProjectRepairs(paths, onLog)
  const totalBytes = preflightPaths(paths)
  onLog?.(`Preflight: ${paths.size} file${paths.size === 1 ? '' : 's'} · ${(totalBytes / (1024 * 1024)).toFixed(2)} MB.`)

  const maxProgress = paths.size + 8
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

  if (repoInfo.archived) throw new Error('This repository is archived and cannot be updated.')
  if (repoInfo.permissions && repoInfo.permissions.push === false) {
    throw new Error('This GitHub token/account can read the repository but does not have permission to push to it.')
  }
  onLog?.('Repository access OK.')

  let branchState = await ensureRequestedBranch({
    token,
    owner,
    repo,
    repoInfo,
    requestedBranch: branch,
    onLog,
  })
  bump()

  if (!branchState) {
    const first = [...paths.entries()].find(([path]) => /(^|\/)index\.html?$/i.test(path)) || [...paths.entries()][0]
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

  const entries = [...paths.entries()]
  let uploaded = 0
  const tree = await mapWithConcurrency(entries, BLOB_CONCURRENCY, async ([path, item]) => {
    onStatus?.(`Uploading files… ${uploaded}/${entries.length}`, 'busy')
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
    uploaded += 1
    bump()
    onStatus?.(`Uploading files… ${uploaded}/${entries.length}`, 'busy')
    onLog?.(`✓ ${path}`)
    return { path, mode: '100644', type: 'blob', sha: blob.sha }
  })

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

    const latest = await ensureRequestedBranch({
      token,
      owner,
      repo,
      repoInfo,
      requestedBranch: branch,
      onLog,
    })
    if (!latest) throw new Error(`Branch "${branch}" disappeared while uploading.`)

    if (latest.baseSha !== branchState.baseSha) {
      onLog?.(
        `↻ Branch moved from ${branchState.baseSha.slice(0, 7)} to ${latest.baseSha.slice(0, 7)}. ` +
        'Rebuilding safely on the latest commit.',
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

    const beforeUpdate = await ensureRequestedBranch({
      token,
      owner,
      repo,
      repoInfo,
      requestedBranch: branch,
      onLog,
    })
    if (!beforeUpdate) throw new Error(`Branch "${branch}" disappeared before the final update.`)

    if (beforeUpdate.baseSha !== branchState.baseSha) {
      onLog?.(`↻ Branch changed again to ${beforeUpdate.baseSha.slice(0, 7)} before publish. Retrying without force.`)
      branchState = beforeUpdate
      continue
    }

    onStatus?.('Publishing commit…', 'busy')
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

      if (error.status === 403 || error.status === 422) {
        throw new Error(`${error.message} If this branch is protected, allow your token to write to it or choose another branch.`)
      }
      throw error
    }
  }

  if (!published) {
    throw new Error('The branch kept changing while this upload was finishing. Wait a few seconds, then press Upload & Push again.')
  }

  onStatus?.('Verifying GitHub update…', 'busy')
  const verification = await verifyPublishedCommit(token, owner, repo, branch, commit.sha)
  bump()
  if (verification.verified) {
    onLog?.(`Verified: ${branch} now points to ${commit.sha.slice(0, 7)}.`)
  } else {
    onLog?.(`NOTICE: upload succeeded, but ${branch} moved again immediately to ${verification.actualSha.slice(0, 7)}.`)
  }

  onProgress?.(maxProgress, maxProgress)
  onStatus?.(`Pushed ${commit.sha.slice(0, 7)} successfully`, 'ok')
  onLog?.('')
  onLog?.('SUCCESS')
  onLog?.(`Commit: ${commit.sha}`)
  onLog?.(`Repository: https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`)

  return { owner, repo, branch, commit, verification }
}
