import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreVertical, MessageCircle, Users, Settings, Bluetooth } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationItem } from '@/components/chat/ConversationItem';
import { DeviceScanner } from '@/components/bluetooth/DeviceScanner';
import { BluetoothToggle } from '@/components/bluetooth/BluetoothToggle';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { useBluetooth } from '@/contexts/BluetoothContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import logoImage from '@/assets/logo.jpg';

interface HomePageProps {
  onOpenChat: (conversationId: string, participantName: string, participantAvatar?: string, isOnline?: boolean) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenChat }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { conversations, loading, createConversation } = useConversations();
  const { isBluetoothEnabled } = useBluetooth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discussions');

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participantUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeviceSelect = async (userId: string) => {
    const conversationId = await createConversation(userId);
    if (conversationId) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        onOpenChat(conv.id, conv.participantName, conv.participantAvatar, conv.isOnline);
      } else {
        // Fetch the new conversation
        setTimeout(() => {
          const newConv = conversations.find(c => c.participantId === userId);
          if (newConv) {
            onOpenChat(newConv.id, newConv.participantName, newConv.participantAvatar, newConv.isOnline);
          }
        }, 500);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="chat-header px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
            <img src={logoImage} alt="ConnKtus" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">ConnKtus</h1>
        </div>

        <div className="flex items-center gap-1">
          <BluetoothToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-2 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full bg-muted border-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b border-border bg-card h-12">
          <TabsTrigger 
            value="discussions" 
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Discussions
          </TabsTrigger>
          <TabsTrigger 
            value="scanner"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Bluetooth className="w-4 h-4 mr-2" />
            Scanner
          </TabsTrigger>
          <TabsTrigger 
            value="contacts"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussions" className="flex-1 overflow-y-auto mt-0 chat-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Aucune discussion</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Aucun résultat pour votre recherche' 
                  : 'Scannez des appareils pour commencer une discussion'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setActiveTab('scanner')} className="rounded-full">
                  <Bluetooth className="w-4 h-4 mr-2" />
                  Scanner des appareils
                </Button>
              )}
            </div>
          ) : (
            <div className="px-2 py-1">
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  onClick={() => onOpenChat(conv.id, conv.participantName, conv.participantAvatar, conv.isOnline)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scanner" className="flex-1 overflow-y-auto mt-0 chat-scrollbar">
          <DeviceScanner onDeviceSelect={handleDeviceSelect} />
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 overflow-y-auto mt-0 chat-scrollbar">
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Vos contacts</h3>
            <p className="text-sm text-muted-foreground">
              Les contacts que vous avez découverts apparaîtront ici
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Badge */}
      {profile && (
        <div 
          onClick={() => navigate('/profile')}
          className="absolute bottom-6 left-6 bg-card rounded-full shadow-lg flex items-center gap-2 pr-4 pl-1.5 py-1.5 cursor-pointer hover:shadow-xl transition-shadow border border-border"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile.avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {profile.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{profile.displayName}</span>
          <span className={`w-2 h-2 rounded-full ${isBluetoothEnabled ? 'bg-status-online' : 'bg-status-offline'}`} />
        </div>
      )}
    </div>
  );
};
