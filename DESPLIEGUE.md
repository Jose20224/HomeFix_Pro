# Despliegue gratuito de HomeFix Pro

La arquitectura para la demostración académica es: **Vercel Hobby** (frontend React), **Render Free** (API Express) y **Supabase Free** (PostgreSQL y documentos KYC). No requiere tarjeta ni dominio propio.

> Render Free duerme tras 15 minutos sin peticiones, por lo que la primera carga puede tardar alrededor de un minuto. Supabase Free pausa un proyecto tras una semana sin actividad. Son límites aceptables para la defensa; no deben presentarse como una plataforma comercial con alta disponibilidad.

## 1. Crear Supabase

1. Crea una cuenta en [Supabase](https://supabase.com) y un proyecto gratuito.
2. En **Storage**, crea un bucket privado llamado `kyc-documents`.
3. En **Connect**, copia la URI directa de PostgreSQL y reemplaza `[PASSWORD]` por la contraseña de la base. Debe terminar con `?sslmode=require`.
4. En **Project Settings → API**, copia:
   - Project URL (`SUPABASE_URL`)
   - `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`). Esta clave es secreta: solo se configura en Render, jamás en Vercel ni GitHub.

Supabase Free incluye actualmente 500 MB de PostgreSQL y 1 GB de Storage, suficiente para la demostración si se eliminan documentos de prueba que ya no se usan.

## 2. Backend gratuito en Render

1. Sube los cambios a `main` en GitHub.
2. En Render selecciona **New → Blueprint**, conecta el repositorio y confirma `render.yaml`.
3. Completa estas variables secretas:

   ```text
   DATABASE_URL=postgresql://...supabase.co:5432/postgres?sslmode=require
   ADMIN_PASSWORD=una-clave-segura
   DEMO_PASSWORD=
   CORS_ORIGIN=https://ejemplo-temporal.invalid
   SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ```

4. Crea el servicio. El arranque ejecuta `prisma db push`, la semilla y luego inicia la API. La semilla solo crea lo que no existe (categorías, administrador y cuentas demo); nunca cambia la contraseña, el rol ni el estado de una cuenta existente.
   - `ADMIN_PASSWORD` (8 a 72 bytes) solo se usa para crear el administrador por primera vez. Cambiar esta variable después no cambia su contraseña.
   - `DEMO_PASSWORD` es opcional. Si está vacía no se crean cuentas demo; si tiene de 8 a 72 bytes se crean `maria@ejemplo.com` y `juan@tech.com`, cuando no existen.
5. Prueba `https://TU-API.onrender.com/api/health` y `https://TU-API.onrender.com/api-docs`.

## 3. Frontend gratuito en Vercel

1. En Vercel, crea un proyecto desde el mismo repositorio y selecciona `frontend` como **Root Directory**.
2. Agrega para Production y Preview:

   ```text
   VITE_API_URL=https://TU-API.onrender.com/api
   ```

3. Despliega. Copia la URL pública de Vercel.
4. En Render reemplaza `CORS_ORIGIN` por esa URL exacta, sin `/` final, y selecciona **Manual Deploy**.

`frontend/vercel.json` permite que React controle las rutas al recargar y añade cabeceras básicas de protección.

## 4. Evidencia para Fase 3

Captura y anexa:

1. Las URL públicas de Vercel y Render, y Swagger en `/api-docs`.
2. Registro, login, una respuesta 401 y una 403.
3. Carga KYC, aprobación administrativa y descarga autorizada del documento.
4. Solicitud, asignación, cita, notificación y calificación.
5. Supabase Table Editor con datos persistidos y el bucket privado `kyc-documents`.
6. Salida de `npm test` y explicación de las pruebas manuales.

## Límites que deben declararse

- Render Free duerme tras 15 minutos y no ofrece disco persistente; por eso la aplicación no usa SQLite ni archivos locales en producción.
- El uso gratuito de Vercel es para proyectos personales/académicos.
- Para un producto comercial se migraría a un plan con disponibilidad garantizada, migraciones versionadas de PostgreSQL y monitoreo.
