export interface CachedBooking {
  id: string;
  riotintoAccountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: string;
  hora: string;
  semana: number;
  status: string;
  lastSynced: string;
}

export interface SyncResult {
  synced: number;
  removed: number;
}
