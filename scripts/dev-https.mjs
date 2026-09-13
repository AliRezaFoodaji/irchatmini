/**
 * Local HTTPS server for testing from a phone / another device on the LAN.
 *
 * Browsers only allow camera & microphone on HTTPS (secure context). A phone
 * opening http://192.168.x.x will NOT be able to use the camera. This script:
 *
 *   1. generates a self-signed certificate (with the LAN IP in it),
 *   2. starts `next dev` and the signaling server if they are not running,
 *   3. serves the app + WebSocket proxying over HTTPS on port 3443.
 *
 * On the phone visit  https://<PC-LAN-IP>:3443  and accept the certificate
 * warning once (Advanced > Proceed). Then camera/mic will work.
 *
 * Usage:  npm run dev:phone
 */

import https from "node:https";
import net from "node:net";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import selfsigned from "selfsigned";
import httpProxy from "http-proxy";

const NEXT_PORT = 3000;
const SIGNAL_PORT = 3001;
const HTTPS_PORT = Number(process.env.HTTPS_PORT ?? 3443);
const ROOT = path.resolve(import.meta.dirname, "..");
const CERT_DIR = path.join(ROOT, ".devcert");
const CERT_FILE = path.join(CERT_DIR, "cert.pem");
const KEY_FILE = path.join(CERT_DIR, "key.pem");

function lanInterfaces() {
  const found = [];
  for (const [name, nets] of Object.entries(os.networkInterfaces())) {
    for (const ni of nets ?? []) {
      if (ni.family === "IPv4" && !ni.internal) found.push({ ip: ni.address, name });
    }
  }
  return found;
}

const SNAPSHOT_FILE = path.join(CERT_DIR, "ips.json");

function currentIps() {
  return lanInterfaces()
    .map(({ ip }) => ip)
    .sort();
}

async function getCertificate() {
  const needRegen = !(
    fs.existsSync(CERT_FILE) &&
    fs.existsSync(KEY_FILE) &&
    fs.existsSync(SNAPSHOT_FILE) &&
    JSON.stringify(JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"))) ===
      JSON.stringify(currentIps())
  );
  if (!needRegen) {
    return {
      key: fs.readFileSync(KEY_FILE),
      cert: fs.readFileSync(CERT_FILE),
    };
  }
  const altNames = [
    { type: 2, value: "localhost" },
    ...lanInterfaces().map(({ ip }) => ({ type: 7, ip })),
  ];
  const pems = await selfsigned.generate(
    [{ name: "commonName", value: "Hamsabhat Dev" }],
    {
      days: 90,
      algorithm: "sha256",
      extensions: [{ name: "subjectAltName", altNames }],
    },
  );
  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(CERT_FILE, pems.cert);
  fs.writeFileSync(KEY_FILE, pems.private);
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(currentIps(), null, 2));
  return { key: pems.private, cert: pems.cert };
}

async function isOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: "127.0.0.1" });
    sock.on("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
  });
}

async function ensureBackends() {
  if (!(await isOpen(NEXT_PORT))) {
    console.log(`[dev-https] starting next dev on :${NEXT_PORT}...`);
    spawn("npm.cmd", ["run", "dev:web"], {
      stdio: "inherit",
      cwd: ROOT,
      shell: true,
    });
  }
  if (!(await isOpen(SIGNAL_PORT))) {
    console.log(`[dev-https] starting signaling server on :${SIGNAL_PORT}...`);
    spawn("npm.cmd", ["run", "dev:signal"], {
      stdio: "inherit",
      cwd: ROOT,
      shell: true,
    });
  }
}

function isWsPath(url) {
  return url.startsWith("/ws-signal");
}

function targetFor(url) {
  return isWsPath(url)
    ? { host: "127.0.0.1", port: SIGNAL_PORT }
    : { host: "127.0.0.1", port: NEXT_PORT };
}

function stampSecureHeaders(req) {
  req.headers["x-forwarded-proto"] = "https";
  req.headers["x-forwarded-host"] = req.headers.host;
}

const proxy = httpProxy.createProxyServer({ ws: true });

const { key, cert } = await getCertificate();
const secure = https.createServer({ key, cert }, (req, res) => {
  stampSecureHeaders(req);
  proxy.web(req, res, { target: targetFor(req.url) });
});
secure.on("upgrade", (req, socket, head) => {
  stampSecureHeaders(req);
  proxy.ws(req, socket, head, { target: targetFor(req.url) });
});

await ensureBackends();

// Give the backends a moment to boot before accepting traffic.
await new Promise((r) => setTimeout(r, 2500));

secure.listen(HTTPS_PORT, "0.0.0.0");

console.log("");
console.log("[dev-https] HTTPS test server ready!");
console.log(
  "  Open on your phone (use the one labeled Wi-Fi, matching its network):",
);
for (const { ip, name } of lanInterfaces()) {
  console.log(`    https://${ip}:${HTTPS_PORT}   [${name}]`);
}
console.log("");
console.log(
  "  If it won't load, allow Windows firewall:\n" +
    "    New-NetFirewallRule -DisplayName 'Hamsabhat dev https' -Direction Inbound -Protocol TCP -LocalPort " +
    `${HTTPS_PORT} -Action Allow`,
);
console.log("");
console.log("  Keep this window open while testing. Ctrl+C to stop.");

process.on("SIGINT", () => {
  process.exit(0);
});