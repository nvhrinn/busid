import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAYFAB_TITLE_ID = "4AE9";
const PLAYFAB_BASE = `https://${PLAYFAB_TITLE_ID}.playfabapi.com`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QUEUE_COOLDOWN_MS = 60000; // 60 seconds cooldown between requests per device
const STALE_THRESHOLD_MS = 120000; // processing rows older than this are considered dead
const MAX_EXECUTION_COUNT = 5; // max repeats per addMoney request

interface PlayFabResponse {
  code?: number;
  status?: string;
  data?: any;
  error?: string;
  errorMessage?: string;
  errorDetails?: any;
}

async function playfab(path: string, body: any, headers: Record<string, string>): Promise<PlayFabResponse> {
  const res = await fetch(`${PLAYFAB_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json as PlayFabResponse;
}

// --- Queue helpers (database-backed, survives across instances) ---

async function dbQuery(query: string, params: any[]): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/`;
  // Use PostgREST directly via the REST API
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    method: "GET",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return [];
  return await res.json();
}

/** Try to acquire a queue slot for this device. Returns true if acquired, false if blocked. */
async function acquireQueueSlot(deviceId: string, action: string): Promise<{ allowed: boolean; waitMs?: number; queuePosition?: number }> {
  const now = Date.now();
  const staleCutoff = new Date(now - STALE_THRESHOLD_MS).toISOString();

  // Clean up stale processing rows (dead requests)
  await fetch(`${SUPABASE_URL}/rest/v1/request_queue?status=eq.processing&created_at=lt.${encodeURIComponent(staleCutoff)}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  // Check for active processing row for this device
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/request_queue?device_id=eq.${encodeURIComponent(deviceId)}&status=eq.processing&select=id,created_at&order=created_at.desc&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  const existing = checkRes.ok ? await checkRes.json() : [];

  if (existing.length > 0) {
    const created = new Date(existing[0].created_at).getTime();
    const elapsed = now - created;
    if (elapsed < STALE_THRESHOLD_MS) {
      const waitMs = Math.max(0, QUEUE_COOLDOWN_MS - elapsed);
      return { allowed: false, waitMs };
    }
  }

  // Check cooldown: last completed request for this device
  const cooldownRes = await fetch(
    `${SUPABASE_URL}/rest/v1/request_queue?device_id=eq.${encodeURIComponent(deviceId)}&status=eq.done&order=completed_at.desc&limit=1&select=completed_at`,
    {
      method: "GET",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  const completed = cooldownRes.ok ? await cooldownRes.json() : [];

  if (completed.length > 0 && completed[0].completed_at) {
    const completedTime = new Date(completed[0].completed_at).getTime();
    const sinceCompleted = now - completedTime;
    if (sinceCompleted < QUEUE_COOLDOWN_MS) {
      return { allowed: false, waitMs: QUEUE_COOLDOWN_MS - sinceCompleted };
    }
  }

  // Insert new processing row
  await fetch(`${SUPABASE_URL}/rest/v1/request_queue`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ device_id: deviceId, action, status: "processing" }),
  });

  return { allowed: true };
}

/** Mark the queue slot as done (or failed). */
async function completeQueueSlot(deviceId: string, success: boolean): Promise<void> {
  const status = success ? "done" : "failed";
  await fetch(
    `${SUPABASE_URL}/rest/v1/request_queue?device_id=eq.${encodeURIComponent(deviceId)}&status=eq.processing&order=created_at.desc&limit=1`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status, completed_at: new Date().toISOString() }),
    },
  );
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, deviceId, authToken, amount, displayName, count } = await req.json();

    if (!action) return jsonResponse({ error: "Missing action" }, 400);

    // --- Queue enforcement ---
    const queueKey = deviceId || authToken || "unknown";
    const queueCheck = await acquireQueueSlot(queueKey, action);
    if (!queueCheck.allowed) {
      const waitSec = Math.ceil((queueCheck.waitMs || 0) / 1000);
      return jsonResponse({
        error: `Antrian penuh. Tunggu ${waitSec} detik sebelum request berikutnya.`,
        queued: true,
        waitMs: queueCheck.waitMs,
      }, 429);
    }

    const headers: Record<string, string> = {};
    const authInput: string = authToken || "";
    let sessionTicket = "";

    if (authInput.length > 25) {
      sessionTicket = authInput;
    } else {
      if (!deviceId && !authInput) {
        await completeQueueSlot(queueKey, false);
        return jsonResponse({ error: "Missing deviceId or authToken" }, 400);
      }
      const loginRes = await playfab("/Client/LoginWithAndroidDeviceID", {
        AndroidDeviceID: authInput || deviceId,
        TitleId: PLAYFAB_TITLE_ID,
        CreateAccount: false,
      }, {});
      if (loginRes.data?.SessionTicket) {
        sessionTicket = loginRes.data.SessionTicket;
      } else {
        await completeQueueSlot(queueKey, false);
        return jsonResponse({
          error: loginRes.errorMessage || "Login failed",
          raw: loginRes,
        }, 400);
      }
    }

    headers["X-Authorization"] = sessionTicket;

    // ---- getInfo ----
    if (action === "getInfo") {
      const info = await playfab("/Client/GetPlayerCombinedInfo", {
        InfoRequestParameters: {
          GetUserAccountInfo: true,
          GetUserVirtualCurrency: true,
        },
      }, headers);
      await completeQueueSlot(queueKey, info.code === 200);
      if (info.code === 200 && info.data?.InfoResultPayload) {
        const payload = info.data.InfoResultPayload;
        return jsonResponse({
          name: payload.AccountInfo?.TitleInfo?.DisplayName || "[ganti nama]",
          money: payload.UserVirtualCurrency?.RP || 0,
          sessionTicket,
        });
      }
      return jsonResponse({ error: info.errorMessage || "Failed to get info" }, 400);
    }

    // ---- addMoney (topup / drain) ----
    if (action === "addMoney") {
      const repeats = Math.max(1, Math.min(MAX_EXECUTION_COUNT, Math.floor(count || 1)));
      let success = 0;
      let failed = 0;
      for (let i = 0; i < repeats; i++) {
        const r = await playfab("/Client/ExecuteCloudScript", {
          FunctionName: "AddRp",
          FunctionParameter: { addValue: amount },
          RevisionSelection: "Live",
          GeneratePlayStreamEvent: false,
        }, headers);
        if (r && !r.error) success++;
        else failed++;
      }
      await completeQueueSlot(queueKey, failed < repeats);
      return jsonResponse({ success, failed, sessionTicket });
    }

    // ---- kurasSemua ----
    if (action === "kurasSemua") {
      const info = await playfab("/Client/GetPlayerCombinedInfo", {
        InfoRequestParameters: { GetUserAccountInfo: true, GetUserVirtualCurrency: true },
      }, headers);
      const money = info.data?.InfoResultPayload?.UserVirtualCurrency?.RP || 0;
      if (money === 0) {
        await completeQueueSlot(queueKey, true);
        return jsonResponse({ money: 0, drained: 0, sessionTicket });
      }
      const r = await playfab("/Client/ExecuteCloudScript", {
        FunctionName: "AddRp",
        FunctionParameter: { addValue: -money },
        RevisionSelection: "Live",
        GeneratePlayStreamEvent: false,
      }, headers);
      const ok = r && !r.error;
      await completeQueueSlot(queueKey, ok);
      return jsonResponse({
        money: ok ? 0 : money,
        drained: ok ? money : 0,
        status: ok ? "success" : "failed",
        sessionTicket,
      });
    }

    // ---- gantiNama ----
    if (action === "gantiNama") {
      if (!displayName) {
        await completeQueueSlot(queueKey, false);
        return jsonResponse({ error: "Missing displayName" }, 400);
      }
      const r = await playfab("/Client/UpdateUserTitleDisplayName", {
        DisplayName: displayName,
      }, headers);
      const ok = r.code === 200;
      await completeQueueSlot(queueKey, ok);
      return jsonResponse({
        status: ok ? "success" : "failed",
        newName: displayName,
        raw: r,
        sessionTicket,
      }, ok ? 200 : 400);
    }

    // ---- hapusAkun ----
    if (action === "hapusAkun") {
      const r = await playfab("/Client/ExecuteCloudScript", {
        FunctionName: "DeleteUsers",
        FunctionParameter: {},
        RevisionSelection: "Live",
        GeneratePlayStreamEvent: false,
      }, headers);
      const ok = r && !r.error;
      await completeQueueSlot(queueKey, ok);
      return jsonResponse({ status: ok ? "success" : "failed", raw: r, sessionTicket });
    }

    await completeQueueSlot(queueKey, false);
    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err?.message || err) }, 500);
  }
});
