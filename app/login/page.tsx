'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginClub, registerClub, verifyEmail } from '../services/api';

function LoginFormContent() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Verification step state
  const [verificationMode, setVerificationMode] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';
  const paramVerifyToken = searchParams.get('token') || searchParams.get('verifyToken');

  // Handle URL token verification if user opened a link
  useEffect(() => {
    if (paramVerifyToken) {
      setVerificationMode(true);
      setVerifyTokenInput(paramVerifyToken);
      handleVerify(paramVerifyToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramVerifyToken]);

  const handleVerify = async (tokenToVerify?: string) => {
    const token = (tokenToVerify || verifyTokenInput).trim();
    if (!token) {
      setError('Please provide a valid verification token.');
      return;
    }

    setVerifying(true);
    setError('');
    setSuccessNotice('');

    try {
      const msg = await verifyEmail(token);
      setSuccessNotice(msg || 'Email verified successfully! You can now sign in.');
      setVerificationMode(false);
      setIsRegisterMode(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Verification failed. Please ensure the token is correct.');
      } else {
        setError('Verification failed. Please ensure the token is correct.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      if (isRegisterMode) {
        const result = await registerClub(name, email, password);
        // Backend Requirement: Clubs cannot log in until verified.
        // POST /eventify/auth/register returns verificationToken.
        if (result && result.verificationToken) {
          setVerifyTokenInput(result.verificationToken);
          setVerificationMode(true);
          setSuccessNotice(
            result.message ||
              'Club registration recorded. Please verify your email before logging in.'
          );
        } else {
          setSuccessNotice(
            result.message ||
              'Registration successful. Please verify your email using the token sent.'
          );
          setVerificationMode(true);
        }
      } else {
        await loginClub(email, password);
        router.push(redirectTarget);
      }
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
          {verificationMode
            ? 'Verify Club Account'
            : isRegisterMode
            ? 'Register Student Club'
            : 'Organizer Sign In'}
        </h1>
        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
          {verificationMode
            ? 'Submit your email verification token to unlock club authorization'
            : isRegisterMode
            ? 'Set up your club presence to create campus events and issue QR tickets'
            : redirectTarget === '/scanner'
            ? 'Sign in to unlock camera-based admission check-in'
            : 'Access event creation, registrations roster, and CSV attendance export'}
        </p>
      </div>

      {/* Mode toggle (hidden in verification mode) */}
      {!verificationMode && (
        <div className="grid grid-cols-2 gap-1 bg-[#090d16] p-1 rounded-xl mb-6 border border-[#23314d]">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError('');
              setSuccessNotice('');
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
              setSuccessNotice('');
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
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className="mb-4 bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs p-3.5 rounded-xl flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>{successNotice}</div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="mb-4 bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-xs p-3.5 rounded-xl flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      {/* Verification Sub-form */}
      {verificationMode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
              Verification Token *
            </label>
            <input
              type="text"
              required
              placeholder="Paste verification token..."
              value={verifyTokenInput}
              onChange={(e) => setVerifyTokenInput(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] font-mono"
            />
            <p className="text-[11px] text-[#64748b] mt-1.5 leading-relaxed">
              This token was generated upon registration. Verify your email to activate your organizer account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={verifying || !verifyTokenInput.trim()}
            className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#10b981]/20"
          >
            {verifying ? 'Verifying Account...' : 'Confirm Verification & Activate'}
          </button>

          <button
            type="button"
            onClick={() => {
              setVerificationMode(false);
              setIsRegisterMode(false);
              setError('');
            }}
            className="w-full text-center text-xs text-[#94a3b8] hover:text-[#f8fafc] transition pt-2 block cursor-pointer"
          >
            &larr; Return to Sign In
          </button>
        </div>
      ) : (
        /* Sign In / Register Form */
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {!isRegisterMode && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setVerificationMode(true);
                  setError('');
                  setSuccessNotice('');
                }}
                className="text-[11px] text-[#60a5fa] hover:text-[#93c5fd] hover:underline cursor-pointer"
              >
                Have a verification token? Verify email here
              </button>
            </div>
          )}
        </form>
      )}
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
