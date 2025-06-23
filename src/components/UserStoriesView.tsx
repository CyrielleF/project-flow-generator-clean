import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Plus, FileText, CheckCircle, Clock, Circle } from "lucide-react";
import { toast } from "sonner";
import { getProjectContent, updateStoryStatus } from "@/services/projectService";
import { supabase } from "@/lib/supabase";

interface Epic {
  id: string;
  title: string;
  description: string;
  objective?: string;
  problemAddressed?: string;
  businessValue?: string;
}

interface UserStory {
  id: string;
  epicId: string;
  title: string;
  description: string;
  acceptance: string[];
  status: "todo" | "in_progress" | "done";
}

interface UserStoriesViewProps {
  projectId: string;
  epicId?: string;
}

const UserStoriesView = ({ projectId, epicId: propEpicId }: UserStoriesViewProps) => {
  const [epic, setEpic] = useState<Epic | null>(null);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get epic ID from props or URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const epicId = propEpicId || searchParams.get("epic");
  
  useEffect(() => {
    const loadEpicAndStories = async () => {
      try {
        setIsLoading(true);
        
        if (!epicId) {
          // If no epicId specified, redirect to epics view
          navigate(`/project/${projectId}?tab=epics`);
          return;
        }
        
        // Vérifier l'authentification
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }
        
        // Charger le contenu du projet depuis Supabase
        const content = await getProjectContent(projectId);
        
        // Trouver l'EPIC correspondant
        const currentEpic = content.epics.find(e => e.id === epicId);
        
        if (!currentEpic) {
          toast.error("EPIC non trouvé");
          navigate(`/project/${projectId}?tab=epics`);
          return;
        }
        
        // Convertir l'EPIC au format attendu par le composant
        setEpic({
          id: currentEpic.id || epicId,
          title: currentEpic.title,
          description: currentEpic.objective || "",
          objective: currentEpic.objective,
          problemAddressed: currentEpic.problemAddressed,
          businessValue: currentEpic.businessValue
        });
        
        // Convertir les User Stories au format attendu par le composant
        const stories = currentEpic.stories.map(story => ({
          id: story.id || `story_${Date.now()}`,
          epicId: epicId,
          title: story.story,
          description: story.story,
          acceptance: story.acceptanceCriteria.map(criteria => 
            `${criteria.given} ${criteria.when} ${criteria.then}`
          ),
          status: (story.status?.replace("-", "_") as "todo" | "in_progress" | "done") || "todo"
        }));
        
        setUserStories(stories);
      } catch (error) {
        console.error("Erreur lors du chargement des EPICs et stories:", error);
        toast.error("Impossible de charger les données de l'EPIC");
        navigate(`/project/${projectId}?tab=epics`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEpicAndStories();
  }, [projectId, epicId, navigate]);

  const handleUpdateStoryStatus = async (storyId: string, newStatus: "todo" | "in_progress" | "done") => {
    try {
      await updateStoryStatus(storyId, newStatus);
      
      // Mettre à jour le state local
      setUserStories(stories =>
        stories.map(story =>
          story.id === storyId
            ? { ...story, status: newStatus }
            : story
        )
      );
      
      toast.success("Statut mis à jour avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "done":
        return "Terminé";
      case "in_progress":
        return "En cours";
      default:
        return "À faire";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">Chargement des User Stories...</h3>
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">EPIC non trouvé</h3>
        <Button 
          variant="default" 
          onClick={() => navigate(`/project/${projectId}?tab=epics`)}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux EPICs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{epic.title}</CardTitle>
              <CardDescription className="mt-2">{epic.description}</CardDescription>
            </div>
            <Badge variant="outline">EPIC</Badge>
          </div>
          {epic.objective && (
            <div className="mt-4">
              <h4 className="font-semibold text-primary">Objectif</h4>
              <p className="text-muted-foreground">{epic.objective}</p>
            </div>
          )}
          {epic.problemAddressed && (
            <div className="mt-4">
              <h4 className="font-semibold text-primary">Problématique adressée</h4>
              <p className="text-muted-foreground">{epic.problemAddressed}</p>
            </div>
          )}
          {epic.businessValue && (
            <div className="mt-4">
              <h4 className="font-semibold text-primary">Valeur métier</h4>
              <p className="text-muted-foreground">{epic.businessValue}</p>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userStories.map((story) => (
          <Card key={story.id} className="glass-card overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{story.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    const newStatus = story.status === "todo" 
                      ? "in_progress" 
                      : story.status === "in_progress" 
                        ? "done" 
                        : "todo";
                    handleUpdateStoryStatus(story.id, newStatus);
                  }}
                >
                  {getStatusIcon(story.status)}
                  <span className="text-sm">{getStatusText(story.status)}</span>
                </Button>
              </div>
              <CardDescription className="mt-2">{story.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <h4 className="font-semibold mb-2">Critères d'acceptation</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {story.acceptance.map((criteria, index) => (
                  <li key={index}>{criteria}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserStoriesView;
