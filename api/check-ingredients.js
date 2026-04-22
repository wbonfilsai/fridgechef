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
    ? `\nContraintes alimentaires: ${dietary}.` : ''

  const prompt = `Tu es un assistant qui compare deux listes d'ingrédients de façon STRICTE.

RECETTE : "${recipeName}" (${recipeCuisine}), ${people} personnes, ${timeLabel}.${dietLine}

INGRÉDIENTS DISPONIBLES DE L'UTILISATEUR :
${userIngList}

ÉTAPE 1 : Détermine la liste COMPLÈTE des ingrédients nécessaires pour préparer "${recipeName}" pour ${people} personnes, avec les quantités exactes.

ÉTAPE 2 : Compare CHAQUE ingrédient nécessaire avec la liste de l'utilisateur.

RÈGLES STRICTES :
- Si l'utilisateur n'a PAS un ingrédient dans sa liste → il est MANQUANT
- Si l'utilisateur a l'ingrédient mais en quantité insuffisante → il est MANQUANT
- Ne JAMAIS assumer qu'un ingrédient est disponible s'il n'est pas EXPLICITEMENT listé par l'utilisateur
- Le sel, poivre, huile d'olive, eau, sucre sont considérés comme basiques (ne pas lister comme manquants)
- TOUS les autres ingrédients doivent être vérifiés strictement

Retourne UNIQUEMENT un JSON valide, rien d'autre :
[{"name":"Nom","emoji":"🧅","note":"quantité nécessaire","recipe_quantity":"300g","purchase_unit":"1 sac (1kg)","purchase_qty":1,"importance":"essentiel"}]

importance : "essentiel" si la recette ne fonctionne pas sans, "recommandé" si ça améliore beaucoup, "optionnel" si c'est un bonus.
Classe par importance : essentiel d'abord, optionnel en dernier.
Si RIEN ne manque (très rare), retourne : []`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
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
