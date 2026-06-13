const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let interval: ReturnType<typeof setInterval> | null = null;

export function startKeepalive() {
  if (!BACKEND_URL) {
    console.warn("keepalive: NEXT_PUBLIC_API_URL is not set, skipping.");
    return;
  }

  const ping = async () => {
    try {
      await fetch(`${BACKEND_URL}/health`);
      console.log("keepalive ok", new Date().toISOString());
    } catch {
      console.log("keepalive failed", new Date().toISOString());
    }
  };

  ping(); // immediate first ping
  interval = setInterval(ping, 10 * 60 * 1000); // every 10 minutes
}

export function stopKeepalive() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
