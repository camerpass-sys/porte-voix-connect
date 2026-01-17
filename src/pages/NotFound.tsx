import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, Bluetooth } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/logo.png';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Route non trouvée:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center safe-area-top safe-area-bottom">
      <div className="w-56 h-16 mb-6 flex items-center justify-center">
        <img src={logoImage} alt="ConnKtus" className="max-w-full max-h-full object-contain drop-shadow-lg" />
      </div>
      
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Bluetooth className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-2">Page non trouvée</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Oups ! Cette page n'existe pas ou a été déplacée. Retournez à l'accueil pour continuer à utiliser ConnKtus.
      </p>

      <div className="flex gap-3">
        <Button onClick={() => navigate('/')} className="rounded-xl">
          <Home className="w-4 h-4 mr-2" />
          Accueil
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl">
          Retour
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
