// Lightweight version checker. Import and call startVersionCheck() once at app boot.
// Usage: import { startVersionCheck } from './versionCheck'; startVersionCheck();

const POLL_INTERVAL_MS = 30_000; // 30s (tune as desired)

async function fetchVersion(): Promise<string | null> {
  try {
    const r = await fetch("/api/version", { cache: "no-store" });
    if (!r.ok) return null;
    const json = await r.json();
    return json?.commit ?? null;
  } catch (err) {
    // ignore network errors; keep using current version
    return null;
  }
}

let currentVersion: string | null = null;
let timer: number | undefined;

export function startVersionCheck(opts?: { intervalMs?: number; onUpdate?: (newVersion: string) => void }) {
  const intervalMs = opts?.intervalMs ?? POLL_INTERVAL_MS;
  // Initialize version once
  (async () => {
    currentVersion = await fetchVersion();
  })();

  // Poll loop
  timer = window.setInterval(async () => {
    const v = await fetchVersion();
    if (!v) return;
    if (!currentVersion) {
      currentVersion = v;
      return;
    }
    if (v !== currentVersion) {
      // New version detected
      currentVersion = v;
      if (opts?.onUpdate) {
        opts.onUpdate(v);
      } else {
        // Default behavior: prompt user to reload
        const reload = window.confirm("A new version of the app is available. Reload now to update?");
        if (reload) {
          // Force reload from network
          window.location.reload();
        }
      }
    }
  }, intervalMs);
}

export function stopVersionCheck() {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}
