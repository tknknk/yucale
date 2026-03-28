'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { SWRProvider } from '@/lib/swr-config';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SWRProvider>
      <AuthProvider>{children}</AuthProvider>
    </SWRProvider>
  );
}
