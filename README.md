# Nen

Herramienta para juegadores de rol. Permite **crear partidas** y conectarse con uno de tres roles:

| Rol | Descripción |
|-----|-------------|
| **Master** | Un solo master por partida; quien crea la sala entra como master. |
| **Jugador** | Participa activamente en la aventura. |
| **Observador** | Sigue la partida sin intervenir. |

## Requisitos

- Node.js 20+

## Arrancar en desarrollo

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
npm run dev
```

- Frontend: http://localhost:5173
- API y WebSockets: http://localhost:3001

## Flujo

1. **Crear partida** → se genera un código de 6 caracteres y entras como master.
2. **Unirse** → introduces el código, tu nombre y eliges jugador u observador (master solo si aún no hay uno).
3. **Sala** → ves en tiempo real quién está conectado y con qué rol.

## Estructura

```
nen/
├── client/     # React + Vite
└── server/     # Express + Socket.io
```

Los datos de sesión viven en memoria (se pierden al reiniciar el servidor). Ideal para prototipo; más adelante se puede persistir en base de datos.
