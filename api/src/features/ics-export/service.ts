import { getCurrentBooking } from "../../integrations/riotinto/index.js";
import type { BookingWithAccount } from "../../types/index.js";
import {
  getDecryptedPassword,
  getStoredAccount,
} from "../accounts/repository.js";
import { listAccounts } from "../accounts/service.js";

export async function fetchAllBookings(
  userId: string,
): Promise<BookingWithAccount[]> {
  const accounts = await listAccounts(userId);

  const results = await Promise.allSettled(
    accounts.flatMap((acc) =>
      [1, 2].map(async (courtId) => {
        const stored = await getStoredAccount(userId, acc.id);
        if (!stored) return null;
        const pwd = await getDecryptedPassword(userId, acc.id);
        if (!pwd) return null;
        const current = await getCurrentBooking(
          acc.id,
          stored.username,
          pwd,
          courtId,
        );
        if (!current) return null;
        return {
          accountId: acc.id,
          username: stored.username,
          displayName: stored.displayName,
          phone: stored.phone,
          courtId,
          date: current.date,
          time: current.time,
          nome: current.nome,
        };
      }),
    ),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<BookingWithAccount | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((booking): booking is BookingWithAccount => booking !== null);
}
