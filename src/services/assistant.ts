import { OPENAI_CONFIG } from "@/config/openai";

interface UserStory {
  epic: string;
  story: string;
  acceptanceCriteria: {
    given: string;
    when: string;
    then: string;
  }[];
  kpis: string;
  designLink: string;
}

interface Epic {
  title: string;
  objective: string;
  problemAddressed: string;
  businessValue: string;
  stories: UserStory[];
}

interface ProjectContent {
  epics: Epic[];
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const MAX_ATTEMPTS = 60; // Augmenté à 60 secondes
const POLLING_INTERVAL = 2000; // 2 secondes entre chaque vérification

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkRunStatus = async (threadId: string, runId: string, retryCount = 0): Promise<any> => {
  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Erreur API (${response.status}):`, errorData);
      
      if (response.status === 500 && retryCount < MAX_RETRIES) {
        console.log(`Tentative ${retryCount + 1}/${MAX_RETRIES} - Attente de ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return checkRunStatus(threadId, runId, retryCount + 1);
      }
      
      throw new Error(`Erreur lors de la vérification du statut (${response.status}): ${errorData}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && retryCount < MAX_RETRIES) {
      console.log(`Erreur réseau, tentative ${retryCount + 1}/${MAX_RETRIES} - Attente de ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
      return checkRunStatus(threadId, runId, retryCount + 1);
    }
    throw error;
  }
};

const ASSISTANT_IDS = {
  EPICS: 'asst_FCjQ7uT86lbc2y1oz9opxgpO',
  USER_STORIES: 'asst_BnNg3nqA8uBPfftaAKZL2xGh'
};

export const generateProjectSpecifications = async (
  projectTitle: string,
  projectDescription: string
): Promise<ProjectContent> => {
  try {
    console.log('Début de la génération des spécifications...');
    console.log('Clé API disponible:', !!OPENAI_CONFIG.apiKey);

    if (!OPENAI_CONFIG.apiKey) {
      throw new Error('La clé API OpenAI n\'est pas configurée');
    }

    // 1. Générer d'abord les EPICs
    console.log('Génération des EPICs...');
    const epicsContent = await generateEpics(projectTitle, projectDescription);
    
    // 2. Pour chaque EPIC, générer les User Stories
    console.log('Génération des User Stories pour chaque EPIC...');
    const epicsWithStories = await Promise.all(
      epicsContent.epics.map(async (epic) => {
        const stories = await generateUserStories(epic.title, epic.objective, projectTitle);
        return {
          ...epic,
          stories
        };
      })
    );

    return {
      epics: epicsWithStories
    };
  } catch (error) {
    console.error('Erreur lors de la génération des spécifications:', error);
    throw error;
  }
};

const generateEpics = async (projectTitle: string, projectDescription: string): Promise<ProjectContent> => {
  try {
    // 1. Créer un thread
    console.log('Création du thread pour les EPICs...');
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      throw new Error(`Erreur lors de la création du thread (${threadResponse.status}): ${error}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread créé:', thread.id);

    // 2. Ajouter un message au thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: `Projet : ${projectTitle}\n\nDescription détaillée : ${projectDescription}\n\nMerci de générer les EPICs pour ce projet selon le format spécifié dans tes instructions.`
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      throw new Error(`Erreur lors de l'ajout du message (${messageResponse.status}): ${error}`);
    }

    // 3. Exécuter l'assistant pour les EPICs
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_IDS.EPICS
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      throw new Error(`Erreur lors du lancement de l'assistant (${runResponse.status}): ${error}`);
    }

    const run = await runResponse.json();
    console.log('Run créé pour les EPICs:', run.id);

    // 4. Attendre la réponse
    let runStatus = await checkRunStatus(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      if (runStatus.status === 'failed') {
        throw new Error('La génération des EPICs a échoué: ' + (runStatus.last_error?.message || 'Erreur inconnue'));
      }
      await sleep(1000);
      runStatus = await checkRunStatus(thread.id, run.id);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout: La génération des EPICs a pris trop de temps');
    }

    // 5. Récupérer les messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      throw new Error(`Erreur lors de la récupération des messages (${messagesResponse.status}): ${error}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('Pas de réponse de l\'assistant pour les EPICs');
    }

    const response = assistantMessage.content[0].text.value;
    return parseAssistantResponse(response);
  } catch (error) {
    console.error('Erreur lors de la génération des EPICs:', error);
    throw error;
  }
};

