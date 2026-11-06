'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginClub, registerClub } from '../services/api';

function LoginFormContent() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegisterMode) {
        await registerClub(name, email, password);
        await loginClub(email, password);
      } else {
        await loginClub(email, password);
      }
      router.push(redirectTarget);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Authentication failed. Please verify your credentials.');
      } else {
        setError('Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#141c2e] border border-[#23314d] rounded-2xl shadow-2xl p-7 sm:p-8 backdrop-blur-md">
      <div className="mb-6">
        <span className="text-xs font-semibold text-[#60a5fa] bg-[#3b82f6]/10 px-2.5 py-1 rounded-full border border-[#3b82f6]/25">
          Club Authority
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc] mt-2.5">
          {isRegisterMode ? 'Register Student Club' : 'Organizer Sign In'}
        </h1>
        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
          {isRegisterMode
            ? 'Set up your club presence to create campus events and issue QR tickets'
            : redirectTarget === '/scanner'
            ? 'Sign in to unlock camera-based admission check-in'
            : 'Access event creation, registrations roster, and CSV attendance export'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 bg-[#090d16] p-1 rounded-xl mb-6 border border-[#23314d]">
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(false);
            setError('');
          }}
          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            !isRegisterMode
              ? 'bg-[#2563eb] text-white shadow-sm shadow-[#2563eb]/25'
              : 'text-[#94a3b8] hover:text-[#f8fafc]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(true);
            setError('');
          }}
          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            isRegisterMode
              ? 'bg-[#2563eb] text-white shadow-sm shadow-[#2563eb]/25'
              : 'text-[#94a3b8] hover:text-[#f8fafc]'
          }`}
        >
          Register Club
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-xs p-3.5 rounded-xl flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {isRegisterMode && (
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Official Club Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. ACM Student Chapter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Club Email Address *</label>
          <input
            type="email"
            required
            placeholder="acm@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Password *</label>
          <input
            type="password"
            required
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#2563eb]/20"
        >
          {loading
            ? isRegisterMode
              ? 'Registering Club...'
              : 'Verifying Credentials...'
            : isRegisterMode
            ? 'Complete Registration'
            : 'Access Club Dashboard'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center p-6">
      <Suspense fallback={<div className="text-[#94a3b8] text-sm">Preparing access portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
