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

## Despliegue (Vercel + Render)

Vercel solo sirve el **frontend**. El **backend** (API + WebSockets) debe ir en otro host con proceso persistente, por ejemplo [Render](https://render.com) (gratis).

### 1. Backend en Render

1. Entra en [render.com](https://render.com) → **New** → **Blueprint** (o Web Service).
2. Conecta el repo [Batery001/nen](https://github.com/Batery001/nen).
3. Render detectará `render.yaml` y creará el servicio `nen-api`.
4. En variables de entorno, define **`CLIENT_ORIGIN`** con la URL de tu app en Vercel, por ejemplo:
   ```
   https://tu-proyecto.vercel.app
   ```
   (Cuando tengas la URL final de Vercel, actualízala aquí.)
5. Tras el deploy, copia la URL del servicio, ej. `https://nen-api.onrender.com`.

### 2. Frontend en Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importa el repo de GitHub.
2. Configuración del proyecto:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Variables de entorno (Settings → Environment Variables):

   | Variable | Valor |
   |----------|--------|
   | `VITE_API_URL` | `https://nen-api.onrender.com` (tu URL de Render) |
   | `VITE_SOCKET_URL` | La misma URL de Render |

4. **Deploy**. Abre la URL que te da Vercel (ej. `https://nen-xxx.vercel.app`).
5. Vuelve a Render y actualiza **`CLIENT_ORIGIN`** con esa URL exacta de Vercel (sin barra final). Redespliega el backend si hace falta.

### Comprobar

- Abre `https://tu-api.onrender.com/health` → debe responder `{"ok":true}`.
- En la app de Vercel: crear partida y unirse desde otra pestaña o el móvil.

> **Nota:** En el plan free de Render el servidor se “duerme” tras inactividad; la primera petición puede tardar ~30 s.
