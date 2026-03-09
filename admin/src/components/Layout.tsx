import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setAuthToken } from '../api/client';
import styles from './Layout.module.css';

export default function Layout() {
  const { token, signOut, getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      getToken().then((t) => t && setAuthToken(t));
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

  const handleSignOut = async () => {
    setAuthToken(null);
    await signOut();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>EventHub Admin</div>
        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? styles.active : '')}>
            Tableau de bord
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => (isActive ? styles.active : '')}>
            Utilisateurs
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => (isActive ? styles.active : '')}>
            Événements
          </NavLink>
        </nav>
        <button type="button" className={styles.logout} onClick={handleSignOut}>
          Déconnexion
        </button>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
