import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { recipeName, recipeCuisine, userIngredients, people, cookingTime, dietary } = req.body
  if (!recipeName || typeof recipeName !== 'string' || !recipeCuisine) {
    return res.status(400).json({ error: 'Données invalides.' })
  }

  const userIngList = Array.isArray(userIngredients)
    ? userIngredients.map(i => `- ${i}`).join('\n')
    : '(non précisés)'

  const timeLabels = {
    express: '15 minutes',
    rapide: '30 minutes',
    normal: '45 minutes',
    leisurely: '1 heure ou plus',
  }
  const timeLabel = timeLabels[cookingTime] || '45 minutes'
  const dietLine = dietary && typeof dietary === 'string' && dietary.length < 200
    ? `\nContraintes: ${dietary}.` : ''

  const prompt = `Recette "${recipeName}" (${recipeCuisine}), ${people} pers., ${timeLabel}.${dietLine}
Ingrédients déjà disponibles :
${userIngList}

Réponds UNIQUEMENT avec un JSON — max 6 ingrédients complémentaires manquants. Si rien ne manque : [].
[{"name":"Ail","emoji":"🧄","note":"3 gousses"}]`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return res.json({ ingredients: [] })
    const ingredients = JSON.parse(match[0])
    res.json({ ingredients: Array.isArray(ingredients) ? ingredients : [] })
  } catch (err) {
    const msg =
      err.status === 401 ? 'Clé API invalide.' :
      err.status === 429 ? 'Limite de requêtes atteinte.' :
      err.message || 'Erreur serveur.'
    res.status(500).json({ error: msg })
  }
}
