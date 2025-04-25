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
      console.error('Erreur thread response:', error);
      throw new Error(`Erreur lors de la création du thread: ${threadResponse.status} - ${error}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread créé:', thread.id);

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
        content: `Projet : ${projectTitle}\n\nDescription détaillée : ${projectDescription}\n\nMerci de générer les EPICs et User Stories pour ce projet selon le format spécifié dans tes instructions.`
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.error('Erreur message response:', error);
      throw new Error(`Erreur lors de l'ajout du message: ${messageResponse.status} - ${error}`);
    }

    console.log('Message ajouté au thread');

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
        assistant_id: 'asst_FCjQ7uT86lbc2y1oz9opxgpO'
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Erreur run response:', error);
      throw new Error(`Erreur lors du lancement de l'assistant: ${runResponse.status} - ${error}`);
    }

    const run = await runResponse.json();
    console.log('Run créé:', run.id);

    // 4. Attendre la réponse (polling)
    console.log('Attente de la réponse...');
    let runStatus = await checkRunStatus(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 30; // 30 secondes maximum

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      if (runStatus.status === 'failed') {
        console.error('Run status failed:', runStatus);
        throw new Error('La génération a échoué: ' + runStatus.last_error?.message || 'Erreur inconnue');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await checkRunStatus(thread.id, run.id);
      attempts++;
      console.log('Status actuel:', runStatus.status, `(tentative ${attempts}/${maxAttempts})`);
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout: La génération a pris trop de temps');
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
      console.error('Erreur messages response:', error);
      throw new Error(`Erreur lors de la récupération des messages: ${messagesResponse.status} - ${error}`);
    }

    const messages = await messagesResponse.json();
    
    // Logs plus ciblés et visibles
    console.log('---------- DÉBUT STRUCTURE DES MESSAGES ----------');
    console.log('Nombre de messages:', messages.data?.length || 0);
    console.log('Premier message ID:', messages.data?.[0]?.id);
    console.log('Types de messages présents:', messages.data?.map(m => m.role).join(', '));
    console.log('---------- FIN STRUCTURE DES MESSAGES ----------');
    
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('Pas de réponse de l\'assistant');
    }

    // Logs plus ciblés sur le message de l'assistant
    console.log('---------- DÉBUT MESSAGE ASSISTANT ----------');
    console.log('ID du message:', assistantMessage.id);
    console.log('Rôle:', assistantMessage.role);
    console.log('Type de contenu:', assistantMessage.content?.[0]?.type);
    console.log('Longueur du texte:', assistantMessage.content?.[0]?.text?.value?.length || 0);
    console.log('---------- FIN MESSAGE ASSISTANT ----------');
    
    // 6. Parser et formater la réponse
    console.log('Parsing de la réponse...');
    
    // Vérifier le format du contenu pour éviter les erreurs
    if (!assistantMessage.content || !assistantMessage.content[0] || !assistantMessage.content[0].text || !assistantMessage.content[0].text.value) {
      console.error('Format de réponse inattendu:', assistantMessage);
      throw new Error('Format de réponse inattendu de l\'assistant');
    }
    
    const content = assistantMessage.content[0].text.value;
    
    // Afficher une partie du contenu pour le débogage
    console.log('---------- DÉBUT CONTENU (EXTRAIT) ----------');
    console.log(content.substring(0, 500) + '...');
    console.log('---------- FIN CONTENU (EXTRAIT) ----------');
    
    // Écrire le contenu complet dans le localStorage pour consultation ultérieure
    try {
      localStorage.setItem('lastAssistantResponse', content);
      console.log('Contenu complet sauvegardé dans localStorage.lastAssistantResponse pour consultation');
      
      // Créer une version téléchargeable du contenu pour référence
      createDownloadableResponse(content, projectTitle);
    } catch (e) {
      console.log('Impossible de sauvegarder dans localStorage:', e);
    }
    
    // Logs de débogage pour le parsing 
    console.log('Sections EPIC trouvées:', content.split('EPIC').length - 1);
    
    // Créer une version modifiée du parser pour analyser la structure
    console.log('Analyse de la structure de la réponse:');
    const epicSections = content.split(/### EPIC \d+ :/).filter(Boolean);
    if (epicSections.length > 0) {
      console.log(`Nombre d'EPICs détectés (format ###): ${epicSections.length}`);
      console.log('Premier EPIC (extrait):', epicSections[0].substring(0, 200) + '...');
      
      // Essayer de détecter le format des User Stories
      const userStoryPattern = /##### User Story \d+/;
      const hasStructuredUserStories = userStoryPattern.test(content);
      console.log('Format de User Stories structuré détecté:', hasStructuredUserStories);
      
      if (hasStructuredUserStories) {
        const userStoryMatches = content.match(/##### User Story \d+/g);
        console.log(`Nombre de User Stories détectées: ${userStoryMatches ? userStoryMatches.length : 0}`);
      }
    } else {
      // Essayer d'autres formats si le format principal n'est pas détecté
      console.log('Format ### EPIC non détecté, recherche d\'alternatives...');
      
      // Vérifier si le format utilise simplement "EPIC" sans le motif "### EPIC N :"
      const simpleEpicSections = content.split(/EPIC \d+/).filter(Boolean);
      if (simpleEpicSections.length > 0) {
        console.log(`Nombre d'EPICs détectés (format simple): ${simpleEpicSections.length}`);
      }
    }

    return parseAssistantResponse(content);
  } catch (error) {
    console.error('Erreur détaillée lors de la génération des spécifications:', error);
    throw error;
  }
};

