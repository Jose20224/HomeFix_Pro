# HomeFix Pro

[![CI](https://github.com/isaacmartinez-droid/HomeFix_Pro/actions/workflows/ci.yml/badge.svg)](https://github.com/isaacmartinez-droid/HomeFix_Pro/actions/workflows/ci.yml)

Plataforma para solicitar y gestionar servicios técnicos del hogar. Monorepo con `frontend` (React y Vite) y `backend` (Express y Prisma). El despliegue se describe en [DESPLIEGUE.md](DESPLIEGUE.md).

## Integración continua

GitHub Actions se ejecuta en cada push y pull request a `main`, con Node 22:

- **Backend:** `npm ci`, `npx prisma generate` y `npm test`.
- **Frontend:** `npm ci`, `npm run lint` y `npm run build`.

Los resultados se consultan en la pestaña **Actions** del repositorio.
