const API_URL = 'http://localhost:3001';

export class AIService {
  constructor() {}  // No need for API key anymore since we're using the backend

  async generateSpecification(needsDescription: string): Promise<string> {
    const response = await fetch(`${API_URL}/api/generate-specification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ needsDescription }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la génération des spécifications');
    }

    const data = await response.json();
    return data.specification;
  }

  async generateEpicsAndStories(specification: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/api/generate-epics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ specification }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la génération des EPICs');
    }

    const data = await response.json();
    return this.parseEpicsFromResponse(data.epics);
  }

  private parseEpicsFromResponse(response: string): any[] {
    const epics: any[] = [];
    const epicBlocks = response.split(/(?=1\. Nom de l'EPIC)/g);

    for (const block of epicBlocks) {
      if (!block.trim()) continue;

      const titleMatch = block.match(/1\. Nom de l'EPIC\s*:\s*(.+)/);
      const objectiveMatch = block.match(/2\. Objectif\s*:\s*(.+)/);
      const problemMatch = block.match(/3\. Problématique adressée\s*:\s*(.+)/);
      const valueMatch = block.match(/4\. Valeur métier\s*:\s*(.+)/);

      if (titleMatch && objectiveMatch && problemMatch && valueMatch) {
        epics.push({
          title: titleMatch[1].trim(),
          objective: objectiveMatch[1].trim(),
          businessProblem: problemMatch[1].trim(),
          businessValue: valueMatch[1].trim(),
          stories: []
        });
      }
    }

    return epics;
  }
} 