import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Bluetooth, Bell, Shield, Info, LogOut, ChevronRight, Moon, Sun, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useBluetooth } from '@/contexts/BluetoothContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, updateProfile, loading } = useProfile();
  const { isBluetoothEnabled, enableBluetooth, disableBluetooth } = useBluetooth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom ne peut pas être vide',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const success = await updateProfile({ displayName: displayName.trim() });
    setSaving(false);

    if (success) {
      toast({
        title: 'Profil mis à jour',
        description: 'Vos modifications ont été enregistrées.',
      });
      setIsEditing(false);
    } else {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleBluetoothToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableBluetooth();
    } else {
      disableBluetooth();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="chat-header px-2 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-primary-foreground">Paramètres</h1>
      </header>

      <div className="px-4 py-6">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-primary/20">
                <AvatarImage src={profile?.avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Votre nom"
                    className="rounded-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(profile?.displayName || '');
                      }}
                      className="rounded-lg"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{profile?.displayName}</h2>
                  <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDisplayName(profile?.displayName || '');
                      setIsEditing(true);
                    }}
                    className="mt-2 text-primary hover:text-primary/80"
                  >
                    Modifier le profil
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Online Status */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut actuel</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isBluetoothEnabled ? 'bg-status-online' : 'bg-status-offline'}`} />
              <span className="text-sm font-medium">
                {isBluetoothEnabled ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Bluetooth Settings */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border">
            <div className="px-4 py-3 bg-muted/50">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Bluetooth
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bluetooth className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Bluetooth activé</p>
                    <p className="text-xs text-muted-foreground">Soyez visible pour les autres</p>
                  </div>
                </div>
                <Switch
                  checked={isBluetoothEnabled}
                  onCheckedChange={handleBluetoothToggle}
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border">
            <div className="px-4 py-3 bg-muted/50">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Notifications
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Notifications push</p>
                    <p className="text-xs text-muted-foreground">Recevoir les alertes de messages</p>
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </div>
          </div>

          {/* Security & Privacy */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border">
            <div className="px-4 py-3 bg-muted/50">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Sécurité & Confidentialité
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Chiffrement des messages</p>
                    <p className="text-xs text-muted-foreground">Vos messages sont chiffrés de bout en bout</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* About */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border">
            <div className="px-4 py-3 bg-muted/50">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                À propos
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">À propos de ConnKtus</p>
                    <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full rounded-xl h-12 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
};
