import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const AuthForm = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        toast.success("Connexion réussie");
        navigate("/dashboard");
      } else {
        console.log("Tentative de création de compte avec:", { email });
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/login',
            data: {
              email: email,
            }
          }
        });

        if (error) {
          console.error("Erreur SignUp:", error);
          throw error;
        }

        console.log("Résultat SignUp:", data);

        if (data.user) {
          // Nous ne créons plus le profil ici, il sera créé automatiquement
          // par un trigger de base de données lors de la confirmation de l'email
          toast.success("Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.");
        } else {
          console.log("Pas d'utilisateur créé dans la réponse");
          toast.info("Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception.");
        }
      }
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      
      let errorMessage = "Une erreur s'est produite";
      
      if (error.message) {
        switch (error.message) {
          case "User already registered":
            errorMessage = "Cet email est déjà utilisé";
            break;
          case "Invalid login credentials":
            errorMessage = "Email ou mot de passe incorrect";
            break;
          case "Email not confirmed":
            errorMessage = "Veuillez confirmer votre email avant de vous connecter";
            break;
          default:
            errorMessage = `Erreur: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setEmail("");
    setPassword("");
  };

  return (
    <Card className="w-full max-w-md animate-scale-in glass-container">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "signin" 
            ? "Connectez-vous pour accéder à vos projets" 
            : "Créez un compte pour commencer à gérer vos projets"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Chargement..." : mode === "signin" ? "Se connecter" : "S'inscrire"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={toggleMode}>
          {mode === "signin" ? "Pas de compte ? Créez-en un" : "Déjà un compte ? Connectez-vous"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
