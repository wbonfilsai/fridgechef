import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' })
  }

  const { recipeName, recipeCuisine, recipeIngredients, userIngredients, people, cookingTime, dietary, lang } = req.body
  if (!recipeName || typeof recipeName !== 'string' || !recipeCuisine) {
    return res.status(400).json({ error: 'Données invalides.' })
  }
  const isEn = lang === 'en'
  console.log('[check-ingredients] Language:', lang, '| recipe:', recipeName)

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

  const langDirective = isEn
    ? 'OUTPUT LANGUAGE: ENGLISH. The user-provided ingredients list may be in any language (English, French or mixed) — understand them correctly across languages (e.g. "poulet"=chicken, "tomates"=tomatoes, "ail"=garlic). All "name" and "note" fields you return MUST be in English.'
    : 'LANGUE DE SORTIE : FRANÇAIS. La liste des ingrédients utilisateur peut être dans n\'importe quelle langue (français, anglais ou un mélange) — comprends-les correctement à travers les langues (ex: "chicken"=poulet, "tomatoes"=tomates, "garlic"=ail). Tous les champs "name" et "note" retournés DOIVENT être en français.'

  // Importance values are internal enum codes — always French — used by the frontend UI for filtering/sorting
  const importanceVals = '"essentiel" / "recommandé" / "optionnel"'

  const prompt = recipeIngList
    ? (isEn
      ? `${langDirective}

You compare two ingredient lists with STRICT, BINARY logic.

RECIPE: "${recipeName}" (${recipeCuisine}), ${people} people.${dietLine}

INGREDIENTS REQUIRED FOR THE RECIPE (reference list — do not invent others, do not remove any):
${recipeIngList}

INGREDIENTS THE USER HAS (their only source of truth — may be in any language):
${userIngList}

TASK: For EACH ingredient in the recipe list, check whether it is EXPLICITLY present in the user's list (matching across languages — "chicken" matches "poulet", "garlic" matches "ail").

STRICT RULES — NO EXCEPTIONS:
1. An ingredient counts as "available" ONLY if it appears in the user's list, either textually or as an obvious cross-language equivalent of the SAME product (e.g. "tomato" ↔ "tomate" ↔ "tomatoes" ↔ "tomates"). Singular/plural and direct translations of the SAME ingredient count.
2. A family is NOT a substitute: "lettuce" ≠ "arugula", "oil" ≠ "sesame oil", "soy sauce" ≠ "fish sauce".
3. If the ingredient is NOT in the user's list → it is MISSING. Always.
4. NEVER assume the user has a common ingredient that isn't listed (flour, eggs, milk, butter, rice, onion, garlic, lemon, herbs, spices, sauces, etc. — ALL must be listed).
5. Only universal pantry basics never to flag as missing: salt, pepper, water.

For EACH missing ingredient, return a JSON object with:
- name: short ingredient name in English
- emoji: appropriate emoji
- note: brief note (possible substitution or role in the recipe), in English
- recipe_quantity: quantity used in the recipe (copy from recipe list if provided)
- purchase_unit: realistic grocery purchase unit (e.g. "1 pack (200g)", "1 bottle (500ml)", "1 bunch", "1 head")
- purchase_qty: integer number of units to buy (usually 1)
- importance: one of ${importanceVals} (these are internal enum codes — keep them in French exactly as written, do NOT translate)

Return ONLY a valid JSON array, nothing else, sorted by importance (essentiel first):
[{"name":"Fish sauce","emoji":"🥢","note":"base of the Thai sauce","recipe_quantity":"3 tbsp","purchase_unit":"1 bottle (250ml)","purchase_qty":1,"importance":"essentiel"}]

If ALL recipe ingredients are genuinely present in the user's list (rare), return: []`
      : `${langDirective}

Tu compares deux listes d'ingrédients avec une logique BINAIRE et STRICTE.

RECETTE : "${recipeName}" (${recipeCuisine}), ${people} personnes.${dietLine}

INGRÉDIENTS NÉCESSAIRES POUR LA RECETTE (liste de référence — n'en invente pas d'autres, n'en retire pas) :
${recipeIngList}

INGRÉDIENTS DISPONIBLES DE L'UTILISATEUR (sa seule source de vérité — peuvent être dans n'importe quelle langue) :
${userIngList}

TÂCHE : Pour CHAQUE ingrédient de la liste de la recette, vérifie s'il est EXPLICITEMENT présent dans la liste utilisateur (correspondance inter-langues — "poulet" correspond à "chicken", "ail" correspond à "garlic").

RÈGLES STRICTES — AUCUNE EXCEPTION :
1. Un ingrédient est "disponible" UNIQUEMENT s'il apparaît dans la liste utilisateur, soit textuellement soit comme équivalent évident inter-langues du MÊME produit (ex: "tomate" ↔ "tomates" ↔ "tomato" ↔ "tomatoes"). Singulier/pluriel et traductions directes du MÊME ingrédient comptent.
2. Une famille n'est PAS un substitut : "salade" ≠ "roquette", "huile" ≠ "huile de sésame", "sauce soja" ≠ "nuoc-mâm".
3. Si l'ingrédient n'est PAS dans la liste utilisateur → il est MANQUANT. Toujours.
4. NE JAMAIS supposer que l'utilisateur a un ingrédient courant non listé (farine, œufs, lait, beurre, riz, oignon, ail, citron, herbes, épices, sauces, etc. — TOUS doivent être listés).
5. Seules exceptions universelles (basiques de placard, jamais à lister comme manquants) : sel, poivre, eau.

Pour CHAQUE ingrédient manquant, retourne un objet JSON avec :
- name : nom français court de l'ingrédient
- emoji : emoji approprié
- note : courte indication (substitution possible ou rôle dans la recette), en français
- recipe_quantity : quantité utilisée dans la recette (copie de la liste recette si fournie)
- purchase_unit : unité d'achat réaliste en épicerie (ex: "1 sachet (200g)", "1 bouteille (500ml)", "1 botte", "1 tête")
- purchase_qty : nombre entier d'unités à acheter (généralement 1)
- importance : ${importanceVals}

Retourne UNIQUEMENT un JSON valide, rien d'autre, classé par importance (essentiel d'abord) :
[{"name":"Sauce nuoc-mâm","emoji":"🥢","note":"base de la sauce thaïe","recipe_quantity":"3 c. à soupe","purchase_unit":"1 bouteille (250ml)","purchase_qty":1,"importance":"essentiel"}]

Si TOUS les ingrédients de la recette sont effectivement présents dans la liste utilisateur (cas rare), retourne : []`)
    : (isEn
      ? `${langDirective}

You strictly compare two ingredient lists.

RECIPE: "${recipeName}" (${recipeCuisine}), ${people} people, ${timeLabel}.${dietLine}

INGREDIENTS THE USER HAS (may be in any language):
${userIngList}

STEP 1: Determine the COMPLETE list of ingredients needed to cook "${recipeName}" for ${people} people, with exact quantities.
STEP 2: Compare EACH required ingredient with the user's list (matching across languages).

STRICT RULES:
- If the user does NOT have an ingredient → MISSING
- If the user has it but in insufficient quantity → MISSING
- NEVER assume an ingredient is available if not EXPLICITLY listed
- Only exceptions: salt, pepper, water (never list as missing)

Return ONLY a valid JSON, all "name"/"note" in English. The "importance" field MUST be one of ${importanceVals} (internal enum codes — keep in French exactly):
[{"name":"Name","emoji":"🧅","note":"required quantity","recipe_quantity":"300g","purchase_unit":"1 bag (1kg)","purchase_qty":1,"importance":"essentiel"}]

Sort by importance (essentiel first).
If nothing missing (rare), return: []`
      : `${langDirective}

Tu compares deux listes d'ingrédients de façon STRICTE.

RECETTE : "${recipeName}" (${recipeCuisine}), ${people} personnes, ${timeLabel}.${dietLine}

INGRÉDIENTS DISPONIBLES DE L'UTILISATEUR (peuvent être dans n'importe quelle langue) :
${userIngList}

ÉTAPE 1 : Détermine la liste COMPLÈTE des ingrédients nécessaires pour "${recipeName}" pour ${people} personnes, avec les quantités exactes.
ÉTAPE 2 : Compare CHAQUE ingrédient nécessaire avec la liste de l'utilisateur (correspondance inter-langues).

RÈGLES STRICTES :
- Si l'utilisateur n'a PAS un ingrédient → MANQUANT
- Si quantité insuffisante → MANQUANT
- NE JAMAIS assumer qu'un ingrédient est disponible s'il n'est pas EXPLICITEMENT listé
- Seules exceptions : sel, poivre, eau (jamais à lister comme manquants)

Retourne UNIQUEMENT un JSON valide, tous les "name"/"note" en français :
[{"name":"Nom","emoji":"🧅","note":"quantité nécessaire","recipe_quantity":"300g","purchase_unit":"1 sac (1kg)","purchase_qty":1,"importance":"essentiel"}]

importance : ${importanceVals}. Classe par importance : essentiel d'abord.
Si rien ne manque (rare), retourne : []`)

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
