'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '../services/api';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [manualToken, setManualToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submitVerification = async (tokenToVerify: string) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken) {
      setStatus('error');
      setMessage('Please enter a valid verification token.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const resMsg = await verifyEmail(cleanToken);
      setStatus('success');
      setMessage(resMsg || 'Email verified successfully!');
    } catch (err: unknown) {
      setStatus('error');
      if (err instanceof Error) {
        setMessage(err.message || 'Invalid or expired verification token.');
      } else {
        setMessage('Invalid or expired verification token.');
      }
    }
  };

  // Auto-verify if ?token=... is present in the URL from an email link click
  useEffect(() => {
    const urlToken = searchParams.get('token') || searchParams.get('verifyToken');
    if (urlToken) {
      setManualToken(urlToken);
      submitVerification(urlToken);
    }
  }, [searchParams]);

  return (
    <div className="w-full max-w-md bg-[#141c2e] border border-[#23314d] rounded-2xl shadow-2xl p-7 sm:p-8 backdrop-blur-md">
      <div className="mb-6 text-center">
        <span className="text-xs font-semibold text-[#60a5fa] bg-[#3b82f6]/10 px-2.5 py-1 rounded-full border border-[#3b82f6]/25">
          Email Verification
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc] mt-2.5">
          Club Account Verification
        </h1>
        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
          Verify your email address to advance your club application to institutional review
        </p>
      </div>

      {/* Loading state */}
      {status === 'loading' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-[#f8fafc]">Verifying your email, please wait...</p>
          <p className="text-xs text-[#64748b]">Connecting with campus identity authority...</p>
        </div>
      )}

      {/* Success state */}
      {status === 'success' && (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#10b981]">Email Verified!</h3>
            <p className="text-xs text-[#f8fafc] leading-relaxed">{message}</p>
          </div>

          <div className="p-3.5 bg-[#090d16] border border-[#23314d] rounded-xl text-left text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#60a5fa] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa] animate-pulse"></span>
              <span>Next Step: Institutional Governance</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Your application is now under Institutional Admin review. You will receive an approval email shortly once authorized.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-[#2563eb]/20"
          >
            Go to Sign In
          </button>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="space-y-5">
          <div className="p-4 bg-[#f43f5e]/10 border border-[#f43f5e]/30 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-[#f43f5e] font-bold text-xs">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Verification Failed</span>
            </div>
            <p className="text-xs text-[#f8fafc]/90 leading-relaxed">{message}</p>
          </div>

          <div className="space-y-3 pt-1">
            <label className="block text-xs font-semibold text-[#94a3b8]">
              Paste Token Manually
            </label>
            <input
              type="text"
              placeholder="Paste token from email"
              value={manualToken}
              suppressHydrationWarning
              onChange={(e) => setManualToken(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] font-mono"
            />
            <button
              type="button"
              onClick={() => submitVerification(manualToken)}
              className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-[#2563eb]/20"
            >
              Retry Verification
            </button>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs text-[#94a3b8] hover:text-[#f8fafc] transition"
            >
              &larr; Return to Sign In
            </Link>
          </div>
        </div>
      )}

      {/* Idle state (no token in URL) */}
      {status === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
              Enter Verification Token
            </label>
            <input
              type="text"
              placeholder="Paste token from email"
              value={manualToken}
              suppressHydrationWarning
              onChange={(e) => setManualToken(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] font-mono"
            />
            <p className="text-[11px] text-[#64748b] mt-1.5 leading-relaxed">
              Check your inbox or spam folder for the verification email sent to your registered club address.
            </p>
          </div>

          <button
            type="button"
            onClick={() => submitVerification(manualToken)}
            disabled={!manualToken.trim()}
            className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#2563eb]/20"
          >
            Verify Account
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs text-[#94a3b8] hover:text-[#f8fafc] transition"
            >
              &larr; Return to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center p-6">
      <Suspense fallback={<div className="text-[#94a3b8] text-sm">Loading verification portal...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
