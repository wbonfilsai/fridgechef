const CUISINE_CONTEXT = {
  créole: 'caribbean creole', creole: 'caribbean creole',
  japonaise: 'japanese', japanese: 'japanese',
  coréenne: 'korean', korean: 'korean',
  vietnamienne: 'vietnamese', vietnamese: 'vietnamese',
  éthiopienne: 'ethiopian african', ethiopian: 'ethiopian african',
  mexicaine: 'mexican', mexican: 'mexican',
  indienne: 'indian', indian: 'indian',
  chinoise: 'chinese', chinese: 'chinese',
  thaïlandaise: 'thai', thai: 'thai',
  marocaine: 'moroccan', moroccan: 'moroccan',
  canadienne: 'canadian', canadian: 'canadian',
}

async function searchUnsplash(query, apiKey) {
  const params = new URLSearchParams({
    query,
    per_page: '1',
    orientation: 'landscape',
    client_id: apiKey,
  })
  const response = await fetch(`https://api.unsplash.com/search/photos?${params}`)
  if (!response.ok) return null
  const data = await response.json()
  return data.results?.[0]?.urls?.regular || null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = req.query.query
  const cuisine = (req.query.cuisine || '').toLowerCase()
  if (!query || typeof query !== 'string') {
    return res.json({ url: null })
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return res.json({ url: null })
  }

  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  const cuisineTag = CUISINE_CONTEXT[cuisine] || ''

  try {
    // Try 1: title + cuisine context + food
    let url = await searchUnsplash(`${query} ${cuisineTag} food dish recipe`.trim(), apiKey)

    // Try 2: fallback to cuisine + food
    if (!url && cuisineTag) {
      url = await searchUnsplash(`${cuisineTag} food dish`, apiKey)
    }

    // Try 3: generic food
    if (!url) {
      url = await searchUnsplash('delicious food dish', apiKey)
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.json({ url })
  } catch {
    res.json({ url: null })
  }
}
