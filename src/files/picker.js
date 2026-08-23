import { cleanPath } from './folders.js'

const pickerBatches = new WeakMap()

export function openNativePicker(input, transaction) {
  try { input.value = '' } catch {}
  transaction.pending = input
  transaction.serial += 1
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
  } catch {}
  input.click()
}

export async function consumeNativePicker(input, addFiles, transaction) {
  await Promise.resolve()
  let files = Array.from(input.files || [])
  if (!files.length) {
    await new Promise((resolve) => setTimeout(resolve, 40))
    files = Array.from(input.files || [])
  }
  if (!files.length) return false

  const batchKey = files
    .map((file) => `${file.name}:${file.size}:${file.lastModified}:${file.webkitRelativePath || ''}`)
    .join('|')
  if (pickerBatches.get(input) === batchKey) return false
  pickerBatches.set(input, batchKey)

  try { input.value = '' } catch {}
  await addFiles(files)
  if (transaction.pending === input) transaction.pending = null

  setTimeout(() => {
    if (pickerBatches.get(input) === batchKey) pickerBatches.delete(input)
  }, 250)
  return true
}

export function retryPendingPicker(transaction, consume) {
  const input = transaction.pending
  if (!input) return
  const serial = transaction.serial
  setTimeout(() => {
    if (transaction.pending === input && serial === transaction.serial) consume(input)
  }, 70)
  setTimeout(() => {
    if (transaction.pending === input && serial === transaction.serial) consume(input)
  }, 220)
}

export async function readDroppedEntries(dataTransfer) {
  const transferItems = [...(dataTransfer?.items || [])]
  const records = []

  async function walk(entry, prefix = '') {
    if (!entry) return
    if (entry.isFile) {
      await new Promise((resolve, reject) => {
        entry.file((file) => {
          records.push({ file, path: cleanPath(prefix + file.name) })
          resolve()
        }, reject)
      })
      return
    }
    if (entry.isDirectory) {
      const reader = entry.createReader()
      const children = []
      while (true) {
        const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject))
        if (!batch.length) break
        children.push(...batch)
      }
      for (const child of children) await walk(child, `${prefix}${entry.name}/`)
    }
  }

  const entries = transferItems.map((item) => item.webkitGetAsEntry?.()).filter(Boolean)
  if (entries.length) {
    for (const entry of entries) await walk(entry, '')
    return records
  }

  return [...(dataTransfer?.files || [])].map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }))
}
