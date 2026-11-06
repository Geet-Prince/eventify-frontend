'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventItem, Club, getAllEvents, getAllClubs } from '../services/api';
import { CAMPUS_DEPARTMENTS, STUDY_YEARS } from '../constants/departments';
import { getEventStatusDetails } from '../utils/eventStatus';

export default function UnifiedEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'ongoing' | 'concluded'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getAllEvents(), getAllClubs()])
      .then(([eventsData, clubsData]) => {
        if (!ignore) {
          setEvents(eventsData);
          setClubs(clubsData);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setLoading(false);
          if (err instanceof Error) {
            setError(err.message || 'Failed to load events.');
          } else {
            setError('Failed to load events.');
          }
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter events dynamically
  const filteredEvents = events.filter((ev) => {
    const statusDetails = getEventStatusDetails(ev);

    // Lifecycle Status filter
    if (statusFilter === 'open' && !statusDetails.isBookable) {
      return false;
    }
    if (statusFilter === 'ongoing' && statusDetails.status !== 'ongoing') {
      return false;
    }
    if (statusFilter === 'concluded' && statusDetails.status !== 'concluded' && statusDetails.status !== 'registration_closed') {
      return false;
    }

    const matchesSearch =
      ev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.guests?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.club?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedClub && ev.club?.name !== selectedClub && ev.club?.id !== selectedClub) {
      return false;
    }

    if (selectedDept) {
      if (ev.allowedDepartments && !ev.allowedDepartments.toLowerCase().includes(selectedDept.toLowerCase())) {
        return false;
      }
    }

    if (selectedYear) {
      if (ev.allowedStudyYears && !ev.allowedStudyYears.includes(selectedYear)) {
        return false;
      }
    }

    return true;
  });

  const openCount = events.filter((e) => getEventStatusDetails(e).isBookable).length;
  const ongoingCount = events.filter((e) => getEventStatusDetails(e).status === 'ongoing').length;
  const closedCount = events.filter((e) => !getEventStatusDetails(e).isBookable).length;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-[#253146] pb-8 pt-4">
        <span className="text-xs font-semibold text-[#3b6bf6] bg-[#3b6bf6]/10 px-2.5 py-1 rounded-full border border-[#3b6bf6]/20">
          Campus Directory
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#f8fafc] mt-3">
          Campus Events and Assemblies
        </h1>
        <p className="text-sm md:text-base text-[#94a3b8] mt-2 max-w-2xl leading-relaxed">
          Active technical symposia, hackathons, and society meets across all student clubs. Filter by department or study year to reserve your QR entrance pass.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#141c2e] border border-[#23314d] rounded-2xl p-4 md:p-6 shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Search Events</label>
            <input
              type="text"
              placeholder="Filter by title, venue, or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
          </div>

          {/* Club Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Organizing Club</label>
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
            >
              <option value="">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.name || c.id}>
                  {c.name || `Club ${c.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Target Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
            >
              <option value="">All Departments</option>
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

          {/* Year Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-[#090d16] border border-[#23314d] rounded-xl px-3.5 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
            >
              <option value="">All Academic Years</option>
              {STUDY_YEARS.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Counter & Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#94a3b8] pt-3 border-t border-[#23314d]">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'bg-[#090d16] border border-[#23314d] text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'bg-[#090d16] border border-[#23314d] text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Open for Pass ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ongoing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ongoing'
                  ? 'bg-[#10b981] text-white shadow-xs'
                  : 'bg-[#090d16] border border-[#23314d] text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Live Now ({ongoingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('concluded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'concluded'
                  ? 'bg-[#64748b] text-white shadow-xs'
                  : 'bg-[#090d16] border border-[#23314d] text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Closed / Past ({closedCount})
            </button>
          </div>

          {(searchQuery || selectedClub || selectedDept || selectedYear || statusFilter !== 'all') && (
            <div className="flex items-center gap-3">
              <span>Showing {filteredEvents.length} of {events.length} listed</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClub('');
                  setSelectedDept('');
                  setSelectedYear('');
                  setStatusFilter('all');
                }}
                className="text-[#60a5fa] hover:text-[#93c5fd] hover:underline font-medium cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Events Listing */}
      {loading ? (
        <div className="bg-[#141c2e] border border-[#23314d] rounded-2xl p-16 text-center text-[#94a3b8]">
          <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Loading current campus schedule...</p>
        </div>
      ) : error ? (
        <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-sm p-5 rounded-2xl text-center">
          {error}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-[#141c2e] border border-[#23314d] rounded-2xl p-16 text-center space-y-3">
          <p className="text-[#94a3b8] text-sm">No events match the selected filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedClub('');
              setSelectedDept('');
              setSelectedYear('');
            }}
            className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const depts = event.allowedDepartments?.split(',').map((d) => d.trim()).filter(Boolean) || [];
            const years = event.allowedStudyYears?.split(',').map((y) => y.trim()).filter(Boolean) || [];
            const statusDetails = getEventStatusDetails(event);

            return (
              <div
                key={event.id}
                className="bg-[#141c2e] border border-[#23314d] hover:border-[#3b82f6]/60 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
              >
                <div>
                  {/* Event Visual / Banner */}
                  <div className="h-44 bg-[#090d16] relative overflow-hidden flex items-center justify-center border-b border-[#23314d]">
                    {event.imageLink ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.imageLink}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <span className="text-xs uppercase tracking-wider text-[#64748b] font-medium">Campus Event</span>
                      </div>
                    )}

                    {/* Host Tag */}
                    <div className="absolute top-3 left-3 bg-[#090d16]/90 backdrop-blur-md border border-[#23314d] text-[#f8fafc] text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm">
                      {event.club?.name || 'Campus Club'}
                    </div>

                    {/* Lifecycle Status Badge */}
                    <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md border ${statusDetails.badgeClass}`}>
                      {statusDetails.label}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#f8fafc] leading-snug group-hover:text-white transition-colors">
                        {event.name}
                      </h2>
                      {event.details && (
                        <p className="text-xs text-[#94a3b8] mt-1.5 line-clamp-2 leading-relaxed">
                          {event.details}
                        </p>
                      )}
                    </div>

                    {/* Logistics metadata */}
                    <div className="bg-[#090d16] p-3 rounded-xl border border-[#23314d]/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Venue
                        </span>
                        <span className="text-[#f8fafc] font-medium truncate max-w-[170px]">{event.venue}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Date
                        </span>
                        <span className="text-[#f8fafc] tabular-nums" suppressHydrationWarning>
                          {event.startTime ? new Date(event.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Time
                        </span>
                        <span className="text-[#f8fafc] tabular-nums" suppressHydrationWarning>
                          {event.startTime
                            ? new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'TBD'}
                        </span>
                      </div>
                      {event.guests && (
                        <div className="flex items-center justify-between pt-1 border-t border-[#23314d]/70">
                          <span className="text-[#64748b] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Guests
                          </span>
                          <span className="text-[#f8fafc] font-medium truncate max-w-[170px]">{event.guests}</span>
                        </div>
                      )}
                    </div>

                    {/* Department & Year Requirements */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#64748b]">Eligibility:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {depts.length > 0 ? (
                          depts.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-[#090d16] text-[#94a3b8] text-[10px] font-medium border border-[#23314d]"
                            >
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[#94a3b8]">All Departments</span>
                        )}

                        {years.length > 0 &&
                          years.map((y) => (
                            <span
                              key={y}
                              className="px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#60a5fa] text-[10px] font-semibold border border-[#3b82f6]/30 tabular-nums"
                            >
                              Year {y}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-5 pt-0 space-y-2">
                  {statusDetails.isBookable ? (
                    <Link
                      href={`/?eventId=${event.id}`}
                      className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-[#2563eb]/20 cursor-pointer"
                    >
                      <span>Claim Entrance Pass</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  ) : (
                    <div className="w-full py-2.5 bg-[#090d16] border border-[#23314d] text-[#64748b] rounded-xl text-xs font-semibold text-center cursor-not-allowed">
                      {statusDetails.status === 'ongoing' ? 'Live Event — Gate Check-In Only' : 'Registration Closed'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(event.id)}
                    className="w-full py-1.5 bg-[#090d16] hover:bg-[#1b263e] border border-[#23314d] text-[#94a3b8] hover:text-[#f8fafc] rounded-lg text-[11px] font-mono transition tabular-nums cursor-pointer"
                  >
                    {copiedId === event.id ? 'Copied Event ID' : 'Copy Event ID'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
