import { supabase } from './client';
export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
    });
    if (error)
        throw error;
}
export async function signInWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
}
/** Returns whether email confirmation is required before the account is active. */
export async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error)
        throw error;
    return { needsConfirmation: !data.session };
}
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error)
        throw error;
}
export async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}
/** Subscribe to auth state changes. Returns unsubscribe function. */
export function onAuthStateChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
}
