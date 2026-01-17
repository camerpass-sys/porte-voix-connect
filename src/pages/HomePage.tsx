import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreVertical, MessageCircle, Users, Settings, Bluetooth, Plus } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo.png';

interface HomePageProps {
  onOpenChat: (conversationId: string, participantName: string, participantAvatar?: string, isOnline?: boolean) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenChat }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { conversations, loading, createConversation, fetchConversations } = useConversations();
  const { isBluetoothEnabled, nearbyDevices, savedContacts } = useBluetooth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discussions');

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participantUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeviceSelect = async (userId: string) => {
    const conversationId = await createConversation(userId);
    if (conversationId) {
      // Refresh conversations
      await fetchConversations();
      
      // Find the conversation to open
      const device = nearbyDevices.find(d => d.userId === userId);
      if (device) {
        onOpenChat(conversationId, device.displayName, device.avatarUrl, true);
      } else {
        // Try to find in conversations list
        setTimeout(() => {
          const conv = conversations.find(c => c.participantId === userId);
          if (conv) {
            onOpenChat(conv.id, conv.participantName, conv.participantAvatar, conv.isOnline);
          } else {
            toast({
              title: "Conversation créée",
              description: "La conversation a été créée avec succès.",
            });
            setActiveTab('discussions');
          }
        }, 500);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Get contacts from nearby devices, saved contacts, and conversations
  const contacts = [
    ...nearbyDevices.map(d => ({
      id: d.userId,
      name: d.displayName,
      username: d.username,
      avatar: d.avatarUrl,
      isOnline: true,
      isNearby: d.isNearby,
    })),
    ...savedContacts
      .filter(c => !nearbyDevices.some(d => d.userId === c.userId))
      .map(c => ({
        id: c.userId,
        name: c.displayName,
        username: c.username,
        avatar: c.avatarUrl,
        isOnline: false,
        isNearby: false,
      })),
    ...conversations
      .filter(c => !nearbyDevices.some(d => d.userId === c.participantId) && 
                   !savedContacts.some(s => s.userId === c.participantId))
      .map(c => ({
        id: c.participantId,
        name: c.participantName,
        username: c.participantUsername,
        avatar: c.participantAvatar,
        isOnline: c.isOnline,
        isNearby: false,
      }))
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="chat-header px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center">
          <img src={logoImage} alt="ConnKtus" className="h-10 object-contain" />
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
              <DropdownMenuSeparator />
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
        <TabsList className="w-full rounded-none border-b border-border bg-card h-12 px-2">
          <TabsTrigger 
            value="discussions" 
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Discussions
          </TabsTrigger>
          <TabsTrigger 
            value="scanner"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
          >
            <Bluetooth className="w-4 h-4 mr-2" />
            Scanner
          </TabsTrigger>
          <TabsTrigger 
            value="contacts"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
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
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Aucun contact</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Scannez des appareils pour découvrir des contacts
              </p>
              <Button onClick={() => setActiveTab('scanner')} className="rounded-full">
                <Bluetooth className="w-4 h-4 mr-2" />
                Scanner
              </Button>
            </div>
          ) : (
            <div className="px-2 py-2">
              <p className="text-xs text-muted-foreground px-3 mb-2 uppercase font-medium">
                {contacts.length} contact(s)
              </p>
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleDeviceSelect(contact.id)}
                  className="contact-card"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {contact.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                      contact.isOnline ? 'bg-status-online' : 'bg-status-offline'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">@{contact.username}</p>
                  </div>
                  {contact.isNearby && (
                    <span className="px-2 py-1 rounded-full bg-status-online/10 text-status-online text-xs font-medium">
                      À proximité
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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

      {/* FAB for new chat */}
      <button 
        onClick={() => setActiveTab('scanner')}
        className="fab"
        aria-label="Nouvelle discussion"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
