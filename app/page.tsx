'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { registerForEvent, getAllEvents, EventItem } from './services/api';
import { CAMPUS_DEPARTMENTS, STUDY_YEARS } from './constants/departments';
import { getEventStatusDetails, isRegistrationOpen } from './utils/eventStatus';

function RegistrationForm() {
  const searchParams = useSearchParams();
  const paramEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isManualUuid, setIsManualUuid] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeEmail: '',
    rollNumber: '',
    department: 'CSE',
    studyYear: 3,
    eventId: paramEventId || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<{
    id?: string;
    studentName?: string;
    studentEmail?: string;
    qrCodeBase64?: string;
    [key: string]: unknown;
  } | null>(null);

  // Load public events for the dropdown
  useEffect(() => {
    let ignore = false;

    getAllEvents()
      .then((data) => {
        if (!ignore) {
          setEvents(data);
          setLoadingEvents(false);
          setFormData((prev) => {
            if (paramEventId) {
              return { ...prev, eventId: paramEventId };
            }
            if (prev.eventId) {
              return prev;
            }
            const openEvent = data.find(isRegistrationOpen);
            return (openEvent || data[0]) ? { ...prev, eventId: (openEvent || data[0]).id } : prev;
          });
        }
      })
      .catch(() => {
        if (!ignore) {
          setIsManualUuid(true);
          setLoadingEvents(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [paramEventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectedEvent = events.find((e) => e.id === formData.eventId);
  const statusDetails = selectedEvent ? getEventStatusDetails(selectedEvent) : null;
  const isBookable = statusDetails ? statusDetails.isBookable : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTicket(null);

    if (selectedEvent && !isRegistrationOpen(selectedEvent)) {
      setError(`Registration for "${selectedEvent.name}" has closed (${statusDetails?.label}). No new registrations can be accepted.`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        attendeeName: formData.attendeeName,
        attendeeEmail: formData.attendeeEmail,
        rollNumber: formData.rollNumber,
        department: formData.department,
        studyYear: Number(formData.studyYear),
        event: { id: formData.eventId.trim() },
      };

      const result = await registerForEvent(payload);
      setTicket(result as {
        id?: string;
        studentName?: string;
        studentEmail?: string;
        qrCodeBase64?: string;
        [key: string]: unknown;
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred during registration.');
      } else {
        setError('An error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#141c2e] border border-[#23314d] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#60a5fa] bg-[#3b82f6]/10 px-2.5 py-1 rounded-full border border-[#3b82f6]/25">
            Campus Pass Portal
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#10b981]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            Gate System Ready
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#f8fafc] mt-3">Claim Event Pass</h2>
        <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 leading-relaxed">
          Reserve your verified entrance ticket with an instant QR gate pass.
        </p>
      </div>

      {ticket ? (
        <div className="bg-[#090d16] border border-[#23314d] rounded-xl overflow-hidden shadow-2xl text-left">
          {/* Ticket Header Stub */}
          <div className="p-5 bg-gradient-to-r from-[#141c2e] to-[#1a253c] border-b border-[#23314d]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#60a5fa] font-bold">Confirmed Access Pass</span>
                <h3 className="text-lg font-bold text-[#f8fafc] mt-0.5">
                  {selectedEvent ? selectedEvent.name : 'Campus Event'}
                </h3>
                {selectedEvent?.venue && (
                  <p className="text-xs text-[#94a3b8] mt-0.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedEvent.venue}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                Active Pass
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#23314d]/80 text-xs">
              <div>
                <span className="text-[#64748b] block text-[10px] uppercase font-medium">Attendee</span>
                <span className="font-semibold text-[#f8fafc]">{String(ticket.studentName ?? formData.attendeeName)}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[10px] uppercase font-medium">Roll & Branch</span>
                <span className="font-semibold text-[#f8fafc] tabular-nums">
                  {formData.rollNumber} • {formData.department} (Yr {formData.studyYear})
                </span>
              </div>
            </div>
          </div>

          {/* Perforated separator */}
          <div className="ticket-perforation my-1" />

          {/* Ticket QR Stub */}
          <div className="p-6 text-center bg-[#090d16]">
            <p className="text-xs text-[#94a3b8] mb-3">Scan this code at the venue gate for check-in</p>
            <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${ticket.qrCodeBase64}`}
                alt="Event Entrance QR Pass"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#64748b] tabular-nums font-mono">
              <span>Pass ID: {String(ticket.id ?? '')}</span>
              <button
                type="button"
                onClick={() => {
                  if (ticket.id) {
                    navigator.clipboard.writeText(String(ticket.id));
                  }
                }}
                className="text-[#60a5fa] hover:text-[#93c5fd] hover:underline cursor-pointer"
                title="Copy Pass ID"
              >
                Copy
              </button>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#141c2e] hover:bg-[#1b263e] border border-[#23314d] text-[#f8fafc] rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Print / Save Pass
              </button>
              <button
                type="button"
                onClick={() => setTicket(null)}
                className="flex-1 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm shadow-[#2563eb]/20"
              >
                Book Another Ticket
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-xs p-3.5 rounded-lg flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>{error}</div>
            </div>
          )}

          {/* Event Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-[#94a3b8]">Target Event *</label>
              <div className="flex items-center gap-3">
                <Link href="/events" className="text-xs text-[#60a5fa] hover:underline cursor-pointer">
                  Browse Catalog
                </Link>
                <button
                  type="button"
                  onClick={() => setIsManualUuid(!isManualUuid)}
                  className="text-xs text-[#64748b] hover:text-[#f8fafc] cursor-pointer"
                >
                  {isManualUuid ? 'Choose from list' : 'Custom UUID'}
                </button>
              </div>
            </div>

            {!isManualUuid && events.length > 0 ? (
              <select
                name="eventId"
                required
                value={formData.eventId}
                onChange={handleChange}
                className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
              >
                {events.filter(isRegistrationOpen).length > 0 && (
                  <optgroup label="Open for Registration" className="bg-[#141c2e] text-[#60a5fa] font-semibold">
                    {events.filter(isRegistrationOpen).map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-[#090d16] text-[#f8fafc]">
                        {ev.name} — {ev.venue}
                      </option>
                    ))}
                  </optgroup>
                )}
                {events.filter((e) => !isRegistrationOpen(e)).length > 0 && (
                  <optgroup label="Registration Closed / Concluded" className="bg-[#141c2e] text-[#94a3b8] font-semibold">
                    {events.filter((e) => !isRegistrationOpen(e)).map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-[#090d16] text-[#94a3b8]">
                        [Closed] {ev.name} — {ev.venue}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <input
                type="text"
                name="eventId"
                required
                placeholder="Paste event UUID..."
                value={formData.eventId}
                onChange={handleChange}
                className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] font-mono"
              />
            )}

            {/* Event Info Context */}
            {selectedEvent && !isManualUuid && (
              <div className="mt-2.5 p-3 bg-[#090d16] rounded-lg border border-[#23314d]/70 text-xs text-[#94a3b8] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b]">Status:</span>
                  {statusDetails && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${statusDetails.badgeClass}`}>
                      {statusDetails.label}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Venue:</span>
                  <span className="text-[#f8fafc] font-medium">{selectedEvent.venue}</span>
                </div>
                {selectedEvent.registrationDeadline && (
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Reg. Deadline:</span>
                    <span className="text-[#f8fafc] tabular-nums" suppressHydrationWarning>
                      {new Date(selectedEvent.registrationDeadline).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
                {selectedEvent.allowedDepartments && (
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Eligible Depts:</span>
                    <span className="text-[#60a5fa] font-medium">{selectedEvent.allowedDepartments}</span>
                  </div>
                )}
                {selectedEvent.allowedStudyYears && (
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Eligible Years:</span>
                    <span className="text-[#f8fafc] font-medium">Year {selectedEvent.allowedStudyYears}</span>
                  </div>
                )}
              </div>
            )}

            {/* Warning banner when registration is closed */}
            {statusDetails && !statusDetails.isBookable && (
              <div className="mt-2.5 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg text-xs text-[#f59e0b] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Registration Closed</span>
                </div>
                <p className="text-[11px] text-[#f8fafc]/80 leading-relaxed">
                  The event has started or the registration deadline has passed. Ticket passes cannot be issued for this session.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Full Name *</label>
            <input
              type="text"
              name="attendeeName"
              required
              placeholder="e.g. Alex Johnson"
              value={formData.attendeeName}
              onChange={handleChange}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Student Email *</label>
            <input
              type="email"
              name="attendeeEmail"
              required
              placeholder="alex@student.edu"
              value={formData.attendeeEmail}
              onChange={handleChange}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Roll Number *</label>
              <input
                type="text"
                name="rollNumber"
                required
                placeholder="21CS045"
                value={formData.rollNumber}
                onChange={handleChange}
                className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Department *</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
              >
                {Array.from(new Set(CAMPUS_DEPARTMENTS.map((d) => d.category))).map((category) => (
                  <optgroup key={category} label={category} className="bg-[#141c2e] text-[#94a3b8] font-semibold">
                    {CAMPUS_DEPARTMENTS.filter((d) => d.category === category).map((dept) => (
                      <option key={dept.code} value={dept.code} className="bg-[#090d16] text-[#f8fafc]">
                        {dept.code} — {dept.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Study Year *</label>
            <select
              name="studyYear"
              value={formData.studyYear}
              onChange={handleChange}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-lg px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
            >
              {STUDY_YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : `${yr}th Year`}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || loadingEvents || !isBookable}
            className={`w-full mt-2 py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
              !isBookable
                ? 'bg-[#141c2e] text-[#64748b] border border-[#23314d] cursor-not-allowed'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md shadow-[#2563eb]/25 cursor-pointer active:scale-[0.99]'
            }`}
          >
            {loading
              ? 'Confirming Reservation...'
              : !isBookable
              ? 'Registration Closed'
              : 'Claim Entrance Pass'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function StudentRegistrationPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Hero Showcase */}
        <div className="lg:col-span-7 space-y-6 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/25 text-[#60a5fa] text-xs font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Campus Gate & Pass Portal v2.0
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#f8fafc] leading-[1.15]">
            Seamless event entry with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] via-[#38bdf8] to-[#818cf8]">instant QR passes.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#94a3b8] max-w-xl leading-relaxed">
            Reserve your verified admission pass for university hackathons, guest lectures, cultural fests, and society meets. Direct mobile verification right at the gate turnstile.
          </p>

          {/* Value Props Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-[#141c2e]/60 border border-[#23314d] hover:border-[#3b82f6]/40 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/15 text-[#60a5fa] flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h4 className="text-xs font-semibold text-[#f8fafc]">Instant Pass</h4>
              <p className="text-[11px] text-[#64748b] mt-0.5">High-res encrypted QR code generated instantly upon form submission.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#141c2e]/60 border border-[#23314d] hover:border-[#10b981]/40 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#10b981]/15 text-[#10b981] flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-xs font-semibold text-[#f8fafc]">Verified Access</h4>
              <p className="text-[11px] text-[#64748b] mt-0.5">Automatic department, branch, and graduation year validation.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#141c2e]/60 border border-[#23314d] hover:border-[#f59e0b]/40 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xs font-semibold text-[#f8fafc]">Fast Gate Check</h4>
              <p className="text-[11px] text-[#64748b] mt-0.5">Under 1-second turnstile camera validation for zero entry queues.</p>
            </div>
          </div>

          {/* Quick links & organizer callout */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141c2e] hover:bg-[#1b263e] border border-[#23314d] hover:border-[#3b82f6]/50 text-xs font-semibold text-[#f8fafc] transition-all cursor-pointer"
            >
              <span>Explore All Campus Events</span>
              <svg className="w-3.5 h-3.5 text-[#60a5fa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            >
              <span>Club Organizer Sign In &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Pass Reservation Form */}
        <div className="lg:col-span-5">
          <Suspense fallback={<div className="text-[#94a3b8] text-sm p-8 text-center bg-[#141c2e] rounded-2xl border border-[#23314d]">Loading pass portal...</div>}>
            <RegistrationForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
