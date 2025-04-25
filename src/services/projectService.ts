import { supabase } from "@/lib/supabase";
import { Project } from "@/components/ProjectCard";

export interface ProjectContent {
  epics: Epic[];
}

export interface Epic {
  id?: string;
  title: string;
  objective: string;
  problemAddressed: string;
  businessValue: string;
  stories: UserStory[];
}

export interface UserStory {
  id?: string;
  epic: string;
  story: string;
  acceptanceCriteria: {
    id?: string;
    given: string;
    when: string;
    then: string;
  }[];
  kpis: string;
  designLink: string;
  status?: "todo" | "in_progress" | "done";
}

// Convertir le modèle de Project utilisé dans l'UI vers le format Supabase
const convertToSupabaseProject = (project: Project, userId: string) => {
  return {
    name: project.title,
    description: project.description,
    status: 'active',
    owner_id: userId
  };
};

// Convertir le modèle de Supabase vers le format utilisé dans l'UI
const convertFromSupabaseProject = (project: any): Project => {
  return {
    id: project.id,
    title: project.name,
    description: project.description,
    createdAt: project.created_at,
    epicsCount: 0, // Ces valeurs seront mises à jour après avoir chargé le contenu
    storiesCount: 0
  };
};

// Créer un nouveau projet dans Supabase
export const createProject = async (project: Omit<Project, 'id'>, userId: string, content?: ProjectContent): Promise<Project> => {
  // 1. Créer le projet de base
  const supabaseProject = convertToSupabaseProject({
    id: '', // ID temporaire, sera remplacé par celui généré par Supabase
    ...project
  }, userId);

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert(supabaseProject)
    .select()
    .single();

  if (projectError) {
    console.error('Erreur lors de la création du projet:', projectError);
    throw projectError;
  }

  const newProject = convertFromSupabaseProject(projectData);

  // 2. Sauvegarder le contenu (EPICs et Stories) si fourni
  if (content) {
    try {
      await saveProjectContent(newProject.id, content);
      
      // Mettre à jour les compteurs
      newProject.epicsCount = content.epics.length;
      newProject.storiesCount = content.epics.reduce((acc, epic) => acc + epic.stories.length, 0);
      
      // Pour la compatibilité temporaire avec le code existant
      localStorage.setItem(`project_${newProject.id}_content`, JSON.stringify(content));
    } catch (contentError) {
      console.error('Erreur lors de la sauvegarde du contenu:', contentError);
      // Ne pas faire échouer la création du projet si le contenu n'a pas pu être sauvegardé
    }
  }

  return newProject;
};

// Sauvegarder le contenu d'un projet (EPICs et User Stories) dans Supabase
export const saveProjectContent = async (projectId: string, content: ProjectContent): Promise<void> => {
  // Pour chaque EPIC, insérer et récupérer son ID
  for (const epic of content.epics) {
    const { data: epicData, error: epicError } = await supabase
      .from('epics')
      .insert({
        title: epic.title,
        objective: epic.objective,
        problem_addressed: epic.problemAddressed,
        business_value: epic.businessValue,
        project_id: projectId
      })
      .select()
      .single();

    if (epicError) {
      console.error('Erreur lors de la création de l\'EPIC:', epicError);
      continue; // Passer à l'EPIC suivant
    }

    const epicId = epicData.id;

    // Pour chaque User Story, insérer et récupérer son ID
    for (const story of epic.stories) {
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: story.story,
          story_description: story.story,
          epic_id: epicId,
          status: story.status || 'todo'
        })
        .select()
        .single();

      if (storyError) {
        console.error('Erreur lors de la création de la User Story:', storyError);
        continue; // Passer à la Story suivante
      }

      const storyId = storyData.id;

      // Insérer les critères d'acceptation
      const acceptanceCriteriaInserts = story.acceptanceCriteria.map(criteria => ({
        given_condition: criteria.given,
        when_action: criteria.when,
        then_result: criteria.then,
        story_id: storyId
      }));

      if (acceptanceCriteriaInserts.length > 0) {
        const { error: criteriaError } = await supabase
          .from('acceptance_criteria')
          .insert(acceptanceCriteriaInserts);

        if (criteriaError) {
          console.error('Erreur lors de la création des critères d\'acceptation:', criteriaError);
        }
      }

      // Insérer les métadonnées
      const { error: metadataError } = await supabase
        .from('story_metadata')
        .insert({
          story_id: storyId,
          kpis: story.kpis,
          design_link: story.designLink
        });

      if (metadataError) {
        console.error('Erreur lors de la création des métadonnées:', metadataError);
      }
    }
  }
};

