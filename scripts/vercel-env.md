# Variables para Vercel (copiar manualmente)

No puedo entrar en tu cuenta de Vercel desde aquí. En el dashboard:

**Settings → Environment Variables → Add**

| Key | Value |
|-----|--------|
| `MONGODB_URI` | (pega la URI de Atlas, paso Connect → Drivers) |
| `MONGODB_DB_NAME` | `niku` |

Marca Production, Preview y Development → **Save** → **Redeploy**.

## URI de Atlas

Debe verse así (con tu usuario y contraseña):

```
mongodb+srv://USUARIO:PASSWORD@cluster0.yooqdly.mongodb.net/?retryWrites=true&w=majority
```

## Comprobar

`https://TU-APP.vercel.app/api/health` → `"mongo": "connected"`
