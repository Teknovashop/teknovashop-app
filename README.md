
# Teknovashop App (Next.js)

Frontend minimal que llama al backend `/generate` desplegado en Render.

## Variables de entorno (Vercel)

Configura al menos una de estas (en **All Environments**):

- `NEXT_PUBLIC_BACKEND_URL` (recomendado) → p.ej. `https://teknovashop-forge.onrender.com`
- `NEXT_PUBLIC_FORGE_API` (opcional, compatibilidad)
- `NEXT_PUBLIC_STL_API` (opcional, compatibilidad)
- `NEXT_PUBLIC_STL_SERVICE_URL` (opcional, compatibilidad)

El botón **Generar STL** hace un `POST` con un payload de ejemplo y muestra el JSON devuelto.

