import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/bussid-api`;

export function edgeHeaders() {
  return {
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
}

export interface AccountInfo {
  name: string;
  money: number;
  sessionTicket?: string;
}

export interface TransactionRow {
  id: string;
  device_id: string;
  account_name: string;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  type: string;
  status: string;
  detail: string | null;
  created_at: string;
}

export interface EdgeResult {
  error?: string;
  queued?: boolean;
  waitMs?: number;
  name?: string;
  money?: number;
  sessionTicket?: string;
  success?: number;
  failed?: number;
  drained?: number;
  status?: string;
  newName?: string;
  raw?: unknown;
}

export async function callEdge(action: string, params: Record<string, unknown> = {}): Promise<{ result: EdgeResult; status: number }> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
  if (!res.ok && !data.error) {
    data.error = `Request failed (${res.status})`;
  }
  return { result: data as EdgeResult, status: res.status };
}
