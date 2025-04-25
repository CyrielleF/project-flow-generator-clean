import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Project } from "@/components/ProjectCard";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getProjectById, getProjectContent, ProjectContent } from "@/services/projectService";

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
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [projectContent, setProjectContent] = useState<ProjectContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        
        // Vérifier l'authentification
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }
        
        if (!projectId) {
          toast.error("ID de projet invalide");
          navigate("/");
          return;
        }

        // Charger les détails du projet depuis Supabase
        const projectData = await getProjectById(projectId);
        
        if (!projectData) {
          toast.error("Projet non trouvé");
          navigate("/");
          return;
        }
        
        setProject(projectData);
        
        // Charger les EPICs et User Stories depuis Supabase
        try {
          const content = await getProjectContent(projectId);
          setProjectContent(content);
        } catch (contentError) {
          console.error("Erreur lors du chargement du contenu:", contentError);
          
          // Fallback vers localStorage pour la compatibilité
          const contentJson = localStorage.getItem(`project_${projectId}_content`);
          if (contentJson) {
            try {
              setProjectContent(JSON.parse(contentJson));
            } catch (parseError) {
              console.error("Erreur lors du parsing du contenu localStorage:", parseError);
              toast.error("Impossible de charger le contenu du projet");
            }
          } else {
            toast.error("Aucun contenu trouvé pour ce projet");
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du projet:", error);
        toast.error("Erreur lors du chargement du projet");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate]);

  // Fonction pour transformer projectContent en un format plus simple pour l'affichage
  const getFormattedEpics = (): Epic[] => {
    if (!projectContent) return [];
    
    return projectContent.epics.map(epic => ({
      id: epic.id,
      title: epic.title,
      description: epic.objective, // Utiliser l'objectif comme description
      objective: epic.objective,
      problemAddressed: epic.problemAddressed,
      businessValue: epic.businessValue,
      stories: epic.stories.map(story => ({
        id: story.id,
        title: story.story, // Utiliser le champ story comme titre
        description: story.story,
        status: story.status
      }))
    }));
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex justify-center items-center py-12">
          <p>Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const formattedEpics = getFormattedEpics();

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate("/")} className="group">
          <ArrowLeft className="mr-2 h-4 w-4 transform transition-transform group-hover:-translate-x-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
      </div>

      {formattedEpics.length > 0 ? (
        <div className="space-y-8">
          {formattedEpics.map((epic, epicIndex) => (
            <Card key={epic.id || epicIndex} className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl">
                  EPIC {epicIndex + 1}: {epic.title}
                </CardTitle>
                <p className="text-muted-foreground">{epic.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {epic.stories.map((story, storyIndex) => (
                    <Card key={story.id || storyIndex} className="glass-card">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          User Story {storyIndex + 1}: {story.title}
                        </CardTitle>
                        <p className="text-muted-foreground">{story.description}</p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-lg">
          <h3 className="text-xl font-medium mb-2">Aucun contenu trouvé</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Les EPICs et User Stories n'ont pas pu être chargés pour ce projet.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
