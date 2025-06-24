// Configuration OpenAI
export const OPENAI_CONFIG = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  model: "gpt-3.5-turbo",
  temperature: 0.7,
  maxTokens: 2000,
};

// Validation de la configuration
if (!OPENAI_CONFIG.apiKey) {
  console.warn('⚠️ La clé API OpenAI n\'est pas configurée. Veuillez définir VITE_OPENAI_API_KEY dans votre fichier .env');
} else {
  console.log('✅ Clé API OpenAI configurée');
}
