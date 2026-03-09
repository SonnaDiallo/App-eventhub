import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { auth, firebaseApp } from '../config/firebase';

type AuthState = {
  user: User | null;
  role: string | null;
  token: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
} | null>(null);

const db = getFirestore(firebaseApp);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (!firebaseUser) {
        setRole(null);
        setToken(null);
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const data = userDoc.data();
        const r = (data?.role as string) ?? 'user';
        setRole(r);
        const t = await firebaseUser.getIdToken();
        setToken(t);
      } catch {
        setRole(null);
        setToken(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    const data = userDoc.data();
    const r = (data?.role as string) ?? 'user';
    if (r !== 'admin') {
      await firebaseSignOut(auth);
      throw new Error('Accès réservé aux administrateurs.');
    }
    const t = await cred.user.getIdToken();
    setToken(t);
    setRole(r);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setToken(null);
    setRole(null);
  };

  const getToken = async (): Promise<string | null> => {
    if (!user) return null;
    const t = await user.getIdToken(true);
    setToken(t);
    return t;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        signIn,
        signOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
