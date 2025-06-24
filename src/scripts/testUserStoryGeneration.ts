import 'dotenv/config';
import { OPENAI_CONFIG } from "../config/openai.js";

const ASSISTANT_ID = 'asst_BnNg3nqA8uBPfftaAKZL2xGh';

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkRunStatus = async (threadId: string, runId: string): Promise<any> => {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
    headers: {
      'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  if (!response.ok) {
    throw new Error(`Erreur API (${response.status})`);
  }

  return response.json();
};

const generateUserStories = async (epicTitle: string, epicObjective: string, projectTitle: string): Promise<UserStory[]> => {
  console.log('Début de la génération des User Stories...');
  console.log('EPIC:', epicTitle);
  console.log('Objectif:', epicObjective);

  // 1. Créer un thread
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  const thread = await threadResponse.json();
  console.log('Thread créé:', thread.id);

  // 2. Ajouter le message
  const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      role: 'user',
      content: `Projet : ${projectTitle}

EPIC : ${epicTitle}
Objectif de l'EPIC : ${epicObjective}

Merci de générer les User Stories pour cet EPIC. Pour chaque User Story, inclure :
- L'énoncé au format "En tant que [persona], je veux [action], afin de [bénéfice]"
- Les critères d'acceptance au format Gherkin (Given/When/Then)
- Les KPIs pour mesurer le succès
- Un lien vers la maquette (peut être fictif pour ce test)`
    })
  });

  if (!messageResponse.ok) {
    throw new Error('Erreur lors de l\'ajout du message');
  }

  // 3. Lancer l'assistant
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      assistant_id: ASSISTANT_ID
    })
  });

  const run = await runResponse.json();
  console.log('Run créé:', run.id);

  // 4. Attendre la réponse
  let runStatus = await checkRunStatus(thread.id, run.id);
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed') {
      throw new Error('La génération a échoué');
    }
    await sleep(1000);
    runStatus = await checkRunStatus(thread.id, run.id);
    console.log('Status:', runStatus.status);
  }

  // 5. Récupérer la réponse
  const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    headers: {
      'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  const messages = await messagesResponse.json();
  const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

  if (!assistantMessage) {
    throw new Error('Pas de réponse de l\'assistant');
  }

  const response = assistantMessage.content[0].text.value;
  console.log('\nRéponse de l\'assistant:\n', response);

  return parseUserStories(response, epicTitle);
};

const parseUserStories = (response: string, epicTitle: string): UserStory[] => {
  const stories: UserStory[] = [];
  const userStoryBlocks = response.split('##### User Story').filter(Boolean);

  for (const block of userStoryBlocks) {
    try {
      // Extraire l'énoncé de la user story
      const storyMatch = block.match(/En tant que (.*?), je veux (.*?), afin de (.*?)\.?\n/i);
      if (!storyMatch) continue;

      const story = `En tant que ${storyMatch[1]}, je veux ${storyMatch[2]}, afin de ${storyMatch[3]}`;

      // Extraire les critères d'acceptance
      const acceptanceCriteria: { given: string; when: string; then: string; }[] = [];
      const criteriaSection = block.match(/Critères d'acceptance :([\s\S]*?)(?=KPIs|$)/);
      
      if (criteriaSection) {
        const criteria = criteriaSection[1].match(/Étant donné que (.*?)\nQuand (.*?)\nAlors (.*?)(?=\n|$)/gm);
        if (criteria) {
          for (const criterion of criteria) {
            const match = criterion.match(/Étant donné que (.*?)\nQuand (.*?)\nAlors (.*?)(?=\n|$)/);
            if (match) {
              acceptanceCriteria.push({
                given: match[1].trim(),
                when: match[2].trim(),
                then: match[3].trim()
              });
            }
          }
        }
      }

      // Extraire les KPIs
      const kpisMatch = block.match(/KPIs :(.*?)(?=\n|$)/);
      const kpis = kpisMatch ? kpisMatch[1].trim() : '';

      // Extraire le lien de la maquette
      const designMatch = block.match(/Lien vers la maquette :(.*?)(?=\n|$)/);
      const designLink = designMatch ? designMatch[1].trim() : '';

      stories.push({
        epic: epicTitle,
        story,
        acceptanceCriteria,
        kpis,
        designLink
      });
    } catch (error) {
      console.error('Erreur lors du parsing d\'une user story:', error);
    }
  }

  return stories;
};

// Test de génération
const testGeneration = async () => {
  try {
    const projectTitle = "Système de gestion de mobilité géographique";
    const epicTitle = "Gestion des demandes de mobilité";
    const epicObjective = "Permettre aux employés de soumettre et suivre leurs demandes de mobilité géographique de manière efficace et transparente";

    console.log('Début du test de génération...\n');
    const stories = await generateUserStories(epicTitle, epicObjective, projectTitle);
    
    console.log('\nUser Stories générées :\n');
    console.log(JSON.stringify(stories, null, 2));
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
};

// Lancer le test
testGeneration(); 