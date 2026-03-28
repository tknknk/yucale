'use client';

import { useAuthContext } from '@/contexts/AuthContext';

// Re-export the hook from the context for backward compatibility
export const useAuth = useAuthContext;
