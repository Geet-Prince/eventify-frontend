// Production and local API Base URL resolution
const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://eventify-api.geetprince.me';

const cleanBaseUrl = RAW_API_URL.replace(/\/+$/, '');
export const API_BASE_URL = cleanBaseUrl.endsWith('/eventify')
  ? cleanBaseUrl
  : `${cleanBaseUrl}/eventify`;

// Token & Session helpers (SSR-safe)
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_token');
  }
  return null;
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_refresh_token');
  }
  return null;
};

export const getStoredClubId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_id');
  }
  return null;
};

export const getStoredClubRole = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_role');
  }
  return null;
};

export const getStoredClubEmail = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('club_email');
  }
  return null;
};

export const setAuthSession = (
  token: string,
  refreshToken?: string,
  clubId?: string,
  role?: string,
  email?: string
): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('club_token', token);
    if (refreshToken) {
      localStorage.setItem('club_refresh_token', refreshToken);
    }
    if (clubId) {
      localStorage.setItem('club_id', clubId);
    }
    if (role) {
      localStorage.setItem('club_role', role);
    }
    if (email) {
      localStorage.setItem('club_email', email);
    }
  }
};

export const clearAuthSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('club_token');
    localStorage.removeItem('club_refresh_token');
    localStorage.removeItem('club_id');
    localStorage.removeItem('club_role');
    localStorage.removeItem('club_email');
  }
};

// Custom API Error with HTTP status preservation
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Password validation policy regex:
// Min 8 chars, at least 1 lowercase, 1 uppercase, 1 digit, 1 special character
export const PASSWORD_REGEX =
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!_~`*?|:;"'<>,./\\-]).{8,100}$/;

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

// Token Refresh Mutex to handle multiple concurrent 401s
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const data = await response.json();
      const newToken: string | undefined = data.token || data.accessToken;
      if (newToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('club_token', newToken);
          if (data.refreshToken) {
            localStorage.setItem('club_refresh_token', data.refreshToken);
          }
        }
        return newToken;
      }

      clearAuthSession();
      return null;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Authenticated fetch wrapper with automatic Authorization header and 401 token refresh interceptor
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // When token expires (401), request a new token and retry the original call
  if (response.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
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
  club?: {
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
  studentName?: string;
  studentEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  rollNumber?: string;
  department?: string;
  studyYear?: number;
  checkedIn: boolean;
  qrCodeBase64?: string;
  registeredAt?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  clubId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface RegisterResponse {
  message?: string;
  [key: string]: unknown;
}

// 1. Auth APIs
export async function registerClub(name: string, email: string, password: string): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Registration failed.');
    throw new ApiError(msg, response.status);
  }

  try {
    return await response.json();
  } catch {
    return { message: 'Registration submitted successfully.' };
  }
}

export async function verifyEmail(verificationToken: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/auth/verify?token=${encodeURIComponent(verificationToken.trim())}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Invalid or expired verification token.');
    throw new ApiError(msg, response.status);
  }

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.message || text;
  } catch {
    return text || 'Email verified successfully!';
  }
}

export async function loginClub(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Invalid email or password.');
    throw new ApiError(msg, response.status);
  }

  const data: LoginResponse = await response.json();
  if (data.token) {
    setAuthSession(data.token, data.refreshToken, data.clubId, data.role, email);
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
  // Requirement 4: Do NOT send club: { id: ... } in the body.
  // The backend automatically extracts and assigns the club from the authenticated JWT token.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { club, ...eventData } = payload;

  const response = await fetchWithAuth(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to create event.');
    throw new Error(msg);
  }

  return response.json();
}

export async function updateEvent(id: string, payload: Partial<CreateEventPayload>): Promise<EventItem> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { club, ...eventData } = payload;

  const response = await fetchWithAuth(`${API_BASE_URL}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to update event.');
    throw new Error(msg);
  }

  return response.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/events/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Failed to delete event.');
    throw new Error(msg);
  }
}

// 3. Registrations APIs
export async function registerForEvent(payload: RegistrationPayload): Promise<Registration> {
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
  const response = await fetchWithAuth(
    `${API_BASE_URL}/registrations/${registrationId}/check-in`,
    {
      method: 'PUT',
    }
  );

  if (!response.ok) {
    const msg = await extractErrorMessage(response, 'Check-in failed.');
    throw new Error(msg);
  }

  return response.text();
}

export async function getEventRegistrations(eventId: string): Promise<Registration[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/registrations/event/${eventId}`
  );

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

  const response = await fetchWithAuth(url);
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
