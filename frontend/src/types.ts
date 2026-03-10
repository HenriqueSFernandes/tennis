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
    user: string;
    username: string;
    obs: string;
    nome: string;
    telefone: string;
    data?: string;
    turno?: string;
    hora?: string;
  };
}

export interface AddAccountRequest {
  username: string;
  password: string;
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
