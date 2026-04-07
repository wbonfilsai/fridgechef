import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 300 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { people, dietaryFilters, lang } = req.body
  if (!people || typeof people !== 'number' || people < 1 || people > 20) {
    return res.status(400).json({ error: 'Paramètres invalides.' })
  }

  const safeDietary = Array.isArray(dietaryFilters)
    ? dietaryFilters.filter(f => typeof f === 'string' && f.length < 50).slice(0, 7)
    : []

  const isEn       = lang === 'en'
  const dietText   = safeDietary.length ? `Dietary restrictions: ${safeDietary.join(', ')}.` : ''
  const langNote   = isEn ? '\nRespond entirely in English.' : ''
  const days       = isEn
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    : ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const breakfast  = isEn ? 'Breakfast'       : 'Petit-déjeuner'
  const lunch      = isEn ? 'Lunch'           : 'Déjeuner'
  const dinner     = isEn ? 'Dinner'          : 'Dîner'
  const snack      = isEn ? 'Snack'           : 'Collation'
  const shopping   = isEn ? 'Shopping List'   : 'Liste de courses'

  const prompt = `Create a balanced, varied 7-day meal plan for ${people} person(s). ${dietText}
Format exactly as follows for each of the 7 days:
## 📅 ${days[0]}
- **${breakfast}:** [meal with brief description]
- **${lunch}:** [meal with brief description]
- **${dinner}:** [meal with brief description]
- **${snack}:** [snack]

Then continue for ${days.slice(1).join(', ')}.
After all 7 days, add:
### 🛒 ${shopping}
List 15-20 key ingredients needed for the week.${langNote}`

  // Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  res.on('close', () => stream.abort())
  stream.on('text', (delta) => send({ text: delta }))

  try {
    await stream.finalMessage()
    res.write('data: [DONE]\n\n')
  } catch (err) {
    const isAbort = err.name === 'AbortError'
                 || err.name === 'APIUserAbortError'
                 || err.message?.toLowerCase().includes('abort')
    if (!isAbort) {
      const msg =
        err.status === 401 ? 'Clé API invalide (401).' :
        err.status === 429 ? 'Limite de requêtes atteinte (429).' :
        err.message || 'Erreur serveur.'
      send({ error: msg })
    }
  } finally {
    res.end()
  }
}
