import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { AIService } from "../services/aiService";

interface Epic {
  id: string;
  title: string;
  description: string;
  objective: string;
  businessProblem: string;
  businessValue: string;
  stories: UserStory[];
}

interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  definitionOfDone: string[];
  mockupUrl?: string;
  status: "todo" | "in-progress" | "done";
}

interface EpicsViewProps {
  projectId: string;
}

const EpicsView = ({ projectId }: EpicsViewProps) => {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [specification, setSpecification] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Load specification and epics from localStorage
    const savedSpec = localStorage.getItem(`project_${projectId}_specification`);
    const savedEpics = localStorage.getItem(`project_${projectId}_epics`);
    
    if (savedSpec) setSpecification(savedSpec);
    if (savedEpics) setEpics(JSON.parse(savedEpics));
  }, [projectId]);

  const viewUserStories = (epicId: string) => {
    navigate(`/project/${projectId}?tab=stories&epic=${epicId}`);
  };

  const generateEpicsAndStories = async () => {
    if (!specification) return;

    try {
      setIsGenerating(true);
      const aiService = new AIService();
      const generatedEpics = await aiService.generateEpicsAndStories(specification);
      
      // Add IDs to the generated epics and stories
      const epicsWithIds = generatedEpics.map((epic, index) => ({
        ...epic,
        id: `epic${index + 1}`,
        description: epic.objective,
        stories: epic.stories.map((story, storyIndex) => ({
          ...story,
          id: `story_${index + 1}_${storyIndex + 1}`
        }))
      }));

      setEpics(epicsWithIds);
      localStorage.setItem(`project_${projectId}_epics`, JSON.stringify(epicsWithIds));
      toast.success("EPICs et User Stories générés avec succès");
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      toast.error("Erreur lors de la génération des EPICs");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!specification) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">Spécifications manquantes</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Vous devez d'abord générer les spécifications du projet pour accéder aux EPICs.
        </p>
        <Button 
          variant="default" 
          onClick={() => navigate(`/project/${projectId}?tab=specification`)}
        >
          Générer les spécifications
        </Button>
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">Aucun EPIC disponible</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Les EPICs seront générés automatiquement à partir des spécifications.
        </p>
        <Button 
          variant="default"
          onClick={generateEpicsAndStories}
          disabled={isGenerating}
        >
          {isGenerating ? "Génération en cours..." : "Générer les EPICs"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      {epics.map((epic) => (
        <Card key={epic.id} className="glass-card overflow-hidden animate-scale-in flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg line-clamp-1">{epic.title}</CardTitle>
              <Badge variant="outline" className="text-xs">
                EPIC
              </Badge>
            </div>
            <CardDescription className="line-clamp-2 mb-4">
              {epic.description}
            </CardDescription>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-primary">Objectif :</strong>
                <p className="text-muted-foreground">{epic.objective}</p>
              </div>
              <div>
                <strong className="text-primary">Problématique adressée :</strong>
                <p className="text-muted-foreground">{epic.businessProblem}</p>
              </div>
              <div>
                <strong className="text-primary">Valeur métier :</strong>
                <p className="text-muted-foreground">{epic.businessValue}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2 flex-grow">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{epic.stories?.length || 0} User Stories</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button 
              variant="default" 
              className="w-full group"
              onClick={() => viewUserStories(epic.id)}
            >
              User Stories
              <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
            </Button>
          </CardFooter>
        </Card>
      ))}
      <Card className="glass-card h-full min-h-[200px] flex flex-col justify-center items-center p-6 border-dashed animate-scale-in">
        <Plus className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-muted-foreground text-center mb-2">Ajouter un EPIC</CardTitle>
        <CardDescription className="text-center mb-4">
          Créez un nouvel EPIC pour votre projet
        </CardDescription>
        <Button 
          variant="outline" 
          onClick={() => toast.info("Fonctionnalité à venir")}
        >
          Nouvel EPIC
        </Button>
      </Card>
    </div>
  );
};

export default EpicsView;
