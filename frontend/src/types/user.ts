export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'NO_ROLE';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: Role;
}
