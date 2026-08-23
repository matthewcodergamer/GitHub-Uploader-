export async function githubRequest(token, path, options = {}) {
  if (!token?.trim()) throw new Error('Enter a GitHub token first.')

  let response
  try {
    response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.trim()}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {}),
      },
    })
  } catch (error) {
    throw new Error(
      `Network request to GitHub failed (${error?.message || 'Load failed'}). ` +
      'Open Crain from an HTTPS/static host such as GitHub Pages rather than iPhone Files/Quick Look.',
    )
  }

  const text = await response.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { message: text } }

  if (!response.ok) {
    const error = new Error(data.message || `GitHub API error ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}
