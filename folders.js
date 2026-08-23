export function cleanPath(path) {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/')
}

export function sourceInfo(file, suppliedRelativePath = '') {
  const raw = cleanPath(suppliedRelativePath || file.webkitRelativePath || '')
  if (raw && raw !== file.name) {
    const parts = raw.split('/')
    const selectionRoot = parts.length > 1 ? parts[0] : ''
    const relativeInsideRoot = parts.length > 1 ? cleanPath(parts.slice(1).join('/')) : raw
    return {
      sourcePath: raw,
      selectionRoot,
      relativePath: relativeInsideRoot || file.name,
      hasFolder: true,
    }
  }
  return {
    sourcePath: file.name,
    selectionRoot: '',
    relativePath: file.name,
    hasFolder: false,
  }
}

export function finalPath(item, prefix = '', throwOnEmpty = true) {
  const root = cleanPath(prefix)
  const path = cleanPath(item.path)
  if (!path && throwOnEmpty) {
    throw new Error(`"${item.file.name}" has an empty destination path.`)
  }
  if (!path) return ''
  return root ? `${root}/${path}` : path
}

export function encodeRepoPath(path) {
  return cleanPath(path).split('/').map(encodeURIComponent).join('/')
}

export function folderCount(items, prefix = '') {
  const folders = new Set()
  for (const item of items) {
    const path = finalPath(item, prefix, false)
    const parts = path.split('/').filter(Boolean)
    if (parts.length > 1) folders.add(parts.slice(0, -1).join('/'))
  }
  return folders.size
}

export function prettySize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
