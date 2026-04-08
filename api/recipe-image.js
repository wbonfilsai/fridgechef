const CUISINE_MAP = {
  'créole': 'caribbean creole', 'creole': 'caribbean creole',
  'française': 'french', 'french': 'french',
  'italienne': 'italian', 'italian': 'italian',
  'japonaise': 'japanese', 'japanese': 'japanese',
  'coréenne': 'korean', 'korean': 'korean',
  'vietnamienne': 'vietnamese', 'vietnamese': 'vietnamese',
  'mexicaine': 'mexican', 'mexican': 'mexican',
  'indienne': 'indian', 'indian': 'indian',
  'chinoise': 'chinese', 'chinese': 'chinese',
  'thaïlandaise': 'thai', 'thai': 'thai',
  'marocaine': 'moroccan', 'moroccan': 'moroccan',
  'libanaise': 'lebanese', 'lebanese': 'lebanese',
  'éthiopienne': 'ethiopian', 'ethiopian': 'ethiopian',
  'canadienne': 'canadian', 'canadian': 'canadian',
  'méditerranéenne': 'mediterranean', 'mediterranean': 'mediterranean',
  'grecque': 'greek', 'greek': 'greek',
  'espagnole': 'spanish', 'spanish': 'spanish',
  'américaine': 'american', 'american': 'american',
}

const STOP_WORDS = new Set([
  'aux', 'avec', 'et', 'de', 'la', 'le', 'les', 'du', 'des', 'un', 'une',
  'au', 'en', 'à', 'sur', 'dans', 'pour', 'par', 'sans', 'ou', 'son', 'sa',
  'the', 'a', 'an', 'of', 'with', 'and', 'in', 'on', 'for', 'its',
])

function extractKeywords(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 4)
}

async function searchUnsplash(query, apiKey) {
  const params = new URLSearchParams({
    query,
    per_page: '10',
    orientation: 'landscape',
    content_filter: 'high',
    client_id: apiKey,
  })
  const response = await fetch(`https://api.unsplash.com/search/photos?${params}`)
  if (!response.ok) return null
  const data = await response.json()
  if (!data.results?.length) return null
  // Pick the photo with the most likes
  const best = data.results.sort((a, b) => (b.likes || 0) - (a.likes || 0))[0]
  return best?.urls?.regular || null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, cuisine, ingredients } = req.query
  if (!title || typeof title !== 'string') {
    return res.json({ url: null })
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return res.json({ url: null })
  }

  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  const keywords = extractKeywords(title)
  const cuisineEN = CUISINE_MAP[(cuisine || '').toLowerCase()] || ''
  const ingList = ingredients ? ingredients.split(',').slice(0, 2).map(s => s.trim()).filter(Boolean) : []

  try {
    // Attempt 1: keywords + ingredients + cuisine + food
    let url = await searchUnsplash(
      [...keywords, ...ingList, cuisineEN, 'food dish plated'].filter(Boolean).join(' '),
      apiKey
    )

    // Attempt 2: keywords + cuisine + food
    if (!url) {
      url = await searchUnsplash(
        [...keywords, cuisineEN, 'food dish'].filter(Boolean).join(' '),
        apiKey
      )
    }

    // Attempt 3: cuisine + food
    if (!url && cuisineEN) {
      url = await searchUnsplash(`${cuisineEN} food dish recipe`, apiKey)
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.json({ url })
  } catch {
    res.json({ url: null })
  }
}
