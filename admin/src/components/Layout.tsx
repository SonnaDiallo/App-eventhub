import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setAuthToken } from '../api/client';
import styles from './Layout.module.css';

const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  events: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  reviews: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export default function Layout() {
  const { token, user, signOut, getToken } = useAuth();
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
        <div className={styles.brand}>
          <span className={styles.brandIcon}>◆</span>
          EventHub Admin
        </div>
        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            {icons.dashboard}
            <span>Tableau de bord</span>
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            {icons.users}
            <span>Utilisateurs</span>
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            {icons.events}
            <span>Événements</span>
          </NavLink>
          <NavLink to="/reviews" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            {icons.reviews}
            <span>Avis</span>
          </NavLink>
        </nav>
        <div className={styles.sidebarFooter}>
          {user?.email && (
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          )}
          <button type="button" className={styles.logout} onClick={handleSignOut}>
            {icons.logout}
            Déconnexion
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
