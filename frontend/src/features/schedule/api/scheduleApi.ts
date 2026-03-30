// Schedule API

import { request } from "../../../core/api/client";
import type { ScheduleResponse } from "../../../types";

export async function getSchedule(
  password: string,
  weekOffset: number,
): Promise<ScheduleResponse> {
  return request<ScheduleResponse>(`/schedule?week=${weekOffset}`, password);
}
