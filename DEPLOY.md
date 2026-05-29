# Desplegar en Vercel

## Si el build falla con `tsc: command not found`

Eso significa que Vercel está usando **código viejo** o el **repositorio equivocado**.

En el deploy debe aparecer un commit reciente, por ejemplo:
`App funcional en Vercel: API REST, polling y sin WebSockets`

**No** debe decir solo `Initial commit` (`9d6474c`).

## Pasos

1. [vercel.com/new](https://vercel.com/new) → importa **`Batery001/nen`** (no otro repo como `niku`).
2. **Root Directory:** deja vacío (raíz `/`).
3. En **Build & Development Settings**, borra overrides manuales:
   - Install Command → vacío (usa `vercel.json`)
   - Build Command → vacío
   - Output Directory → vacío
4. **Deploy**.

## Error JSON.parse / HTML en lugar de JSON

- **Root Directory** debe ser la raíz del repo (no solo `client`).
- **Borra** `VITE_API_URL` y `VITE_SOCKET_URL` en Vercel si no usas backend externo.
- Prueba en el navegador: `https://tu-app.vercel.app/api/health` (debe devolver JSON).

## Local vs Vercel: ¿por qué se ve distinto?

| Entorno | Dónde viven los datos |
|---------|------------------------|
| **Local sin `MONGODB_URI`** | Memoria del proceso Node (solo en tu PC; muchas cosas “de prueba”) |
| **Local con `MONGODB_URI`** | MongoDB Atlas (misma nube si usas el mismo URI) |
| **Vercel** | Solo MongoDB si `MONGODB_URI` está en Variables de entorno |

Lo que creas en local **sin** MongoDB **no aparece** en Vercel. Configura el mismo `MONGODB_URI` en `.env` local y en Vercel para compartir campañas.

**Variables en Vercel (Settings → Environment Variables):**

- `MONGODB_URI` — obligatorio para persistir campañas
- `MONGODB_DB_NAME` — opcional (`niku`)
- No definas `VITE_API_URL` salvo que uses API externa
- `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN` — solo para audio/IA

Prueba: `https://tu-app.vercel.app/api/health` → JSON con `"mongo": true`.

## Comprobar

En el log del build debe verse:

```
> nen-client@0.1.0 build
> vite build
```

Y **no** `tsc -b`.
