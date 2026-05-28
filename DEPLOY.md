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

## Comprobar

En el log del build debe verse:

```
> nen-client@0.1.0 build
> vite build
```

Y **no** `tsc -b`.
