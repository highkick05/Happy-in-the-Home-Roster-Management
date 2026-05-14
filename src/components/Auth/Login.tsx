import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicSettings, setPublicSettings] = useState<any>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => setPublicSettings(data))
      .catch(err => console.error('Error fetching public settings:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user, data.settings);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0B0E14] py-12 px-4 sm:px-4 lg:px-8 text-zinc-100 overflow-hidden z-0">
      
      {/* Animated Floating Orbs */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0052FF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, -50, -100, 0],
          scale: [0.8, 1, 1.2, 0.8],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFFF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, 50, -100, 0],
          y: [0, 100, -50, 0],
          scale: [1.2, 0.8, 1, 1.2],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#32CD32] rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"
      />

      <div className="max-w-md w-full space-y-8 bg-[#161B22]/80 backdrop-blur-md p-8 rounded-xl border border-white/[0.05] shadow-2xl relative z-10">
        <div className="flex flex-col flex-1 items-center justify-center pt-2">
          {publicSettings?.websiteLogo ? (
            <img 
              src={publicSettings.websiteLogo} 
              alt={publicSettings?.businessName || "Company Logo"} 
              className="w-full max-w-full h-auto max-h-[200px] object-contain mx-auto" 
            />
          ) : (
            <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
              {publicSettings?.businessName || "Happy in the Home"}
            </h2>
          )}
          <p className="mt-2 text-center text-sm text-zinc-400">
            Enterprise Portal
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center bg-red-950/30 p-3 rounded">{error}</div>}
          <div className="rounded-md space-y-4 shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-white/[0.12] bg-[#121214] placeholder-zinc-400 text-white rounded-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-white/[0.12] bg-[#121214] placeholder-zinc-400 text-white rounded-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          <div className="text-center mt-4">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-teal hover:underline focus:outline-none">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
