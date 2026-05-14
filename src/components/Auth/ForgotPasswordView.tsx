import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
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
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, -50, -100, 0],
          scale: [0.8, 1, 1.2, 0.8],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFFF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
      />

      <div className="max-w-md w-full space-y-8 bg-[#161B22]/80 backdrop-blur-md p-8 rounded-xl border border-white/[0.05] shadow-2xl relative z-10">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Enter your email to receive a password reset link.
          </p>
        </div>
        
        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-brand-teal/10 text-brand-teal rounded border border-brand-teal/20">
              If an account with that email exists, we have sent a password reset link to it. Valid for 1 hour.
            </div>
            <Link to="/login" className="text-brand-blue hover:text-brand-teal text-sm font-medium">Return to Login</Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm text-center bg-red-950/30 p-3 rounded">{error}</div>}
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
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
            
            <div className="text-center">
              <Link to="/login" className="text-sm font-medium text-brand-teal hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
