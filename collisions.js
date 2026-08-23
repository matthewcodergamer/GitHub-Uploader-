import { cleanPath, finalPath } from './folders.js'

export function pathCounts(items, prefix = '') {
  const counts = new Map()
  for (const item of items) {
    const path = finalPath(item, prefix, false)
    if (!path) continue
    counts.set(path, (counts.get(path) || 0) + 1)
  }
  return counts
}

export function validateItems(items, prefix = '') {
  const counts = pathCounts(items, prefix)
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([path]) => path)
  const empty = items.filter((item) => !cleanPath(item.path))
  return {
    ok: items.length > 0 && duplicates.length === 0 && empty.length === 0,
    duplicates,
    empty,
    counts,
  }
}