const checkRunStatus = async (threadId: string, runId: string) => {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
    headers: {
      'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de la vérification du statut: ${response.status}`);
  }

  return response.json();
};

// Amélioration de la fonction de parsing pour mieux gérer différents formats
const parseAssistantResponse = (response: string): ProjectContent => {
  console.log('DÉMARRAGE DU PARSING DE LA RÉPONSE');
  try {
    // Vérifier si c'est le format spécifique avec "### EPIC N : Titre" 
    // comme dans l'exemple fourni par l'utilisateur
    const epicRegex0 = /### EPIC \d+ : ([^\n]+)/g;
    const epicTitles = [...response.matchAll(epicRegex0)].map(match => match[1].trim());
    
    if (epicTitles.length > 0) {
      console.log('Format détecté: "### EPIC N : Titre" avec', epicTitles.length, 'EPICs');
      console.log('Titres des EPICs:', epicTitles);
      
      // Diviser le contenu en sections d'EPIC
      const epicTexts = response.split(/(?=### EPIC \d+ :)/).filter(Boolean);
      console.log('Nombre de sections EPIC trouvées:', epicTexts.length);
      
      const epics = epicTexts.map((epicText, index) => {
        const title = epicTitles[index] || `EPIC ${index + 1}`;
        console.log(`\nTraitement de l'EPIC: ${title}`);
        
        // Extraire les informations principales de l'EPIC
        const objective = extractDoubleStarValue(epicText, 'Objectif');
        const problemAddressed = extractDoubleStarValue(epicText, 'Problématique adressée');
        const businessValue = extractDoubleStarValue(epicText, 'Valeur métier');
        
        console.log('Valeurs extraites:', { 
          objective: objective ? objective.substring(0, 30) + '...' : 'non trouvé',
          problemAddressed: problemAddressed ? problemAddressed.substring(0, 30) + '...' : 'non trouvé',
          businessValue: businessValue ? businessValue.substring(0, 30) + '...' : 'non trouvé'
        });
        
        // Extraction des user stories au format "1. En tant que consultant, je veux..."
        const userStoriesSection = epicText.includes('User Stories associées') 
          ? epicText.split('User Stories associées')[1] 
          : '';
          
        const storiesRegex = /\d+\.\s*En tant que\s+([^,]+),\s*je veux\s+([^,]+),\s*afin de\s+([^\n\.]+)/gi;
        const storyMatches = [...userStoriesSection.matchAll(storiesRegex)];
        
        console.log(`Nombre de user stories trouvées dans l'EPIC ${title}:`, storyMatches.length);
        
        const stories = storyMatches.map(match => {
          const persona = match[1].trim();
          const action = match[2].trim();
          const benefit = match[3].trim();
          const storyText = `En tant que ${persona}, je veux ${action}, afin de ${benefit}`;
          
          console.log('User story extraite:', storyText.substring(0, 50) + '...');
          
          return {
            epic: title,
            story: storyText,
            acceptanceCriteria: [], // Ces informations ne sont pas dans le format liste
            kpis: '',              // Ces informations ne sont pas dans le format liste
            designLink: ''         // Ces informations ne sont pas dans le format liste
          };
        });
        
        return {
          title,
          objective,
          problemAddressed,
          businessValue,
          stories
        };
      });
      
      console.log(`Parsing terminé, ${epics.length} EPICs extraits avec ${epics.reduce((sum, epic) => sum + epic.stories.length, 0)} user stories au total`);
      return { epics };
    }
    
    // Si ce n'est pas le format spécifique, essayer les autres formats...
    // Vérifier d'abord le format avec ### EPIC N :
    let epics: Epic[] = [];
    const epicRegex1 = /### EPIC \d+ :([\s\S]*?)(?=### EPIC \d+ :|$)/g;
    let epicMatches1 = [...response.matchAll(epicRegex1)];
    
    console.log(`Tentative de parsing avec regex "### EPIC N :" : ${epicMatches1.length} correspondances`);
    
    if (epicMatches1.length > 0) {
      console.log('Utilisation du format "### EPIC N :"');
      epics = epicMatches1.map(match => {
        const epicText = match[0];
        console.log('Texte d\'un EPIC (extrait):', epicText.substring(0, 100) + '...');
        
        // Extraire le titre de l'EPIC
        const titleMatch = epicText.match(/### EPIC \d+ : (.*)/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        console.log('Titre extrait:', title);
        
        // Extraire objectif, problématique et valeur métier
        const objective = extractValue(epicText, 'Objectif');
        const problemAddressed = extractValue(epicText, 'Problématique adressée');
        const businessValue = extractValue(epicText, 'Valeur métier');
        
        console.log('Objectif extrait:', objective);
        console.log('Problématique extraite:', problemAddressed);
        console.log('Valeur métier extraite:', businessValue);
        
        // Extraire les user stories
        const stories = extractUserStories(epicText, title);
        console.log(`Nombre de User Stories extraites: ${stories.length}`);
        
        return {
          title,
          objective,
          problemAddressed,
          businessValue,
          stories
        };
      });
    } else {
      // Format alternatif sans "###" ou autre
      console.log('Format "### EPIC N :" non détecté, tentative avec format alternatif');
      
      // Essayer de détecter si les EPICs sont séparés par des lignes comme "EPIC 1 : Titre"
      const epicRegex2 = /EPIC \d+[ :]+(.*?)(?=\n\s*\*\s*\*\*Objectif)/g;
      const titleMatches = [...response.matchAll(epicRegex2)];
      
      if (titleMatches.length > 0) {
        console.log(`Format alternatif détecté avec ${titleMatches.length} EPICs`);
        
        // Diviser le contenu par sections d'EPIC
        const epicRegex3 = /EPIC \d+[ :]+[\s\S]*?(?=EPIC \d+[ :]+|$)/g;
        const epicMatches3 = [...response.matchAll(epicRegex3)];
        
        epics = epicMatches3.map(match => {
          const epicText = match[0];
          console.log('Texte d\'un EPIC (format alternatif, extrait):', epicText.substring(0, 100) + '...');
          
          // Extraire le titre
          const titleMatch = epicText.match(/EPIC \d+[ :]+(.*?)(?=\n)/);
          const title = titleMatch ? titleMatch[1].trim() : '';
          console.log('Titre extrait (format alternatif):', title);
          
          // Extraire objectif, problématique et valeur métier
          const objective = extractValue(epicText, 'Objectif');
          const problemAddressed = extractValue(epicText, 'Problématique adressée');
          const businessValue = extractValue(epicText, 'Valeur métier');
          
          // Extraire les user stories pour ce format
          const stories = extractUserStoriesAlternative(epicText, title);
          console.log(`Nombre de User Stories extraites (format alternatif): ${stories.length}`);
          
          return {
            title,
            objective,
            problemAddressed,
            businessValue,
            stories
          };
        });
      } else {
        // Dernier recours - format simple
        console.log('Utilisation du format simple par défaut');
        epics = response.split('EPIC').filter(Boolean).map(epicText => {
          console.log('Traitement d\'un EPIC (format simple)');
          return {
            title: extractValue(epicText, 'Nom de l\'EPIC') || 'EPIC sans titre',
            objective: extractValue(epicText, 'Objectif'),
            problemAddressed: extractValue(epicText, 'Problématique adressée'),
            businessValue: extractValue(epicText, 'Valeur métier'),
            stories: extractUserStories(epicText, 'EPIC sans titre')
          };
        });
      }
    }
    
    console.log(`Total des EPICs extraits: ${epics.length}`);
    return { epics };
  } catch (error) {
    console.error('Erreur détaillée lors du parsing:', error);
    throw new Error('Format de réponse invalide: ' + error.message);
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

// Fonction pour extraire les user stories - format standard
const extractUserStories = (epicText: string, epicTitle: string): UserStory[] => {
  console.log('Extraction des user stories pour EPIC:', epicTitle);
  
  try {
    // Chercher le motif "##### User Story N"
    const userStoryRegex = /##### User Story \d+\s*([\s\S]*?)(?=##### User Story \d+|$)/g;
    const matches = [...epicText.matchAll(userStoryRegex)];
    
    if (matches.length > 0) {
      console.log(`Format structuré détecté avec ${matches.length} user stories`);
      
      return matches.map(match => {
        const storyText = match[0];
        console.log('Texte d\'une User Story (extrait):', storyText.substring(0, 100) + '...');
        
        // Extraire l'énoncé de la user story (format "En tant que... Je veux... Afin de...")
        const storyPattern = /\*\*User Story :\*\*\s*En tant que\s+(.*?),\s*Je veux\s+(.*?),\s*Afin de\s+(.*?)\.?\n/s;
        const storyMatch = storyText.match(storyPattern);
        
        let story = '';
        if (storyMatch) {
          story = `En tant que ${storyMatch[1]}, je veux ${storyMatch[2]}, afin de ${storyMatch[3]}`;
        } else {
          // Fallback si le format spécifique n'est pas trouvé
          story = extractValue(storyText, 'User Story') || extractValue(storyText, 'En tant que');
        }
        
        console.log('User Story extraite:', story);
        
        return {
          epic: epicTitle,
          story,
          acceptanceCriteria: extractAcceptanceCriteria(storyText),
          kpis: extractValue(storyText, 'KPIs définis'),
          designLink: extractValue(storyText, 'Lien vers la maquette') || extractValue(storyText, 'Lien vers le design')
        };
      });
    } else {
      // Essayer le format plus simple
      console.log('Format simple des user stories utilisé');
      return extractUserStoriesAlternative(epicText, epicTitle);
    }
  } catch (error) {
    console.error('Erreur lors de l\'extraction des user stories:', error);
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