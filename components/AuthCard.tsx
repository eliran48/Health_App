import React, { useState } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../services/firebase';

export default function AuthCard() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // On success, the onAuthStateChanged listener in App.tsx will handle
      // redirecting the user to the dashboard.
    } catch (err: any) {
      // Map common Firebase auth errors to user-friendly Hebrew messages.
      switch (err.code) {
        case 'auth/invalid-email':
          setError('כתובת האימייל אינה תקינה.');
          break;
        case 'auth/user-not-found':
          setError('לא נמצא משתמש עם כתובת אימייל זו.');
          break;
        case 'auth/wrong-password':
          setError('הסיסמה שהוזנה שגויה.');
          break;
        case 'auth/email-already-in-use':
          setError('כתובת האימייל כבר רשומה במערכת.');
          break;
        case 'auth/weak-password':
          setError('הסיסמה חלשה מדי. יש להזין לפחות 6 תווים.');
          break;
        default:
          setError('אירעה שגיאה. אנא נסה שוב.');
          console.error('Authentication error:', err);
      }
      setLoading(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError(null); // Clear errors when switching modes
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            {isSignUp ? 'יצירת חשבון חדש' : 'ברוכים הבאים'}
        </h2>
        <p className="text-gray-600 mb-8 text-center">
            {isSignUp ? 'הזן את פרטיך כדי להירשם.' : 'התחבר לחשבונך כדי להמשיך.'}
        </p>

        <form onSubmit={handleAuthAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              כתובת אימייל
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-gray-700 mb-1">
              סיסמה
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'טוען...' : (isSignUp ? 'הרשמה' : 'התחברות')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {isSignUp ? 'כבר יש לך חשבון?' : 'אין לך חשבון?'}
          <button onClick={toggleAuthMode} className="font-semibold text-black hover:underline ml-1 focus:outline-none">
            {isSignUp ? 'התחבר' : 'הירשם'}
          </button>
        </p>
      </div>
    </div>
  );
}
