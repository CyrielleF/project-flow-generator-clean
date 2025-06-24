import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = "https://mukwelacicyeuyvdxqgy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a3dlbGFjaWN5ZXV5dmR4cWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODg0NTEsImV4cCI6MjA1ODY2NDQ1MX0.x0ps-SKesT0bPRwKOVdacM0JnG8ZDRNz9ldLo5nr0gA";

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// ID du projet
const projectId = "ebbda169-e7d5-464c-874a-67ec854f5cc2";

// Fonction principale
async function addMobilityEpic() {
  try {
    console.log('Début de l\'ajout de l\'EPIC de mobilité...');

    // 1. Créer l'EPIC
    const { data: epic, error: epicError } = await supabase
      .from('epics')
      .insert({
        title: "Gestion de la Mobilité Géographique",
        objective: "Permettre une gestion efficace de la mobilité géographique des intérimaires",
        problem_addressed: "Difficulté à matcher les missions avec les zones de mobilité des intérimaires",
        business_value: "Amélioration du taux de placement et de la satisfaction des intérimaires",
        project_id: projectId
      })
      .select()
      .single();

    if (epicError) {
      throw new Error(`Erreur lors de la création de l'EPIC: ${epicError.message}`);
    }

    console.log('EPIC créé avec succès:', epic);

    // 2. Créer les User Stories
    const stories = [
      {
        title: "Visualisation des zones de mobilité",
        description: "En tant que consultant, je veux visualiser les zones de mobilité sur une carte pour mieux comprendre la disponibilité géographique des intérimaires",
        acceptanceCriteria: [
          {
            given: "En tant que consultant connecté",
            when: "je consulte la fiche d'un intérimaire",
            then: "je vois une carte interactive montrant sa zone de mobilité"
          }
        ]
      },
      {
        title: "Définition de la zone de mobilité",
        description: "En tant qu'intérimaire, je veux définir ma zone de mobilité géographique pour recevoir des offres de mission pertinentes",
        acceptanceCriteria: [
          {
            given: "En tant qu'intérimaire connecté",
            when: "je modifie mon profil",
            then: "je peux dessiner ma zone de mobilité sur une carte"
          }
        ]
      },
      {
        title: "Filtrage des missions par zone",
        description: "En tant que consultant, je veux filtrer les missions en fonction des contraintes géographiques pour proposer des missions pertinentes",
        acceptanceCriteria: [
          {
            given: "En tant que consultant",
            when: "je recherche des candidats pour une mission",
            then: "je peux filtrer les intérimaires selon leur zone de mobilité"
          }
        ]
      },
      {
        title: "Notifications géolocalisées",
        description: "En tant qu'intérimaire, je veux recevoir des notifications pour les missions dans ma zone pour ne pas manquer d'opportunités",
        acceptanceCriteria: [
          {
            given: "En tant qu'intérimaire",
            when: "une nouvelle mission est créée dans ma zone",
            then: "je reçois une notification en temps réel"
          }
        ]
      }
    ];

    // Ajouter chaque User Story
    for (const story of stories) {
      console.log(`Création de la User Story: ${story.title}`);
      
      // Créer la story
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: story.title,
          story_description: story.description,
          epic_id: epic.id,
          status: 'todo'
        })
        .select()
        .single();

      if (storyError) {
        throw new Error(`Erreur lors de la création de la story ${story.title}: ${storyError.message}`);
      }

      console.log('Story créée:', storyData);

      // Ajouter les critères d'acceptation
      for (const criteria of story.acceptanceCriteria) {
        const { error: criteriaError } = await supabase
          .from('acceptance_criteria')
          .insert({
            given_condition: criteria.given,
            when_action: criteria.when,
            then_result: criteria.then,
            story_id: storyData.id
          });

        if (criteriaError) {
          throw new Error(`Erreur lors de la création des critères d'acceptation pour ${story.title}: ${criteriaError.message}`);
        }
      }

      console.log(`Critères d'acceptation ajoutés pour: ${story.title}`);
    }

    console.log('EPIC de mobilité et toutes les User Stories ont été créés avec succès!');
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

// Exécuter le script
addMobilityEpic()
  .then(() => {
    console.log('Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }); 