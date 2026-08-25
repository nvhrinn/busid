/*
# Create request_queue table for anti-spam queue system

1. New Tables
- `request_queue`
  - `id` (uuid, primary key)
  - `device_id` (text, the device making the request)
  - `action` (text, the action type: topup/drain/kurasSemua/gantiNama/hapusAkun)
  - `status` (text: 'processing' | 'done' | 'failed')
  - `created_at` (timestamptz, default now())
  - `completed_at` (timestamptz, nullable, set when processing finishes)

2. Security
- Enable RLS on `request_queue`.
- NO policies are added: this table is accessed ONLY by the edge function
  using the service role key (which bypasses RLS). The anon-key frontend
  must NOT be able to read or modify queue entries, otherwise an attacker
  could delete processing rows to bypass the queue.

3. Purpose
- Prevents concurrent requests from the same device (anti-spam).
- Enforces a cooldown between actions per device.
- Stale 'processing' rows (older than 60s) are cleaned up automatically.
*/

CREATE TABLE IF NOT EXISTS request_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE request_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_request_queue_device_status ON request_queue (device_id, status);
CREATE INDEX IF NOT EXISTS idx_request_queue_created_at ON request_queue (created_at);
