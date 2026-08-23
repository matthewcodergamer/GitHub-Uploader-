const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.('retry-after'))
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(10000, retryAfter * 1000)
  return Math.min(5000, 450 * (2 ** attempt))
}

export async function githubRequest(token, path, options = {}) {
  if (!token?.trim()) throw new Error('Enter a GitHub token first.')

  const url = `https://api.github.com${path}`
  const MAX_ATTEMPTS = 3
  let lastNetworkError = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token.trim()}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(options.headers || {}),
        },
      })
    } catch (error) {
      lastNetworkError = error
      if (attempt < MAX_ATTEMPTS - 1) {
        await wait(450 * (2 ** attempt))
        continue
      }
      throw new Error(
        `Network request to GitHub failed (${error?.message || 'Load failed'}). ` +
        'Check your connection and open Crain from its HTTPS GitHub Pages site.',
      )
    }

    const text = await response.text()
    let data = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { message: text } }

    if (response.ok) return data

    const retryable = RETRYABLE_STATUS.has(response.status)
    if (retryable && attempt < MAX_ATTEMPTS - 1) {
      await wait(retryDelay(response, attempt))
      continue
    }

    const rateRemaining = response.headers.get('x-ratelimit-remaining')
    const resetAt = Number(response.headers.get('x-ratelimit-reset'))
    let detail = data.message || `GitHub API error ${response.status}`
    if (response.status === 403 && rateRemaining === '0' && Number.isFinite(resetAt)) {
      const when = new Date(resetAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      detail += ` GitHub's API rate limit resets around ${when}.`
    }

    const error = new Error(detail)
    error.status = response.status
    error.data = data
    throw error
  }

  throw new Error(`GitHub request failed${lastNetworkError ? ` (${lastNetworkError.message})` : ''}.`)
}
