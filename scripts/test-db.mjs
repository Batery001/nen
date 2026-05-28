import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {
  console.error("❌ No hay archivo .env en la raíz del proyecto");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("❌ Falta MONGODB_URI en .env");
  process.exit(1);
}

const { pingDb } = await import("../lib/db/client.js");

try {
  const ok = await pingDb();
  if (ok) {
    console.log("✅ MongoDB conectado correctamente");
    console.log("   Base de datos:", process.env.MONGODB_DB_NAME ?? "niku");
    process.exit(0);
  }
  console.error("❌ No se pudo hacer ping a MongoDB");
  process.exit(1);
} catch (err) {
  console.error("❌ Error:", err.message);
  console.error("\nRevisa en Atlas:");
  console.error("  - Network Access: 0.0.0.0/0");
  console.error("  - Usuario y contraseña en MONGODB_URI");
  process.exit(1);
}
