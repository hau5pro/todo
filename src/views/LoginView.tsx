import { signInWithGoogle } from '../supabase/auth';

export function LoginView() {
  return (
    <div className="login-view">
      <h1>todo</h1>
      <button className="btn-google" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  );
}
