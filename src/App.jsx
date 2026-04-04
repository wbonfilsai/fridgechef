import { useState, useEffect, useRef } from 'react'
import './App.css'
import { supabase } from './supabase'

/* Claude prompt constraints */
const COOKING_TIME_CONSTRAINTS = {
  express:   '15 minutes maximum au total (préparation + cuisson)',
  rapide:    '30 minutes maximum au total (préparation + cuisson)',
  normal:    '45 minutes maximum au total (préparation + cuisson)',
  leisurely: "plus d'une heure — propose quelque chose d'élaboré si tu le souhaites",
}

const UNITS = ['g', 'kg', 'L', 'mL', 'cl', 'unités', 'tasses', 'c. à soupe', 'c. à café', 'tranches', 'pincées']

const ENGLISH_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

/* ═══════════════════════════════════════════
   TRANSLATIONS
   ═══════════════════════════════════════════ */
const T = {
  fr: {
    cuisines: [
      { id: 'francaise',  label: 'Française',    emoji: '🇫🇷' },
      { id: 'italienne',  label: 'Italienne',    emoji: '🇮🇹' },
      { id: 'japonaise',  label: 'Japonaise',    emoji: '🇯🇵' },
      { id: 'mexicaine',  label: 'Mexicaine',    emoji: '🇲🇽' },
      { id: 'indienne',   label: 'Indienne',     emoji: '🇮🇳' },
      { id: 'chinoise',   label: 'Chinoise',     emoji: '🇨🇳' },
      { id: 'thai',       label: 'Thaïlandaise', emoji: '🇹🇭' },
      { id: 'grecque',    label: 'Grecque',      emoji: '🇬🇷' },
      { id: 'marocaine',  label: 'Marocaine',    emoji: '🇲🇦' },
      { id: 'americaine', label: 'Américaine',   emoji: '🇺🇸' },
      { id: 'espagnole',  label: 'Espagnole',    emoji: '🇪🇸' },
      { id: 'surprise',   label: 'Surprise !',   emoji: '🌍' },
    ],
    cookingTimes: [
      { id: 'express',   label: 'Express',       detail: '15 min', emoji: '⚡' },
      { id: 'rapide',    label: 'Rapide',        detail: '30 min', emoji: '🏃' },
      { id: 'normal',    label: 'Normal',        detail: '45 min', emoji: '🍳' },
      { id: 'leisurely', label: "J'ai le temps", detail: '1h+',    emoji: '😌' },
    ],
    dietOptions: [
      { id: 'vegetarien',  label: 'Végétarien',   emoji: '🥦' },
      { id: 'vegan',       label: 'Végan',         emoji: '🌱' },
      { id: 'sans-gluten', label: 'Sans gluten',   emoji: '🌾' },
      { id: 'keto',        label: 'Keto',           emoji: '🥩' },
      { id: 'sans-lactose',label: 'Sans lactose',  emoji: '🥛' },
      { id: 'halal',       label: 'Halal',          emoji: '☪️' },
      { id: 'casher',      label: 'Casher',         emoji: '✡️' },
    ],
    langToggle: '🇺🇸 EN',
    connect: 'Se connecter',
    heroBadge: '✨ Recettes personnalisées en 30 secondes',
    heroTitle1: 'Vous méritez mieux',
    heroTitle2: "que l'improvisation",
    heroSub: "Entrez ce que vous avez dans votre frigo, choisissez votre style, et découvrez des recettes sur mesure — avec substitutions, macros et conseils de chef.",
    heroCta: 'Commencer à cuisiner',
    stat1Val: '10 000+', stat1Label: 'recettes générées',
    stat2Val: '5 000+', stat2Label: 'utilisateurs actifs',
    stat3Val: '12', stat3Label: 'cuisines mondiales',
    featuresLabel: 'Fonctionnalités',
    featuresTitle: "Tout ce qu'il faut pour cuisiner mieux",
    features: [
      { emoji: '✨', title: '3 propositions en secondes', desc: "L'IA génère 3 idées de recettes variées, adaptées à vos ingrédients, votre style de cuisine et votre temps disponible." },
      { emoji: '🛒', title: 'Ingrédients intelligents', desc: "Cochez les ingrédients complémentaires que vous avez. Les substitutions créatives s'occupent du reste." },
      { emoji: '📊', title: 'Macros nutritionnelles', desc: 'Calories, protéines, glucides et lipides estimés par portion — pour cuisiner sainement sans y penser.' },
    ],
    hiwLabel: 'Comment ça marche',
    hiwTitle: 'Cinq étapes, une recette parfaite',
    hiwSteps: [
      { n: '1', icon: '🥦', label: 'Listez vos ingrédients et le nombre de convives' },
      { n: '2', icon: '🌍', label: 'Choisissez un style de cuisine et votre temps' },
      { n: '3', icon: '🍽️', label: 'Sélectionnez parmi 3 propositions personnalisées' },
      { n: '4', icon: '🛒', label: "Confirmez les ingrédients complémentaires que vous avez" },
      { n: '5', icon: '📖', label: 'La recette complète avec macros et conseils du chef' },
    ],
    ctaTitle: 'Prêt à transformer votre frigo ?',
    ctaSub: 'Gratuit, rapide et intelligent. Des recettes en 30 secondes.',
    ctaBtn: 'Créer mon compte',
    footerText: 'Cuisinez avec passion 🔥 — FridgeChef',
    reviewsLabel: 'Ils nous font confiance',
    reviewsTitle: 'Ce que disent nos utilisateurs',
    galleryLabel: 'Nos utilisateurs cuisinent',
    galleryTitle: 'Community Creations',
    reviews: [
      { name: 'Marie L.', text: "J'ai enfin arrêté de gaspiller mes légumes ! FridgeChef me propose des recettes géniales avec ce que j'ai." },
      { name: 'Thomas B.', text: 'Game changer pour mes repas de la semaine. Plus besoin de réfléchir !' },
      { name: 'Sarah K.', text: 'Mes enfants adorent les recettes, et je gaspille beaucoup moins.' },
      { name: 'Alex M.', text: "Incredible app! I open my fridge, type what's inside, and get amazing meal ideas instantly." },
      { name: 'Lucie D.', text: 'Je cuisine tellement mieux depuis que j\'utilise FridgeChef. Les macros sont super utiles !' },
      { name: 'James R.', text: 'The best cooking app I\'ve used. The recipe suggestions are creative and always delicious.' },
    ],
    loginTab: 'Se connecter', signupTab: "S'inscrire",
    loginTitle: 'Bon retour !', signupTitle: 'Rejoignez CheFridge',
    loginSub: 'Connectez-vous pour accéder à vos recettes',
    signupSub: 'Créez votre compte gratuitement',
    emailLabel: 'Email', passwordLabel: 'Mot de passe',
    passwordHint: 'Minimum 6 caractères', passwordDots: '••••••••',
    loginBtn: 'Se connecter', signupBtn: 'Créer mon compte',
    signupSuccess: 'Compte créé ! Vérifiez votre email pour confirmer votre adresse, puis connectez-vous.',
    authErrors: {
      'Invalid login credentials': 'Email ou mot de passe incorrect.',
      'User already registered': 'Cet email est déjà utilisé.',
      'Password should be at least 6 characters': 'Le mot de passe doit faire au moins 6 caractères.',
      'Email not confirmed': 'Email non confirmé. Vérifiez votre boîte mail.',
    },
    newRecipe: '✨ Nouvelle recette', myRecipes: '❤️ Mes recettes', mealPlanNav: '📅 Plan semaine', logout: 'Déconnexion',
    step1Title: '🥦 Mes ingrédients', step1Sub: "Qu'est-ce qu'il y a dans votre frigo ?",
    ing1Placeholder: 'Ex: poulet, tomates, œufs...', ingPlaceholder: 'Ingrédient...',
    addIngredient: '＋ Ajouter un ingrédient', removeIng: 'Supprimer',
    step2Title: '👥 Nombre de convives', step2Sub: 'Pour combien de personnes cuisinez-vous ?',
    person: 'personne', persons: 'personnes',
    step3Title: '🌍 Style de cuisine',
    step3Sub: 'Sélectionnez vos cuisines préférées, ou laissez-nous vous surprendre !',
    step3SubSelected: (n) => `${n} cuisine${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`,
    step4DietTitle: '🥗 Régime alimentaire',
    step4DietSub: 'Aucune restriction (toutes les recettes)',
    step4DietSubSelected: (n) => `${n} restriction${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`,
    step5Title: '⏱️ Temps disponible', step5Sub: 'Combien de temps avez-vous pour cuisiner ?',
    generateBtn: '✨ Générer mes recettes', stopBtn: '⏹ Arrêter', resetBtn: '🔄 Nouvelles propositions',
    proposalsTitle: '🍽️ Choisissez votre recette',
    proposalsSub: 'Cliquez sur la recette qui vous inspire',
    proposalsSubChange: 'Cliquez sur une autre carte pour changer de recette',
    proposalsLoadingMsg: 'Le chef imagine 3 recettes pour vous...',
    loadMoreBtn: '🔄 Plus de recettes',
    loadingMoreMsg: 'Nouvelles recettes en cours...',
    checkLoadingMsg: 'Analyse des ingrédients nécessaires...',
    recipeLoadingMsg: 'Le chef rédige la recette complète...',
    checkTitle: '🛒 Est-ce que tu as aussi ?',
    checkSub: (name) => `Pour ${name} — coche les ingrédients que tu as`,
    checkEmpty: "✅ Tu as tout ce qu'il faut !",
    checkNote: '💡 Les ingrédients non cochés seront remplacés par des substitutions créatives.',
    checkGenBtn: '👨‍🍳 Générer la recette complète',
    recipeTitle: '📖 Recette complète',
    saveBtn: '❤️ Sauvegarder', savedConfirm: '✅ Sauvegardée !',
    savedPageTitle: '❤️ Mes recettes sauvegardées',
    savedPageSub0: 'Votre collection est vide',
    savedPageSubN: (n) => `${n} recette${n > 1 ? 's' : ''} dans votre collection`,
    savedLoadingMsg: 'Chargement de vos recettes...',
    savedSearchPlaceholder: 'Rechercher par nom ou cuisine...',
    savedEmptyTitle: 'Aucune recette sauvegardée',
    savedEmptyDesc: 'Générez une recette et cliquez sur ❤️ pour la retrouver ici.',
    savedNewRecipeBtn: 'Créer une recette',
    savedDeleteTip: 'Supprimer', savedDeleteConfirm: 'Supprimer ?',
    savedDeleteYes: 'Oui', savedDeleteNo: 'Non',
    savedClose: 'Fermer',
    dietaryTitle: '🥗 Restrictions alimentaires',
    dietarySub: 'Sélectionnez vos restrictions (facultatif)',
    dietaryFilters: [
      { id: 'vegetarian', label: 'Végétarien', emoji: '🥦' },
      { id: 'vegan',      label: 'Vegan',       emoji: '🌱' },
      { id: 'gluten-free', label: 'Sans gluten', emoji: '🌾' },
      { id: 'keto',       label: 'Kéto',         emoji: '🥑' },
      { id: 'lactose-free', label: 'Sans lactose', emoji: '🥛' },
      { id: 'halal',      label: 'Halal',         emoji: '☪️' },
      { id: 'kosher',     label: 'Casher',        emoji: '✡️' },
    ],
    mealPlanNav: '📅 Plan',
    mealPlanTitle: '📅 Plan de repas 7 jours',
    mealPlanSub: 'Générez un plan de repas équilibré pour toute la semaine',
    mealPlanPeopleLabel: 'Pour combien de personnes ?',
    mealPlanGenerateBtn: '✨ Générer mon plan',
    mealPlanStopBtn: '⏹ Arrêter',
    mealPlanResetBtn: '🔄 Nouveau plan',
    mealPlanLoadingMsg: 'Le chef prépare votre semaine...',
    mealPlanDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    dateLocale: 'fr-FR',
    langPrompt: '',
    /* Meal Plan */
    mealPlanTitle: '📅 Plan de la semaine',
    mealPlanSub: 'Votre menu 7 jours généré par l\'IA',
    mealPlanIngredientsLabel: 'Ingrédients disponibles pour la semaine',
    mealPlanIngredientsPlaceholder: 'Ex: poulet, pâtes, tomates, courgettes, œufs, riz...',
    mealPlanGenerateBtn: '🗓️ Générer mon plan',
    mealPlanRegenerateBtn: '🗓️ Régénérer le plan',
    mealPlanGeneratingMsg: 'Le chef planifie votre semaine...',
    mealPlanRegenMealMsg: 'Nouveau repas en cours...',
    mealPlanSaveBtn: '💾 Sauvegarder le plan',
    mealPlanSavedConfirm: '✅ Plan sauvegardé !',
    mealPlanSavedPlans: 'Plans sauvegardés',
    mealPlanLoadBtn: 'Charger',
    mealPlanDeleteBtn: 'Supprimer',
    days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    lunch: '🌞 Déjeuner', dinner: '🌙 Dîner',
    mealPlanEmptyTitle: 'Planifiez votre semaine',
    mealPlanEmptyDesc: 'Entrez vos ingrédients et générez un menu 7 jours personnalisé avec macros.',
    mealPlanLoadingMsg: 'Chargement de vos plans...',
    mealPlanNoSaved: 'Aucun plan sauvegardé',
  },
  en: {
    cuisines: [
      { id: 'francaise',  label: 'French',    emoji: '🇫🇷' },
      { id: 'italienne',  label: 'Italian',   emoji: '🇮🇹' },
      { id: 'japonaise',  label: 'Japanese',  emoji: '🇯🇵' },
      { id: 'mexicaine',  label: 'Mexican',   emoji: '🇲🇽' },
      { id: 'indienne',   label: 'Indian',    emoji: '🇮🇳' },
      { id: 'chinoise',   label: 'Chinese',   emoji: '🇨🇳' },
      { id: 'thai',       label: 'Thai',      emoji: '🇹🇭' },
      { id: 'grecque',    label: 'Greek',     emoji: '🇬🇷' },
      { id: 'marocaine',  label: 'Moroccan',  emoji: '🇲🇦' },
      { id: 'americaine', label: 'American',  emoji: '🇺🇸' },
      { id: 'espagnole',  label: 'Spanish',   emoji: '🇪🇸' },
      { id: 'surprise',   label: 'Surprise!', emoji: '🌍' },
    ],
    cookingTimes: [
      { id: 'express',   label: 'Express',       detail: '15 min', emoji: '⚡' },
      { id: 'rapide',    label: 'Quick',         detail: '30 min', emoji: '🏃' },
      { id: 'normal',    label: 'Normal',        detail: '45 min', emoji: '🍳' },
      { id: 'leisurely', label: "I've got time", detail: '1h+',    emoji: '😌' },
    ],
    dietOptions: [
      { id: 'vegetarien',  label: 'Vegetarian', emoji: '🥦' },
      { id: 'vegan',       label: 'Vegan',       emoji: '🌱' },
      { id: 'sans-gluten', label: 'Gluten-free', emoji: '🌾' },
      { id: 'keto',        label: 'Keto',         emoji: '🥩' },
      { id: 'sans-lactose',label: 'Dairy-free',  emoji: '🥛' },
      { id: 'halal',       label: 'Halal',        emoji: '☪️' },
      { id: 'casher',      label: 'Kosher',       emoji: '✡️' },
    ],
    langToggle: '🇫🇷 FR',
    connect: 'Sign in',
    heroBadge: '✨ Personalized recipes in 30 seconds',
    heroTitle1: 'You deserve better',
    heroTitle2: 'than improvisation',
    heroSub: "Enter what's in your fridge, choose your style, and discover tailor-made recipes — with substitutions, macros and chef tips.",
    heroCta: 'Start cooking',
    stat1Val: '10,000+', stat1Label: 'recipes generated',
    stat2Val: '5,000+', stat2Label: 'active users',
    stat3Val: '12', stat3Label: 'world cuisines',
    featuresLabel: 'Features',
    featuresTitle: 'Everything you need to cook better',
    features: [
      { emoji: '✨', title: '3 proposals in seconds', desc: "AI generates 3 varied recipe ideas, tailored to your ingredients, cuisine style and available time." },
      { emoji: '🛒', title: 'Smart ingredients', desc: "Check off the complementary ingredients you have. Creative substitutions handle the rest." },
      { emoji: '📊', title: 'Nutritional macros', desc: 'Calories, proteins, carbs and fats estimated per serving — for healthy cooking without thinking about it.' },
    ],
    hiwLabel: 'How it works',
    hiwTitle: 'Five steps, one perfect recipe',
    hiwSteps: [
      { n: '1', icon: '🥦', label: 'List your ingredients and number of guests' },
      { n: '2', icon: '🌍', label: 'Choose a cuisine style and your time' },
      { n: '3', icon: '🍽️', label: 'Pick from 3 personalized proposals' },
      { n: '4', icon: '🛒', label: "Confirm the complementary ingredients you have" },
      { n: '5', icon: '📖', label: 'Full recipe with macros and chef tips' },
    ],
    ctaTitle: 'Ready to transform your fridge?',
    ctaSub: 'Free, fast and smart. Recipes in 30 seconds.',
    ctaBtn: 'Create my account',
    footerText: 'Cook with passion 🔥 — FridgeChef',
    reviewsLabel: 'Trusted by home cooks',
    reviewsTitle: 'What our users say',
    galleryLabel: 'Our users are cooking',
    galleryTitle: 'Community Creations',
    reviews: [
      { name: 'Marie L.', text: "I finally stopped wasting my vegetables! FridgeChef suggests amazing recipes with what I already have." },
      { name: 'Thomas B.', text: 'Game changer for my weekly meals. No more thinking about what to cook!' },
      { name: 'Sarah K.', text: 'My kids love the recipes, and I waste much less food now.' },
      { name: 'Alex M.', text: "Incredible app! I open my fridge, type what's inside, and get amazing meal ideas instantly." },
      { name: 'Lucie D.', text: "I cook so much better since I started using FridgeChef. The macro tracking is super helpful!" },
      { name: 'James R.', text: "The best cooking app I've used. The recipe suggestions are creative and always delicious." },
    ],
    loginTab: 'Sign in', signupTab: 'Sign up',
    loginTitle: 'Welcome back!', signupTitle: 'Join CheFridge',
    loginSub: 'Sign in to access your recipes',
    signupSub: 'Create your free account',
    emailLabel: 'Email', passwordLabel: 'Password',
    passwordHint: 'At least 6 characters', passwordDots: '••••••••',
    loginBtn: 'Sign in', signupBtn: 'Create account',
    signupSuccess: 'Account created! Check your email to confirm your address, then sign in.',
    authErrors: {
      'Invalid login credentials': 'Incorrect email or password.',
      'User already registered': 'This email is already in use.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters.',
      'Email not confirmed': 'Email not confirmed. Check your inbox.',
    },
    newRecipe: '✨ New recipe', myRecipes: '❤️ My recipes', mealPlanNav: '📅 Meal Plan', logout: 'Sign out',
    step1Title: '🥦 My ingredients', step1Sub: "What's in your fridge?",
    ing1Placeholder: 'E.g. chicken, tomatoes, eggs...', ingPlaceholder: 'Ingredient...',
    addIngredient: '＋ Add an ingredient', removeIng: 'Remove',
    step2Title: '👥 Number of guests', step2Sub: 'How many people are you cooking for?',
    person: 'person', persons: 'people',
    step3Title: '🌍 Cuisine style',
    step3Sub: 'Select your favourite cuisines, or let us surprise you!',
    step3SubSelected: (n) => `${n} cuisine${n > 1 ? 's' : ''} selected`,
    step4DietTitle: '🥗 Dietary Preferences',
    step4DietSub: 'No restrictions (all recipes)',
    step4DietSubSelected: (n) => `${n} restriction${n > 1 ? 's' : ''} selected`,
    step5Title: '⏱️ Available time', step5Sub: 'How much time do you have to cook?',
    generateBtn: '✨ Generate my recipes', stopBtn: '⏹ Stop', resetBtn: '🔄 New proposals',
    proposalsTitle: '🍽️ Pick your favorite',
    proposalsSub: 'Click on the recipe that inspires you',
    proposalsSubChange: 'Click another card to change recipe',
    proposalsLoadingMsg: 'The chef is imagining 3 recipes for you...',
    loadMoreBtn: '🔄 Load more recipes',
    loadingMoreMsg: 'Loading more recipes...',
    checkLoadingMsg: 'Analysing required ingredients...',
    recipeLoadingMsg: 'The chef is writing the full recipe...',
    checkTitle: '🛒 Do you also have?',
    checkSub: (name) => `For ${name} — check the ingredients you have`,
    checkEmpty: '✅ You have everything you need!',
    checkNote: '💡 Unchecked ingredients will be replaced with creative substitutions.',
    checkGenBtn: '👨‍🍳 Generate full recipe',
    recipeTitle: '📖 Full Recipe',
    saveBtn: '❤️ Save', savedConfirm: '✅ Saved!',
    savedPageTitle: '❤️ My saved recipes',
    savedPageSub0: 'Your collection is empty',
    savedPageSubN: (n) => `${n} recipe${n > 1 ? 's' : ''} in your collection`,
    savedLoadingMsg: 'Loading your recipes...',
    savedSearchPlaceholder: 'Search by name or cuisine...',
    savedEmptyTitle: 'No saved recipes',
    savedEmptyDesc: 'Generate a recipe and click ❤️ to save it here.',
    savedNewRecipeBtn: 'Create a recipe',
    savedDeleteTip: 'Delete', savedDeleteConfirm: 'Delete?',
    savedDeleteYes: 'Yes', savedDeleteNo: 'No',
    savedClose: 'Close',
    dietaryTitle: '🥗 Dietary Restrictions',
    dietarySub: 'Select your restrictions (optional)',
    dietaryFilters: [
      { id: 'vegetarian',  label: 'Vegetarian',    emoji: '🥦' },
      { id: 'vegan',       label: 'Vegan',          emoji: '🌱' },
      { id: 'gluten-free', label: 'Gluten-free',    emoji: '🌾' },
      { id: 'keto',        label: 'Keto',            emoji: '🥑' },
      { id: 'lactose-free', label: 'Lactose-free',  emoji: '🥛' },
      { id: 'halal',       label: 'Halal',           emoji: '☪️' },
      { id: 'kosher',      label: 'Kosher',          emoji: '✡️' },
    ],
    mealPlanNav: '📅 Meal Plan',
    mealPlanTitle: '📅 7-Day Meal Plan',
    mealPlanSub: 'Generate a balanced meal plan for the whole week',
    mealPlanPeopleLabel: 'How many people?',
    mealPlanGenerateBtn: '✨ Generate my plan',
    mealPlanStopBtn: '⏹ Stop',
    mealPlanResetBtn: '🔄 New plan',
    mealPlanLoadingMsg: 'The chef is planning your week...',
    mealPlanDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    dateLocale: 'en-US',
    langPrompt: '\nRespond entirely in English.',
    /* Meal Plan */
    mealPlanTitle: '📅 Weekly Meal Plan',
    mealPlanSub: 'Your AI-generated 7-day menu',
    mealPlanIngredientsLabel: 'Ingredients available for the week',
    mealPlanIngredientsPlaceholder: 'E.g. chicken, pasta, tomatoes, zucchini, eggs, rice...',
    mealPlanGenerateBtn: '🗓️ Generate my plan',
    mealPlanRegenerateBtn: '🗓️ Regenerate plan',
    mealPlanGeneratingMsg: 'The chef is planning your week...',
    mealPlanRegenMealMsg: 'Getting a new meal...',
    mealPlanSaveBtn: '💾 Save plan',
    mealPlanSavedConfirm: '✅ Plan saved!',
    mealPlanSavedPlans: 'Saved plans',
    mealPlanLoadBtn: 'Load',
    mealPlanDeleteBtn: 'Delete',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    lunch: '🌞 Lunch', dinner: '🌙 Dinner',
    mealPlanEmptyTitle: 'Plan your week',
    mealPlanEmptyDesc: 'Enter your ingredients and generate a personalized 7-day menu with macros.',
    mealPlanLoadingMsg: 'Loading your plans...',
    mealPlanNoSaved: 'No saved plans',
  },
}

