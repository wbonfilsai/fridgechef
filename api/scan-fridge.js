import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured.' })
  }

  const { imageBase64, mediaType } = req.body
  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: 'Image data required.' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analyse cette image et identifie tous les aliments et ingrédients visibles.
Retourne UNIQUEMENT un JSON valide avec ce format :
{ "ingredients": ["poulet", "tomates", "ail", "oignons"] }
- Noms en français
- Noms simples et génériques (pas de marques)
- Maximum 20 ingrédients
- Si aucun aliment visible : { "ingredients": [] }`,
          },
        ],
      }],
    })

    const text = response.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return res.json({ ingredients: [] })
    const parsed = JSON.parse(match[0])
    res.json({ ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [] })
  } catch (err) {
    const msg = err.status === 429 ? 'Rate limit reached.' : err.message || 'Server error.'
    res.status(500).json({ error: msg })
  }
}
