import { useEffect, useState, useMemo } from 'react';
import {
  getUsers,
  updateUserRole,
  deleteUser,
  type User,
} from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import styles from './Users.module.css';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getUsers()
      .then((r) => setUsers(r.users))
      .catch(() => setError('Impossible de charger les utilisateurs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleRoleChange = async (userId: string, role: User['role']) => {
    setUpdating(userId);
    try {
      await updateUserRole(userId, role);
      load();
    } catch {
      setError('Erreur lors du changement de rôle');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    setUpdating(userId);
    try {
      await deleteUser(userId);
      load();
    } catch {
      setError('Impossible de supprimer l\'utilisateur');
    } finally {
      setUpdating(null);
    }
  };

  const roleBadgeClass = (role: string) => {
    if (role === 'admin') return styles.badgeAdmin;
    if (role === 'organizer') return styles.badgeOrganizer;
    return styles.badgeUser;
  };

  if (loading && users.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonTable} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Utilisateurs</h1>
        <div className={styles.searchWrap}>
          <input
            type="search"
            placeholder="Rechercher par nom ou email…"
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
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.avatar}>
                      {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{u.name || u.email}</strong>
                      {u.name && <span className={styles.email}>{u.email}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as User['role'])}
                    disabled={u.id === currentUser?.uid || updating === u.id}
                    className={styles.select}
                  >
                    <option value="user">Utilisateur</option>
                    <option value="organizer">Organisateur</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className={`${styles.roleBadge} ${roleBadgeClass(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  {u.id !== currentUser?.uid && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(u.id)}
                      disabled={updating === u.id}
                    >
                      {updating === u.id ? '…' : 'Supprimer'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className={styles.empty}>Aucun utilisateur trouvé</div>
      )}
    </div>
  );
}
