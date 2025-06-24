import { createClient } from '@supabase/supabase-js';

if (process.argv.length < 4) {
  console.error('Usage: npx tsx src/addEpicScript.ts <email> <password>');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

const supabase = createClient(
  'https://mukwelacicyeuyvdxqgy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a3dlbGFjaWN5ZXV5dmR4cWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODg0NTEsImV4cCI6MjA1ODY2NDQ1MX0.x0ps-SKesT0bPRwKOVdacM0JnG8ZDRNz9ldLo5nr0gA'
);

const projectId = 'ebbda169-e7d5-464c-874a-67ec854f5cc2';

const epic = {
  title: "Gestion de la Mobilité Géographique",
  objective: "Gérer les données relatives à la mobilité géographique des intérimaires pour un appariement précis avec les missions",
  problem_addressed: "Permettre une prise en compte fine de la distance et de la capacité de déplacement dans le processus de sélection",
  business_value: "Accroître l'efficacité du processus de placement en tenant compte des contraintes géographiques",
  project_id: projectId
};

async function addEpicAndStories() {
  try {
    // 1. S'authentifier
    console.log('Authentification...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw authError;
    }

    console.log('Authentification réussie !');

    // 2. Créer l'EPIC
    console.log('Création de l\'EPIC...');
    const { data: epicData, error: epicError } = await supabase
      .from('epics')
      .insert(epic)
      .select()
      .single();

    if (epicError) {
      throw epicError;
    }

    console.log('EPIC créé avec succès:', epicData);
    const epicId = epicData.id;

    // 3. Créer les User Stories
    const stories = [
      {
        title: "En tant que consultant, je veux pouvoir visualiser la zone de mobilité de chaque intérimaire sur une carte pour évaluer rapidement les possibilités de placement",
        story_description: "En tant que consultant, je veux pouvoir visualiser la zone de mobilité de chaque intérimaire sur une carte pour évaluer rapidement les possibilités de placement",
        epic_id: epicId,
        status: "todo"
      },
      {
        title: "En tant qu'intérimaire, je veux définir ma zone de mobilité géographique pour ne recevoir que des offres qui respectent mes limites de déplacement",
        story_description: "En tant qu'intérimaire, je veux définir ma zone de mobilité géographique pour ne recevoir que des offres qui respectent mes limites de déplacement",
        epic_id: epicId,
        status: "todo"
      },
      {
        title: "En tant que consultant, je veux pouvoir filtrer les missions disponibles en fonction des contraintes géographiques de l'intérimaire afin de garantir la faisabilité des placements",
        story_description: "En tant que consultant, je veux pouvoir filtrer les missions disponibles en fonction des contraintes géographiques de l'intérimaire afin de garantir la faisabilité des placements",
        epic_id: epicId,
        status: "todo"
      },
      {
        title: "En tant qu'intérimaire, je veux être notifié des missions disponibles dans ma zone géographique afin de choisir rapidement celles qui sont accessibles",
        story_description: "En tant qu'intérimaire, je veux être notifié des missions disponibles dans ma zone géographique afin de choisir rapidement celles qui sont accessibles",
        epic_id: epicId,
        status: "todo"
      }
    ];

    console.log('Création des User Stories...');
    for (const story of stories) {
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert(story)
        .select()
        .single();

      if (storyError) {
        throw storyError;
      }

      console.log('User Story créée avec succès:', storyData);

      // Ajouter les critères d'acceptation pour chaque story
      const acceptanceCriteria = [
        {
          story_id: storyData.id,
          given_condition: "Conditions préalables définies",
          when_action: "Action de l'utilisateur",
          then_result: "Résultat attendu"
        }
      ];

      const { error: criteriaError } = await supabase
        .from('acceptance_criteria')
        .insert(acceptanceCriteria);

      if (criteriaError) {
        throw criteriaError;
      }

      console.log('Critères d\'acceptation créés avec succès pour la story:', storyData.id);
    }

    console.log('Epic et toutes les user stories ont été créés avec succès !');
  } catch (error) {
    console.error('Erreur lors de la création:', error);
  }
}

addEpicAndStories(); 