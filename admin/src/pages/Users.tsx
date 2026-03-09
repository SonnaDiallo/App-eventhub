import { useEffect, useState } from 'react';
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

  if (loading) return <div className={styles.loading}>Chargement…</div>;

  return (
    <div>
      <h1 className={styles.title}>Utilisateurs</h1>
      {error && (
        <div className={styles.error} onClick={() => setError('')}>
          {error}
        </div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nom / Email</th>
              <th>Rôle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userCell}>
                    <strong>{u.name || u.email}</strong>
                    {u.name && <span className={styles.email}>{u.email}</span>}
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
                </td>
                <td>
                  {u.id !== currentUser?.uid && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(u.id)}
                      disabled={updating === u.id}
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
