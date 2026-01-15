import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateBluetoothId } from '@/services/BluetoothMeshService';

// Offline user structure (no Supabase dependency)
export interface OfflineUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bluetoothId: string;
  createdAt: string;
}

interface AuthContextType {
  user: OfflineUser | null;
  loading: boolean;
  signUp: (username: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys for offline auth
const USERS_KEY = 'connktus_users';
const CURRENT_USER_KEY = 'connktus_current_user';
const SESSION_KEY = 'connktus_session';

// Get stored users from localStorage
const getStoredUsers = (): { [username: string]: { password: string; user: OfflineUser } } => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save users to localStorage
const saveUsers = (users: { [username: string]: { password: string; user: OfflineUser } }): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Simple hash function for password (basic protection for local storage)
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OfflineUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = localStorage.getItem(CURRENT_USER_KEY);
        const session = localStorage.getItem(SESSION_KEY);
        
        if (storedUser && session) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('[Auth] Erreur session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signUp = async (username: string, password: string, displayName: string) => {
    try {
      const normalizedUsername = username.toLowerCase().trim();
      const users = getStoredUsers();
      
      // Check if username already exists
      if (users[normalizedUsername]) {
        return { error: new Error("Ce nom d'utilisateur est déjà pris") };
      }

      // Create new user
      const userId = crypto.randomUUID();
      const bluetoothId = generateBluetoothId();
      
      const newUser: OfflineUser = {
        id: userId,
        username: normalizedUsername,
        displayName: displayName.trim(),
        bluetoothId,
        createdAt: new Date().toISOString(),
      };

      // Save user with hashed password
      users[normalizedUsername] = {
        password: hashPassword(password),
        user: newUser,
      };
      
      saveUsers(users);
      
      // Auto sign-in after signup
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(SESSION_KEY, crypto.randomUUID());
      
      setUser(newUser);
      
      console.log('[Auth] Inscription réussie:', normalizedUsername);
      
      return { error: null };
    } catch (error) {
      console.error('[Auth] Erreur inscription:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const normalizedUsername = username.toLowerCase().trim();
      const users = getStoredUsers();
      
      const storedUser = users[normalizedUsername];
      
      if (!storedUser) {
        return { error: new Error("Nom d'utilisateur ou mot de passe incorrect") };
      }

      // Check password
      if (storedUser.password !== hashPassword(password)) {
        return { error: new Error("Nom d'utilisateur ou mot de passe incorrect") };
      }

      // Set session
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(storedUser.user));
      localStorage.setItem(SESSION_KEY, crypto.randomUUID());
      
      setUser(storedUser.user);
      
      console.log('[Auth] Connexion réussie:', normalizedUsername);
      
      return { error: null };
    } catch (error) {
      console.error('[Auth] Erreur connexion:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    console.log('[Auth] Déconnexion réussie');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
