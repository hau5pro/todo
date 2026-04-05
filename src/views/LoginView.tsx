import { useState } from 'react';
import { signInWithGoogle } from '../supabase/auth';

export function LoginView() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // OAuth popup dismissed or failed — re-enable button
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view">
      <h1>todo</h1>
      <button className="btn-google" onClick={handleSignIn} disabled={loading}>
        Sign in with Google
      </button>
    </div>
  );
}
