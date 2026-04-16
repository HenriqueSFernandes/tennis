// Accounts API

import { request } from "../../../core/api/client";
import type {
  AccountSummary,
  AddAccountRequest,
  UpdateAccountRequest,
} from "../../../types";

export async function getAccounts(): Promise<AccountSummary[]> {
  return request<AccountSummary[]>("/riotinto-accounts");
}

export async function addAccount(
  data: AddAccountRequest,
): Promise<AccountSummary> {
  return request<AccountSummary>("/riotinto-accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/riotinto-accounts/${id}`, {
    method: "DELETE",
  });
}

export async function updateAccount(
  id: string,
  data: UpdateAccountRequest,
): Promise<AccountSummary> {
  return request<AccountSummary>(`/riotinto-accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
