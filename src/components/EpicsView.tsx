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
import { getProjectContent } from "@/services/projectService";

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
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadEpics = async () => {
      try {
        console.log("Début du chargement des EPICs pour le projet:", projectId);
        setIsLoading(true);
        const content = await getProjectContent(projectId);
        console.log("Contenu reçu de getProjectContent:", content);
        
        // Transformer les données au format attendu par le composant
        const formattedEpics = content.epics.map(epic => {
          console.log("Transformation de l'EPIC:", epic);
          return {
            id: epic.id || '',
            title: epic.title,
            description: epic.objective,
            objective: epic.objective,
            businessProblem: epic.problemAddressed,
            businessValue: epic.businessValue,
            stories: epic.stories.map(story => ({
              id: story.id || '',
              title: story.story,
              description: story.story,
              acceptanceCriteria: story.acceptanceCriteria.map(ac => `${ac.given} ${ac.when} ${ac.then}`),
              definitionOfDone: [],
              mockupUrl: story.designLink,
              status: story.status?.replace('_', '-') as "todo" | "in-progress" | "done" || "todo"
            }))
          };
        });
        
        console.log("EPICs formatés:", formattedEpics);
        setEpics(formattedEpics);
      } catch (error) {
        console.error('Erreur détaillée lors du chargement des EPICs:', error);
        toast.error("Erreur lors du chargement des EPICs");
      } finally {
        setIsLoading(false);
      }
    };

    loadEpics();
  }, [projectId]);

  const viewUserStories = (epicId: string) => {
    navigate(`/project/${projectId}?tab=stories&epic=${epicId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">Chargement des EPICs...</h3>
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">Aucun EPIC disponible</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Commencez par générer les spécifications du projet pour créer automatiquement les EPICs.
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
