import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured.' })
  }

  const { imageBase64, mediaType, language } = req.body
  const lang = language === 'fr' ? 'fr' : 'en'
  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: 'Image data required.' })
  }

  console.log('[scan-fridge] Image reçue - taille base64:', imageBase64?.length)
  console.log('[scan-fridge] Media type:', mediaType, '| Language:', lang, '| raw param:', language)

  const prompt = lang === 'fr'
    ? `LANGUE DE SORTIE : FRANÇAIS UNIQUEMENT. Tous les noms d'ingrédients que tu retournes DOIVENT être en français standard (ex: "poulet", "tomates", "fromage râpé", "concombre"). Ne traduis JAMAIS en anglais.

Analyse cette photo et liste tous les ingrédients visibles.

Règles :
- Un seul aliment, un morceau, une tranche = valide
- Peu importe le contexte (frigo, table, main, assiette)
- Si tu vois quelque chose qui ressemble à un aliment, liste-le
- Inclus les condiments, épices, sauces visibles
- Maximum 20 ingrédients
- Sois généreux dans ta détection
- Noms en français : "concombre" pas "cucumber", "tomate" pas "tomato", "ail" pas "garlic"

Retourne UNIQUEMENT ce JSON valide, rien d'autre, avec les noms en français :
{ "ingredients": ["concombre", "tomate", "ail"] }

Si aucun aliment visible :
{ "ingredients": [] }`
    : `OUTPUT LANGUAGE: ENGLISH ONLY. All ingredient names you return MUST be in standard English (e.g. "chicken", "tomatoes", "shredded cheese", "cucumber"). Never translate to French.

Analyze this photo and list all visible ingredients.

Rules:
- A single item, a piece, a slice = valid
- Any context is fine (fridge, table, hand, plate)
- If something looks like food, list it
- Include visible condiments, spices, sauces
- Maximum 20 ingredients
- Be generous in detection
- English names: "cucumber" not "concombre", "tomato" not "tomate", "garlic" not "ail"

Return ONLY this valid JSON, nothing else, with English names:
{ "ingredients": ["cucumber", "tomato", "garlic"] }

If no food visible:
{ "ingredients": [] }`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
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
            text: prompt,
          },
        ],
      }],
    })

    console.log('[scan-fridge] Réponse Claude brute:', JSON.stringify(response.content))

    const text = response.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) {
      console.log('[scan-fridge] Aucun JSON trouvé dans la réponse')
      return res.json({ ingredients: [], debug: text })
    }
    const parsed = JSON.parse(match[0])
    console.log('[scan-fridge] Ingrédients détectés:', parsed.ingredients)
    res.json({
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      debug: text,
    })
  } catch (err) {
    console.error('[scan-fridge] Error:', err.message, err.status)
    const msg = err.status === 429 ? 'Rate limit reached.' : err.message || 'Server error.'
    res.status(500).json({ error: msg })
  }
}
