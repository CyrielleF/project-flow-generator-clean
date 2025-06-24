import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Project } from "@/components/ProjectCard";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getProjectById, getProjectContent, ProjectContent, deleteProject } from "@/services/projectService";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EpicsView from "@/components/EpicsView";
import UserStoriesView from "@/components/UserStoriesView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Epic {
  id?: string;
  title: string;
  description?: string;
  objective?: string;
  problemAddressed?: string;
  businessValue?: string;
  stories: {
    id?: string;
    title: string;
    description: string;
    status?: "todo" | "in_progress" | "done";
  }[];
}

const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectContent, setProjectContent] = useState<ProjectContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const currentTab = searchParams.get("tab") || "epics";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Vérification de l'authentification
  useEffect(() => {
    const checkAuth = async () => {
      console.log("=== Vérification de l'authentification ===");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("État de l'authentification:", { user, authError });
      
      if (!user) {
        console.log("Utilisateur non authentifié, redirection vers /login");
        navigate("/login");
      } else {
        console.log("Utilisateur authentifié:", user.email);
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [navigate]);

  // Chargement des données du projet
  useEffect(() => {
    const loadProject = async () => {
      console.log("=== Début loadProject ===");
      console.log("État actuel:", { authChecked, projectId });
      
      if (!authChecked || !projectId) {
        console.log("Conditions non remplies pour charger le projet");
        return;
      }

      try {
        setIsLoading(true);
        console.log("Chargement du projet:", projectId);

        // Charger les détails du projet depuis Supabase
        const projectData = await getProjectById(projectId);
        console.log("Réponse getProjectById:", projectData);
        
        if (!projectData) {
          console.error("Projet non trouvé:", projectId);
          toast.error("Projet non trouvé");
          navigate("/dashboard");
          return;
        }
        
        console.log("Projet chargé avec succès:", projectData);
        setProject(projectData);
        
        // Charger les EPICs et User Stories depuis Supabase
        try {
          console.log("=== Chargement du contenu du projet ===");
          const content = await getProjectContent(projectId);
          console.log("Contenu brut reçu:", content);
          
          if (!content || !content.epics) {
            console.warn("Contenu invalide reçu:", content);
            return;
          }
          
          console.log("Nombre d'EPICs trouvés:", content.epics.length);
          content.epics.forEach((epic, index) => {
            console.log(`EPIC ${index + 1}:`, {
              id: epic.id,
              title: epic.title,
              storiesCount: epic.stories?.length || 0
            });
            if (epic.stories) {
              epic.stories.forEach((story, storyIndex) => {
                console.log(`  Story ${storyIndex + 1}:`, {
                  id: story.id,
                  title: story.story,
                  status: story.status
                });
              });
            }
          });
          
          console.log("Mise à jour du state projectContent");
          setProjectContent(content);
        } catch (contentError) {
          console.error("=== Erreur lors du chargement du contenu ===");
          console.error("Type d'erreur:", contentError instanceof Error ? 'Error' : typeof contentError);
          console.error("Message:", contentError instanceof Error ? contentError.message : contentError);
          console.error("Stack:", contentError instanceof Error ? contentError.stack : 'Non disponible');
          toast.error("Impossible de charger le contenu du projet");
        }
      } catch (error) {
        console.error("=== Erreur lors du chargement du projet ===");
        console.error("Type d'erreur:", error instanceof Error ? 'Error' : typeof error);
        console.error("Message:", error instanceof Error ? error.message : error);
        console.error("Stack:", error instanceof Error ? error.stack : 'Non disponible');
        toast.error("Erreur lors du chargement du projet");
      } finally {
        console.log("Fin du chargement, isLoading mis à false");
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate, authChecked]);

  // Fonction pour transformer projectContent en un format plus simple pour l'affichage
  const getFormattedEpics = (): Epic[] => {
    console.log("=== Formatage des EPICs ===");
    console.log("ProjectContent actuel:", projectContent);
    
    if (!projectContent) {
      console.log("Pas de contenu à formater");
      return [];
    }
    
    const formatted = projectContent.epics.map(epic => {
      console.log("Formatage de l'EPIC:", epic.title);
      return {
        id: epic.id,
        title: epic.title,
        description: epic.objective,
        objective: epic.objective,
        problemAddressed: epic.problemAddressed,
        businessValue: epic.businessValue,
        stories: epic.stories.map(story => {
          console.log("Formatage de la story:", story.story);
          return {
            id: story.id,
            title: story.story,
            description: story.story,
            status: story.status
          };
        })
      };
    });
    
    console.log("EPICs formatés:", formatted);
    return formatted;
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await deleteProject(projectId);
      toast.success("Projet supprimé avec succès");
      navigate("/dashboard");
    } catch (error) {
      console.error("Erreur lors de la suppression du projet:", error);
      toast.error("Erreur lors de la suppression du projet");
    }
  };

  if (!authChecked || isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex justify-center items-center py-12">
          <p>Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-xl font-medium mb-4">Projet non trouvé</p>
          <Button variant="default" onClick={() => navigate("/dashboard")}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="group">
          <ArrowLeft className="mr-2 h-4 w-4 transform transition-transform group-hover:-translate-x-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
          Supprimer le projet
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="epics">EPICs</TabsTrigger>
          <TabsTrigger value="stories">User Stories</TabsTrigger>
        </TabsList>
        <TabsContent value="epics">
          <EpicsView projectId={projectId} />
        </TabsContent>
        <TabsContent value="stories">
          <UserStoriesView projectId={projectId} epicId={searchParams.get("epic") || ""} />
        </TabsContent>
      </Tabs>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
