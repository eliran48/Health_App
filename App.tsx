
import React, { useState, useEffect } from 'react';
// Fix: Use Firebase v8 compat imports to fix module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from './services/firebase';
import AuthCard from './components/AuthCard';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fix: Use Firebase v8 onAuthStateChanged method.
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">טוען...</div>
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <AuthCard />;
}