export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/eventify';

// Token & Session helpers (SSR-safe)
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_token');
  }
  return null;
};

export const getStoredClubId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_id');
  }
  return null;
};

export const getStoredClubEmail = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_email');
  }
  return null;
};

export const setAuthSession = (token: string, clubId?: string, email?: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('club_token', token);
    if (clubId) {
      localStorage.setItem('club_id', clubId);
    }
    if (email) {
      localStorage.setItem('club_email', email);
    }
  }
};

export const clearAuthSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('club_token');
    localStorage.removeItem('club_id');
    localStorage.removeItem('club_email');
  }
};

// Helper to extract clean error message from response
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data.message || data.error || text || fallback;
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
}

// Interfaces
export interface Club {
  id: string;
  name?: string;
  email?: string;
}

export interface EventItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  details?: string;
  isPublic?: boolean;
  public?: boolean;
  venue: string;
  guests?: string;
  imageLink?: string;
  allowedDepartments?: string;
  allowedStudyYears?: string;
  club?: Club;
  createdAt?: string;
}

export interface CreateEventPayload {
  name: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  details?: string;
  isPublic: boolean;
  venue: string;
  guests?: string;
  imageLink?: string;
  allowedDepartments?: string;
  allowedStudyYears?: string;
  club: {
    id: string;
  };
}

export interface RegistrationPayload {
  attendeeName: string;
  attendeeEmail: string;
  rollNumber: string;
  department: string;
  studyYear: number;
  event: {
    id: string;
  };
}

export interface Registration {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  rollNumber?: string;
  department?: string;
  studyYear?: number;
  checkedIn: boolean;
  registeredAt?: string;
}

// 1. Auth APIs
export async function registerClub(name: string, email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Registration failed.');
    throw new Error(msg);
  }

  return response.json();
}

export async function loginClub(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Invalid email or password.');
    throw new Error(msg);
  }

  const data = await response.json();
  if (data.token) {
    setAuthSession(data.token, data.clubId, email);
  }
  return data;
}

// Club Info
export async function getAllClubs(): Promise<Club[]> {
  const response = await fetch(`${API_BASE_URL}/clubs`);
  if (!response.ok) return [];
  return response.json();
}

// 2. Events APIs
export async function getAllEvents(): Promise<EventItem[]> {
  const response = await fetch(`${API_BASE_URL}/events`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to fetch events.');
    throw new Error(msg);
  }

  return response.json();
}

export async function getEventById(id: string): Promise<EventItem> {
  const response = await fetch(`${API_BASE_URL}/events/${id}`);
  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Event not found.');
    throw new Error(msg);
  }
  return response.json();
}

export async function createEvent(payload: CreateEventPayload): Promise<EventItem> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to create event.');
    throw new Error(msg);
  }

  return response.json();
}

export async function updateEvent(id: string, payload: Partial<CreateEventPayload>): Promise<EventItem> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to update event.');
    throw new Error(msg);
  }

  return response.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to delete event.');
    throw new Error(msg);
  }
}

// 3. Registrations APIs
export async function registerForEvent(payload: RegistrationPayload) {
  const response = await fetch(`${API_BASE_URL}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to register for event.');
    throw new Error(msg);
  }

  return response.json();
}

export async function checkInAttendee(registrationId: string): Promise<string> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/registrations/${registrationId}/check-in`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Check-in failed.');
    throw new Error(msg);
  }

  return response.text();
}

export async function getEventRegistrations(eventId: string): Promise<Registration[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/registrations/event/${eventId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to load attendees.');
    throw new Error(msg);
  }

  return response.json();
}

export async function downloadEventCSV(
  eventId: string,
  department?: string,
  studyYear?: number,
  checkedIn?: boolean
): Promise<void> {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  if (studyYear !== undefined && studyYear !== null) params.append('studyYear', studyYear.toString());
  if (checkedIn !== undefined && checkedIn !== null) params.append('checkedIn', checkedIn.toString());

  const url = `${API_BASE_URL}/registrations/event/${eventId}/export${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  const response = await fetch(url);
  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to download CSV report.');
    throw new Error(msg);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const fileNameSuffix = [
    department ? `_${department}` : '',
    studyYear ? `_Yr${studyYear}` : '',
    checkedIn !== undefined ? (checkedIn ? '_Present' : '_Absent') : '',
  ].join('');
  a.download = `event_${eventId}${fileNameSuffix}_attendance.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
