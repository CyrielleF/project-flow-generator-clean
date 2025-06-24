import { saveProjectContent, ProjectContent, Epic, UserStory } from './services/projectService';

const projectId = 'ebbda169-e7d5-464c-874a-67ec854f5cc2';

const mobilityEpic: ProjectContent = {
  epics: [{
    title: "Gestion de la Mobilité Géographique",
    objective: "Gérer les données relatives à la mobilité géographique des intérimaires pour un appariement précis avec les missions",
    problemAddressed: "Permettre une prise en compte fine de la distance et de la capacité de déplacement dans le processus de sélection",
    businessValue: "Accroître l'efficacité du processus de placement en tenant compte des contraintes géographiques",
    stories: [
      {
        epic: "Gestion de la Mobilité Géographique",
        story: "En tant que consultant, je veux pouvoir visualiser la zone de mobilité de chaque intérimaire sur une carte pour évaluer rapidement les possibilités de placement",
        acceptanceCriteria: [
          {
            given: "Un intérimaire a défini sa zone de mobilité",
            when: "Je consulte son profil",
            then: "Je peux voir sa zone de mobilité représentée sur une carte interactive"
          }
        ],
        kpis: "Nombre de consultations des zones de mobilité par jour",
        designLink: "",
        status: "todo" as const
      },
      {
        epic: "Gestion de la Mobilité Géographique",
        story: "En tant qu'intérimaire, je veux définir ma zone de mobilité géographique pour ne recevoir que des offres qui respectent mes limites de déplacement",
        acceptanceCriteria: [
          {
            given: "Je suis connecté à mon compte",
            when: "Je définis ma zone de mobilité",
            then: "Mes préférences de déplacement sont enregistrées et prises en compte"
          }
        ],
        kpis: "Pourcentage d'intérimaires ayant défini leur zone de mobilité",
        designLink: "",
        status: "todo" as const
      },
      {
        epic: "Gestion de la Mobilité Géographique",
        story: "En tant que consultant, je veux pouvoir filtrer les missions disponibles en fonction des contraintes géographiques de l'intérimaire afin de garantir la faisabilité des placements",
        acceptanceCriteria: [
          {
            given: "Je consulte la liste des missions",
            when: "Je sélectionne un intérimaire",
            then: "Les missions sont automatiquement filtrées pour ne montrer que celles dans sa zone de mobilité"
          }
        ],
        kpis: "Taux de succès des placements en fonction de la distance",
        designLink: "",
        status: "todo" as const
      },
      {
        epic: "Gestion de la Mobilité Géographique",
        story: "En tant qu'intérimaire, je veux être notifié des missions disponibles dans ma zone géographique afin de choisir rapidement celles qui sont accessibles",
        acceptanceCriteria: [
          {
            given: "Une nouvelle mission est créée dans ma zone de mobilité",
            when: "La mission correspond à mon profil",
            then: "Je reçois une notification avec les détails de la mission"
          }
        ],
        kpis: "Taux d'engagement sur les notifications de missions",
        designLink: "",
        status: "todo" as const
      }
    ]
  }]
};

saveProjectContent(projectId, mobilityEpic)
  .then(() => {
    console.log('Epic de mobilité géographique ajouté avec succès !');
  })
  .catch((error) => {
    console.error('Erreur lors de l\'ajout de l\'epic de mobilité géographique:', error);
  }); 