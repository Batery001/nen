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

## Comprobar

En el log del build debe verse:

```
> nen-client@0.1.0 build
> vite build
```

Y **no** `tsc -b`.
