import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { FiMail, FiLock } from 'react-icons/fi';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await login({ email, password });

    if (result.success) {
      toast.success('Succesvol ingelogd!');
      navigate('/');
    } else {
      toast.error(result.error || 'Login mislukt');
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-center mb-6">Inloggen</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">E-mailadres</label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="jouw@email.nl"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Wachtwoord</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? 'Bezig met inloggen...' : 'Inloggen'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Demo account: demo@warredal.be / demo123
      </p>
    </div>
  );
};

export default LoginPage;
