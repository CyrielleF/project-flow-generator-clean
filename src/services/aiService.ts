import { generateProjectSpecifications } from './assistant';
import { saveProjectContent, ProjectContent } from './projectService';

export class AIService {
  constructor() {}

  async generateSpecification(needsDescription: string): Promise<string> {
    try {
      const result = await generateProjectSpecifications(needsDescription, needsDescription);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      console.error('Erreur lors de la génération des spécifications:', error);
      throw new Error('Erreur lors de la génération des spécifications');
    }
  }

  async generateEpicsAndStories(specification: string): Promise<any[]> {
    try {
      const result = await generateProjectSpecifications("Projet", specification);
      
      // Sauvegarder les données dans Supabase
      if (result.epics) {
        const projectId = localStorage.getItem('currentProjectId');
        if (projectId) {
          const projectContent: ProjectContent = {
            epics: result.epics
          };
          await saveProjectContent(projectId, projectContent);
        }
      }
      
      return result.epics || [];
    } catch (error) {
      console.error('Erreur lors de la génération des EPICs:', error);
      throw new Error('Erreur lors de la génération des EPICs');
    }
  }
} 