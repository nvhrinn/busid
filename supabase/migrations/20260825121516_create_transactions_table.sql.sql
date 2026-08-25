/*
# Create transactions table for Bussid top-up history

1. New Tables
- `transactions`
  - `id` (uuid, primary key)
  - `device_id` (text, the PlayFab Device ID or X-Authorization used)
  - `account_name` (text, display name fetched from PlayFab at time of transaction)
  - `amount` (bigint, signed amount added — positive for top-up, negative for drain)
  - `balance_before` (bigint, balance before transaction)
  - `balance_after` (bigint, balance after transaction)
  - `type` (text: 'topup' | 'drain' | 'kuras_semua' | 'ganti_nama' | 'hapus_akun')
  - `status` (text: 'success' | 'failed')
  - `detail` (text, optional extra info e.g. new name for rename)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `transactions`.
- This is a no-auth single-tenant tool: allow anon + authenticated CRUD so the
  anon-key frontend can log every operation and read history.
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  account_name text NOT NULL DEFAULT '[unknown]',
  amount bigint NOT NULL DEFAULT 0,
  balance_before bigint,
  balance_after bigint,
  type text NOT NULL DEFAULT 'topup',
  status text NOT NULL DEFAULT 'success',
  detail text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON transactions (device_id);
