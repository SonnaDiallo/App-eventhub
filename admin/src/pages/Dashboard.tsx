import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/client';
import type { DashboardStats as Stats } from '../api/client';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Chargement…</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return null;

  const { users, events, tickets, reviews } = stats;
  const byRole = users.byRole || {};

  return (
    <div>
      <h1 className={styles.title}>Tableau de bord</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Utilisateurs</span>
          <span className={styles.cardValue}>{users.total}</span>
          <div className={styles.cardDetail}>
            user: {byRole.user ?? 0} · organizer: {byRole.organizer ?? 0} · admin: {byRole.admin ?? 0}
          </div>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Événements</span>
          <span className={styles.cardValue}>{events.total}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Billets</span>
          <span className={styles.cardValue}>{tickets.total}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Avis</span>
          <span className={styles.cardValue}>{reviews.total}</span>
        </div>
      </div>
    </div>
  );
}