const generateUserStories = async (epicTitle: string, epicObjective: string, projectTitle: string): Promise<UserStory[]> => {
  try {
    console.log(`Début de la génération des User Stories pour l'EPIC: ${epicTitle}`);
    console.log('Objectif de l\'EPIC:', epicObjective);

    // 1. Créer un thread
    console.log('Création du thread...');
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      console.error('Erreur de création du thread:', error);
      throw new Error(`Erreur lors de la création du thread (${threadResponse.status}): ${error}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread créé avec succès, ID:', thread.id);

    // 2. Ajouter un message au thread
    console.log('Ajout du message au thread...');
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: `Projet : ${projectTitle}\n\nEPIC : ${epicTitle}\n\nObjectif de l'EPIC : ${epicObjective}\n\nMerci de générer les User Stories pour cet EPIC selon le format spécifié dans tes instructions.`
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.error('Erreur d\'ajout du message:', error);
      throw new Error(`Erreur lors de l'ajout du message (${messageResponse.status}): ${error}`);
    }

    // 3. Exécuter l'assistant
    console.log('Lancement de l\'assistant...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_IDS.USER_STORIES
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Erreur de lancement de l\'assistant:', error);
      throw new Error(`Erreur lors du lancement de l'assistant (${runResponse.status}): ${error}`);
    }

    const run = await runResponse.json();
    console.log('Run créé avec succès, ID:', run.id);

    // 4. Attendre la réponse avec timeout augmenté
    let runStatus = await checkRunStatus(thread.id, run.id);
    let attempts = 0;

    console.log('Attente de la réponse de l\'assistant...');
    while (runStatus.status !== 'completed' && attempts < MAX_ATTEMPTS) {
      if (runStatus.status === 'failed') {
        const errorMessage = runStatus.last_error?.message || 'Erreur inconnue';
        console.error('Échec de la génération:', errorMessage);
        throw new Error('La génération des User Stories a échoué: ' + errorMessage);
      }
      
      if (runStatus.status === 'expired') {
        console.error('Le run a expiré');
        throw new Error('Le run a expiré - veuillez réessayer');
      }

      console.log(`Tentative ${attempts + 1}/${MAX_ATTEMPTS} - Statut: ${runStatus.status}`);
      await sleep(POLLING_INTERVAL);
      runStatus = await checkRunStatus(thread.id, run.id);
      attempts++;
    }

    if (attempts >= MAX_ATTEMPTS) {
      console.error('Timeout atteint après', MAX_ATTEMPTS * (POLLING_INTERVAL / 1000), 'secondes');
      throw new Error(`Timeout: La génération des User Stories a pris trop de temps (${MAX_ATTEMPTS * (POLLING_INTERVAL / 1000)} secondes)`);
    }

    // 5. Récupérer les messages
    console.log('Récupération des messages...');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      console.error('Erreur de récupération des messages:', error);
      throw new Error(`Erreur lors de la récupération des messages (${messagesResponse.status}): ${error}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage) {
      console.error('Pas de message de l\'assistant trouvé');
      throw new Error('Pas de réponse de l\'assistant pour les User Stories');
    }

    console.log('Message de l\'assistant récupéré avec succès');
    const response = assistantMessage.content[0].text.value;
    return parseUserStoriesResponse(response, epicTitle);
  } catch (error) {
    console.error(`Erreur lors de la génération des User Stories pour l'EPIC ${epicTitle}:`, error);
    throw error;
  }
};

