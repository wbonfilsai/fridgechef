export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = req.query.query
  if (!query || typeof query !== 'string') {
    return res.json({ url: null })
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return res.json({ url: null })
  }

  try {
    const params = new URLSearchParams({
      query: `${query} food dish`,
      per_page: '1',
      orientation: 'landscape',
      client_id: process.env.UNSPLASH_ACCESS_KEY,
    })
    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`)
    if (!response.ok) return res.json({ url: null })
    const data = await response.json()
    const url = data.results?.[0]?.urls?.regular || null
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.json({ url })
  } catch {
    res.json({ url: null })
  }
}
