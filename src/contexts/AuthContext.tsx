import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock users for phytopathology lab demo
const mockUsers: User[] = [
  { id: '1', name: 'Dr. Sarah Johnson', email: 'sarah@phytolab.com', role: 'supervisor', specialization: 'Plant Pathology' },
  { id: '2', name: 'Mike Chen', email: 'mike@phytolab.com', role: 'pathologist', specialization: 'Fungal Diseases' },
  { id: '3', name: 'Green Valley Farms', email: 'client@greenvalley.com', role: 'client' }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockUsers[0]); // Default to supervisor for demo

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call an API
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};