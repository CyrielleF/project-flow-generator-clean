import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  epicsCount: number | null;
  storiesCount: number | null;
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();

  const handleViewProject = () => {
    navigate(`/project/${project.id}`);
  };

  return (
    <Card className="glass-card overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl line-clamp-1">{project.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="py-2 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{project.description}</p>
        <div className="flex items-center text-xs text-muted-foreground gap-1 mb-2">
          <Calendar className="h-3 w-3" />
          <span>{new Date(project.createdAt).toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {project.epicsCount} EPICs
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {project.storiesCount} User Stories
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="default" 
          className="w-full group"
          onClick={handleViewProject}
        >
          Consulter
          <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
