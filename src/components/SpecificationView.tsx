import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AIService } from "../services/aiService";

interface SpecificationViewProps {
  projectId: string;
}

const SpecificationView = ({ projectId }: SpecificationViewProps) => {
  const [needsDescription, setNeedsDescription] = useState("");
  const [specification, setSpecification] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Load from localStorage if exists
    const savedNeeds = localStorage.getItem(`project_${projectId}_needs`);
    const savedSpec = localStorage.getItem(`project_${projectId}_specification`);
    
    if (savedNeeds) setNeedsDescription(savedNeeds);
    if (savedSpec) setSpecification(savedSpec);
  }, [projectId]);

  const generateSpecification = async () => {
    if (!needsDescription.trim()) {
      toast.error("L'expression de besoin ne peut pas être vide");
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Initialisation du service AI avec la clé:', import.meta.env.VITE_OPENAI_API_KEY ? 'Clé présente' : 'Clé manquante');
      const aiService = new AIService(import.meta.env.VITE_OPENAI_API_KEY || '');
      
      console.log('Génération des spécifications...');
      const generatedSpec = await aiService.generateSpecification(needsDescription);
      console.log('Spécifications générées avec succès');
      setSpecification(generatedSpec);
      
      console.log('Sauvegarde des spécifications...');
      localStorage.setItem(`project_${projectId}_needs`, needsDescription);
      localStorage.setItem(`project_${projectId}_specification`, generatedSpec);
      
      console.log('Génération des EPICs...');
      const generatedEpics = await aiService.generateEpicsAndStories(generatedSpec);
      console.log('EPICs générés:', generatedEpics);
      
      console.log('Ajout des IDs aux EPICs...');
      const epicsWithIds = generatedEpics.map((epic, index) => ({
        ...epic,
        id: `epic${index + 1}`,
        description: epic.objective,
        stories: epic.stories.map((story, storyIndex) => ({
          ...story,
          id: `story_${index + 1}_${storyIndex + 1}`
        }))
      }));
      
      console.log('Sauvegarde des EPICs...');
      localStorage.setItem(`project_${projectId}_epics`, JSON.stringify(epicsWithIds));
      
      toast.success("Spécifications et EPICs générés avec succès");
    } catch (error) {
      console.error('Erreur détaillée lors de la génération:', error);
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSpecification = () => {
    if (specification) {
      localStorage.setItem(`project_${projectId}_specification`, specification);
      toast.success("Spécifications enregistrées");
      setIsEditing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {!specification ? (
        <Card className="glass-container">
          <CardHeader>
            <CardTitle className="text-xl">Expression de besoin</CardTitle>
            <CardDescription>
              Décrivez votre idée de produit ou projet pour générer des spécifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Décrivez votre projet, ses objectifs, ses utilisateurs cibles et les fonctionnalités attendues..."
              className="min-h-[200px] resize-none"
              value={needsDescription}
              onChange={(e) => setNeedsDescription(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={generateSpecification} 
              disabled={isGenerating || !needsDescription.trim()}
              className="ml-auto"
            >
              {isGenerating ? "Génération en cours..." : "Générer les spécifications"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="glass-container">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Spécifications du Projet</CardTitle>
              <CardDescription>
                Document généré à partir de votre expression de besoin
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Généré automatiquement
              </Badge>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Modifier
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={saveSpecification}>
                  Sauvegarder
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                className="min-h-[400px] font-mono text-sm"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap bg-secondary/50 p-4 rounded-md overflow-auto">
                  {specification}
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setSpecification(null);
                setNeedsDescription("");
                localStorage.removeItem(`project_${projectId}_specification`);
                localStorage.removeItem(`project_${projectId}_needs`);
              }}
            >
              Recommencer
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default SpecificationView;
