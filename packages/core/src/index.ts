export * from "./auth";
export * from "./schedule";

export function formatGreeting(target: string) {
  const timestamp = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `Hola ${target}! (${timestamp})`;
}

export function assertEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
