import { EventItem } from '../services/api';

export type EventLifecycleStatus = 'open' | 'registration_closed' | 'ongoing' | 'concluded';

export interface EventStatusDetails {
  status: EventLifecycleStatus;
  label: string;
  isBookable: boolean;
  badgeClass: string;
}

/**
 * Calculates current lifecycle status of an event based on current wall-clock time
 */
export function getEventStatusDetails(event: EventItem): EventStatusDetails {
  const now = new Date();
  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;
  const deadline = event.registrationDeadline
    ? new Date(event.registrationDeadline)
    : start;

  // 1. Concluded: Event has ended
  if (end && now > end) {
    return {
      status: 'concluded',
      label: 'Concluded',
      isBookable: false,
      badgeClass: 'bg-[#64748b]/15 text-[#94a3b8] border-[#64748b]/30',
    };
  }

  // 2. Ongoing: Event is currently happening (Gate check-in actively running)
  if (start && end && now >= start && now <= end) {
    return {
      status: 'ongoing',
      label: 'Live Now',
      isBookable: false,
      badgeClass: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 animate-pulse',
    };
  }

  // 3. Registration closed (Deadline passed or start time reached before end)
  if (deadline && now > deadline) {
    return {
      status: 'registration_closed',
      label: 'Registration Closed',
      isBookable: false,
      badgeClass: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
    };
  }

  // 4. Registration Open
  return {
    status: 'open',
    label: 'Registration Open',
    isBookable: true,
    badgeClass: 'bg-[#3b6bf6]/15 text-[#3b6bf6] border-[#3b6bf6]/30',
  };
}

/**
 * Returns true if attendee registration is currently allowed
 */
export function isRegistrationOpen(event: EventItem): boolean {
  return getEventStatusDetails(event).isBookable;
}
