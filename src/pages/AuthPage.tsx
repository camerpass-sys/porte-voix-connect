import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, User, Lock, UserPlus } from 'lucide-react';
import { z } from 'zod';
import logoImage from '@/assets/logo.png';

const loginSchema = z.object({
  username: z.string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(20, "Le nom d'utilisateur ne peut pas dépasser 20 caractères")
    .regex(/^[a-zA-Z0-9_]+$/, "Seuls les lettres, chiffres et underscores sont autorisés"),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const signupSchema = loginSchema.extend({
  displayName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const schema = isLogin ? loginSchema : signupSchema;
      const result = schema.safeParse(formData);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(formData.username, formData.password);
        if (error) {
          toast({
            title: 'Erreur de connexion',
            description: error.message === 'Invalid login credentials' 
              ? 'Nom d\'utilisateur ou mot de passe incorrect' 
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Connexion réussie',
            description: 'Bienvenue sur ConnKtus !',
          });
          navigate('/');
        }
      } else {
        const { error } = await signUp(
          formData.username, 
          formData.password, 
          formData.displayName
        );
        if (error) {
          toast({
            title: "Erreur d'inscription",
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Inscription réussie',
            description: 'Votre compte a été créé avec succès !',
          });
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-top safe-area-bottom">
      {/* Header with gradient */}
      <div className="flex-shrink-0 pt-10 pb-8 px-6 text-center" style={{ background: 'var(--gradient-primary)' }}>
        <div className="w-28 h-28 mx-auto mb-4 rounded-2xl overflow-hidden shadow-xl bg-white p-2">
          <img 
            src={logoImage} 
            alt="ConnKtus" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold text-primary-foreground">ConnKtus</h1>
        <p className="text-primary-foreground/80 text-sm mt-2">
          Messagerie Bluetooth • Sans Internet
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 -mt-6 bg-background rounded-t-3xl">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="votre_pseudo"
                  className="rounded-xl pl-10"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nom affiché</Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="Votre nom complet"
                    className="rounded-xl pl-10"
                  />
                </div>
                {errors.displayName && (
                  <p className="text-xs text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="rounded-xl pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="rounded-xl pl-10"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl h-12 text-base font-medium mt-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'Se connecter'
              ) : (
                "S'inscrire"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setFormData({
                  username: '',
                  password: '',
                  displayName: '',
                  confirmPassword: '',
                });
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin 
                ? "Pas encore de compte ? S'inscrire" 
                : 'Déjà un compte ? Se connecter'
              }
            </button>
          </div>

          {/* App info */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              ConnKtus utilise le Bluetooth pour vous connecter avec les personnes à proximité, sans avoir besoin d'internet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
