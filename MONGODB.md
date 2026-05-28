# MongoDB Atlas para Niku

## 1. Crear proyecto en Atlas

1. Nombre del proyecto: **niku** (o el que prefieras).
2. Siguiente → añade miembros si quieres → **Create project**.

## 2. Crear cluster (base de datos)

1. **Build a Database** → plan **M0 FREE**.
2. Región cercana a tus usuarios (ej. `AWS / eu-west-1` o la de Vercel).
3. Nombre del cluster: por defecto está bien → **Create**.

## 3. Usuario y acceso de red

1. **Database Access** → **Add New Database User**:
   - Usuario y contraseña (guárdalos).
   - Rol: `Atlas admin` o `readWriteAnyDatabase` en desarrollo.
2. **Network Access** → **Add IP Address**:
   - Para desarrollo: **Allow Access from Anywhere** (`0.0.0.0/0`).
   - En producción puedes restringir después.

## 4. Cadena de conexión

1. **Database** → **Connect** → **Drivers** → Node.js.
2. Copia la URI, ejemplo:
   ```
   mongodb+srv://usuario:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Sustituye `<password>` por tu contraseña real.

## 5. Variables de entorno

### Local

Copia `.env.example` a `.env` en la raíz del repo y pega tu URI:

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=niku
```

Arranca con `npm run dev`.

### Vercel

1. Proyecto → **Settings** → **Environment Variables**.
2. Añade:
   - `MONGODB_URI` = tu cadena completa
   - `MONGODB_DB_NAME` = `niku` (opcional)
3. **Redeploy**.

## 6. Comprobar

Abre `https://tu-app.vercel.app/api/health`

Debe responder:

```json
{ "ok": true, "mongo": "connected" }
```

Si dice `"not_configured"`, falta `MONGODB_URI` en Vercel.

## Colección

Las partidas se guardan en la colección **`sessions`** de la base **`niku`**.
