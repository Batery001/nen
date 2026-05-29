/**
 * Bot mínimo de Discord (opcional).
 * Requiere: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID en .env
 * Uso: node integrations/discord-bot.mjs
 *
 * Comandos: /niku codigo — muestra enlace de invitación
 * Para producción usa DISCORD_WEBHOOK_URL (más simple, ya integrado en join requests).
 */

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;
const origin = process.env.PUBLIC_APP_URL ?? "https://tu-app.vercel.app";

if (!token || !appId) {
  console.error("Configura DISCORD_BOT_TOKEN y DISCORD_APPLICATION_ID");
  process.exit(1);
}

async function registerCommands() {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${appId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          name: "niku",
          description: "Enlace para unirse a una campaña",
          options: [
            {
              name: "codigo",
              description: "Código de la mesa (ej. RL75QA)",
              type: 3,
              required: true,
            },
          ],
        },
      ]),
    }
  );
  if (!res.ok) console.error(await res.text());
  else console.log("Comandos registrados");
}

async function pollInteractions() {
  console.log("Bot Niku — webhook recomendado para avisos al master.");
  console.log(`Invitación ejemplo: ${origin}/unirse?code=RL75QA`);
  await registerCommands();
}

pollInteractions();