/* ── Inline markdown parser ── */
function parseInline(text) {
  const parts = []
  const regex = /\*\*([^*]+)\*\*/g
  let lastIndex = 0, match, i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(<strong key={i++}>{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length === 0 ? [text] : parts
}

/* ── Block markdown renderer ── */
function RecipeContent({ text, isStreaming }) {
  const lines = text.split('\n')
  const elements = []
  let ulItems = [], olItems = [], k = 0
  const key = () => k++
  const flushUL = () => { if (ulItems.length) { elements.push(<ul key={key()}>{[...ulItems]}</ul>); ulItems = [] } }
  const flushOL = () => { if (olItems.length) { elements.push(<ol key={key()}>{[...olItems]}</ol>); olItems = [] } }
  const flush = () => { flushUL(); flushOL() }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush(); elements.push(<h2 key={key()}>{parseInline(line.slice(3))}</h2>)
    } else if (line.startsWith('### ')) {
      flush(); elements.push(<h3 key={key()}>{parseInline(line.slice(4))}</h3>)
    } else if (line.trim() === '---') {
      flush(); elements.push(<div key={key()} className="recipe-sep" />)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushOL(); ulItems.push(<li key={key()}>{parseInline(line.slice(2))}</li>)
    } else if (/^\d+\.[ \t]/.test(line)) {
      flushUL(); olItems.push(<li key={key()}>{parseInline(line.replace(/^\d+\.[ \t]*/, ''))}</li>)
    } else if (line.trim() === '') {
      flush()
    } else {
      flush(); elements.push(<p key={key()}>{parseInline(line)}</p>)
    }
  }
  flush()
  return (
    <div className="recipe-content">
      {elements}
      {isStreaming && <span className="cursor">▌</span>}
    </div>
  )
}

