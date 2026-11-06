'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginClub, registerClub, verifyEmail, ApiError, PASSWORD_REGEX } from '../services/api';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  // Mode: 'login' | 'register'
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Post-Registration "Check Your Email" State
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);

  // Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');

  // Handle manual token submission from the Check Your Email screen
  const handleVerifyManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) {
      setError('Please enter the verification token received in your email.');
      return;
    }

    setVerifyingToken(true);
    setError('');

    try {
      const msg = await verifyEmail(token);
      setLoginNotice(
        msg ||
          'Email verified! Your club registration is now pending Admin approval. You will receive an email once approved.'
      );
      setIsRegistered(false);
      setIsRegisterMode(false);
      setManualToken('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Verification failed. Please check the token and try again.');
      } else {
        setError('Verification failed. Please check the token and try again.');
      }
    } finally {
      setVerifyingToken(false);
    }
  };

  // Main Form Submit (Register or Login)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLoginNotice('');

    try {
      if (isRegisterMode) {
        // Enforce password policy
        if (!PASSWORD_REGEX.test(password)) {
          setError(
            'Password must be at least 8 characters and include uppercase, lowercase, a digit, and a special character (@#$%^&+=!...).'
          );
          setLoading(false);
          return;
        }

        // Call registration (backend returns 201 Created without verificationToken in body)
        await registerClub(name, email, password);

        // Switch UI to "Check Your Email" screen
        setIsRegistered(true);
        setRegisteredEmail(email);
        setPassword('');
      } else {
        await loginClub(email, password);
        router.push(redirectTarget);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      const status = err instanceof ApiError ? err.status : undefined;

      if (isRegisterMode) {
        setError(errorMsg || 'Registration failed. Please check your information and try again.');
      } else {
        // Handle Institutional Governance Errors on Login
        if (status === 429 || errorMsg.toLowerCase().includes('too many failed attempts') || errorMsg.toLowerCase().includes('locked')) {
          setError('Too many failed attempts. Account locked for 15 minutes.');
        } else if (errorMsg.toLowerCase().includes('email is not verified') || errorMsg.toLowerCase().includes('not verified')) {
          setError('Please check your email and verify your account first.');
        } else if (
          errorMsg.toLowerCase().includes('pending institutional admin approval') ||
          errorMsg.toLowerCase().includes('admin approval') ||
          errorMsg.toLowerCase().includes('pending')
        ) {
          setLoginNotice("Your club registration is pending Admin approval. You'll receive an email once approved.");
        } else if (errorMsg.toLowerCase().includes('declined')) {
          setError('Your club registration request was declined by the university administrator.');
        } else {
          setError(errorMsg || 'Invalid email or password.');
        }
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
          {isRegistered
            ? 'Check Your Email'
            : isRegisterMode
            ? 'Register Student Club'
            : 'Organizer Sign In'}
        </h1>
        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
          {isRegistered
            ? `We sent a verification link to ${registeredEmail}`
            : isRegisterMode
            ? 'Set up your club presence to create campus events and issue QR tickets'
            : redirectTarget === '/scanner'
            ? 'Sign in to unlock camera-based admission check-in'
            : 'Access event creation, registrations roster, and CSV attendance export'}
        </p>
      </div>

      {/* Mode toggle (hidden when showing post-registration screen) */}
      {!isRegistered && (
        <div className="grid grid-cols-2 gap-1 bg-[#090d16] p-1 rounded-xl mb-6 border border-[#23314d]">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError('');
              setLoginNotice('');
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
              setLoginNotice('');
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

      {/* Institutional Notice Banner (e.g. Pending Approval) */}
      {loginNotice && (
        <div className="mb-4 bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#60a5fa] text-xs p-3.5 rounded-xl flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="leading-relaxed">{loginNotice}</div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-xs p-3.5 rounded-xl flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="leading-relaxed flex-1">
            {error}
            {error.includes('verify your account first') && (
              <div className="mt-1.5">
                <Link
                  href="/verify"
                  className="text-[#60a5fa] underline font-semibold hover:text-[#93c5fd]"
                >
                  Go to Email Verification Page &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 1: "Check Your Email" Post-Registration */}
      {isRegistered ? (
        <div className="space-y-5">
          <div className="p-4 bg-[#090d16] border border-[#23314d] rounded-xl space-y-2 text-center">
            <div className="w-10 h-10 bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#60a5fa] rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs text-[#f8fafc] font-medium leading-relaxed">
              We sent a verification link to <span className="text-[#60a5fa] font-bold">{registeredEmail}</span>.
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Please check your inbox (and spam folder) and click the link to verify your account.
            </p>
          </div>

          {/* Optional Manual Token Input (Starts Empty) */}
          <form onSubmit={handleVerifyManualToken} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                Paste Verification Token (Optional)
              </label>
              <input
                type="text"
                placeholder="Paste token from email..."
                value={manualToken}
                suppressHydrationWarning
                onChange={(e) => setManualToken(e.target.value)}
                className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingToken || !manualToken.trim()}
              className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#2563eb]/20"
            >
              {verifyingToken ? 'Verifying Token...' : 'Verify Token & Continue'}
            </button>
          </form>

          <div className="pt-2 text-center flex items-center justify-between text-xs text-[#94a3b8]">
            <button
              type="button"
              onClick={() => {
                setIsRegistered(false);
                setIsRegisterMode(false);
                setError('');
              }}
              className="hover:text-[#f8fafc] transition cursor-pointer"
            >
              &larr; Back to Sign In
            </button>
            <Link
              href="/verify"
              className="text-[#60a5fa] hover:underline"
            >
              Open Dedicated /verify page &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* Screen 2: Login / Register Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Official Club Name *</label>
              <input
                type="text"
                required
                suppressHydrationWarning
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
              suppressHydrationWarning
              placeholder="acm@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#94a3b8]">Password *</label>
              {isRegisterMode && (
                <span className="text-[10px] text-[#64748b]">Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special</span>
              )}
            </div>
            <input
              type="password"
              required
              suppressHydrationWarning
              placeholder={isRegisterMode ? "e.g. Secret#2026" : "Enter password"}
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
              <Link
                href="/verify"
                className="text-[11px] text-[#60a5fa] hover:text-[#93c5fd] hover:underline"
              >
                Need to verify an email token? Go to verification portal &rarr;
              </Link>
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
