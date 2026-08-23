import { cleanPath, sourceInfo } from './folders.js'

export const nameMap = {
  'styles.css': 'styles.css',
  'manifest.webmanifest': 'manifest.webmanifest',
  'README.md': 'README.md',
  'app.js': 'app.js',
  'index.html': 'index.html',
  'SECURITY.md': 'SECURITY.md',
  'sw.js': 'sw.js',
  '404.html': '404.html',
  '.nojekyll': '.nojekyll',
  '.gitignore': '.gitignore',
  'icon-192.png': 'icons/icon-192.png',
  'icon-512.png': 'icons/icon-512.png',
  'apple-touch-icon.png': 'icons/apple-touch-icon.png',
  'pages.yml': '.github/workflows/pages.yml',
  'wrangler.toml': 'worker/wrangler.toml',
  '.dev.vars.example': 'worker/.dev.vars.example',
}

export async function classifyFile(file, suppliedRelativePath = '') {
  const info = sourceInfo(file, suppliedRelativePath)

  // Real folder information always wins. Same filenames in different folders
  // remain different files because their complete paths remain different.
  if (info.hasFolder && info.relativePath) return info.relativePath

  if (nameMap[file.name]) return nameMap[file.name]

  if (file.name === 'package.json') {
    try {
      const text = await file.text()
      return /arena-pocket-ide-proxy|wrangler|cloudflare/i.test(text)
        ? 'worker/package.json'
        : 'package.json'
    } catch {
      return 'package.json'
    }
  }

  if (file.name === 'index.js') {
    try {
      const text = await file.text()
      return /ARENA_DEFAULT_BASE|api\.preview\.arena\.ai|ARENA_API_KEY|\/v1\/messages/.test(text)
        ? 'worker/src/index.js'
        : 'index.js'
    } catch {
      return 'index.js'
    }
  }

  return file.name
}

export function createInitialItem(file, suppliedRelativePath = '') {
  const info = sourceInfo(file, suppliedRelativePath)
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    key: `${info.sourcePath}-${file.size}-${file.lastModified}`,
    file,
    path: info.hasFolder && info.relativePath ? info.relativePath : file.name,
    virtual: false,
    manualPath: false,
    sourcePath: info.sourcePath,
    sourceRelativePath: info.relativePath,
    selectionRoot: info.selectionRoot,
  }
}

export function createVirtualFolderItem(folder) {
  const clean = cleanPath(folder)
  if (!clean) return null
  const path = `${clean}/.gitkeep`
  return {
    id: crypto.randomUUID?.() || `virtual-${Date.now()}-${Math.random()}`,
    key: `virtual-${path}-${Date.now()}`,
    virtual: true,
    manualPath: true,
    path,
    sourcePath: `(generated) ${path}`,
    sourceRelativePath: path,
    selectionRoot: '',
    file: new File([''], '.gitkeep', { type: 'text/plain' }),
  }
}

export function createBuiltInItem(name, path, content = '') {
  return {
    id: `builtin-${path}`,
    key: `builtin-${path}`,
    virtual: true,
    manualPath: false,
    path,
    sourcePath: `(generated) ${path}`,
    sourceRelativePath: path,
    selectionRoot: '',
    file: new File([content], name, { type: 'text/plain' }),
  }
}

export async function arrangeItems(items, { includeSupportFiles = true } = {}) {
  const arranged = await Promise.all(
    items.map(async (item) => {
      if (item.virtual || item.manualPath) return item
      const supplied = item.sourcePath && item.sourcePath !== item.file.name ? item.sourcePath : ''
      return { ...item, path: await classifyFile(item.file, supplied) }
    }),
  )

  if (!includeSupportFiles) return arranged

  const byPath = new Set(arranged.map((item) => cleanPath(item.path)))
  if (!byPath.has('.gitignore')) {
    arranged.push(
      createBuiltInItem(
        '.gitignore',
        '.gitignore',
        `node_modules/\n.DS_Store\n.env\n.dev.vars\n*.log\n`,
      ),
    )
    byPath.add('.gitignore')
  }

  const needsNoJekyll = arranged.some(
    (item) => /\.html?$/i.test(item.file?.name || '') || item.file?.name === 'manifest.webmanifest',
  )
  if (needsNoJekyll && !byPath.has('.nojekyll')) {
    arranged.push(createBuiltInItem('.nojekyll', '.nojekyll', ''))
  }

  return arranged
}

export function ensureSupportFiles(items) {
  const result = [...items]
  const byPath = new Set(result.map((item) => cleanPath(item.path)))
  if (!byPath.has('.gitignore')) {
    result.push(createBuiltInItem('.gitignore', '.gitignore', `node_modules/\n.DS_Store\n.env\n.dev.vars\n*.log\n`))
    byPath.add('.gitignore')
  }
  const needsNoJekyll = result.some(
    (item) => /\.html?$/i.test(item.file?.name || '') || item.file?.name === 'manifest.webmanifest',
  )
  if (needsNoJekyll && !byPath.has('.nojekyll')) result.push(createBuiltInItem('.nojekyll', '.nojekyll', ''))
  return result
}
