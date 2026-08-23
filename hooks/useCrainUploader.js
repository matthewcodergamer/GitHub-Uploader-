import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { githubRequest } from '../github/api.js'
import { parseRepo } from '../github/repository.js'
import { pushAllToGitHub } from '../github/uploader.js'
import {
  arrangeItems,
  createInitialItem,
  createVirtualFolderItem,
  ensureSupportFiles,
} from '../files/autoArrange.js'
import { cleanPath, folderCount } from '../files/folders.js'
import { validateItems } from '../files/collisions.js'
import {
  consumeNativePicker,
  openNativePicker,
  readDroppedEntries,
  retryPendingPicker,
} from '../files/picker.js'

const CONNECTION_KEY = 'crainGithubConnectionV1'

export function useCrainUploader() {
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [message, setMessage] = useState('Update from Crain')
  const [token, setToken] = useState('')
  const [rememberToken, setRememberToken] = useState(true)
  const [tokenVisible, setTokenVisible] = useState(false)

  const [githubUser, setGithubUser] = useState(null)
  const [repos, setRepos] = useState([])
  const [repoPickerOpen, setRepoPickerOpen] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [repoTestText, setRepoTestText] = useState('Saved connection is loaded automatically when available.')

  const [items, setItems] = useState([])
  const [prefix, setPrefix] = useState('')
  const [emptyFolder, setEmptyFolder] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [status, setStatusText] = useState('Ready')
  const [statusType, setStatusType] = useState('')
  const [error, setError] = useState('')
  const [logLines, setLogLines] = useState(['Nothing pushed yet.'])
  const [progress, setProgress] = useState({ value: 0, max: 1 })
  const [busy, setBusy] = useState(false)

  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const itemsRef = useRef([])
  const pickerTransaction = useRef({ pending: null, serial: 0 })

  const commitItems = useCallback((next) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const setStatus = useCallback((text, type = '') => {
    setStatusText(text)
    setStatusType(type)
  }, [])

  const appendLog = useCallback((line) => {
    setLogLines((current) => {
      const base = current.length === 1 && current[0] === 'Nothing pushed yet.' ? [] : current
      return [...base, line]
    })
  }, [])

  const resetError = useCallback(() => setError(''), [])

  const showError = useCallback((problem) => {
    const text = String(problem?.message || problem || 'Unknown error')
    setError(text)
    setStatus('Cannot push', 'bad')
    appendLog(`ERROR: ${text}`)
  }, [appendLog, setStatus])

  const saveConnectionSettings = useCallback((showMessage = true) => {
    const data = {
      token: rememberToken ? token.trim() : '',
      repo: repo.trim(),
      branch: branch.trim() || 'main',
      remember: rememberToken,
    }
    try {
      localStorage.setItem(CONNECTION_KEY, JSON.stringify(data))
      if (showMessage) {
        setRepoTestText(
          rememberToken
            ? 'GitHub connection saved on this device.'
            : 'Repository saved; token will not be remembered.',
        )
      }
    } catch {
      if (showMessage) showError(new Error('Could not save the GitHub connection in this browser.'))
    }
  }, [branch, rememberToken, repo, showError, token])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONNECTION_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.repo) setRepo(data.repo)
      if (data.branch) setBranch(data.branch)
      setRememberToken(data.remember !== false)
      if (data.remember && data.token) {
        setToken(data.token)
        setRepoTestText('Saved token loaded. Press Connect or Browse My Repos.')
      }
    } catch (problem) {
      console.warn('Could not load saved Crain connection', problem)
    }
  }, [])

  const forgetConnection = useCallback(() => {
    localStorage.removeItem(CONNECTION_KEY)
    setToken('')
    setRememberToken(false)
    setGithubUser(null)
    setRepoTestText('Saved GitHub token forgotten.')
  }, [])

  const connectGitHub = useCallback(async () => {
    resetError()
    setStatus('Connecting to GitHub…', 'busy')
    const user = await githubRequest(token, '/user')
    setGithubUser(user)
    saveConnectionSettings(false)
    setStatus('GitHub connected', 'ok')
    setRepoTestText(`Connected as @${user.login}.`)
    return user
  }, [resetError, saveConnectionSettings, setStatus, token])

  const loadMyRepos = useCallback(async () => {
    resetError()
    setRepoPickerOpen(true)
    setRepos([])
    setStatus('Loading GitHub repositories…', 'busy')
    try {
      if (!githubUser) await connectGitHub()
      const all = []
      for (let page = 1; page <= 5; page += 1) {
        const list = await githubRequest(
          token,
          `/user/repos?per_page=100&page=${page}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`,
        )
        if (!Array.isArray(list)) break
        all.push(...list)
        if (list.length < 100) break
      }
      setRepos(all)
      setStatus(`Loaded ${all.length} repositories`, 'ok')
    } catch (problem) {
      showError(problem)
    }
  }, [connectGitHub, githubUser, resetError, setStatus, showError, token])

  const selectRepo = useCallback((selected) => {
    setRepo(selected.full_name)
    setBranch(selected.default_branch || 'main')
    setRepoPickerOpen(false)
    setRepoTestText(`Selected ${selected.full_name}.`)
  }, [])

  const testRepoAccess = useCallback(async () => {
    resetError()
    setRepoTestText('Connecting…')
    setStatus('Testing GitHub…', 'busy')
    try {
      const user = await githubRequest(token, '/user')
      setGithubUser(user)
      if (repo.trim()) {
        const { owner, repo: repoName } = parseRepo(repo)
        const data = await githubRequest(
          token,
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,
        )
        setRepoTestText(`Connected · ${data.full_name} · default branch ${data.default_branch || 'not created yet'}`)
      } else {
        setRepoTestText('GitHub connected. Choose a repository with Browse My Repos.')
      }
      saveConnectionSettings(false)
      setStatus('GitHub access works', 'ok')
    } catch (problem) {
      setRepoTestText('Connection failed')
      showError(problem)
    }
  }, [repo, resetError, saveConnectionSettings, setStatus, showError, token])

  const addFiles = useCallback(async (files, relativePathLookup = null) => {
    const existing = itemsRef.current
    const knownKeys = new Set(existing.map((item) => item.key))
    const incoming = []

    for (const file of Array.from(files || [])) {
      const supplied = relativePathLookup?.get?.(file) || ''
      const item = createInitialItem(file, supplied)
      if (knownKeys.has(item.key)) continue
      knownKeys.add(item.key)
      incoming.push(item)
    }

    if (!incoming.length) {
      setStatus('Ready', 'ok')
      return
    }

    // Immediate first-picker feedback: commit File objects before async inspection.
    commitItems([...existing, ...incoming])
    resetError()
    setStatus(`Organizing ${incoming.length} file${incoming.length === 1 ? '' : 's'}…`, 'busy')

    await new Promise((resolve) => requestAnimationFrame(resolve))
    const organized = await arrangeItems(incoming, { includeSupportFiles: false })
    const incomingIds = new Set(incoming.map((item) => item.id))
    const currentWithoutIncoming = itemsRef.current.filter((item) => !incomingIds.has(item.id))
    const merged = ensureSupportFiles([...currentWithoutIncoming, ...organized])
    commitItems(merged)
    setStatus(`${incoming.length} file${incoming.length === 1 ? '' : 's'} added`, 'ok')
  }, [commitItems, resetError, setStatus])

  const clearFiles = useCallback(() => {
    commitItems([])
    resetError()
    setReviewOpen(false)
  }, [commitItems, resetError])

  const addVirtualFolder = useCallback(() => {
    const item = createVirtualFolderItem(emptyFolder)
    if (!item) return
    if (itemsRef.current.some((entry) => cleanPath(entry.path) === cleanPath(item.path))) return
    commitItems([...itemsRef.current, item])
    setEmptyFolder('')
  }, [commitItems, emptyFolder])

  const updateItemPath = useCallback((id, path) => {
    const next = itemsRef.current.map((item) =>
      item.id === id ? { ...item, path: cleanPath(path), manualPath: true } : item,
    )
    commitItems(next)
  }, [commitItems])

  const removeItem = useCallback((id) => {
    commitItems(itemsRef.current.filter((item) => item.id !== id))
  }, [commitItems])

  const validation = useMemo(() => validateItems(items, prefix), [items, prefix])
  const folders = useMemo(() => folderCount(items, prefix), [items, prefix])
  const generatedCount = useMemo(() => items.filter((item) => item.virtual).length, [items])

  useEffect(() => {
    if (!validation.ok && items.length) setReviewOpen(true)
  }, [items.length, validation.ok])

  const consumePicker = useCallback(async (input) => {
    try {
      await consumeNativePicker(input, addFiles, pickerTransaction.current)
    } catch (problem) {
      showError(problem)
    }
  }, [addFiles, showError])

  const openFiles = useCallback(() => {
    if (fileInputRef.current) openNativePicker(fileInputRef.current, pickerTransaction.current)
  }, [])

  const openFolder = useCallback(() => {
    if (folderInputRef.current) openNativePicker(folderInputRef.current, pickerTransaction.current)
  }, [])

  useEffect(() => {
    const retry = () => retryPendingPicker(pickerTransaction.current, consumePicker)
    const visibility = () => { if (!document.hidden) retry() }
    window.addEventListener('focus', retry)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pageshow', retry)
    return () => {
      window.removeEventListener('focus', retry)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pageshow', retry)
    }
  }, [consumePicker])

  const handleDrop = useCallback(async (event) => {
    event.preventDefault()
    setDragging(false)
    try {
      const records = await readDroppedEntries(event.dataTransfer)
      const files = records.map((record) => record.file)
      const lookup = new Map(records.map((record) => [record.file, record.path]))
      await addFiles(files, lookup)
    } catch (problem) {
      showError(problem)
    }
  }, [addFiles, showError])

  const pushAll = useCallback(async () => {
    resetError()
    setBusy(true)
    setLogLines([])
    setProgress({ value: 0, max: Math.max(1, itemsRef.current.length + 6) })
    try {
      await pushAllToGitHub({
        token,
        repoValue: repo,
        branchValue: branch,
        messageValue: message,
        items: itemsRef.current,
        prefix,
        onStatus: setStatus,
        onLog: appendLog,
        onProgress: (value, max) => setProgress({ value, max }),
      })
      saveConnectionSettings(false)
    } catch (problem) {
      console.error('[Crain uploader]', problem)
      showError(problem)
    } finally {
      setBusy(false)
    }
  }, [appendLog, branch, message, prefix, repo, resetError, saveConnectionSettings, setStatus, showError, token])

  useEffect(() => {
    const unhandled = (event) => {
      console.error('[Crain unhandled rejection]', event.reason)
      showError(event.reason || new Error('Unexpected async error.'))
    }
    window.addEventListener('unhandledrejection', unhandled)
    return () => window.removeEventListener('unhandledrejection', unhandled)
  }, [showError])

  return {
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
    items,
    prefix, setPrefix,
    emptyFolder, setEmptyFolder,
    reviewOpen, setReviewOpen,
    dragging, setDragging,
    status,
    statusType,
    error,
    logLines,
    progress,
    busy,
    validation,
    folders,
    generatedCount,
    fileInputRef,
    folderInputRef,
    saveConnectionSettings,
    forgetConnection,
    loadMyRepos,
    selectRepo,
    testRepoAccess,
    addFiles,
    clearFiles,
    addVirtualFolder,
    updateItemPath,
    removeItem,
    consumePicker,
    openFiles,
    openFolder,
    handleDrop,
    pushAll,
  }
}
