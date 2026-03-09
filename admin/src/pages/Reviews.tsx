import { useEffect, useState, useMemo } from 'react';
import { getAdminReviews, deleteAdminReview, type ReviewItem } from '../api/client';
import styles from './Reviews.module.css';

export default function Reviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = (page = 1) => {
    setLoading(true);
    getAdminReviews(page, 20)
      .then((r) => {
        setReviews(r.reviews);
        setPagination(r.pagination);
      })
      .catch(() => setError('Impossible de charger les avis'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return reviews;
    const q = search.toLowerCase();
    return reviews.filter(
      (r) =>
        r.eventTitle?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
    );
  }, [reviews, search]);

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Supprimer cet avis ?')) return;
    setDeleting(reviewId);
    try {
      await deleteAdminReview(reviewId);
      load(pagination.page);
    } catch {
      setError('Impossible de supprimer l\'avis');
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

  const renderStars = (rating: number) => {
    return (
      <span className={styles.stars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= rating ? styles.starFilled : styles.starEmpty}>
            ★
          </span>
        ))}
      </span>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Avis</h1>
        <div className={styles.searchWrap}>
          <input
            type="search"
            placeholder="Rechercher (événement, auteur, commentaire…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />
        </div>
      </div>
      {error && (
        <div className={styles.error} onClick={() => setError('')}>
          {error}
        </div>
      )}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Aucun avis</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewMeta}>
                  <span className={styles.reviewEvent}>{r.eventTitle || 'Événement'}</span>
                  <span className={styles.reviewAuthor}>{r.userName || 'Anonyme'}</span>
                  <span className={styles.reviewDate}>{formatDate(r.createdAt)}</span>
                </div>
                <div className={styles.reviewRating}>{renderStars(r.rating)}</div>
              </div>
              <p className={styles.reviewComment}>{r.comment || '—'}</p>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
              >
                {deleting === r.id ? '…' : 'Supprimer'}
              </button>
            </div>
          ))
        )}
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
