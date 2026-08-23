import { useState } from 'react';
import { api } from '../../services/api';

interface LoginProps {
  onLogin: (token: string, budgetUser: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, budgetUser } = await api.login(username, password);
      onLogin(token, budgetUser);
    } catch {
      setError('Usuario o contrasena incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="login-card bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <h1 className="login-title text-2xl font-bold text-center mb-6 text-blue-600">
          Budget App
        </h1>

        <form onSubmit={handleSubmit} className="login-form space-y-4">
          <div className="login-field login-field--username">
            <label className="login-label block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="login-field login-field--password">
            <label className="login-label block text-sm font-medium text-gray-700 mb-1">
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <p className="login-error text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
