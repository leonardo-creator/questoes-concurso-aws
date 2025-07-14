'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/contexts/OfflineContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <OfflineProvider>
          {children}
        </OfflineProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
