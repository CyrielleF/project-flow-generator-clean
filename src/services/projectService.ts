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
  try {
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

    console.log('Projet créé avec succès:', projectData);
    const newProject = convertFromSupabaseProject(projectData);

    // 2. Sauvegarder le contenu (EPICs et Stories) si fourni
    if (content) {
      try {
        console.log('Début de la sauvegarde du contenu pour le projet', newProject.id);
        console.log('Nombre d\'EPICs à sauvegarder:', content.epics.length);
        
        await saveProjectContent(newProject.id, content);
        console.log('Contenu sauvegardé avec succès');
        
        // Mettre à jour les compteurs
        newProject.epicsCount = content.epics.length;
        newProject.storiesCount = content.epics.reduce((acc, epic) => acc + epic.stories.length, 0);
        
        // Pour la compatibilité temporaire avec le code existant
        localStorage.setItem(`project_${newProject.id}_content`, JSON.stringify(content));
      } catch (contentError) {
        console.error('Erreur détaillée lors de la sauvegarde du contenu:', contentError);
        throw new Error(`Erreur lors de la sauvegarde du contenu: ${contentError instanceof Error ? contentError.message : 'Erreur inconnue'}`);
      }
    }

    return newProject;
  } catch (error) {
    console.error('Erreur globale lors de la création du projet:', error);
    throw error;
  }
};

// Sauvegarder le contenu d'un projet (EPICs et User Stories) dans Supabase
export const saveProjectContent = async (projectId: string, content: ProjectContent): Promise<void> => {
  console.log('Début de saveProjectContent pour le projet', projectId);
  console.log('Contenu à sauvegarder:', JSON.stringify(content, null, 2));

  // Pour chaque EPIC, insérer et récupérer son ID
  for (const epic of content.epics) {
    console.log('Sauvegarde de l\'EPIC:', epic.title);
    
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
      throw epicError;
    }

    console.log('EPIC créé avec succès:', epicData);
    const epicId = epicData.id;

    // Pour chaque User Story, insérer et récupérer son ID
    for (const story of epic.stories) {
      console.log('Sauvegarde de la User Story:', story.story);
      
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
        throw storyError;
      }

      console.log('User Story créée avec succès:', storyData);
      const storyId = storyData.id;

      // Insérer les critères d'acceptation
      if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
        console.log('Sauvegarde des critères d\'acceptation pour la story:', storyId);
        
        const acceptanceCriteriaInserts = story.acceptanceCriteria.map(criteria => ({
          given_condition: criteria.given,
          when_action: criteria.when,
          then_result: criteria.then,
          story_id: storyId
        }));

        const { error: criteriaError } = await supabase
          .from('acceptance_criteria')
          .insert(acceptanceCriteriaInserts);

        if (criteriaError) {
          console.error('Erreur lors de la création des critères d\'acceptation:', criteriaError);
          throw criteriaError;
        }
        
        console.log('Critères d\'acceptation sauvegardés avec succès');
      }

      // Insérer les métadonnées
      if (story.kpis || story.designLink) {
        console.log('Sauvegarde des métadonnées pour la story:', storyId);
        
        const { error: metadataError } = await supabase
          .from('story_metadata')
          .insert({
            story_id: storyId,
            kpis: story.kpis,
            design_link: story.designLink
          });

        if (metadataError) {
          console.error('Erreur lors de la création des métadonnées:', metadataError);
          throw metadataError;
        }
        
        console.log('Métadonnées sauvegardées avec succès');
      }
    }
  }
  
  console.log('Sauvegarde du contenu terminée avec succès');
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
  try {
    // Récupérer les EPICs avec leurs stories et critères d'acceptation en une seule requête
    const { data: epicsData, error: epicsError } = await supabase
      .from('epics')
      .select(`
        *,
        stories:stories(
          *,
          acceptance_criteria(*),
          story_metadata(*)
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (epicsError) {
      console.error('Erreur lors de la récupération des EPICs:', epicsError);
      throw epicsError;
    }

    if (!epicsData) {
      return { epics: [] };
    }

    // Transformer les données au format attendu
    const content: ProjectContent = {
      epics: epicsData.map(epic => ({
        id: epic.id,
        title: epic.title,
        objective: epic.objective || '',
        problemAddressed: epic.problem_addressed || '',
        businessValue: epic.business_value || '',
        stories: (epic.stories || []).map(story => ({
          id: story.id,
          epic: epic.title,
          story: story.story_description || story.title,
          acceptanceCriteria: (story.acceptance_criteria || []).map(criteria => ({
            id: criteria.id,
            given: criteria.given_condition || '',
            when: criteria.when_action || '',
            then: criteria.then_result || ''
          })),
          kpis: story.story_metadata?.kpis || '',
          designLink: story.story_metadata?.design_link || '',
          status: story.status as "todo" | "in_progress" | "done"
        }))
      }))
    };

    return content;
  } catch (error) {
    console.error('Erreur lors de la récupération du contenu du projet:', error);
    
    // Fallback vers localStorage pour la compatibilité
    const contentJson = localStorage.getItem(`project_${projectId}_content`);
    if (contentJson) {
      try {
        return JSON.parse(contentJson) as ProjectContent;
      } catch (parseError) {
        console.error(`Erreur lors du parsing du contenu du projet ${projectId}:`, parseError);
      }
    }
    
    throw error;
  }
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