import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/client';
import type { DashboardStats as Stats } from '../api/client';
import styles from './Dashboard.module.css';

const REFRESH_INTERVAL = 60 * 1000; // 60 secondes

const statIcons: Record<string, string> = {
  users: '👥',
  events: '📅',
  tickets: '🎫',
  reviews: '⭐',
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getDashboardStats()
      .then(setStats)
      .catch((err: any) => {
        const status = err?.response?.status;
        if (status === 403) setError('Accès refusé — rôle admin requis dans Firestore.');
        else if (status === 401) setError('Session expirée — reconnectez-vous.');
        else setError('Backend inaccessible → démarrez-le : cd backend && npm run dev');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonTitle} />
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return null;

  const { users, events, tickets, reviews } = stats;
  const byRole = users.byRole || {};

  const cards = [
    {
      key: 'users',
      label: 'Utilisateurs',
      value: users.total,
      detail: `user: ${byRole.user ?? 0} · organizer: ${byRole.organizer ?? 0} · admin: ${byRole.admin ?? 0}`,
    },
    { key: 'events', label: 'Événements', value: events.total },
    { key: 'tickets', label: 'Billets', value: tickets.total },
    { key: 'reviews', label: 'Avis', value: reviews.total },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <button type="button" className={styles.refreshBtn} onClick={load} disabled={loading}>
          {loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>
      <div className={styles.grid}>
        {cards.map((c, i) => (
          <div
            key={c.key}
            className={styles.card}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <span className={styles.cardIcon}>{statIcons[c.key]}</span>
            <span className={styles.cardLabel}>{c.label}</span>
            <span className={styles.cardValue}>{c.value.toLocaleString('fr-FR')}</span>
            {c.detail && <span className={styles.cardDetail}>{c.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
