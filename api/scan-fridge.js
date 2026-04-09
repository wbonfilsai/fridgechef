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
            text: `Tu es un expert en identification d'aliments. Analyse cette image avec attention et identifie TOUS les aliments visibles, même partiellement.

Règles importantes :
- Un seul aliment, un morceau, une tranche = valide
- Peu importe le contexte (frigo, table, main, assiette)
- Si tu vois quelque chose qui ressemble à un aliment, liste-le
- Noms simples en français (ex: concombre, pas 'morceau de concombre frais')
- Inclus les condiments, épices, sauces visibles
- Maximum 20 ingrédients
- Sois généreux dans ta détection, mieux vaut détecter trop que pas assez

Retourne UNIQUEMENT ce JSON valide, rien d'autre :
{ "ingredients": ["concombre", "tomate", "ail"] }

Si vraiment aucun aliment n'est visible (image floue, objet non-alimentaire) :
{ "ingredients": [] }`,
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
