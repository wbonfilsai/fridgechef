import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { recipeName, recipeCuisine, userIngredients, people, cookingTime } = req.body
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

  const prompt = `Tu es un chef cuisinier expert. Pour la recette "${recipeName}" (cuisine ${recipeCuisine}), identifie les ingrédients complémentaires courants nécessaires que l'utilisateur n'a pas encore listés.

L'utilisateur a déjà :
${userIngList}

Pour ${people} personne${people > 1 ? 's' : ''}. Temps total disponible : ${timeLabel}.

Réponds UNIQUEMENT avec un tableau JSON des ingrédients complémentaires typiquement nécessaires (maximum 8). Ne liste JAMAIS ce que l'utilisateur a déjà. Format strict :

[
  { "name": "Ail", "emoji": "🧄", "note": "3 gousses" },
  { "name": "Sauce soja", "emoji": "🫙", "note": "3 c. à soupe" }
]

Si aucun ingrédient complémentaire n'est nécessaire, réponds : []
Réponds UNIQUEMENT avec ce JSON, rien d'autre.`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
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
