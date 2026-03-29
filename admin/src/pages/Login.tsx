import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Chargement…</p>
      </div>
    );
  }
  if (user && role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Email ou mot de passe incorrect.');
      } else if (msg.includes('Accès réservé')) {
        setError('Ce compte n\'a pas le rôle admin dans Firestore.');
      } else if (msg.includes('too-many-requests')) {
        setError('Trop de tentatives. Réessaie dans quelques minutes.');
      } else {
        setError(msg || 'Connexion impossible.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◆</span>
          EventHub
        </div>
        <h1 className={styles.title}>Administration</h1>
        <p className={styles.subtitle}>Connexion réservée aux administrateurs</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@eventhub.com"
              className={styles.input}
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={styles.input}
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              const e = email.trim();
              if (!e) { setError('Entre ton email pour recevoir le lien de réinitialisation.'); return; }
              try {
                await sendPasswordResetEmail(auth, e);
                setResetSent(true);
                setError('');
              } catch {
                setError('Impossible d\'envoyer le lien. Vérifie l\'email.');
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent, #7B5CFF)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem', textDecoration: 'underline', padding: 0 }}
          >
            Mot de passe oublié ?
          </button>
          {resetSent && <div style={{ color: '#22c55e', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email de réinitialisation envoyé à {email} ✓</div>}
        <button type="submit" disabled={loading} className={styles.button}>
            {loading ? (
              <>
                <span className={styles.btnSpinner} />
                Connexion…
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
