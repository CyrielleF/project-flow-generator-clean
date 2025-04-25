import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProjectCard, { Project } from "@/components/ProjectCard";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { generateProjectSpecifications } from "@/services/assistant";
import { supabase } from "@/lib/supabase";
import { createProject as createProjectInSupabase, getProjects } from "@/services/projectService";

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndLoadProjects = async () => {
      try {
        setIsLoading(true);
        
        // Vérifier l'authentification avec Supabase
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/login");
          return;
        }
        
        setUserId(user.id);
        
        // Charger les projets depuis Supabase
        const userProjects = await getProjects(user.id);
        setProjects(userProjects);
      } catch (error) {
        console.error("Erreur lors du chargement des projets:", error);
        toast.error("Erreur lors du chargement des projets");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadProjects();
  }, [navigate]);

  const createProject = async () => {
    if (!newProject.title.trim()) {
      toast.error("Le titre du projet est requis");
      return;
    }

    if (!userId) {
      toast.error("Vous devez être connecté pour créer un projet");
      return;
    }

    setIsGenerating(true);
    toast.info("L'assistant IA génère les EPICs et User Stories pour votre projet. Cette opération peut prendre quelques instants...");

    try {
      // Créer l'objet projet
      const projectData = {
        title: newProject.title,
        description: newProject.description || "Aucune description",
        createdAt: new Date().toISOString(),
        epicsCount: 0,
        storiesCount: 0
      };

      // Générer les EPICs et Stories avec l'assistant
      let generatedContent;
      try {
        generatedContent = await generateProjectSpecifications(newProject.title, newProject.description);
        
        // Créer le projet dans Supabase avec le contenu généré
        const newProjectData = await createProjectInSupabase(projectData, userId, generatedContent);
        
        // Mettre à jour la liste des projets
        setProjects([newProjectData, ...projects]);
        
        toast.success(`Projet créé avec succès ! ${generatedContent.epics.length} EPICs et ${newProjectData.storiesCount} User Stories ont été générés par l'assistant IA.`);
        
        setNewProject({ title: "", description: "" });
        setIsDialogOpen(false);
        
        // Rediriger vers la page de détail du projet
        navigate(`/project/${newProjectData.id}`);
      } catch (assistantError) {
        console.error("Erreur avec l'assistant IA:", assistantError);
        toast.error("Impossible de générer le contenu avec l'assistant IA. Le projet a été créé sans EPICs ni User Stories.");
        
        // Créer un template de contenu vide
        generatedContent = {
          epics: [{
            title: "EPIC par défaut",
            objective: "À définir",
            problemAddressed: "À définir",
            businessValue: "À définir",
            stories: [{
              epic: "EPIC par défaut",
              story: "User Story à définir",
              acceptanceCriteria: [{
                given: "Condition à définir",
                when: "Action à définir",
                then: "Résultat attendu à définir"
              }],
              kpis: "À définir",
              designLink: ""
            }]
          }]
        };
        
        // Créer le projet dans Supabase avec le contenu par défaut
        const newProjectData = await createProjectInSupabase(projectData, userId, generatedContent);
        
        // Mettre à jour la liste des projets
        setProjects([newProjectData, ...projects]);
      }
    } catch (error) {
      toast.error("Erreur lors de la création du projet: " + (error instanceof Error ? error.message : "Erreur inconnue"));
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const createProjectWithoutAI = async () => {
    if (!newProject.title.trim() || !userId) {
      return;
    }
    
    try {
      // Créer l'objet projet
      const projectData = {
        title: newProject.title,
        description: newProject.description || "Aucune description",
        createdAt: new Date().toISOString(),
        epicsCount: 1,
        storiesCount: 1
      };

      // Créer un template de contenu vide
      const emptyContent = {
        epics: [{
          title: "EPIC par défaut",
          objective: "À définir",
          problemAddressed: "À définir",
          businessValue: "À définir",
          stories: [{
            epic: "EPIC par défaut",
            story: "User Story à définir",
            acceptanceCriteria: [{
              given: "Condition à définir",
              when: "Action à définir",
              then: "Résultat attendu à définir"
            }],
            kpis: "À définir",
            designLink: ""
          }]
        }]
      };
      
      // Créer le projet dans Supabase avec le contenu par défaut
      const newProjectData = await createProjectInSupabase(projectData, userId, emptyContent);
      
      // Mettre à jour la liste des projets
      setProjects([newProjectData, ...projects]);
      
      setNewProject({ title: "", description: "" });
      setIsDialogOpen(false);
      toast.success("Projet créé avec succès (sans génération IA)");
      
      // Rediriger vers la page de détail du projet
      navigate(`/project/${newProjectData.id}`);
    } catch (error) {
      toast.error("Erreur lors de la création du projet: " + (error instanceof Error ? error.message : "Erreur inconnue"));
      console.error(error);
    }
  };

  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes projets</h1>
          <p className="text-muted-foreground">
            Retrouvez l'ensemble de vos projets
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="self-start">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glass-container">
            <DialogHeader>
              <DialogTitle>Créer un nouveau projet</DialogTitle>
              <DialogDescription>
                Définissez le titre et la description de votre nouveau projet.
                L'assistant IA générera automatiquement les EPICs et User Stories associées.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Titre
                </label>
                <Input
                  id="title"
                  placeholder="Nom du projet"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Description du projet"
                  rows={4}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button 
                variant="secondary" 
                onClick={createProjectWithoutAI}
                className="w-full sm:w-auto"
                disabled={!newProject.title.trim() || isGenerating}
              >
                Créer sans IA
              </Button>
              <Button 
                onClick={createProject} 
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération en cours...
                  </>
                ) : "Créer avec IA"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Rechercher un projet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <p>Chargement des projets...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-lg">
          <h3 className="text-xl font-medium mb-2">Aucun projet trouvé</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {searchQuery 
              ? "Aucun projet ne correspond à votre recherche. Essayez avec d'autres termes." 
              : "Vous n'avez pas encore de projets. Créez votre premier projet pour commencer."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un projet
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
