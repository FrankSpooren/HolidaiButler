'use strict';
/*
 * threema-relay — vertaalt UptimeKuma-webhook (JSON) naar een Threema Gateway
 * send_simple-call (application/x-www-form-urlencoded).
 *
 * Waarom een relay i.p.v. directe UptimeKuma->Threema webhook:
 *   UptimeKuma stuurt JSON; Threema Gateway verwacht form-urlencoded met
 *   correcte URL-encoding van tekst (newlines, emoji). De relay borgt encoding
 *   + voegt rate-limit, retry/timeout en audit-logging toe (quality-standaard,
 *   gelijk aan het bestaande /usr/local/bin/alert-threema.sh op prod).
 *
 * Draait intern (geen host-poort) — alleen UptimeKuma op hetzelfde Docker-net
 * bereikt http://threema-relay:8099/notify. Optionele RELAY_TOKEN als 2e slot.
 *
 * Env (via .env, chmod 0600):
 *   THREEMA_GATEWAY_ID  *XXXXXXX   (8 tekens, begint met *)
 *   THREEMA_SECRET      gateway-secret
 *   OWNER_THREEMA_ID    Frank's Threema-ID (8 tekens)
 *   RELAY_TOKEN         (optioneel) gedeeld geheim; zo ja: X-Relay-Token vereist
 *   PORT                (optioneel) default 8099
 */

const http = require('http');
const https = require('https');
const { URLSearchParams } = require('url');

const PORT = parseInt(process.env.PORT || '8099', 10);
const GATEWAY_ID = process.env.THREEMA_GATEWAY_ID || '';
const SECRET = process.env.THREEMA_SECRET || '';
const OWNER_ID = process.env.OWNER_THREEMA_ID || '';
const RELAY_TOKEN = process.env.RELAY_TOKEN || '';
const COOLDOWN_MS = 5 * 60 * 1000; // 5-min cooldown per monitor (anti-burst)
const SEND_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 2;

const lastSent = new Map(); // monitorName -> epoch ms (alleen voor DOWN)

function log(level, msg, extra) {
  const rec = { ts: new Date().toISOString(), level, component: 'threema-relay', msg };
  if (extra) Object.assign(rec, extra);
  process.stdout.write(JSON.stringify(rec) + '\n');
}

function sendThreema(text) {
  const body = new URLSearchParams({
    from: GATEWAY_ID, to: OWNER_ID, secret: SECRET, text: text.slice(0, 3500),
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request('https://msgapi.threema.ch/send_simple', {
      method: 'POST',
      timeout: SEND_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 64) }));
    });
    req.on('timeout', () => req.destroy(new Error('threema-timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function dispatch(text, monitorName, isDown) {
  // Rate-limit alleen DOWN (recovery moet altijd door)
  if (isDown) {
    const prev = lastSent.get(monitorName) || 0;
    const age = Date.now() - prev;
    if (age < COOLDOWN_MS) {
      log('info', 'throttled', { monitor: monitorName, ageMs: age });
      return { throttled: true };
    }
  }
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const r = await sendThreema(text);
      if (r.status === 200) {
        if (isDown) lastSent.set(monitorName, Date.now());
        log('info', 'sent', { monitor: monitorName, attempt, msgId: r.body });
        return { sent: true };
      }
      lastErr = `HTTP ${r.status} ${r.body}`;
      log('warn', 'send-failed', { monitor: monitorName, attempt, err: lastErr });
    } catch (e) {
      lastErr = e.message;
      log('warn', 'send-error', { monitor: monitorName, attempt, err: lastErr });
    }
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 3000));
  }
  return { sent: false, err: lastErr };
}

function buildText(payload) {
  const name = payload?.monitor?.name || 'onbekende-monitor';
  const url = payload?.monitor?.url || payload?.monitor?.hostname || '';
  const status = payload?.heartbeat?.status; // 0=down 1=up
  const reason = payload?.heartbeat?.msg || payload?.msg || 'geen detail';
  const isDown = status === 0;
  const icon = isDown ? '🔴' : '✅';
  const head = isDown ? 'EXTERNE UPTIME DOWN' : 'Hersteld';
  const text = `${icon} ${head}: ${name}\n\n`
    + `Endpoint: ${url}\n`
    + `Tijdstip: ${new Date().toISOString()}\n`
    + `Reden: ${reason}\n\n`
    + `Bron: Laag 4 externe monitor (UptimeKuma, EU-host)`;
  return { text, name, isDown };
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200); return res.end('ok');
  }
  if (req.method !== 'POST' || req.url !== '/notify') {
    res.writeHead(404); return res.end('not found');
  }
  if (RELAY_TOKEN && req.headers['x-relay-token'] !== RELAY_TOKEN) {
    log('warn', 'unauthorized', { ip: req.socket.remoteAddress });
    res.writeHead(401); return res.end('unauthorized');
  }
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 65536) req.destroy(); });
  req.on('end', async () => {
    let payload;
    try { payload = JSON.parse(raw); }
    catch { res.writeHead(400); return res.end('bad json'); }
    const { text, name, isDown } = buildText(payload);
    res.writeHead(202); res.end('accepted'); // ack snel, verstuur async
    await dispatch(text, name, isDown);
  });
});

if (!GATEWAY_ID || !SECRET || !OWNER_ID) {
  log('error', 'missing-credentials', {
    hasGateway: !!GATEWAY_ID, hasSecret: !!SECRET, hasOwner: !!OWNER_ID,
  });
  process.exit(1);
}
server.listen(PORT, () => log('info', 'listening', { port: PORT }));
