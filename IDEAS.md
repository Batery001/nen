# Ideas para Niku / Nen

## Corto plazo (encajan con lo que ya tienes)

- **Notificaciones al master**: email o webhook Discord cuando alguien pide entrar como jugador.
- **Enlace de invitación**: `/unirse?code=RL75QA` o `/invite/RL75QA` que pre-rellena el código.
- **Subida de audio**: Vercel Blob / S3 en vez de pegar URLs de MP3.
- **Editar entradas wiki** en línea (no solo añadir/eliminar).
- **Co-master**: delegar aprobación de jugadores a otro miembro.
- **Varias campañas en localStorage**: mapa `code → sesión` en vez de una sola.

## Medio plazo (producto asíncrono)

- **Transcripción**: subir audio de sesión → Whisper → resumen editable por el master.
- **Timeline de campaña**: línea temporal de sesiones jugadas + hitos de la wiki.
- **Fichas con plantillas**: D&D 5e, Pathfinder, genérico.
- **Modo “solo lectura compartido”**: enlace público sin login para observadores externos.
- **PWA / offline**: leer resúmenes y wiki sin conexión.

## Largo plazo

- **IA en el hub**: “Resume la última sesión”, “Genera NPC a partir de nota”, coherencia con wiki.
- **Integración Discord bot**: `/niku resumen`, avisos de solicitudes.
- **Export PDF / Markdown** de la campaña completa.
- **Plan Pro en Vercel** si superas límites de funciones serverless o necesitas más almacenamiento.

## Mejoras técnicas

- Unificar `server/src/lib` duplicado o eliminarlo (Express ya importa `api/lib`).
- Tests e2e: crear campaña → salir → reingresar → aprobar jugador.
- Rate limit en `/api/auth/request-code` anti-spam.