/* ── Recipe Modal ── */
function RecipeModal({ recipe, onClose, t }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-modal" onClick={e => e.stopPropagation()}>
        <div className="recipe-modal-header">
          <div className="recipe-modal-title-row">
            <span className="recipe-modal-emoji">{recipe.emoji || '🍽️'}</span>
            <div className="recipe-modal-title-info">
              <h2 className="recipe-modal-title">{recipe.title}</h2>
              <div className="recipe-modal-meta">
                {recipe.cuisine    && <span className="saved-badge">{recipe.cuisine}</span>}
                {recipe.prep_time  && <span className="saved-meta-item">🔪 {recipe.prep_time}</span>}
                {recipe.cook_time  && <span className="saved-meta-item">🔥 {recipe.cook_time}</span>}
                {recipe.difficulty && <span className="saved-meta-item">📊 {recipe.difficulty}</span>}
              </div>
            </div>
          </div>
          <button className="recipe-modal-close" onClick={onClose} aria-label={t.savedClose}>×</button>
        </div>
        <div className="recipe-modal-body">
          <RecipeContent text={recipe.full_text} isStreaming={false} />
        </div>
      </div>
    </div>
  )
}

/* ── Voice Recognition Hook ── */
function useSpeechRecognition(lang) {
  const [listeningId, setListeningId] = useState(null)
  const recognitionRef = useRef(null)
  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const startListening = (id, onResult) => {
    if (!supported) return
    recognitionRef.current?.abort()
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => { onResult(e.results[0][0].transcript) }
    rec.onend = () => { setListeningId(null); recognitionRef.current = null }
    rec.onerror = () => { setListeningId(null); recognitionRef.current = null }
    recognitionRef.current = rec
    rec.start()
    setListeningId(id)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListeningId(null)
    recognitionRef.current = null
  }

  return { listeningId, startListening, stopListening, supported }
}

/* ════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════ */
const GALLERY_ITEMS = [
  { id: 1, k: 'pasta,italian' },
  { id: 2, k: 'salad,healthy' },
  { id: 3, k: 'steak,grill' },
  { id: 4, k: 'sushi,japanese' },
  { id: 5, k: 'pizza,cheese' },
  { id: 6, k: 'soup,vegetable' },
]

const FOOD_STRIP_ITEMS = [
  { id: 11, k: 'pasta,food' },
  { id: 22, k: 'salad,food' },
  { id: 33, k: 'sushi,food' },
  { id: 44, k: 'pizza,food' },
  { id: 55, k: 'steak,food' },
  { id: 66, k: 'cake,dessert' },
]

