import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams, Link } from 'react-router-dom';

export default function ResetPasswordView() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
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

      <div className="max-w-md w-full space-y-8 bg-[#161B22]/80 backdrop-blur-md p-8 rounded-xl border border-white/[0.05] shadow-2xl relative z-10">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Enter your new password below.
          </p>
        </div>
        
        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-brand-teal/10 text-brand-teal rounded border border-brand-teal/20">
              Your password has been successfully reset!
            </div>
            <Link to="/login" className="text-brand-blue hover:text-brand-teal text-sm font-medium">Click here to Login</Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm text-center bg-red-950/30 p-3 rounded">{error}</div>}
            
            <div className="rounded-md space-y-4 shadow-sm">
              <div>
                <label htmlFor="password" className="sr-only">New Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-white/[0.12] bg-[#121214] placeholder-zinc-400 text-white rounded-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-white/[0.12] bg-[#121214] placeholder-zinc-400 text-white rounded-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
