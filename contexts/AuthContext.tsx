'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Usuario, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name,
        image: session.user.image,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      setUser(null);
    }

    setLoading(false);
  }, [session, status]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // A sessão será atualizada automaticamente pelo NextAuth
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no signIn:', error);
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
      setUser(null);
    } catch (error) {
      console.error('Erro no signOut:', error);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no signUp:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    signUp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (typeof window === 'undefined') {
    // Durante SSR/SSG, retorna valores padrão
    return {
      user: null,
      loading: true,
      signIn: async () => false,
      signOut: async () => {},
      signUp: async () => false,
    };
  }
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
