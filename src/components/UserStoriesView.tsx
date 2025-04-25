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
  status: "todo" | "in-progress" | "done";
}

interface UserStoriesViewProps {
  projectId: string;
}

const UserStoriesView = ({ projectId }: UserStoriesViewProps) => {
  const [epic, setEpic] = useState<Epic | null>(null);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get epic ID from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const epicId = searchParams.get("epic");
  
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
          status: (story.status?.replace("-", "_") as "todo" | "in-progress" | "done") || "todo"
        }));
        
        setUserStories(stories);
      } catch (error) {
        console.error("Erreur lors du chargement des EPICs et stories:", error);
        
        // Fallback vers localStorage pour la compatibilité
        const savedEpics = localStorage.getItem(`project_${projectId}_epics`);
        
        if (savedEpics) {
          const epics = JSON.parse(savedEpics);
          const currentEpic = epics.find((e: Epic) => e.id === epicId);
          
          if (currentEpic) {
            setEpic(currentEpic);
            
            // Load or generate user stories for this epic
            const savedStories = localStorage.getItem(`project_${projectId}_epic_${epicId}_stories`);
            
            if (savedStories) {
              setUserStories(JSON.parse(savedStories));
            } else {
              // Generate mock stories for this epic
              generateMockStories(epicId, currentEpic.title);
            }
          }
        } else {
          toast.error("Impossible de charger les données de l'EPIC");
          navigate(`/project/${projectId}?tab=epics`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEpicAndStories();
  }, [projectId, epicId, navigate]);

  const generateMockStories = (epicId: string, epicTitle: string) => {
    let stories: UserStory[] = [];
    
    // Generate different stories based on the epic
    if (epicTitle.includes("authentification")) {
      stories = [
        {
          id: `story_${epicId}_1`,
          epicId: epicId,
          title: "Inscription d'un nouvel utilisateur",
          description: "En tant que visiteur, je veux pouvoir créer un compte afin d'accéder aux fonctionnalités de l'application.",
          acceptance: [
            "Le formulaire contient les champs email et mot de passe",
            "Le mot de passe doit contenir au moins 8 caractères",
            "L'utilisateur est notifié du succès de l'inscription",
            "L'utilisateur est automatiquement connecté après l'inscription"
          ],
          status: "done"
        },
        {
          id: `story_${epicId}_2`,
          epicId: epicId,
          title: "Connexion utilisateur",
          description: "En tant qu'utilisateur inscrit, je veux pouvoir me connecter à mon compte pour accéder à mes projets.",
          acceptance: [
            "Le formulaire contient les champs email et mot de passe",
            "Un message d'erreur approprié s'affiche en cas d'échec",
            "L'utilisateur est redirigé vers son tableau de bord après connexion"
          ],
          status: "done"
        },
        {
          id: `story_${epicId}_3`,
          epicId: epicId,
          title: "Déconnexion utilisateur",
          description: "En tant qu'utilisateur connecté, je veux pouvoir me déconnecter pour sécuriser mon accès.",
          acceptance: [
            "Un bouton de déconnexion est accessible",
            "L'utilisateur est redirigé vers la page d'accueil après déconnexion",
            "Les données de session sont effacées"
          ],
          status: "done"
        },
        {
          id: `story_${epicId}_4`,
          epicId: epicId,
          title: "Mot de passe oublié",
          description: "En tant qu'utilisateur inscrit, je veux pouvoir réinitialiser mon mot de passe si je l'ai oublié.",
          acceptance: [
            "Un lien 'Mot de passe oublié' est accessible sur la page de connexion",
            "L'utilisateur peut demander une réinitialisation par email",
            "Un email avec un lien de réinitialisation est envoyé",
            "L'utilisateur peut définir un nouveau mot de passe"
          ],
          status: "todo"
        }
      ];
    } else if (epicTitle.includes("Gestion de projets")) {
      stories = [
        {
          id: `story_${epicId}_1`,
          epicId: epicId,
          title: "Création d'un nouveau projet",
          description: "En tant qu'utilisateur connecté, je veux pouvoir créer un nouveau projet avec une description pour organiser mon travail.",
          acceptance: [
            "Un formulaire permet de saisir le titre et la description du projet",
            "La date de création est automatiquement enregistrée",
            "Le projet apparaît dans la liste des projets de l'utilisateur"
          ],
          status: "done"
        },
        {
          id: `story_${epicId}_2`,
          epicId: epicId,
          title: "Affichage de la liste des projets",
          description: "En tant qu'utilisateur connecté, je veux voir la liste de mes projets pour pouvoir accéder à ceux qui m'intéressent.",
          acceptance: [
            "Les projets sont affichés sous forme de cartes",
            "Chaque carte affiche le titre, la description et la date de création",
            "Un bouton permet d'accéder au détail d'un projet"
          ],
          status: "in-progress"
        },
        {
          id: `story_${epicId}_3`,
          epicId: epicId,
          title: "Modification d'un projet existant",
          description: "En tant qu'utilisateur connecté, je veux pouvoir modifier les informations d'un projet existant.",
          acceptance: [
            "Un bouton permet d'accéder à la modification",
            "Le formulaire est pré-rempli avec les données actuelles",
            "Les modifications sont sauvegardées en cliquant sur Enregistrer"
          ],
          status: "todo"
        }
      ];
    } else {
      // Default stories for other epics
      stories = [
        {
          id: `story_${epicId}_1`,
          epicId: epicId,
          title: `Première fonctionnalité de ${epicTitle}`,
          description: "En tant qu'utilisateur, je veux pouvoir utiliser cette fonctionnalité pour atteindre mon objectif.",
          acceptance: [
            "Critère d'acceptation 1",
            "Critère d'acceptation 2",
            "Critère d'acceptation 3"
          ],
          status: "todo"
        },
        {
          id: `story_${epicId}_2`,
          epicId: epicId,
          title: `Deuxième fonctionnalité de ${epicTitle}`,
          description: "En tant qu'utilisateur, je veux pouvoir utiliser cette fonctionnalité pour atteindre mon objectif.",
          acceptance: [
            "Critère d'acceptation 1",
            "Critère d'acceptation 2"
          ],
          status: "todo"
        }
      ];
    }
    
    setUserStories(stories);
    localStorage.setItem(`project_${projectId}_epic_${epicId}_stories`, JSON.stringify(stories));
  };

  const handleUpdateStoryStatus = async (storyId: string, newStatus: "todo" | "in-progress" | "done") => {
    try {
      // Convertir le format du statut pour Supabase
      const supabaseStatus = newStatus === "in-progress" ? "in_progress" : newStatus;
      
      // Mettre à jour le statut dans Supabase
      await updateStoryStatus(storyId, supabaseStatus as "todo" | "in_progress" | "done");
      
      // Mettre à jour l'état local
      const updatedStories = userStories.map(story => 
        story.id === storyId ? { ...story, status: newStatus } : story
      );
      
      setUserStories(updatedStories);
      
      // Pour la compatibilité avec le localStorage existant
      localStorage.setItem(`project_${projectId}_epic_${epicId}_stories`, JSON.stringify(updatedStories));
      
      toast.success("Statut mis à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "done":
        return "Terminé";
      case "in-progress":
        return "En cours";
      default:
        return "À faire";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">Chargement...</h3>
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
        >
          Retour aux EPICs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            className="mb-2 pl-0 hover:bg-transparent"
            onClick={() => navigate(`/project/${projectId}?tab=epics`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux EPICs
          </Button>
          <h2 className="text-2xl font-bold">{epic.title}</h2>
          <p className="text-muted-foreground">{epic.description}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => toast.info("Fonctionnalité à venir")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une User Story
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {userStories.map((story) => (
          <Card key={story.id} className="glass-card overflow-hidden animate-scale-in">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{story.title}</CardTitle>
                <Badge
                  variant={
                    story.status === "done" 
                      ? "default" 
                      : story.status === "in-progress" 
                      ? "outline" 
                      : "secondary"
                  }
                  className="text-xs flex items-center gap-1"
                >
                  {getStatusIcon(story.status)}
                  {getStatusText(story.status)}
                </Badge>
              </div>
              <CardDescription>
                {story.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Critères d'acceptation:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  {story.acceptance.map((criterion, index) => (
                    <li key={index}>{criterion}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex gap-2">
              <div className="flex-1 text-xs text-muted-foreground">
                ID: {story.id}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={story.status === "todo"}
                  onClick={() => handleUpdateStoryStatus(story.id, "todo")}
                >
                  À faire
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={story.status === "in-progress"}
                  onClick={() => handleUpdateStoryStatus(story.id, "in-progress")}
                >
                  En cours
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={story.status === "done"}
                  onClick={() => handleUpdateStoryStatus(story.id, "done")}
                >
                  Terminé
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserStoriesView;
