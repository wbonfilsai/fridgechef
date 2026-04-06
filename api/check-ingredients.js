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
Pour chaque ingrédient, indique :
- name : nom de l'ingrédient
- emoji : un emoji représentatif
- note : quantité nécessaire pour la recette (ex: "3 gousses", "300g")
- recipe_quantity : quantité nécessaire pour la recette (ex: "300g", "3 gousses")
- purchase_unit : unité d'achat réaliste en épicerie (ex: "sac 1kg", "boîte 400ml", "filet de 4", "bloc 250g", "bouteille 1L", "pot 200g")
- purchase_qty : nombre d'unités à acheter (presque toujours 1)

Format strict :
[{"name":"Farine","emoji":"🌾","note":"300g","recipe_quantity":"300g","purchase_unit":"sac 1kg","purchase_qty":1}]`

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
