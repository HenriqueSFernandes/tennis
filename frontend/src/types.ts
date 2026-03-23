// Shared types mirroring the Worker's type definitions

export interface AccountSummary {
  id: string;
  username: string;
  displayName: string;
  phone: string;
  createdAt: string;
}

export interface ScheduleSlot {
  time: string;
  turno: number;
  hora: number;
  date: string; // "DD-MM-YYYY"
  dayIndex: number; // 0=Mon ... 6=Sun
  bookedBy: string | null;
  bookedByName: string | null;
  isOurs: boolean;
  ourAccountId: string | null;
}

export interface CourtSchedule {
  courtId: number;
  courtName: string;
  weekDates: string[]; // 7 dates "DD-MM-YYYY"
  slots: ScheduleSlot[];
}

export interface ScheduleResponse {
  courts: CourtSchedule[];
  weekOffset: number;
}

export interface CurrentBookingInfo {
  accountId: string;
  username: string;
  displayName: string;
  courtId: number;
  booking: {
    nome: string;
    date: string; // "DD-MM-YYYY"
    time: string; // "HH:MM"
  };
}

export interface AddAccountRequest {
  username: string;
  password: string;
  displayName: string;
  phone: string;
}

export interface UpdateAccountRequest {
  displayName: string;
  phone: string;
}

export interface BookRequest {
  accountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}

export interface CancelRequest {
  accountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}