const parseUserStoriesResponse = (response: string, epicTitle: string): UserStory[] => {
  try {
    console.log('=== DÉBUT DU PARSING DE LA RÉPONSE DES USER STORIES ===');
    console.log('Réponse brute de l\'assistant:', response);
    
    // Essayer d'abord de parser comme du JSON
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1];
        const parsed = JSON.parse(jsonStr);
        console.log('JSON parsé avec succès:', parsed);
        
        if (parsed.stories && Array.isArray(parsed.stories)) {
          console.log(`${parsed.stories.length} stories trouvées dans le JSON`);
          return parsed.stories.map(story => ({
            epic: epicTitle, // Utiliser l'EPIC title fourni plutôt que celui du JSON
            story: story.story,
            acceptanceCriteria: story.acceptanceCriteria || [],
            kpis: story.kpis || '',
            designLink: story.designLink || ''
          }));
        }
      }
    } catch (jsonError) {
      console.log('Échec du parsing JSON, tentative avec les autres formats');
    }
    
    // Si le parsing JSON échoue, essayer les autres formats
    let stories = extractUserStories(response, epicTitle);
    
    if (stories.length === 0) {
      console.log('Premier format échoué, tentative avec le format alternatif');
      stories = extractUserStoriesAlternative(response, epicTitle);
    }
    
    if (stories.length === 0) {
      console.log('Tentative avec le format simple');
      const simpleStoryRegex = /En tant que\s+(.*?),\s*je veux\s+(.*?),\s*afin de\s+(.*?)(?:\.|$)/gi;
      const matches = [...response.matchAll(simpleStoryRegex)];
      
      if (matches.length > 0) {
        console.log(`Format simple trouvé avec ${matches.length} stories`);
        stories = matches.map(match => ({
          epic: epicTitle,
          story: match[0].trim(),
          acceptanceCriteria: [],
          kpis: '',
          designLink: ''
        }));
      }
    }
    
    console.log(`Nombre total de stories extraites: ${stories.length}`);
    stories.forEach((story, index) => {
      console.log(`Story ${index + 1}:`, story.story.substring(0, 100));
    });
    
    return stories;
  } catch (error) {
    console.error('Erreur lors du parsing des User Stories:', error);
    return [];
  }
};

