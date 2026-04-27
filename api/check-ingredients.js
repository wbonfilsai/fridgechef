import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { recipeName, recipeCuisine, recipeIngredients, userIngredients, people, cookingTime, dietary } = req.body
  if (!recipeName || typeof recipeName !== 'string' || !recipeCuisine) {
    return res.status(400).json({ error: 'Données invalides.' })
  }

  const userIngList = Array.isArray(userIngredients) && userIngredients.length
    ? userIngredients.map(i => `- ${i}`).join('\n')
    : '(aucun)'

  const recipeIngList = Array.isArray(recipeIngredients) && recipeIngredients.length
    ? recipeIngredients.map(i => `- ${i.name}${i.qty ? ` (${i.qty})` : ''}`).join('\n')
    : null

  const timeLabels = {
    express: '15 minutes',
    rapide: '30 minutes',
    normal: '45 minutes',
    leisurely: '1 heure ou plus',
  }
  const timeLabel = timeLabels[cookingTime] || '45 minutes'
  const dietLine = dietary && typeof dietary === 'string' && dietary.length < 200
    ? `\nContraintes alimentaires: ${dietary}.` : ''

  const prompt = recipeIngList
    ? `Tu compares deux listes d'ingrédients avec une logique BINAIRE et STRICTE.

RECETTE : "${recipeName}" (${recipeCuisine}), ${people} personnes.${dietLine}

INGRÉDIENTS NÉCESSAIRES POUR LA RECETTE (liste de référence — n'en invente pas d'autres, n'en retire pas) :
${recipeIngList}

INGRÉDIENTS DISPONIBLES DE L'UTILISATEUR (sa seule source de vérité) :
${userIngList}

TÂCHE : Pour CHAQUE ingrédient de la liste de la recette, vérifie s'il est EXPLICITEMENT présent dans la liste utilisateur.

RÈGLES STRICTES — AUCUNE EXCEPTION :
1. Un ingrédient est "disponible" UNIQUEMENT s'il apparaît textuellement dans la liste utilisateur, ou comme variante évidente du même produit (ex: "tomate" ↔ "tomates", "ail" ↔ "gousse d'ail", "concombre" ↔ "concombres"). Singulier/pluriel et formulations équivalentes du MÊME ingrédient comptent.
2. Une famille n'est PAS un substitut : "salade" ≠ "roquette", "huile" ≠ "huile de sésame", "sauce soja" ≠ "nuoc-mâm".
3. Si l'ingrédient n'est PAS dans la liste utilisateur → il est MANQUANT. Toujours.
4. NE JAMAIS supposer que l'utilisateur a un ingrédient courant non listé (farine, œufs, lait, beurre, riz, oignon, ail, citron, herbes, épices, sauces, etc. — TOUS doivent être listés).
5. Seules exceptions universelles (basiques de placard, jamais à lister comme manquants) : sel, poivre, eau.

Pour CHAQUE ingrédient manquant, retourne un objet JSON avec :
- name : nom français court de l'ingrédient
- emoji : emoji approprié
- note : courte indication (substitution possible ou rôle dans la recette)
- recipe_quantity : quantité utilisée dans la recette (copie de la liste recette si fournie)
- purchase_unit : unité d'achat réaliste en épicerie (ex: "1 sachet (200g)", "1 bouteille (500ml)", "1 botte", "1 tête")
- purchase_qty : nombre entier d'unités à acheter (généralement 1)
- importance : "essentiel" si la recette ne fonctionne pas sans, "recommandé" si améliore beaucoup, "optionnel" si bonus

Retourne UNIQUEMENT un JSON valide, rien d'autre, classé par importance (essentiel d'abord) :
[{"name":"Sauce nuoc-mâm","emoji":"🥢","note":"base de la sauce thaïe","recipe_quantity":"3 c. à soupe","purchase_unit":"1 bouteille (250ml)","purchase_qty":1,"importance":"essentiel"}]

Si TOUS les ingrédients de la recette sont effectivement présents dans la liste utilisateur (cas rare), retourne : []`
    : `Tu es un assistant qui compare deux listes d'ingrédients de façon STRICTE.

RECETTE : "${recipeName}" (${recipeCuisine}), ${people} personnes, ${timeLabel}.${dietLine}

INGRÉDIENTS DISPONIBLES DE L'UTILISATEUR :
${userIngList}

ÉTAPE 1 : Détermine la liste COMPLÈTE des ingrédients nécessaires pour préparer "${recipeName}" pour ${people} personnes, avec les quantités exactes.

ÉTAPE 2 : Compare CHAQUE ingrédient nécessaire avec la liste de l'utilisateur.

RÈGLES STRICTES :
- Si l'utilisateur n'a PAS un ingrédient dans sa liste → il est MANQUANT
- Si l'utilisateur a l'ingrédient mais en quantité insuffisante → il est MANQUANT
- Ne JAMAIS assumer qu'un ingrédient est disponible s'il n'est pas EXPLICITEMENT listé par l'utilisateur
- Seules exceptions : sel, poivre, eau (jamais à lister comme manquants)
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
      max_tokens: 1000,
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