// Récupérer tous les projets d'un utilisateur
export const getProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    throw error;
  }

  // Convertir les projets au format utilisé dans l'UI
  const projects = data.map(convertFromSupabaseProject);

  // Mettre à jour les compteurs en récupérant les nombres d'EPICs et Stories
  for (const project of projects) {
    try {
      // Compter les EPICs
      const { data: epicsData, error: epicsError } = await supabase
        .from('epics')
        .select('id')
        .eq('project_id', project.id);

      if (!epicsError && epicsData) {
        project.epicsCount = epicsData.length;

        // Compter les Stories pour tous les EPICs de ce projet
        const epicIds = epicsData.map(epic => epic.id);
        if (epicIds.length > 0) {
          const { data: storiesData, error: storiesError } = await supabase
            .from('stories')
            .select('id')
            .in('epic_id', epicIds);

          if (!storiesError && storiesData) {
            project.storiesCount = storiesData.length;
          }
        }
      }
    } catch (e) {
      console.error(`Erreur lors du comptage des EPICs/Stories pour le projet ${project.id}:`, e);
      
      // Fallback vers localStorage pour la compatibilité
      const contentJson = localStorage.getItem(`project_${project.id}_content`);
      if (contentJson) {
        try {
          const content = JSON.parse(contentJson) as ProjectContent;
          project.epicsCount = content.epics.length;
          project.storiesCount = content.epics.reduce((acc, epic) => acc + epic.stories.length, 0);
        } catch (parseError) {
          console.error(`Erreur lors du parsing du contenu du projet ${project.id}:`, parseError);
        }
      }
    }
  }

  return projects;
};

// Récupérer un projet par son ID
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Projet non trouvé
      return null;
    }
    console.error('Erreur lors de la récupération du projet:', error);
    throw error;
  }

  const project = convertFromSupabaseProject(data);

  // Mettre à jour les compteurs
  try {
    // Compter les EPICs
    const { data: epicsData, error: epicsError } = await supabase
      .from('epics')
      .select('id')
      .eq('project_id', projectId);

    if (!epicsError && epicsData) {
      project.epicsCount = epicsData.length;

      // Compter les Stories pour tous les EPICs de ce projet
      const epicIds = epicsData.map(epic => epic.id);
      if (epicIds.length > 0) {
        const { data: storiesData, error: storiesError } = await supabase
          .from('stories')
          .select('id')
          .in('epic_id', epicIds);

        if (!storiesError && storiesData) {
          project.storiesCount = storiesData.length;
        }
      }
    }
  } catch (e) {
    console.error(`Erreur lors du comptage des EPICs/Stories pour le projet ${projectId}:`, e);
    
    // Fallback vers localStorage pour la compatibilité
    const contentJson = localStorage.getItem(`project_${projectId}_content`);
    if (contentJson) {
      try {
        const content = JSON.parse(contentJson) as ProjectContent;
        project.epicsCount = content.epics.length;
        project.storiesCount = content.epics.reduce((acc, epic) => acc + epic.stories.length, 0);
      } catch (parseError) {
        console.error(`Erreur lors du parsing du contenu du projet ${projectId}:`, parseError);
      }
    }
  }

  return project;
};