// Fonction pour extraire les user stories - format standard
const extractUserStories = (epicText: string, epicTitle: string): UserStory[] => {
  console.log('=== EXTRACTION DES USER STORIES ===');
  console.log('EPIC:', epicTitle);
  console.log('Texte à analyser (début):', epicText.substring(0, 200));
  
  try {
    // 1. Essayer d'abord le format avec sections numérotées
    const userStoryRegex = /(?:##### )?User Story \d+[\s:]*([\s\S]*?)(?=(?:##### )?User Story \d+|$)/g;
    const matches = [...epicText.matchAll(userStoryRegex)];
    
    if (matches.length > 0) {
      console.log(`Format structuré détecté avec ${matches.length} user stories`);
      
      return matches.map(match => {
        const storyText = match[1] || match[0];
        console.log('\nAnalyse d\'une User Story:');
        console.log('Texte brut:', storyText.substring(0, 150));
        
        // Essayer plusieurs formats pour l'énoncé de la user story
        const storyPatterns = [
          /En tant que\s+(.*?),\s*[Jj]e veux\s+(.*?),\s*[Aa]fin de\s+(.*?)(?:\.|$)/s,
          /\*\*User Story :\*\*\s*En tant que\s+(.*?),\s*[Jj]e veux\s+(.*?),\s*[Aa]fin de\s+(.*?)(?:\.|$)/s,
          /User Story :\s*En tant que\s+(.*?),\s*[Jj]e veux\s+(.*?),\s*[Aa]fin de\s+(.*?)(?:\.|$)/s
        ];
        
        let story = '';
        let storyMatch = null;
        
        for (const pattern of storyPatterns) {
          storyMatch = storyText.match(pattern);
          if (storyMatch) {
            story = `En tant que ${storyMatch[1]}, je veux ${storyMatch[2]}, afin de ${storyMatch[3]}`;
            console.log('Format trouvé:', pattern.source);
            console.log('Story extraite:', story);
            break;
          }
        }
        
        if (!story) {
          // Fallback : prendre tout le texte jusqu'à la première section
          story = storyText.split(/\n\s*\n/)[0].trim();
          console.log('Utilisation du fallback. Story:', story);
        }
        
        // Extraire les critères d'acceptance
        const acceptanceCriteria = extractAcceptanceCriteria(storyText);
        console.log(`${acceptanceCriteria.length} critères d'acceptance trouvés`);
        
        // Extraire KPIs et liens design
        const kpis = extractValue(storyText, 'KPIs définis') || extractValue(storyText, 'KPIs') || '';
        const designLink = extractValue(storyText, 'Lien vers la maquette') || 
                         extractValue(storyText, 'Lien vers le design') || 
                         extractValue(storyText, 'Design Link') || '';
        
        return {
          epic: epicTitle,
          story,
          acceptanceCriteria,
          kpis,
          designLink
        };
      });
    }
    
    console.log('Format structuré non trouvé, passage au format alternatif');
    return [];
  } catch (error) {
    console.error('Erreur lors de l\'extraction des user stories:', error);
    console.error('Stack trace:', error.stack);
    return [];
  }
};

// Format alternatif pour les user stories
const extractUserStoriesAlternative = (epicText: string, epicTitle: string): UserStory[] => {
  console.log('Extraction des user stories (format alternatif) pour EPIC:', epicTitle);
  
  try {
    // Chercher les éléments de liste comme "1. En tant que consultant, je veux..."
    const userStoryRegex = /\d+\.\s*En tant que\s+(.*?),\s*je veux\s+(.*?)\s*afin de\s+(.*?)\.?\n/g;
    const matches = [...epicText.matchAll(userStoryRegex)];
    
    if (matches.length > 0) {
      console.log(`Format liste détecté avec ${matches.length} user stories`);
      
      return matches.map(match => {
        const story = match[0].trim();
        console.log('User Story détectée (format liste):', story);
        
        // Pour ce format simple, on ne peut pas extraire les critères d'acceptance directement
        return {
          epic: epicTitle,
          story,
          acceptanceCriteria: [], // Pas de critères d'acceptance disponibles dans ce format
          kpis: '',
          designLink: ''
        };
      });
    } else {
      // Format de base
      console.log('Aucun format de user story reconnu, utilisation du format de base');
      const stories = epicText.split('User Story').filter(Boolean).map(storyText => {
        return {
          epic: epicTitle,
          story: extractValue(storyText, 'En tant que'),
          acceptanceCriteria: extractAcceptanceCriteria(storyText),
          kpis: extractValue(storyText, 'KPIs définis'),
          designLink: extractValue(storyText, 'Lien vers la maquette')
        };
      });
      
      return stories;
    }
  } catch (error) {
    console.error('Erreur lors de l\'extraction des user stories alternatives:', error);
    return [];
  }
};

// Amélioration de l'extraction des critères d'acceptance
const extractAcceptanceCriteria = (storyText: string): { given: string; when: string; then: string; }[] => {
  console.log('Extraction des critères d\'acceptance');
  
  try {
    // Rechercher la section des critères d'acceptance
    const criteriaSection = storyText.match(/\*\*Critères d'acceptance :\*\*([\s\S]*?)(?=\*\*KPIs|$)/);
    
    if (!criteriaSection) {
      console.log('Section des critères d\'acceptance non trouvée');
      return [];
    }
    
    const criteriaText = criteriaSection[1];
    console.log('Section des critères trouvée (extrait):', criteriaText.substring(0, 100) + '...');
    
    // Format structuré: "Étant donné... Quand... Alors..."
    const criteriaRegex = /[*•-]?\s*Étant donné\s+(.*?),\s*Quand\s+(.*?),\s*Alors\s+(.*?)\.?\n/gs;
    const matches = [...criteriaText.matchAll(criteriaRegex)];
    
    if (matches.length > 0) {
      console.log(`${matches.length} critères d'acceptance structurés trouvés`);
      
      return matches.map(match => ({
        given: match[1].trim(),
        when: match[2].trim(),
        then: match[3].trim()
      }));
    } else {
      console.log('Aucun critère d\'acceptance structuré trouvé');
      return [];
    }
  } catch (error) {
    console.error('Erreur lors de l\'extraction des critères d\'acceptance:', error);
    return [];
  }
};

// Fonction spéciale pour extraire les valeurs au format "* **Objectif :** texte"
const extractDoubleStarValue = (text: string, field: string): string => {
  // Format "* **Objectif :** texte"
  const regex = new RegExp(`\\*\\s*\\*\\*${field}\\s*:\\*\\*\\s*([^\\n]+)`, 'i');
  const match = text.match(regex);
  if (match) {
    console.log(`Valeur extraite pour ${field}:`, match[1].trim().substring(0, 30) + '...');
    return match[1].trim();
  }
  return '';
};

// Fonction améliorée pour extraire les valeurs
const extractValue = (text: string, field: string): string => {
  // Recherche les motifs comme "**Objectif :** valeur" ou "*Objectif :* valeur"
  const patterns = [
    new RegExp(`\\*\\*${field}\\s*:\\*\\*\\s*([^\\n]+)`),  // **Objectif :** valeur
    new RegExp(`\\*${field}\\s*:\\*\\s*([^\\n]+)`),        // *Objectif :* valeur
    new RegExp(`${field}\\s*:\\s*([^\\n]+)`)              // Objectif : valeur (simple)
  ];
  
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      console.log(`Valeur extraite pour '${field}': ${match[1].trim()}`);
      return match[1].trim();
    }
  }
  
  console.log(`Aucune valeur trouvée pour '${field}'`);
  return '';
};

