'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  EventItem,
  Registration,
  getAllEvents,
  getMyEvents,
  publishEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  downloadEventCSV,
  getEventRegistrations,
  clearAuthSession,
  getAuthToken,
} from '../services/api';
import { CAMPUS_DEPARTMENTS, DEPARTMENT_CODES, STUDY_YEARS } from '../constants/departments';
import { getEventStatusDetails } from '../utils/eventStatus';

// Safe external store reader for localStorage without hydration mismatch
const emptySubscribe = () => () => {};

function useStoredToken() {
  return useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== 'undefined' ? localStorage.getItem('club_token') : null),
    () => null
  );
}

function useStoredClubId() {
  return useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== 'undefined' ? localStorage.getItem('club_id') : null),
    () => null
  );
}

function useStoredClubEmail() {
  return useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== 'undefined' ? localStorage.getItem('club_email') : null),
    () => null
  );
}

export default function DashboardPage() {
  const storedToken = useStoredToken();
  const storedClubId = useStoredClubId();
  const storedClubEmail = useStoredClubEmail();

  // Local overrides (e.g. after logout)
  const [sessionCleared, setSessionCleared] = useState(false);

  const token = sessionCleared ? null : storedToken;
  const clubId = sessionCleared ? null : storedClubId;
  const clubEmail = sessionCleared ? null : storedClubEmail;

  // View filter: 'my' | 'all'
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [publicationFilter, setPublicationFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [publishingEventId, setPublishingEventId] = useState<string | null>(null);

  // Events list state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventSearch, setEventSearch] = useState('');

  // Modals & form state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [formError, setFormError] = useState('');

  // Event form data
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [details, setDetails] = useState('');
  const [guests, setGuests] = useState('');
  const [imageLink, setImageLink] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['CSE', 'IT']);
  const [selectedYears, setSelectedYears] = useState<number[]>([1, 2, 3, 4]);

  // Export Modal state
  const [exportEvent, setExportEvent] = useState<EventItem | null>(null);
  const [exportDept, setExportDept] = useState('');
  const [exportYear, setExportYear] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Attendees Viewer state
  const [viewingAttendeesEvent, setViewingAttendeesEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Registration[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch club's events (or all public events if unauthenticated)
  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const currentToken = getAuthToken();
      const data = currentToken ? await getMyEvents() : await getAllEvents();
      setEvents(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showNotification('error', err.message);
      }
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const currentToken = getAuthToken();
    const fetcher = currentToken ? getMyEvents() : getAllEvents();

    fetcher
      .then((data) => {
        if (!ignore) {
          setEvents(data);
          setLoadingEvents(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setLoadingEvents(false);
          if (err instanceof Error) {
            showNotification('error', err.message);
          }
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setSessionCleared(true);
    showNotification('success', 'Logged out successfully.');
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingEventId(null);
    setName('');
    setVenue('');
    setStartTime('');
    setEndTime('');
    setRegistrationDeadline('');
    setDetails('');
    setGuests('');
    setImageLink('');
    setIsPublic(true);
    setSelectedDepts(['CSE', 'IT', 'ECE', 'ME']);
    setSelectedYears([1, 2, 3, 4]);
    setFormError('');
    setShowEventModal(true);
  };

  // Open Edit Modal with pre-filled event data
  const openEditModal = (event: EventItem) => {
    setEditingEventId(event.id);
    setName(event.name || '');
    setVenue(event.venue || '');
    setStartTime(event.startTime ? event.startTime.slice(0, 16) : '');
    setEndTime(event.endTime ? event.endTime.slice(0, 16) : '');
    setRegistrationDeadline(event.registrationDeadline ? event.registrationDeadline.slice(0, 16) : '');
    setDetails(event.details || '');
    setGuests(event.guests || '');
    setImageLink(event.imageLink || '');
    setIsPublic(event.isPublic ?? event.public ?? true);

    const depts = event.allowedDepartments
      ? event.allowedDepartments.split(',').map((d) => d.trim()).filter(Boolean)
      : ['CSE', 'IT'];
    setSelectedDepts(depts);

    const years = event.allowedStudyYears
      ? event.allowedStudyYears.split(',').map((y) => Number(y.trim())).filter((n) => !isNaN(n))
      : [1, 2, 3, 4];
    setSelectedYears(years);

    setFormError('');
    setShowEventModal(true);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError('Please log in with a club account to save events.');
      return;
    }

    if (editingEventId) {
      const targetEvent = events.find((e) => e.id === editingEventId);
      if (targetEvent && !isOwner(targetEvent)) {
        setFormError('Access denied: You can only modify events belonging to your club.');
        return;
      }
    }

    setSavingEvent(true);
    setFormError('');

    try {
      // Format timestamps to ISO-8601 strings
      const formatToIso = (localStr: string) =>
        localStr ? new Date(localStr).toISOString() : new Date().toISOString();

      const payload = {
        name,
        venue,
        startTime: formatToIso(startTime),
        endTime: formatToIso(endTime),
        registrationDeadline: formatToIso(registrationDeadline),
        details,
        guests,
        imageLink,
        isPublic,
        allowedDepartments: selectedDepts.join(','),
        allowedStudyYears: selectedYears.join(','),
      };

      if (editingEventId) {
        await updateEvent(editingEventId, payload);
        showNotification('success', `Event "${name}" updated successfully.`);
      } else {
        await createEvent(payload);
        showNotification('success', `Event "${name}" created successfully.`);
      }

      setShowEventModal(false);
      loadEvents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message || 'Failed to save event.');
      } else {
        setFormError('Failed to save event.');
      }
    } finally {
      setSavingEvent(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string, eventName: string) => {
    if (!token) {
      showNotification('error', 'Please log in to delete an event.');
      return;
    }

    const targetEvent = events.find((e) => e.id === id);
    if (targetEvent && !isOwner(targetEvent)) {
      showNotification('error', 'Access denied: You can only delete events belonging to your club.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the event "${eventName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteEvent(id);
      showNotification('success', `Event "${eventName}" deleted.`);
      loadEvents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showNotification('error', err.message || 'Failed to delete event.');
      }
    }
  };

  // Publish Draft Event
  const handlePublishEvent = async (id: string, eventName: string) => {
    if (!token) {
      showNotification('error', 'Please log in to publish an event.');
      return;
    }

    setPublishingEventId(id);
    try {
      await publishEvent(id, true);
      // On success, update local state to change event badge to "Published" and notify user
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === id ? { ...ev, isPublic: true, public: true } : ev
        )
      );
      showNotification('success', `Event "${eventName}" published successfully!`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showNotification('error', err.message || 'Failed to publish event.');
      } else {
        showNotification('error', 'Failed to publish event.');
      }
    } finally {
      setPublishingEventId(null);
    }
  };

  // Trigger Download CSV
  const handleDownloadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportEvent) return;

    setDownloading(true);
    setExportFeedback(null);

    try {
      await downloadEventCSV(
        exportEvent.id,
        exportDept || undefined,
        exportYear ? Number(exportYear) : undefined,
        exportStatus === '' ? undefined : exportStatus === 'true'
      );
      setExportFeedback({
        type: 'success',
        message: 'CSV attendance downloaded! Check your browser downloads folder.',
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setExportFeedback({
          type: 'error',
          message: err.message || 'Failed to generate attendance CSV.',
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  // Open Live Attendees Modal
  const openAttendeesViewer = async (event: EventItem) => {
    setViewingAttendeesEvent(event);
    setLoadingAttendees(true);
    try {
      const data = await getEventRegistrations(event.id);
      setAttendees(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showNotification('error', err.message || 'Failed to load attendees.');
      }
    } finally {
      setLoadingAttendees(false);
    }
  };

  const isOwner = (event: EventItem) => {
    if (!token) return false;
    if (clubId && event.club?.id && String(event.club.id) === String(clubId)) return true;
    if (clubEmail && event.club?.email && event.club.email.toLowerCase() === clubEmail.toLowerCase()) return true;
    return false;
  };

  const myEventsCount = events.filter((ev) => isOwner(ev)).length;
  const publishedCount = events.filter((ev) => ev.isPublic !== false).length;
  const draftsCount = events.filter((ev) => ev.isPublic === false).length;

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      ev.venue?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      ev.id?.toLowerCase().includes(eventSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'my') {
      if (!isOwner(ev)) return false;
    }
    if (publicationFilter === 'published' && ev.isPublic === false) {
      return false;
    }
    if (publicationFilter === 'draft' && ev.isPublic !== false) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Floating Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-2xl transition ${
            notification.type === 'success'
              ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
              : 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* Top Club Status Bar */}
      <div className="bg-[#161d2a] border border-[#253146] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-semibold text-[#3b6bf6] bg-[#3b6bf6]/10 px-2.5 py-1 rounded-full border border-[#3b6bf6]/20">
              Club Administration
            </span>
            {token && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-medium">
                Verified Session
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f8fafc] mt-2">
            Organizer Management Hub
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Create events, manage check-in rosters, and export class-wise attendance for faculty records.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {token ? (
            <>
              <button
                onClick={openCreateModal}
                className="flex-1 md:flex-none px-4 py-2.5 bg-[#3b6bf6] hover:bg-[#2a58e6] text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm shadow-[#3b6bf6]/20 cursor-pointer"
              >
                <span>+</span> Publish New Event
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-[#0d1117] hover:bg-[#1f293d] text-[#94a3b8] hover:text-[#f8fafc] rounded-lg text-xs font-medium transition border border-[#253146] cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-5 py-2.5 bg-[#3b6bf6] hover:bg-[#2a58e6] text-white rounded-lg text-xs font-semibold transition shadow-sm shadow-[#3b6bf6]/20"
            >
              Sign In to Manage Events
            </Link>
          )}
        </div>
      </div>

      {/* Events Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#f8fafc]">Events Roster ({filteredEvents.length})</h2>
            <p className="text-xs text-[#94a3b8]">Review live registrations and trigger filtered attendance exports</p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by title, venue, or UUID..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-full bg-[#161d2a] border border-[#253146] rounded-lg px-3.5 py-2 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#3b6bf6]"
            />
          </div>
        </div>

        {/* Filter Tabs for All vs Published vs Drafts */}
        {token && (
          <div className="flex flex-wrap items-center justify-between border-b border-[#253146] text-xs font-medium pt-2 gap-4">
            <div className="flex space-x-6">
              <button
                type="button"
                onClick={() => setPublicationFilter('all')}
                className={`pb-3 transition flex items-center gap-2 cursor-pointer ${
                  publicationFilter === 'all'
                    ? 'border-b-2 border-[#3b6bf6] text-[#3b6bf6] font-semibold'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                <span>All Events</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#0d1117] text-[#94a3b8] border border-[#253146]">
                  {events.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPublicationFilter('published')}
                className={`pb-3 transition flex items-center gap-2 cursor-pointer ${
                  publicationFilter === 'published'
                    ? 'border-b-2 border-[#10b981] text-[#10b981] font-semibold'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                  Published
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  {publishedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPublicationFilter('draft')}
                className={`pb-3 transition flex items-center gap-2 cursor-pointer ${
                  publicationFilter === 'draft'
                    ? 'border-b-2 border-[#f59e0b] text-[#f59e0b] font-semibold'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                  Drafts
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                  {draftsCount}
                </span>
              </button>
            </div>
          </div>
        )}

        {loadingEvents ? (
          <div className="bg-[#161d2a] border border-[#253146] rounded-xl p-12 text-center text-[#94a3b8]">
            <p className="text-xs">Loading organizer records from backend...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-[#161d2a] border border-[#253146] rounded-xl p-12 text-center">
            <p className="text-[#94a3b8] text-sm mb-3">No matching events found.</p>
            {token ? (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#3b6bf6] hover:bg-[#2a58e6] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Create Your First Event
              </button>
            ) : (
              <Link
                href="/login"
                className="text-[#3b6bf6] hover:underline text-xs font-medium"
              >
                Sign in with club credentials to create events
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => {
              const depts = event.allowedDepartments?.split(',').filter(Boolean) || [];
              const years = event.allowedStudyYears?.split(',').filter(Boolean) || [];
              const statusDetails = getEventStatusDetails(event);

              return (
                <div
                  key={event.id}
                  className="bg-[#161d2a] border border-[#253146] rounded-xl p-6 flex flex-col justify-between hover:border-[#3b6bf6]/50 transition shadow-sm"
                >
                  <div className="space-y-4">
                    {/* Top Header of Card */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusDetails.badgeClass}`}>
                            {statusDetails.label}
                          </span>
                          {event.isPublic === false ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 flex items-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                              Draft
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 flex items-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                              Published
                            </span>
                          )}
                          {isOwner(event) ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                              Your Club
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#0d1117] text-[#94a3b8] border border-[#253146]">
                              {event.club?.name ? `Hosted by ${event.club.name}` : 'Hosted by Another Club'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-[#f8fafc] tracking-tight">{event.name}</h3>
                      </div>

                      {/* Quick UUID Copy button */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(event.id);
                          showNotification('success', 'Event ID copied to clipboard');
                        }}
                        className="px-2.5 py-1 text-xs bg-[#0d1117] hover:bg-[#1f293d] border border-[#253146] text-[#94a3b8] hover:text-[#f8fafc] rounded-md font-mono transition cursor-pointer"
                        title="Copy UUID for student registration or scanner"
                      >
                        Copy ID
                      </button>
                    </div>

                    {/* Event Details & Meta */}
                    <div className="text-xs text-[#94a3b8] space-y-1.5 bg-[#0d1117] p-3.5 rounded-lg border border-[#253146]/70">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b]">Venue</span>
                        <span className="text-[#f8fafc] font-medium">{event.venue}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b]">Start Time</span>
                        <span className="text-[#f8fafc] tabular-nums" suppressHydrationWarning>
                          {event.startTime ? new Date(event.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b]">End Time</span>
                        <span className="text-[#f8fafc] tabular-nums" suppressHydrationWarning>
                          {event.endTime ? new Date(event.endTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748b]">Deadline</span>
                        <span className="text-[#f59e0b] font-medium tabular-nums" suppressHydrationWarning>
                          {event.registrationDeadline
                            ? new Date(event.registrationDeadline).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                            : 'Open'}
                        </span>
                      </div>
                      {event.guests && (
                        <div className="flex items-center justify-between pt-1 border-t border-[#253146]/50">
                          <span className="text-[#64748b]">Guests</span>
                          <span className="text-[#f8fafc] truncate max-w-[200px]">{event.guests}</span>
                        </div>
                      )}
                    </div>

                    {/* Eligibility Filter Tags */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-[#64748b] font-medium">Eligible Departments &amp; Years:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {depts.length > 0 ? (
                          depts.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-[#0d1117] text-[#94a3b8] text-[10px] font-medium border border-[#253146]"
                            >
                              {d.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[#94a3b8]">All Departments</span>
                        )}

                        {years.length > 0 &&
                          years.map((y) => (
                            <span
                              key={y}
                              className="px-2 py-0.5 rounded bg-[#3b6bf6]/10 text-[#3b6bf6] text-[10px] font-medium border border-[#3b6bf6]/30 tabular-nums"
                            >
                              Year {y.trim()}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-6 pt-4 border-t border-[#253146] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setExportEvent(event);
                          setExportDept('');
                          setExportYear('');
                          setExportStatus('');
                          setExportFeedback(null);
                        }}
                        className="px-3.5 py-1.5 bg-[#3b6bf6]/15 hover:bg-[#3b6bf6]/25 text-[#3b6bf6] border border-[#3b6bf6]/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Export Attendance CSV
                      </button>

                      <button
                        onClick={() => openAttendeesViewer(event)}
                        className="px-3 py-1.5 bg-[#0d1117] hover:bg-[#1f293d] border border-[#253146] text-[#94a3b8] hover:text-[#f8fafc] rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        View Attendees
                      </button>
                    </div>

                    {token && (
                      <div className="flex items-center gap-2">
                        {isOwner(event) ? (
                          <>
                            {event.isPublic === false && (
                              <button
                                type="button"
                                onClick={() => handlePublishEvent(event.id, event.name)}
                                disabled={publishingEventId === event.id}
                                className="px-3 py-1.5 bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                                title="Publish draft event to campus directory"
                              >
                                {publishingEventId === event.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></span>
                                    Publishing...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Publish Event
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(event)}
                              className="px-3 py-1.5 bg-[#0d1117] hover:bg-[#1f293d] text-[#f8fafc] rounded-lg text-xs font-medium transition border border-[#253146] cursor-pointer"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteEvent(event.id, event.name)}
                              className="px-3 py-1.5 bg-[#f43f5e]/10 hover:bg-[#f43f5e]/20 text-[#f43f5e] border border-[#f43f5e]/30 rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-[#64748b]">
                            Hosted by external club
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL 1: Filtered Attendance CSV Export */}
      {exportEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#161d2a] border border-[#253146] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-[#f8fafc]">Export Attendance Records</h3>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Event: <span className="text-[#f8fafc] font-medium">{exportEvent.name}</span>
                </p>
              </div>
              <button
                onClick={() => setExportEvent(null)}
                className="text-[#94a3b8] hover:text-[#f8fafc] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {exportFeedback && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  exportFeedback.type === 'success'
                    ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                    : 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]'
                }`}
              >
                {exportFeedback.message}
              </div>
            )}

            <form onSubmit={handleDownloadCsv} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">Department</label>
                  <select
                    value={exportDept}
                    onChange={(e) => setExportDept(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  >
                    <option value="">All Departments</option>
                    {Array.from(new Set(CAMPUS_DEPARTMENTS.map((d) => d.category))).map((category) => (
                      <optgroup key={category} label={category} className="bg-[#161d2a] text-[#94a3b8] font-semibold">
                        {CAMPUS_DEPARTMENTS.filter((d) => d.category === category).map((d) => (
                          <option key={d.code} value={d.code} className="bg-[#0d1117] text-[#f8fafc]">
                            {d.code} — {d.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">Study Year</label>
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  >
                    <option value="">All Study Years</option>
                    {STUDY_YEARS.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">Gate Check-In Status</label>
                <select
                  value={exportStatus}
                  onChange={(e) => setExportStatus(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                >
                  <option value="">All Registrations</option>
                  <option value="true">Checked In Only (Present)</option>
                  <option value="false">Unchecked (Absent)</option>
                </select>
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#253146] text-xs text-[#94a3b8]">
                Export generates a formatted CSV report containing Attendee Name, Email, Roll Number, Department, Year, and Check-In timestamp.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExportEvent(null)}
                  className="flex-1 py-2.5 bg-[#0d1117] hover:bg-[#1f293d] border border-[#253146] text-[#94a3b8] hover:text-[#f8fafc] rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={downloading}
                  className="flex-1 py-2.5 bg-[#3b6bf6] hover:bg-[#2a58e6] text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {downloading ? 'Downloading...' : 'Download CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#161d2a] border border-[#253146] rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-[#f8fafc]">
                  {editingEventId ? 'Modify Event' : 'Create Campus Event'}
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Set event logistics, department eligibility, and registration deadline
                </p>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Autonomous Robotics Challenge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Auditorium"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">Chief Guests / Speakers</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Alan Turing"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">Registration Deadline *</label>
                  <input
                    type="datetime-local"
                    required
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                  />
                </div>
              </div>

              {/* Eligibility: Departments */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#94a3b8]">
                    Allowed Departments ({selectedDepts.length} of {CAMPUS_DEPARTMENTS.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDepts(DEPARTMENT_CODES)}
                      className="text-[11px] text-[#3b6bf6] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[#64748b] text-[11px]">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDepts([])}
                      className="text-[11px] text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-[#0d1117] rounded-lg border border-[#253146]">
                  {CAMPUS_DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDepts.includes(dept.code);
                    return (
                      <button
                        type="button"
                        key={dept.code}
                        title={dept.name}
                        onClick={() => {
                          setSelectedDepts((prev) =>
                            prev.includes(dept.code)
                              ? prev.filter((d) => d !== dept.code)
                              : [...prev, dept.code]
                          );
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#3b6bf6]/20 border-[#3b6bf6] text-[#3b6bf6]'
                            : 'bg-[#161d2a] border-[#253146] text-[#94a3b8] hover:border-[#3b6bf6]/40'
                        }`}
                      >
                        {dept.code} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Eligibility: Years */}
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Allowed Academic Years
                </label>
                <div className="flex gap-2">
                  {STUDY_YEARS.map((yr) => {
                    const isSelected = selectedYears.includes(yr);
                    return (
                      <button
                        type="button"
                        key={yr}
                        onClick={() => {
                          setSelectedYears((prev) =>
                            prev.includes(yr) ? prev.filter((y) => y !== yr) : [...prev, yr]
                          );
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#3b6bf6]/20 border-[#3b6bf6] text-[#3b6bf6]'
                            : 'bg-[#0d1117] border-[#253146] text-[#94a3b8] hover:border-[#3b6bf6]/40'
                        }`}
                      >
                        Year {yr} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">Banner Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageLink}
                  onChange={(e) => setImageLink(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">Details &amp; Agenda</label>
                <textarea
                  rows={3}
                  placeholder="Event overview, prerequisites, guidelines..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#253146] rounded-lg px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-[#3b6bf6]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded bg-[#0d1117] border-[#253146] text-[#3b6bf6] focus:ring-0"
                />
                <label htmlFor="isPublic" className="text-xs text-[#94a3b8]">
                  Make event publicly discoverable on portal
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 py-2.5 bg-[#0d1117] hover:bg-[#1f293d] border border-[#253146] text-[#94a3b8] hover:text-[#f8fafc] rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="flex-1 py-2.5 bg-[#3b6bf6] hover:bg-[#2a58e6] text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEvent
                    ? 'Saving...'
                    : editingEventId
                    ? 'Save Changes'
                    : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Live Attendees Viewer */}
      {viewingAttendeesEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#161d2a] border border-[#253146] rounded-2xl w-full max-w-4xl p-6 shadow-2xl max-h-[85vh] flex flex-col space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-[#f8fafc] flex items-center gap-2">
                  <span>Attendees for</span>
                  <span className="text-[#3b6bf6]">{viewingAttendeesEvent.name}</span>
                </h3>
                <p className="text-xs text-[#94a3b8]">Total Registered: {attendees.length}</p>
              </div>
              <button
                onClick={() => setViewingAttendeesEvent(null)}
                className="text-[#94a3b8] hover:text-[#f8fafc] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingAttendees ? (
                <div className="py-12 text-center text-[#94a3b8] text-xs">Loading attendee records...</div>
              ) : attendees.length === 0 ? (
                <div className="py-12 text-center text-[#94a3b8] text-xs">No attendees have registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d1117] text-[#94a3b8] uppercase tracking-wider border-b border-[#253146]">
                      <tr>
                        <th className="py-3 px-3">Attendee Name</th>
                        <th className="py-3 px-3">Email</th>
                        <th className="py-3 px-3">Roll No.</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Year</th>
                        <th className="py-3 px-3">Gate Check-In</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#253146]">
                      {attendees.map((att) => (
                        <tr key={att.id} className="hover:bg-[#1f293d]/50">
                          <td className="py-3 px-3 font-medium text-[#f8fafc]">{att.attendeeName}</td>
                          <td className="py-3 px-3 text-[#94a3b8]">{att.attendeeEmail}</td>
                          <td className="py-3 px-3 font-mono text-[#f8fafc] tabular-nums">{att.rollNumber || 'N/A'}</td>
                          <td className="py-3 px-3 text-[#94a3b8]">{att.department || 'N/A'}</td>
                          <td className="py-3 px-3 text-[#94a3b8] tabular-nums">{att.studyYear ? `Yr ${att.studyYear}` : 'N/A'}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                att.checkedIn
                                  ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                                  : 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                              }`}
                            >
                              {att.checkedIn ? 'Checked In' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingAttendeesEvent(null)}
                className="px-4 py-2 bg-[#0d1117] hover:bg-[#1f293d] border border-[#253146] text-[#f8fafc] rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