function LandingPage({ t, onToggleLang, onGetStarted }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="l-container l-nav-inner">
          <div className="landing-logo">
            <img src="/logo.svg" alt="CheFridge" className="landing-logo-img" />
          </div>
          <div className="landing-nav-right">
            <button className="lang-toggle" onClick={onToggleLang}>{t.langToggle}</button>
            <button className="btn-outline-sm" onClick={onGetStarted}>{t.connect}</button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg-glow" />
        <div className="l-container">
          <div className="hero-layout">
            <div className="hero-content">
              <div className="hero-badge">{t.heroBadge}</div>
              <h1 className="hero-title">
                {t.heroTitle1}<br />
                <span className="hero-accent">{t.heroTitle2}</span>
              </h1>
              <p className="hero-sub">{t.heroSub}</p>
              <button className="btn-hero" onClick={onGetStarted}>
                {t.heroCta} <span className="btn-arrow">→</span>
              </button>
              <div className="hero-stats">
                <div className="hero-stat"><strong>{t.stat1Val}</strong><span>{t.stat1Label}</span></div>
                <div className="hero-stat-sep" />
                <div className="hero-stat"><strong>{t.stat2Val}</strong><span>{t.stat2Label}</span></div>
                <div className="hero-stat-sep" />
                <div className="hero-stat"><strong>{t.stat3Val}</strong><span>{t.stat3Label}</span></div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-img-frame">
                <img
                  src="https://loremflickr.com/500/400/food,gourmet,cooking?lock=42"
                  alt=""
                  loading="eager"
                />
                <div className="hero-img-tag">
                  <span className="hero-img-tag-icon">⭐</span>
                  <span>4.9 · 5 000+ avis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="food-strip">
        {FOOD_STRIP_ITEMS.map(item => (
          <div key={item.id} className="food-strip-item">
            <img src={`https://loremflickr.com/220/220/${item.k}?lock=${item.id}`} alt="" loading="lazy" />
          </div>
        ))}
      </div>

      <section className="features-section">
        <div className="l-container">
          <div className="section-eyebrow">{t.featuresLabel}</div>
          <h2 className="section-title">{t.featuresTitle}</h2>
          <div className="features-grid">
            {t.features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-emoji">{f.emoji}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hiw-section">
        <div className="l-container">
          <div className="section-eyebrow">{t.hiwLabel}</div>
          <h2 className="section-title hiw-title">{t.hiwTitle}</h2>
          <div className="hiw-steps">
            {t.hiwSteps.map((s, i) => (
              <div key={i} className="hiw-step">
                <div className="hiw-num">{s.n}</div>
                <div className="hiw-icon">{s.icon}</div>
                <p className="hiw-label">{s.label}</p>
                {i < t.hiwSteps.length - 1 && <div className="hiw-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reviews-section">
        <div className="l-container">
          <div className="section-eyebrow">{t.reviewsLabel}</div>
          <h2 className="section-title">{t.reviewsTitle}</h2>
          <div className="reviews-grid">
            {t.reviews.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-stars">★★★★★</div>
                <p className="review-text">"{r.text}"</p>
                <div className="review-author">— {r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gallery-section">
        <div className="l-container">
          <div className="section-eyebrow">{t.galleryLabel}</div>
          <h2 className="section-title">{t.galleryTitle}</h2>
          <div className="gallery-grid">
            {GALLERY_ITEMS.map(img => (
              <div key={img.id} className="gallery-item">
                <img
                  src={`https://loremflickr.com/400/300/${img.k}?lock=${img.id * 7}`}
                  alt=""
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="l-container">
          <div className="cta-inner">
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaSub}</p>
            <button className="btn-hero btn-hero-white" onClick={onGetStarted}>
              {t.ctaBtn} <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="l-container">
          <p>{t.footerText}</p>
        </div>
      </footer>
    </div>
  )
}

/* ════════════════════════════════════════════
   AUTH MODAL
   ════════════════════════════════════════════ */
function AuthModal({ t, onClose, onSuccess }) {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const switchTab = (newTab) => { setTab(newTab); setError(''); setSuccess('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      if (tab === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onSuccess()
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setSuccess(t.signupSuccess)
      }
    } catch (err) {
      setError(t.authErrors[err.message] || err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        <div className="modal-logo"><img src="/logo.svg" alt="CheFridge" className="modal-logo-img" /></div>
        <h2 className="modal-title">{tab === 'login' ? t.loginTitle : t.signupTitle}</h2>
        <p className="modal-sub">{tab === 'login' ? t.loginSub : t.signupSub}</p>
        <div className="modal-tabs">
          <button className={`modal-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>{t.loginTab}</button>
          <button className={`modal-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => switchTab('signup')}>{t.signupTab}</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="modal-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">{t.passwordLabel}</label>
            <input type="password" className="modal-input" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? t.passwordHint : t.passwordDots} required minLength={6} />
          </div>
          {error   && <div className="modal-error">{error}</div>}
          {success && <div className="modal-success">{success}</div>}
          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? <span className="modal-spinner" /> : (tab === 'login' ? t.loginBtn : t.signupBtn)}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   APP HEADER
   ════════════════════════════════════════════ */
function AppHeader({ t, onToggleLang, user, view, onNavigate, onLogout }) {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <button className="header-logo" onClick={() => onNavigate('app')}>
          <img src="/logo.svg" alt="CheFridge" className="header-logo-img" />
        </button>
        <nav className="header-nav">
          <button className={`header-nav-btn${view === 'app' ? ' active' : ''}`} onClick={() => onNavigate('app')}>
            {t.newRecipe}
          </button>
          <button className={`header-nav-btn${view === 'saved' ? ' active' : ''}`} onClick={() => onNavigate('saved')}>
            {t.myRecipes}
          </button>
          <button className={`header-nav-btn${view === 'meal-plan' ? ' active' : ''}`} onClick={() => onNavigate('meal-plan')}>
            {t.mealPlanNav}
          </button>
        </nav>
        <div className="header-user">
          <button className="lang-toggle lang-toggle-sm" onClick={onToggleLang}>{t.langToggle}</button>
          <span className="header-email">{user.email}</span>
          <button className="btn-logout" onClick={onLogout}>{t.logout}</button>
        </div>
      </div>
    </header>
  )
}

/* ════════════════════════════════════════════
   SAVED RECIPES VIEW
   ════════════════════════════════════════════ */
function SavedRecipesView({ t, onNavigate }) {
  const [recipes, setRecipes]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]         = useState(null)
  const [search, setSearch]             = useState('')

  useEffect(() => { loadRecipes() }, [])

  const loadRecipes = async () => {
    setLoading(true)
    const { data } = await supabase.from('saved_recipes').select('*').order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
  }

  const deleteRecipe = async (id) => {
    setDeleting(id)
    await supabase.from('saved_recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (activeRecipe?.id === id) setActiveRecipe(null)
    setDeleting(null); setConfirmDelete(null)
  }

  const fmt = (iso) => new Date(iso).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })

  const filtered = search.trim()
    ? recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || (r.cuisine && r.cuisine.toLowerCase().includes(search.toLowerCase())))
    : recipes

  return (
    <main className="main">
      <div className="container">
        <div className="saved-header">
          <h1 className="saved-title">{t.savedPageTitle}</h1>
          <p className="saved-sub">{recipes.length === 0 ? t.savedPageSub0 : t.savedPageSubN(recipes.length)}</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="chef-anim">📚</span>
            <p>{t.savedLoadingMsg}</p>
            <div className="dots"><span /><span /><span /></div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="saved-empty">
            <div className="saved-empty-illustration">🍽️</div>
            <h3>{t.savedEmptyTitle}</h3>
            <p>{t.savedEmptyDesc}</p>
            <button className="gen-btn saved-empty-btn" onClick={() => onNavigate('app')}><span>✨</span> {t.savedNewRecipeBtn}</button>
          </div>
        ) : (
          <>
            <div className="saved-search-wrap">
              <span className="saved-search-icon">🔍</span>
              <input type="text" className="saved-search" placeholder={t.savedSearchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button className="saved-search-clear" onClick={() => setSearch('')}>×</button>}
            </div>
            <div className="saved-grid">
              {filtered.map((r, idx) => (
                <div key={r.id} className="saved-card" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => setActiveRecipe(r)}>
                  <div className="saved-card-emoji-wrap">
                    <span className="saved-card-emoji">{r.emoji || '🍽️'}</span>
                  </div>
                  <div className="saved-card-content">
                    <h3 className="saved-card-title">{r.title}</h3>
                    <div className="saved-card-badges">
                      {r.cuisine && <span className="saved-badge">{r.cuisine}</span>}
                      {r.difficulty && <span className="saved-difficulty-badge">{r.difficulty}</span>}
                    </div>
                    <div className="saved-card-times">
                      {r.prep_time && <span className="saved-meta-item">🔪 {r.prep_time}</span>}
                      {r.cook_time && <span className="saved-meta-item">🔥 {r.cook_time}</span>}
                    </div>
                    <span className="saved-date">{fmt(r.created_at)}</span>
                  </div>
                  <div className="saved-card-delete-wrap" onClick={e => e.stopPropagation()}>
                    {confirmDelete === r.id ? (
                      <div className="saved-delete-confirm-inline">
                        <span className="saved-delete-label">{t.savedDeleteConfirm}</span>
                        <button className="saved-del-yes" onClick={() => deleteRecipe(r.id)} disabled={deleting === r.id}>{deleting === r.id ? '…' : t.savedDeleteYes}</button>
                        <button className="saved-del-no" onClick={() => setConfirmDelete(null)}>{t.savedDeleteNo}</button>
                      </div>
                    ) : (
                      <button className="saved-delete-btn" onClick={() => setConfirmDelete(r.id)} title={t.savedDeleteTip}>🗑️</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {activeRecipe && <RecipeModal recipe={activeRecipe} onClose={() => setActiveRecipe(null)} t={t} />}
    </main>
  )
}

/* ════════════════════════════════════════════
   MEAL PLAN VIEW
   ════════════════════════════════════════════ */
function MealPlanViewSaved({ t, user, people, selectedDiets, cookingTime }) {
  const [weekIngredients, setWeekIngredients] = useState('')
  const [plan, setPlan]                       = useState(null)
  const [loading, setLoading]                 = useState(false)
  const [regenKey, setRegenKey]               = useState(null) // "dayIdx-meal"
  const [saved, setSaved]                     = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')
  const [savedPlans, setSavedPlans]           = useState([])
  const [savedLoading, setSavedLoading]       = useState(true)

  useEffect(() => { loadSavedPlans() }, [])

  const loadSavedPlans = async () => {
    setSavedLoading(true)
    const { data } = await supabase.from('meal_plans').select('id, created_at, plan').order('created_at', { ascending: false }).limit(5)
    setSavedPlans(data || [])
    setSavedLoading(false)
  }

  const timeLabels = { express: '15 min', rapide: '30 min', normal: '45 min', leisurely: '1h+' }
  const timeLabel  = timeLabels[cookingTime] || '45 min'
  const dietLabel  = selectedDiets.map(id => t.dietOptions.find(d => d.id === id)?.label).filter(Boolean).join(', ')

  const buildPlanPrompt = () => {
    const ing = weekIngredients.trim() || 'assorted ingredients'
    return `JSON only, no text, no backticks.
Weekly meal plan for ${people} person(s). Time per meal: ${timeLabel}.
Ingredients: ${ing}
${dietLabel ? `Dietary: strictly ${dietLabel}.` : ''}

Return EXACTLY this JSON (7 days Monday-Sunday, lunch+dinner):
{"days":[{"day":"Monday","lunch":{"name":"...","emoji":"🍝","cuisine":"Italian","time":"25 min","calories":450,"protein":25,"carbs":40,"fat":15},"dinner":{"name":"...","emoji":"🥘","cuisine":"French","time":"30 min","calories":520,"protein":30,"carbs":42,"fat":18}},{"day":"Tuesday",...},{"day":"Wednesday",...},{"day":"Thursday",...},{"day":"Friday",...},{"day":"Saturday",...},{"day":"Sunday",...}]}${t.langPrompt}`
  }

  const buildRegenPrompt = (dayName, mealType) => {
    const ing = weekIngredients.trim() || 'assorted ingredients'
    return `JSON only. One ${mealType} for ${dayName} (${people} person(s), ${timeLabel}).
Ingredients: ${ing}. ${dietLabel ? `Dietary: ${dietLabel}.` : ''}
Return: {"name":"...","emoji":"🍝","cuisine":"...","time":"...","calories":450,"protein":25,"carbs":40,"fat":15}${t.langPrompt}`
  }

  const generatePlan = async () => {
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPlanPrompt() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Error') }
      const data = await res.json()
      if (!data.days?.length) throw new Error(t.langPrompt ? 'Invalid response.' : 'Réponse invalide.')
      setPlan(data)
    } catch (err) {
      setError(`❌ ${err.message}`)
    } finally { setLoading(false) }
  }

  const regenMeal = async (dayIdx, mealType) => {
    const key = `${dayIdx}-${mealType}`
    setRegenKey(key); setError('')
    try {
      const dayName = ENGLISH_DAYS[dayIdx]
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildRegenPrompt(dayName, mealType), singleMeal: true }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Error') }
      const meal = await res.json()
      if (!meal.name) throw new Error('Invalid meal')
      setPlan(prev => ({
        ...prev,
        days: prev.days.map((d, i) => i === dayIdx ? { ...d, [mealType]: meal } : d),
      }))
      setSaved(false)
    } catch (err) {
      setError(`❌ ${err.message}`)
    } finally { setRegenKey(null) }
  }

  const savePlan = async () => {
    if (!plan || !user) return
    setSaving(true)
    const { error: err } = await supabase.from('meal_plans').insert({ user_id: user.id, plan })
    setSaving(false)
    if (!err) { setSaved(true); loadSavedPlans() }
    else setError(`❌ ${err.message}`)
  }

  const loadPlan = (saved) => { setPlan(saved.plan); setSaved(true) }

  const deleteSavedPlan = async (id) => {
    await supabase.from('meal_plans').delete().eq('id', id)
    setSavedPlans(prev => prev.filter(p => p.id !== id))
  }

  const fmt = (iso) => new Date(iso).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'short' })

  return (
    <main className="main">
      <div className="container">
        <div className="saved-header">
          <h1 className="saved-title">{t.mealPlanTitle}</h1>
          <p className="saved-sub">{t.mealPlanSub}</p>
        </div>

        {/* Settings */}
        <section className="card">
          <div className="step-header">
            <div className="step-badge">1</div>
            <div><h2>{t.mealPlanIngredientsLabel}</h2></div>
          </div>
          <textarea
            className="week-ingredients-input"
            value={weekIngredients}
            onChange={e => setWeekIngredients(e.target.value)}
            placeholder={t.mealPlanIngredientsPlaceholder}
            rows={3}
          />
          <div className="week-settings-row">
            {people > 0 && <span className="week-setting-badge">👥 {people} {people > 1 ? t.persons : t.person}</span>}
            {dietLabel && <span className="week-setting-badge">🥗 {dietLabel}</span>}
            <span className="week-setting-badge">⏱️ {timeLabel}</span>
          </div>
        </section>

        {error && <div className="error-msg" role="alert">{error}</div>}

        <div className="gen-wrap">
          <button className="gen-btn" onClick={generatePlan} disabled={loading}>
            {loading
              ? <><span className="modal-spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} /><span style={{ marginLeft: 8 }}>{t.mealPlanGeneratingMsg}</span></>
              : <><span>🗓️</span> {plan ? t.mealPlanRegenerateBtn.replace('🗓️ ', '') : t.mealPlanGenerateBtn.replace('🗓️ ', '')}</>
            }
          </button>
        </div>

        {/* Plan Grid */}
        {plan && (
          <div className="meal-plan-section">
            <div className="meal-plan-actions">
              {!saved && (
                <button className="save-btn" onClick={savePlan} disabled={saving}>
                  {saving ? '…' : t.mealPlanSaveBtn}
                </button>
              )}
              {saved && <span className="saved-confirm">{t.mealPlanSavedConfirm}</span>}
            </div>
            <div className="meal-grid">
              {plan.days.map((day, dayIdx) => (
                <div key={dayIdx} className="meal-day-col">
                  <div className="meal-day-header">{t.days[dayIdx]}</div>
                  {['lunch', 'dinner'].map(mealType => {
                    const meal = day[mealType]
                    const key  = `${dayIdx}-${mealType}`
                    const isRegen = regenKey === key
                    return (
                      <div key={mealType} className={`meal-card${isRegen ? ' loading' : ''}`}>
                        <div className="meal-card-top">
                          <span className="meal-type-label">{t[mealType]}</span>
                          <button className="meal-regen-btn" onClick={() => regenMeal(dayIdx, mealType)} disabled={!!regenKey} title="Regenerate">
                            {isRegen ? '⏳' : '🔄'}
                          </button>
                        </div>
                        {isRegen ? (
                          <div className="meal-card-loading"><div className="dots"><span /><span /><span /></div></div>
                        ) : meal ? (
                          <>
                            <span className="meal-emoji">{meal.emoji}</span>
                            <p className="meal-name">{meal.name}</p>
                            <span className="meal-cuisine-badge">{meal.cuisine}</span>
                            <span className="meal-time">⏱️ {meal.time}</span>
                            {meal.calories && (
                              <div className="meal-macros">
                                <span>🔥 {meal.calories}</span>
                                <span>💪 {meal.protein}g</span>
                                <span>🍞 {meal.carbs}g</span>
                                <span>🫒 {meal.fat}g</span>
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {!plan && (
          <div className="saved-empty">
            <div className="saved-empty-illustration">📅</div>
            <h3>{t.mealPlanEmptyTitle}</h3>
            <p>{t.mealPlanEmptyDesc}</p>
          </div>
        )}

        {/* Saved Plans */}
        {!savedLoading && savedPlans.length > 0 && (
          <section className="card" style={{ marginTop: '2rem' }}>
            <div className="step-header" style={{ marginBottom: '1rem' }}>
              <div className="step-badge">📂</div>
              <div><h2>{t.mealPlanSavedPlans}</h2></div>
            </div>
            <div className="saved-plans-list">
              {savedPlans.map(sp => (
                <div key={sp.id} className="saved-plan-row">
                  <span className="saved-plan-date">📅 {fmt(sp.created_at)}</span>
                  <button className="saved-plan-load-btn" onClick={() => loadPlan(sp)}>{t.mealPlanLoadBtn}</button>
                  <button className="saved-plan-del-btn" onClick={() => deleteSavedPlan(sp.id)}>🗑️</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

/* ════════════════════════════════════════════
   MEAL PLAN VIEW
   ════════════════════════════════════════════ */
function MealPlanView({ t, lang }) {
  const [people, setPeople]       = useState(2)
  const [filters, setFilters]     = useState([])
  const [planText, setPlanText]   = useState('')
  const [phase, setPhase]         = useState('idle')
  const [error, setError]         = useState('')
  const abortRef                  = useRef(null)

  const toggleFilter = (id) =>
    setFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const generatePlan = async () => {
    setPhase('loading'); setPlanText(''); setError('')
    const ctrl = new AbortController(); abortRef.current = ctrl

    const dietText  = filters.length ? `Dietary restrictions: ${filters.join(', ')}.` : ''
    const langNote  = lang === 'en' ? '\nRespond entirely in English.' : ''
    const days      = t.mealPlanDays
    const breakfast = lang === 'fr' ? 'Petit-déjeuner' : 'Breakfast'
    const lunch     = lang === 'fr' ? 'Déjeuner'       : 'Lunch'
    const dinner    = lang === 'fr' ? 'Dîner'          : 'Dinner'
    const snack     = lang === 'fr' ? 'Collation'      : 'Snack'
    const shopping  = lang === 'fr' ? 'Liste de courses' : 'Shopping List'

    const prompt = `Create a balanced, varied 7-day meal plan for ${people} person(s). ${dietText}
Format exactly as follows for each of the 7 days:
## 📅 ${days[0]}
- **${breakfast}:** [meal with brief description]
- **${lunch}:** [meal with brief description]
- **${dinner}:** [meal with brief description]
- **${snack}:** [snack]

Then continue for ${days[1]}, ${days[2]}, ${days[3]}, ${days[4]}, ${days[5]}, ${days[6]}.
After all 7 days, add:
### 🛒 ${shopping}
List 15-20 key ingredients needed for the week.${langNote}`

    let accumulated = ''
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'claude-sonnet-4-6', maxTokens: 3000 }),
        signal: ctrl.signal,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf      = ''
      setPhase('streaming')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') { setPhase('done'); return }
          let p; try { p = JSON.parse(raw) } catch { continue }
          if (p.text)  { accumulated += p.text; setPlanText(prev => prev + p.text) }
          if (p.error) throw new Error(p.error)
        }
      }
      setPhase('done')
    } catch (err) {
      if (err.name !== 'AbortError') { setError(`❌ ${err.message}`); setPhase('idle') }
      else setPhase(accumulated ? 'done' : 'idle')
    } finally { abortRef.current = null }
  }

  const stop  = () => { abortRef.current?.abort(); setPhase(planText ? 'done' : 'idle') }
  const reset = () => { abortRef.current?.abort(); setPlanText(''); setPhase('idle'); setError('') }
  const isLoading = phase === 'loading' || phase === 'streaming'

  return (
    <main className="main">
      <div className="container">
        <div className="meal-plan-header">
          <h1 className="meal-plan-title">{t.mealPlanTitle}</h1>
          <p className="meal-plan-sub">{t.mealPlanSub}</p>
        </div>

        <section className="card">
          <div className="step-header">
            <div className="step-badge">👥</div>
            <div>
              <h2>{t.mealPlanPeopleLabel}</h2>
            </div>
          </div>
          <div className="people-wrap">
            <button className="people-ctrl" onClick={() => setPeople(p => Math.max(1, p - 1))}>−</button>
            <div className="people-display">
              <span className="people-num">{people}</span>
              <span className="people-lbl">{people > 1 ? t.persons : t.person}</span>
            </div>
            <button className="people-ctrl" onClick={() => setPeople(p => Math.min(20, p + 1))}>＋</button>
            <div className="people-avatars">
              {Array.from({ length: Math.min(people, 8) }).map((_, i) => <span key={i} className="avatar">👤</span>)}
              {people > 8 && <span className="avatar-more">+{people - 8}</span>}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="step-header">
            <div className="step-badge">🥗</div>
            <div>
              <h2>{t.dietaryTitle}</h2>
              <p>{t.dietarySub}</p>
            </div>
          </div>
          <div className="dietary-grid">
            {t.dietaryFilters.map(f => (
              <button key={f.id}
                className={`dietary-btn${filters.includes(f.id) ? ' active' : ''}`}
                onClick={() => toggleFilter(f.id)}>
                <span>{f.emoji}</span> {f.label}
                {filters.includes(f.id) && <span className="dietary-check">✓</span>}
              </button>
            ))}
          </div>
        </section>

        {error && <div className="error-msg" role="alert">{error}</div>}

        <div className="gen-wrap">
          {isLoading ? (
            <button className="gen-btn stop" onClick={stop}>
              <span>⏹</span> {t.mealPlanStopBtn.replace('⏹ ', '')}
            </button>
          ) : planText ? (
            <button className="gen-btn secondary" onClick={reset}>
              <span>🔄</span> {t.mealPlanResetBtn.replace('🔄 ', '')}
            </button>
          ) : (
            <button className="gen-btn" onClick={generatePlan}>
              <span>✨</span> {t.mealPlanGenerateBtn.replace('✨ ', '')}
            </button>
          )}
        </div>

        {isLoading && !planText && (
          <div className="loading-state">
            <span className="chef-anim">📅</span>
            <p>{t.mealPlanLoadingMsg}</p>
            <div className="dots"><span /><span /><span /></div>
          </div>
        )}

        {planText && (
          <div className="meal-plan-result card">
            <RecipeContent text={planText} isStreaming={isLoading} />
          </div>
        )}
      </div>
    </main>
  )
}

/* ════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════ */
export default function App() {
  /* i18n */
  const [lang, setLang] = useState('fr')
  const t = T[lang]
  const toggleLang = () => setLang(l => l === 'fr' ? 'en' : 'fr')

  /* Auth */
  const [user, setUser]               = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView]               = useState('landing')
  const [showAuth, setShowAuth]       = useState(false)

  /* Form */
  const [ingredients, setIngredients]       = useState([{ id: 1, name: '', qty: '', unit: 'g' }])
  const [people, setPeople]                 = useState(2)
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [cookingTime, setCookingTime] = useState('normal')
  const [activeDietaryFilters, setActiveDietaryFilters] = useState([])

  /* Flow */
  const [phase, setPhase]               = useState('idle')
  const [proposals, setProposals]       = useState([])
  const [selectedIdx, setSelectedIdx]   = useState(null)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [checkIngredients, setCheckIngredients] = useState([])
  const [recipeText, setRecipeText]     = useState('')
  const [error, setError]               = useState('')
  const [saved, setSaved]               = useState(false)
  const [saving, setSaving]             = useState(false)
  const [heartPop, setHeartPop]         = useState(false)
  const [loadingMore, setLoadingMore]   = useState(false)

  const proposalsRef    = useRef(null)
  const checkRef        = useRef(null)
  const recipeRef       = useRef(null)
  const abortRef        = useRef(null)
  const recognitionRef  = useRef(null)

  /* Auth setup */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setView(session?.user ? 'app' : 'landing')
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) { setView('app'); setShowAuth(false) }
      else setView('landing')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = () => supabase.auth.signOut()

  /* Ingredient helpers */
  const addIngredient = () => {
    const id = Date.now()
    newIngIdRef.current = id
    setIngredients(prev => [...prev, { id, name: '', qty: '', unit: 'g' }])
  }
  const removeIngredient = (id) => setIngredients(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  const updateIngredient = (id, field, value) => setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  const handleIngKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }
  const toggleCuisine    = (id) => setSelectedCuisines(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const toggleCheckIng   = (idx) => setCheckIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, checked: !ing.checked } : ing))
  const toggleDietaryFilter = (id) => setActiveDietaryFilters(prev =>
    prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const [listeningId, setListeningId] = useState(null)
  const startVoiceInput = (id) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null }
    const rec = new SR()
    rec.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart  = () => setListeningId(id)
    rec.onresult = (e) => { updateIngredient(id, 'name', e.results[0][0].transcript) }
    rec.onend    = () => { setListeningId(null); recognitionRef.current = null }
    rec.onerror  = () => { setListeningId(null); recognitionRef.current = null }
    rec.start()
    recognitionRef.current = rec
  }

  /* SSE helper */
  const streamSSE = async (prompt, onChunk, signal, model = 'claude-sonnet-4-6', maxTokens = 2000) => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, maxTokens }),
      signal,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Erreur serveur (${res.status})`)
    }
    const reader = res.body.getReader()
    const dec    = new TextDecoder()
    let buf      = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') return
        let p; try { p = JSON.parse(raw) } catch { continue }
        if (p.text)  onChunk(p.text)
        if (p.error) throw new Error(p.error)
      }
    }
  }

  /* Prompt builders */
  const buildIngList = (valid) =>
    valid.map(i => `- ${i.name.trim()}${i.qty ? ` : ${i.qty} ${i.unit}` : ''}`).join('\n')

  const buildDietStr = () =>
    selectedDiets.map(id => t.dietOptions.find(d => d.id === id)?.label).filter(Boolean).join(', ')

  const buildProposalsPrompt = (valid, excludeNames = null) => {
    const ingList = buildIngList(valid)
    const cNames  = selectedCuisines.map(id => t.cuisines.find(c => c.id === id)?.label).filter(Boolean)
    const cText   = cNames.length ? cNames.join(', ') : 'any cuisine'
    const constraint = COOKING_TIME_CONSTRAINTS[cookingTime]
    const dietText   = activeDietaryFilters.length ? `\nDietary: ${activeDietaryFilters.join(', ')}` : ''
    return `JSON only, no text, no backticks.
Ingredients: ${ingList}
${people} serving(s) · Style: ${cText} · Time: ${constraint}${dietText}

3 varied proposals, different from: ${excludeNames || 'none'}. Strict format:
[{"nom":"Name","emoji":"🍝","cuisine":"Style","description":"1-2 sentences.","tempsPrep":"10 min","tempsCuisson":"15 min","difficulte":"Easy","calories":420,"protein":28,"carbs":35,"fat":14}]${t.langPrompt}`
  }

  const buildFullRecipePrompt = (valid, proposal, checkIngs) => {
    const ingList     = buildIngList(valid)
    const available   = checkIngs.filter(i => i.checked)
    const unavailable = checkIngs.filter(i => !i.checked)
    const constraint  = COOKING_TIME_CONSTRAINTS[cookingTime]
    const diet        = buildDietStr()

    let extras = ''
    if (available.length)   extras += `\nExtra available: ${available.map(i => `${i.name}${i.note ? ` (${i.note})` : ''}`).join(', ')}`
    if (unavailable.length) extras += `\nMissing (substitute each): ${unavailable.map(i => i.name).join(', ')}`

    const dietNote = activeDietaryFilters.length ? `\nRestrictions alimentaires : ${activeDietaryFilters.join(', ')}.` : ''
    return `Chef expert. Recette concise pour "${proposal.nom}" (${proposal.cuisine}).${dietNote}
Ingrédients : ${ingList}${extras}
${people} pers. · ${constraint}.

Exact markdown, short steps:

## ${proposal.emoji} ${proposal.nom}
**Cuisine :** ${proposal.cuisine} | **Pour :** ${people} pers. | **Prép :** [X min] | **Cuisson :** [X min] | **Difficulté :** ${proposal.difficulte}

### 📋 Ingrédients
- [ingredient : qty${unavailable.length ? ' — or [substitute]' : ''}]

### 👨‍🍳 Préparation
1. [Step — concise]

### 💡 Conseil du Chef
[1 tip]

### 🍷 Accord
[1 suggestion]

### 📊 Macros (par portion)
- 🔥 **Calories :** ~XXX kcal
- 💪 **Protéines :** ~XX g
- 🍞 **Glucides :** ~XX g
- 🫒 **Lipides :** ~XX g${t.langPrompt}`
  }

  /* Step 1: Generate proposals */
  const generateProposals = async () => {
    const valid = ingredients.filter(i => i.name.trim())
    if (!valid.length) { setError(lang === 'fr' ? 'Veuillez ajouter au moins un ingrédient !' : 'Please add at least one ingredient!'); return }

    setError(''); setSaved(false)
    setPhase('proposals-loading')
    setProposals([]); setSelectedIdx(null); setSelectedProposal(null)
    setCheckIngredients([]); setRecipeText('')

    const ctrl = new AbortController(); abortRef.current = ctrl
    let rawJson = ''
    try {
      await streamSSE(buildProposalsPrompt(valid), c => { rawJson += c }, ctrl.signal, 'claude-sonnet-4-6', 1000)
      const match = rawJson.match(/\[[\s\S]*\]/)
      if (!match) throw new Error(lang === 'fr' ? 'Format invalide. Réessayez.' : 'Invalid format. Please retry.')
      const parsed = JSON.parse(match[0])
      if (!Array.isArray(parsed) || !parsed.length) throw new Error(lang === 'fr' ? 'Réponse invalide. Réessayez.' : 'Invalid response. Please retry.')
      setProposals(parsed); setPhase('proposals')
      setTimeout(() => proposalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      if (err.name !== 'AbortError') setError(`❌ ${err.message}`)
      setPhase('idle')
    } finally { abortRef.current = null }
  }

  /* Load more proposals (appended) */
  const loadMoreProposals = async () => {
    const valid = ingredients.filter(i => i.name.trim())
    if (!valid.length) return
    setLoadingMore(true)
    const excludeNames = proposals.map(p => p.nom).join(', ')
    let rawJson = ''
    try {
      await streamSSE(buildProposalsPrompt(valid, excludeNames), c => { rawJson += c }, undefined, 'claude-sonnet-4-6', 1000)
      const match = rawJson.match(/\[[\s\S]*\]/)
      if (!match) throw new Error(lang === 'fr' ? 'Format invalide. Réessayez.' : 'Invalid format. Please retry.')
      const parsed = JSON.parse(match[0])
      if (!Array.isArray(parsed) || !parsed.length) throw new Error(lang === 'fr' ? 'Réponse invalide. Réessayez.' : 'Invalid response. Please retry.')
      setProposals(prev => [...prev, ...parsed])
    } catch (err) {
      if (err.name !== 'AbortError') setError(`❌ ${err.message}`)
    } finally {
      setLoadingMore(false)
    }
  }

  /* Step 2: Select proposal → check ingredients */
  const selectProposal = async (proposal, idx) => {
    if (isLoading) return
    setSelectedIdx(idx); setSelectedProposal(proposal)
    setPhase('check-loading'); setCheckIngredients([]); setRecipeText(''); setError(''); setSaved(false)

    const valid = ingredients.filter(i => i.name.trim())
    const ctrl  = new AbortController(); abortRef.current = ctrl
    setTimeout(() => checkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)

    try {
      const res = await fetch('/api/check-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: proposal.nom, recipeCuisine: proposal.cuisine,
          userIngredients: valid.map(i => `${i.name.trim()}${i.qty ? ` : ${i.qty} ${i.unit}` : ''}`),
          people, cookingTime, dietary: buildDietStr(),
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Erreur (${res.status})`) }
      const { ingredients: extras } = await res.json()
      if (!extras?.length) {
        await doGenerateRecipe(valid, proposal, [])
      } else {
        setCheckIngredients(extras.map(e => ({ ...e, checked: true }))); setPhase('check')
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(`❌ ${err.message}`)
      setPhase('proposals')
    } finally { abortRef.current = null }
  }

  /* Step 3: Generate full recipe */
  const doGenerateRecipe = async (valid, proposal, extras) => {
    setPhase('recipe-loading'); setRecipeText(''); setError(''); setSaved(false)
    const ctrl = new AbortController(); abortRef.current = ctrl
    let accumulated = ''
    setTimeout(() => recipeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    try {
      await streamSSE(buildFullRecipePrompt(valid, proposal, extras), chunk => {
        accumulated += chunk; setRecipeText(prev => prev + chunk)
      }, ctrl.signal, 'claude-opus-4-6', 2000)
      setPhase('recipe')
    } catch (err) {
      if (err.name !== 'AbortError') { setError(`❌ ${err.message}`); setPhase(extras.length ? 'check' : 'proposals') }
      else setPhase(accumulated ? 'recipe' : (extras.length ? 'check' : 'proposals'))
    } finally { abortRef.current = null }
  }

  const generateFullRecipe = () => doGenerateRecipe(ingredients.filter(i => i.name.trim()), selectedProposal, checkIngredients)

  const stopGeneration = () => {
    abortRef.current?.abort(); abortRef.current = null
    if (phase === 'proposals-loading') setPhase('idle')
    if (phase === 'check-loading') setPhase('proposals')
  }

  const resetProposals = () => {
    abortRef.current?.abort()
    setPhase('idle'); setProposals([]); setSelectedIdx(null); setSelectedProposal(null)
    setCheckIngredients([]); setRecipeText(''); setError(''); setSaved(false)
  }

  /* Save recipe */
  const saveRecipe = async () => {
    if (!user || !recipeText || !selectedProposal) return
    setSaving(true)
    const { error: err } = await supabase.from('saved_recipes').insert({
      user_id:    user.id,
      title:      selectedProposal.nom,
      emoji:      selectedProposal.emoji,
      cuisine:    selectedProposal.cuisine,
      prep_time:  selectedProposal.tempsPrep,
      cook_time:  selectedProposal.tempsCuisson,
      difficulty: selectedProposal.difficulte,
      full_text:  recipeText,
    })
    setSaving(false)
    if (!err) { setSaved(true); setHeartPop(true); setTimeout(() => setHeartPop(false), 600) }
    else setError(`❌ ${err.message}`)
  }

  const isLoading     = phase === 'proposals-loading' || phase === 'check-loading' || phase === 'recipe-loading'
  const showProposals = proposals.length > 0 && phase !== 'idle' && phase !== 'proposals-loading'
  const showCheck     = (phase === 'check-loading' || phase === 'check') && selectedProposal !== null
  const showRecipe    = phase === 'recipe-loading' || phase === 'recipe'

  if (authLoading) return <div className="auth-splash"><span className="auth-splash-icon">🍳</span></div>

  if (view === 'landing') return (
    <>
      <LandingPage t={t} onToggleLang={toggleLang} onGetStarted={() => setShowAuth(true)} />
      {showAuth && <AuthModal t={t} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
    </>
  )

  return (
    <div className="app">
      <AppHeader t={t} onToggleLang={toggleLang} user={user} view={view} onNavigate={setView} onLogout={handleLogout} />

      {view === 'meal-plan' ? (
        <MealPlanView t={t} lang={lang} />
      ) : view === 'saved' ? (
        <SavedRecipesView t={t} onNavigate={setView} />
      ) : view === 'mealPlan' ? (
        <MealPlanViewSaved t={t} user={user} people={people} selectedDiets={selectedDiets} cookingTime={cookingTime} />
      ) : (
        <main className="main">
          <div className="container">

            {/* Step 1: Ingredients */}
            <section className="card">
              <div className="step-header">
                <div className="step-badge">1</div>
                <div><h2>{t.step1Title}</h2><p>{t.step1Sub}</p></div>
              </div>
              <div className="ing-list">
                {ingredients.map((ing, idx) => (
                  <div key={ing.id} className="ing-row">
                    <input type="text" className="inp ing-name" value={ing.name}
                      ref={el => { if (el && ing.id === newIngIdRef.current) { el.focus(); newIngIdRef.current = null } }}
                      onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                      onKeyDown={handleIngKeyDown}
                      placeholder={idx === 0 ? t.ing1Placeholder : t.ingPlaceholder} />
                    {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                      <button
                        type="button"
                        className={`voice-btn${listeningId === ing.id ? ' listening' : ''}`}
                        onClick={() => startVoiceInput(ing.id)}
                        title={lang === 'fr' ? 'Dicter' : 'Dictate'}
                        aria-label={lang === 'fr' ? 'Dicter un ingrédient' : 'Dictate ingredient'}>
                        {listeningId === ing.id ? '🔴' : '🎤'}
                      </button>
                    )}
                    <input type="text" className="inp ing-qty" value={ing.qty}
                      onChange={e => updateIngredient(ing.id, 'qty', e.target.value)}
                      placeholder="250" inputMode="decimal" />
                    <select className="inp ing-unit" value={ing.unit}
                      onChange={e => updateIngredient(ing.id, 'unit', e.target.value)}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button className="rm-btn" onClick={() => removeIngredient(ing.id)}
                      disabled={ingredients.length === 1} title={t.removeIng}>×</button>
                  </div>
                ))}
              </div>
              <button className="add-btn" onClick={addIngredient}>{t.addIngredient}</button>
            </section>

            {/* Step 2: People */}
            <section className="card">
              <div className="step-header">
                <div className="step-badge">2</div>
                <div><h2>{t.step2Title}</h2><p>{t.step2Sub}</p></div>
              </div>
              <div className="people-wrap">
                <button className="people-ctrl" onClick={() => setPeople(p => Math.max(1, p - 1))}>−</button>
                <div className="people-display">
                  <span className="people-num">{people}</span>
                  <span className="people-lbl">{people > 1 ? t.persons : t.person}</span>
                </div>
                <button className="people-ctrl" onClick={() => setPeople(p => Math.min(20, p + 1))}>＋</button>
                <div className="people-avatars">
                  {Array.from({ length: Math.min(people, 8) }).map((_, i) => <span key={i} className="avatar">👤</span>)}
                  {people > 8 && <span className="avatar-more">+{people - 8}</span>}
                </div>
              </div>
            </section>

            {/* Step 3: Cuisine */}
            <section className="card">
              <div className="step-header">
                <div className="step-badge">3</div>
                <div>
                  <h2>{t.step3Title}</h2>
                  <p>{selectedCuisines.length === 0 ? t.step3Sub : t.step3SubSelected(selectedCuisines.length)}</p>
                </div>
              </div>
              <div className="cuisine-grid">
                {t.cuisines.map(c => (
                  <button key={c.id} className={`cuisine-card${selectedCuisines.includes(c.id) ? ' selected' : ''}`} onClick={() => toggleCuisine(c.id)}>
                    <span className="c-flag">{c.emoji}</span>
                    <span className="c-name">{c.label}</span>
                    {selectedCuisines.includes(c.id) && <span className="c-check">✓</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* Dietary filters */}
            <section className="card">
              <div className="step-header">
                <div className="step-badge">🥗</div>
                <div>
                  <h2>{t.dietaryTitle}</h2>
                  <p>{t.dietarySub}</p>
                </div>
              </div>
              <div className="dietary-grid">
                {t.dietaryFilters.map(f => (
                  <button key={f.id}
                    className={`dietary-btn${activeDietaryFilters.includes(f.id) ? ' active' : ''}`}
                    onClick={() => toggleDietaryFilter(f.id)}>
                    <span>{f.emoji}</span> {f.label}
                    {activeDietaryFilters.includes(f.id) && <span className="dietary-check">✓</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 4: Cooking time */}
            <section className="card">
              <div className="step-header">
                <div className="step-badge">4</div>
                <div>
                  <h2>{t.step4DietTitle}</h2>
                  <p>{selectedDiets.length === 0 ? t.step4DietSub : t.step4DietSubSelected(selectedDiets.length)}</p>
                </div>
              </div>
              <div className="diet-grid">
                {t.dietOptions.map(d => (
                  <button key={d.id} className={`diet-card${selectedDiets.includes(d.id) ? ' selected' : ''}`} onClick={() => toggleDiet(d.id)}>
                    <span className="diet-emoji">{d.emoji}</span>
                    <span className="diet-name">{d.label}</span>
                    {selectedDiets.includes(d.id) && <span className="c-check">✓</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 5: Cooking time */}
            <section className="card">
              <div className="step-header">
                <div className="step-badge">5</div>
                <div><h2>{t.step5Title}</h2><p>{t.step5Sub}</p></div>
              </div>
              <div className="time-grid">
                {t.cookingTimes.map(ct => (
                  <button key={ct.id} className={`time-card${cookingTime === ct.id ? ' selected' : ''}`} onClick={() => setCookingTime(ct.id)}>
                    <span className="time-emoji">{ct.emoji}</span>
                    <span className="time-label">{ct.label}</span>
                    <span className="time-detail">{ct.detail}</span>
                    {cookingTime === ct.id && <span className="c-check">✓</span>}
                  </button>
                ))}
              </div>
            </section>

            {error && <div className="error-msg" role="alert">{error}</div>}

            <div className="gen-wrap">
              {isLoading ? (
                <button className="gen-btn stop" onClick={stopGeneration}><span>⏹</span> {t.stopBtn.replace('⏹ ', '')}</button>
              ) : phase === 'idle' ? (
                <button className="gen-btn" onClick={generateProposals}><span>✨</span> {t.generateBtn.replace('✨ ', '')}</button>
              ) : (
                <button className="gen-btn secondary" onClick={resetProposals}><span>🔄</span> {t.resetBtn.replace('🔄 ', '')}</button>
              )}
            </div>

            {phase === 'proposals-loading' && (
              <div className="loading-state">
                <span className="chef-anim">👨‍🍳</span>
                <p>{t.proposalsLoadingMsg}</p>
                <div className="dots"><span /><span /><span /></div>
              </div>
            )}

            {showProposals && (
              <section className="proposals-section" ref={proposalsRef}>
                <h2 className="proposals-title">{t.proposalsTitle}</h2>
                <p className="proposals-subtitle">{phase === 'recipe' || phase === 'recipe-loading' ? t.proposalsSubChange : t.proposalsSub}</p>
                <div className="proposals-grid">
                  {proposals.map((p, i) => (
                    <button key={i}
                      className={`proposal-card${selectedIdx === i ? ' selected' : ''}${isLoading ? ' disabled' : ''}`}
                      onClick={() => selectProposal(p, i)} disabled={isLoading}
                      style={{ animationDelay: `${i * 0.07}s` }}>
                      <div className="proposal-img-wrap">
                        <img
                          src={`https://loremflickr.com/400/300/${p.nom.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,',')},food?lock=${i}`}
                          alt={p.nom}
                          className="proposal-img"
                          onLoad={e => { e.target.classList.add('loaded'); e.target.parentElement.classList.add('img-loaded'); }}
                          onError={e => { e.target.parentElement.classList.add('img-error'); e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="proposal-emoji">{p.emoji}</div>
                      <h3 className="proposal-nom">{p.nom}</h3>
                      <span className="proposal-cuisine-badge">{p.cuisine}</span>
                      <p className="proposal-desc">{p.description}</p>
                      <div className="proposal-meta">
                        <span className="proposal-meta-item">🔪 {p.tempsPrep}</span>
                        <span className="proposal-meta-item">🔥 {p.tempsCuisson}</span>
                        <span className="proposal-meta-item">📊 {p.difficulte}</span>
                      </div>
                      {p.calories && (
                        <div className="proposal-macros">
                          <span>🔥 {p.calories} kcal</span>
                          <span>💪 {p.protein}g</span>
                          <span>🍞 {p.carbs}g</span>
                          <span>🫒 {p.fat}g</span>
                        </div>
                      )}
                      {selectedIdx === i && <span className="proposal-check">✓</span>}
                    </button>
                  ))}
                </div>
                {!isLoading && (
                  <div className="load-more-container">
                    <button className="load-more-btn" onClick={loadMoreProposals} disabled={loadingMore}>
                      {loadingMore
                        ? <><span className="load-more-spinner" /><span>{t.loadingMoreMsg}</span></>
                        : t.loadMoreBtn
                      }
                    </button>
                  </div>
                )}
              </section>
            )}

            {showCheck && (
              <section className="check-section" ref={checkRef}>
                {phase === 'check-loading' ? (
                  <div className="loading-state">
                    <span className="chef-anim">🛒</span>
                    <p>{t.checkLoadingMsg}</p>
                    <div className="dots"><span /><span /><span /></div>
                  </div>
                ) : (
                  <div className="check-card">
                    <div className="check-header">
                      <h2>{t.checkTitle}</h2>
                      <p>{t.checkSub(selectedProposal.nom)}</p>
                    </div>
                    {checkIngredients.length > 0 ? (
                      <div className="check-list">
                        {checkIngredients.map((ing, i) => (
                          <div key={i} className={`check-item${ing.checked ? ' has-it' : ''}`} onClick={() => toggleCheckIng(i)} style={{ animationDelay: `${i * 0.04}s` }}>
                            <span className="check-emoji">{ing.emoji}</span>
                            <div className="check-info">
                              <span className="check-name">{ing.name}</span>
                              {ing.note && <span className="check-note">{ing.note}</span>}
                            </div>
                            <div className={`toggle${ing.checked ? ' on' : ''}`}><div className="toggle-thumb" /></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="check-empty">{t.checkEmpty}</p>
                    )}
                    {checkIngredients.some(i => !i.checked) && <p className="check-sub-note">{t.checkNote}</p>}
                    <button className="gen-btn check-gen-btn" onClick={generateFullRecipe}>
                      <span>👨‍🍳</span> {t.checkGenBtn.replace('👨‍🍳 ', '')}
                    </button>
                  </div>
                )}
              </section>
            )}

            {showRecipe && (
              <section className="recipes-section" ref={recipeRef}>
                <div className="recipes-header">
                  <h2>{t.recipeTitle}</h2>
                  <div className="recipe-actions">
                    {phase === 'recipe' && !saved && (
                      <button className={`save-btn${heartPop ? ' heart-pop' : ''}`} onClick={saveRecipe} disabled={saving}>
                        {saving ? '…' : t.saveBtn}
                      </button>
                    )}
                    {saved && <span className="saved-confirm">{t.savedConfirm}</span>}
                  </div>
                </div>
                {phase === 'recipe-loading' && !recipeText && (
                  <div className="loading-state">
                    <span className="chef-anim">👨‍🍳</span>
                    <p>{t.recipeLoadingMsg}</p>
                    <div className="dots"><span /><span /><span /></div>
                  </div>
                )}
                {recipeText && (
                  <div className="recipes-card">
                    <RecipeContent text={recipeText} isStreaming={phase === 'recipe-loading'} />
                  </div>
                )}
              </section>
            )}

          </div>
        </main>
      )}

      <footer className="footer">
        <div className="container">
          <p>{t.footerText}</p>
        </div>
      </footer>
    </div>
  )
}