// Fonction pour créer un fichier téléchargeable contenant la réponse
const createDownloadableResponse = (content: string, projectTitle: string) => {
  try {
    // Créer un élément a pour le téléchargement
    const element = document.createElement('a');
    // Convertir la réponse en blob
    const file = new Blob([content], {type: 'text/plain'});
    // Créer une URL pour le blob
    element.href = URL.createObjectURL(file);
    // Définir le nom du fichier
    const safeTitle = projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    element.download = `response_${safeTitle}_${new Date().toISOString().slice(0, 10)}.txt`;
    
    // Ajouter temporairement l'élément à la page
    document.body.appendChild(element);
    
    // Afficher un bouton dans la console pour télécharger le fichier
    console.log(
      '%cTélécharger la réponse complète', 
      'background: #4CAF50; color: white; padding: 5px; border-radius: 5px; font-weight: bold; cursor: pointer;'
    );
    console.log('Pour télécharger la réponse, exécutez dans la console:');
    console.log(`document.querySelector('a[download="${element.download}"]').click()`);
    
    // Supprimer l'élément (mais garder l'URL)
    document.body.removeChild(element);
  } catch (e) {
    console.error('Erreur lors de la création du fichier téléchargeable:', e);
  }
};

// Fonction pour parser la réponse de l'assistant pour les EPICs
const parseAssistantResponse = (response: string): ProjectContent => {
  try {
    const epics = response.split('### EPIC').filter(Boolean).map(epicText => {
      const title = extractValue(epicText, 'Titre') || 'EPIC sans titre';
      return {
        title,
        objective: extractValue(epicText, 'Objectif'),
        problemAddressed: extractValue(epicText, 'Problématique adressée'),
        businessValue: extractValue(epicText, 'Valeur métier'),
        stories: []
      };
    });
    return { epics };
  } catch (error) {
    console.error('Erreur lors du parsing de la réponse:', error);
    throw error;
  }
}; 