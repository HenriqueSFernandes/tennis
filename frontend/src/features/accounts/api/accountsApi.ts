// Accounts API

import { request } from "../../../core/api/client";
import type {
  AccountSummary,
  AddAccountRequest,
  UpdateAccountRequest,
} from "../../../types";

export async function getAccounts(password: string): Promise<AccountSummary[]> {
  return request<AccountSummary[]>("/accounts", password);
}

export async function addAccount(
  password: string,
  data: AddAccountRequest,
): Promise<AccountSummary> {
  return request<AccountSummary>("/accounts", password, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(
  password: string,
  id: string,
): Promise<void> {
  await request<{ ok: boolean }>(`/accounts/${id}`, password, {
    method: "DELETE",
  });
}

export async function updateAccount(
  password: string,
  id: string,
  data: UpdateAccountRequest,
): Promise<AccountSummary> {
  return request<AccountSummary>(`/accounts/${id}`, password, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
