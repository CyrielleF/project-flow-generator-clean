import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "@/components/AuthForm";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard");
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col justify-center items-center p-4 animate-fade-in">
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">ProductFlow</h1>
        <p className="text-muted-foreground">
          De l'idée aux tâches de développement
        </p>
      </div>
      
      <AuthForm />
    </div>
  );
};

export default Login;
