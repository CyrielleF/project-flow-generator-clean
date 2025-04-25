// Débogage des variables d'environnement
console.log('DEBUG - Variables d\'environnement disponibles:', Object.keys(import.meta.env));
console.log('DEBUG - VITE_OPENAI_API_KEY définie:', !!import.meta.env.VITE_OPENAI_API_KEY);
console.log('DEBUG - Valeur de process.env:', typeof process !== 'undefined' ? 'process.env existe' : 'process.env n\'existe pas');

// Clé API explicite (en cas de problème avec les variables d'environnement)
// ATTENTION: Cette approche est temporaire pour déboguer - à supprimer ensuite
const EXPLICIT_API_KEY = "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";

// IMPORTANT : NE JAMAIS mettre de clés API directement dans le code source
// Utilisez toujours des variables d'environnement pour les secrets
export const OPENAI_CONFIG = {
  // Utiliser la clé explicite temporairement pour déboguer
  apiKey: EXPLICIT_API_KEY, // import.meta.env.VITE_OPENAI_API_KEY || '',
  model: "gpt-3.5-turbo",
  temperature: 0.7,
  maxTokens: 2000,
};

// Validation de la configuration
if (!OPENAI_CONFIG.apiKey) {
  console.warn('⚠️ La clé API OpenAI n\'est pas configurée. Veuillez définir VITE_OPENAI_API_KEY dans votre fichier .env');
} else {
  console.log('✅ Clé API OpenAI configurée. Longueur:', OPENAI_CONFIG.apiKey.length);
  console.log('✅ Premiers caractères de la clé:', OPENAI_CONFIG.apiKey.substring(0, 10) + '...');
}
