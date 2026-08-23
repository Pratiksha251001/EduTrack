import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'teacher' | null;
  loading: boolean;
  loginAsDemo: (role: 'admin' | 'teacher') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('smit_user');
    const savedRole = localStorage.getItem('smit_role') as 'admin' | 'teacher' | null;
    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
    }
    setLoading(false);
  }, []);

  const loginAsDemo = async (targetRole: 'admin' | 'teacher') => {
    setLoading(true);
    const demoUser: User = targetRole === 'admin'
      ? { id: 'admin-1', email: 'admin@smit.edu', full_name: 'Dr. Arthur Pendelton (Dean)' }
      : { id: 'teacher-user-id', email: 'teacher@smit.edu', full_name: 'Dr. Robert Vance' };

    setUser(demoUser);
    setRole(targetRole);
    localStorage.setItem('smit_user', JSON.stringify(demoUser));
    localStorage.setItem('smit_role', targetRole);
    setLoading(false);
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('smit_user');
    localStorage.removeItem('smit_role');
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginAsDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
};
