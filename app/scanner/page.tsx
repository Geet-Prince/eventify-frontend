'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { checkInAttendee } from '../services/api';

const emptySubscribe = () => () => {};

function useStoredToken() {
  return useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== 'undefined' ? localStorage.getItem('club_token') : null),
    () => null
  );
}

export default function ScannerPage() {
  const token = useStoredToken();
  const [, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualId, setManualId] = useState('');

  // Process the check-in API call when a code is detected or entered
  const processCheckIn = async (id: string) => {
    if (!id || loading) return;

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const result = await checkInAttendee(id.trim());
      setSuccessMessage(result);
      setScanResult(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || 'Check-in validation failed.');
      } else {
        setErrorMessage('Check-in validation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        processCheckIn(decodedText);
      },
      () => {
        // Continuous search callback
      }
    );

    return () => {
      try {
        const state = scanner.getState();
        if (state === 2 || state === 3) {
          scanner.pause(true);
        }
      } catch {
        // Safe catch on rapid unmount
      }

      scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      processCheckIn(manualId.trim());
      setManualId('');
    }
  };

  // Guard check: Club organizer session
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#141c2e] border border-[#23314d] rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="w-14 h-14 bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#60a5fa] rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#f8fafc]">
              Gate Access Control
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
              Ticket verification is operated by accredited club marshals. Sign in to your club organizer account to initialize the live camera gate scanner.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/login?redirect=/scanner"
              className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shadow-md shadow-[#2563eb]/20"
            >
              Sign In to Club Portal
            </Link>

            <Link
              href="/events"
              className="w-full py-2 bg-[#090d16] hover:bg-[#1b263e] border border-[#23314d] text-[#94a3b8] hover:text-[#f8fafc] rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Return to Events Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#141c2e] border border-[#23314d] rounded-2xl shadow-2xl p-6 sm:p-7">
        <div className="mb-5 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full border border-[#10b981]/25">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            Active Gatekeeper Session
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc] mt-3">Gate Check-In Viewfinder</h1>
          <p className="text-xs text-[#94a3b8] mt-1">Align the attendee&apos;s ticket QR code within the focus frame</p>
        </div>

        {/* Viewfinder Window */}
        <div className="bg-[#090d16] border border-[#23314d] rounded-2xl overflow-hidden p-3.5 mb-5 shadow-inner scanner-reticle">
          <div id="reader" className="w-full text-xs text-[#94a3b8]"></div>
        </div>

        {/* Success Card */}
        {successMessage && (
          <div className="mb-4 bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-sm p-4 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1.5 font-bold text-sm mb-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Admission Confirmed</span>
            </div>
            <p className="text-xs text-[#f8fafc]">{successMessage}</p>
          </div>
        )}

        {/* Rejection / Duplicate Card */}
        {errorMessage && (
          <div className="mb-4 bg-[#f43f5e]/15 border border-[#f43f5e]/30 text-[#f43f5e] text-sm p-4 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1.5 font-bold text-sm mb-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Check-In Rejected</span>
            </div>
            <p className="text-xs text-[#f8fafc]">{errorMessage}</p>
          </div>
        )}

        {/* Manual UUID Input */}
        <form onSubmit={handleManualSubmit} className="border-t border-[#23314d] pt-4 mt-2">
          <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
            Manual Ticket UUID Override
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 3fa85f64-5717-4562-..."
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="flex-1 bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm shadow-[#2563eb]/20"
            >
              {loading ? 'Validating...' : 'Verify'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-[#23314d]/60 text-center">
          <Link
            href="/dashboard"
            className="text-xs text-[#94a3b8] hover:text-[#60a5fa] transition font-medium"
          >
            Open Club Management Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
