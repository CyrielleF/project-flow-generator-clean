import { OPENAI_CONFIG } from "@/config/openai";

interface GenerateContentResponse {
  epics: {
    title: string;
    description: string;
    stories: {
      title: string;
      description: string;
    }[];
  }[];
}

export const generateProjectContent = async (
  projectTitle: string,
  projectDescription: string
): Promise<GenerateContentResponse> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "Tu es un expert en gestion de projet agile, spécialisé dans la création d'EPICs et de User Stories. Tu dois générer du contenu structuré et pertinent pour les projets."
          },
          {
            role: "user",
            content: `Génère des EPICs et User Stories pour le projet suivant:
            
            Titre: ${projectTitle}
            Description: ${projectDescription}
            
            Instructions:
            1. Crée 3 à 5 EPICs pertinents qui couvrent les principaux aspects du projet
            2. Pour chaque EPIC, génère 3 à 5 User Stories qui décrivent des fonctionnalités spécifiques
            3. Utilise le format "En tant que [rôle], je veux [action] afin de [bénéfice]" pour les User Stories
            4. Assure-toi que chaque EPIC et User Story soit concret et actionnable
            
            Retourne la réponse au format JSON suivant:
            {
              "epics": [{
                "title": "Titre de l'EPIC",
                "description": "Description détaillée de l'EPIC",
                "stories": [{
                  "title": "Titre de la User Story",
                  "description": "Description complète de la User Story"
                }]
              }]
            }`
          }
        ],
        temperature: OPENAI_CONFIG.temperature,
        max_tokens: OPENAI_CONFIG.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return content;
  } catch (error) {
    console.error('Erreur lors de la génération du contenu:', error);
    throw new Error('Impossible de générer le contenu du projet. Veuillez réessayer.');
  }
}; 