// Récupérer le contenu d'un projet (EPICs et User Stories) depuis Supabase
export const getProjectContent = async (projectId: string): Promise<ProjectContent> => {
  // 1. Récupérer tous les EPICs du projet
  const { data: epicsData, error: epicsError } = await supabase
    .from('epics')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (epicsError) {
    console.error('Erreur lors de la récupération des EPICs:', epicsError);
    
    // Fallback vers localStorage pour la compatibilité
    const contentJson = localStorage.getItem(`project_${projectId}_content`);
    if (contentJson) {
      try {
        return JSON.parse(contentJson) as ProjectContent;
      } catch (parseError) {
        console.error(`Erreur lors du parsing du contenu du projet ${projectId}:`, parseError);
      }
    }
    
    throw epicsError;
  }

  // Préparer le résultat
  const content: ProjectContent = { epics: [] };

  // Pour chaque EPIC, récupérer ses User Stories
  for (const epic of epicsData) {
    // 2. Récupérer toutes les User Stories de l'EPIC
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('epic_id', epic.id)
      .order('created_at', { ascending: true });

    if (storiesError) {
      console.error(`Erreur lors de la récupération des Stories pour l'EPIC ${epic.id}:`, storiesError);
      continue; // Passer à l'EPIC suivant
    }

    // Préparer l'EPIC avec ses stories
    const epicWithStories: Epic = {
      id: epic.id,
      title: epic.title,
      objective: epic.objective || '',
      problemAddressed: epic.problem_addressed || '',
      businessValue: epic.business_value || '',
      stories: []
    };

    // Pour chaque User Story, récupérer ses critères d'acceptation et métadonnées
    for (const story of storiesData) {
      // 3. Récupérer les critères d'acceptation
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('acceptance_criteria')
        .select('*')
        .eq('story_id', story.id);

      if (criteriaError) {
        console.error(`Erreur lors de la récupération des critères pour la Story ${story.id}:`, criteriaError);
        continue; // Passer à la Story suivante
      }

      // 4. Récupérer les métadonnées
      const { data: metadataData, error: metadataError } = await supabase
        .from('story_metadata')
        .select('*')
        .eq('story_id', story.id)
        .single();

      // Préparer la User Story
      const userStory: UserStory = {
        id: story.id,
        epic: epic.title,
        story: story.story_description || story.title,
        acceptanceCriteria: criteriaData.map(criteria => ({
          id: criteria.id,
          given: criteria.given_condition || '',
          when: criteria.when_action || '',
          then: criteria.then_result || ''
        })),
        kpis: metadataData?.kpis || '',
        designLink: metadataData?.design_link || '',
        status: story.status as "todo" | "in_progress" | "done" || "todo"
      };

      // Ajouter la User Story à l'EPIC
      epicWithStories.stories.push(userStory);
    }

    // Ajouter l'EPIC au contenu
    content.epics.push(epicWithStories);
  }

  return content;
};

// Mettre à jour un projet
export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
  const supabaseUpdates: any = {};
  
  if (updates.title !== undefined) supabaseUpdates.name = updates.title;
  if (updates.description !== undefined) supabaseUpdates.description = updates.description;

  const { data, error } = await supabase
    .from('projects')
    .update(supabaseUpdates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour du projet:', error);
    throw error;
  }

  return convertFromSupabaseProject(data);
};

// Supprimer un projet
export const deleteProject = async (projectId: string): Promise<void> => {
  // Note: La suppression des EPICs, Stories, etc. est gérée par les contraintes de clé étrangère CASCADE
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Erreur lors de la suppression du projet:', error);
    throw error;
  }

  // Supprimer également le contenu du localStorage pour la rétrocompatibilité
  localStorage.removeItem(`project_${projectId}_content`);
};

// Mettre à jour le statut d'une User Story
export const updateStoryStatus = async (storyId: string, newStatus: "todo" | "in_progress" | "done"): Promise<void> => {
  const { error } = await supabase
    .from('stories')
    .update({ status: newStatus })
    .eq('id', storyId);

  if (error) {
    console.error('Erreur lors de la mise à jour du statut de la Story:', error);
    throw error;
  }
}; 