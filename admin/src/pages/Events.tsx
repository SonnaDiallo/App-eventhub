import { useEffect, useState } from 'react';
import { getAdminEvents, deleteAdminEvent, type EventItem } from '../api/client';
import styles from './Events.module.css';

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = (page = 1) => {
    setLoading(true);
    getAdminEvents(page, 20)
      .then((r) => {
        setEvents(r.events);
        setPagination(r.pagination);
      })
      .catch(() => setError('Impossible de charger les événements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    setDeleting(eventId);
    try {
      await deleteAdminEvent(eventId);
      load(pagination.page);
    } catch {
      setError('Impossible de supprimer l\'événement');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return d;
    }
  };

  if (loading && events.length === 0) {
    return <div className={styles.loading}>Chargement…</div>;
  }

  return (
    <div>
      <h1 className={styles.title}>Événements</h1>
      {error && (
        <div className={styles.error} onClick={() => setError('')}>
          {error}
        </div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Catégorie</th>
              <th>Lieu</th>
              <th>Date</th>
              <th>Organisateur</th>
              <th>Participants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className={styles.titleCell}>
                    {e.coverImage && (
                      <img src={e.coverImage} alt="" className={styles.thumb} />
                    )}
                    <span>{e.title}</span>
                  </div>
                </td>
                <td>{e.category || '—'}</td>
                <td>{e.location || '—'}</td>
                <td>{formatDate(e.startDate)}</td>
                <td>{e.organizerName || e.organizerId || '—'}</td>
                <td>{e.participantsCount ?? 0}</td>
                <td>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(e.id)}
                    disabled={deleting === e.id}
                  >
                    {deleting === e.id ? '…' : 'Supprimer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
          >
            Précédent
          </button>
          <span>
            Page {pagination.page} / {pagination.pages} ({pagination.total} au total)
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.pages}
            onClick={() => load(pagination.page + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
