# Sistema Electoral — Personeros Huamanga 2026

Sistema web para la gestión de personeros electorales, coordinadores de local y captura de resultados en tiempo real para las elecciones municipales de la Provincia de Huamanga, Perú.

## 📊 Escala del Sistema

- **Electores**: ~228,450
- **Mesas de sufragio**: 800
- **Personeros**: ~800
- **Usuarios concurrentes estimados**: ~400
- **Distritos**: 16 (Provincia de Huamanga)

## 🏗️ Arquitectura

- **Backend**: Node.js + Express + Knex.js → desplegado en **Railway**
- **Frontend**: React + Vite + Tailwind CSS → desplegado en **Vercel**
- **Base de datos**: PostgreSQL → **Supabase** (gratis)
- **Almacenamiento**: Fotos de actas → **Supabase Storage** (gratis)
- **Tiempo Real**: Socket.io

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerequisitos

- [Node.js](https://nodejs.org/) v18+
- PostgreSQL local o cuenta en [Supabase](https://supabase.com/) (gratis)

### 1. Configurar Base de Datos

**Opción A: Supabase (recomendado)**
1. Crear cuenta en [supabase.com](https://supabase.com/)
2. Crear un nuevo proyecto
3. Copiar la connection string de Settings > Database

**Opción B: PostgreSQL local**
```bash
createdb sistema_electoral
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # Editar con tus credenciales
npm install
npm run migrate              # Crear tablas
npm run seed                 # Cargar distritos + admin
npm run dev                  # Servidor en http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                  # App en http://localhost:5173
```

## 👤 Credenciales por Defecto

| Rol | DNI | Contraseña |
|-----|-----|------------|
| Administrador | 00000000 | admin123 |

> Los demás usuarios se crean desde el panel de administración.

## 🌐 Despliegue en Producción

### 1. Base de datos (Supabase)
- Crear proyecto en [supabase.com](https://supabase.com/)
- Copiar DATABASE_URL, SUPABASE_URL y SUPABASE_SERVICE_KEY
- En Supabase Storage: crear bucket `actas-electorales`

### 2. Backend (Railway)
- Conectar repositorio Git en [railway.app](https://railway.app/)
- Root directory: `backend`
- Configurar variables de entorno (ver `.env.example`)
- Railway detecta Node.js automáticamente y usa el `Procfile`

### 3. Frontend (Vercel)
- Conectar repositorio Git en [vercel.com](https://vercel.com/)
- Root directory: `frontend`
- Framework preset: Vite
- Variables de entorno:
  - `VITE_API_URL`: URL del backend Railway (ej: `https://tu-backend.railway.app/api`)
  - `VITE_WS_URL`: URL del backend Railway (ej: `https://tu-backend.railway.app`)

## 📋 Roles del Sistema

### Administrador
- Gestión completa: usuarios, locales, mesas, candidatos
- Asignar personeros a mesas y coordinadores a locales
- Dashboard de resultados en tiempo real (exclusivo)
- Auditoría del sistema

### Coordinador de Local
- Supervisar las mesas de sus locales asignados
- **Aprobar ✅ u observar ⚠️** los resultados de cada personero
- Ver estado en tiempo real de cada mesa

### Personero
- Ver datos de su mesa asignada
- Subir foto del acta de escrutinio + votos digitados
- Corregir resultados si el coordinador los observa

## 🔄 Flujo de Trabajo

```
1. Admin registra locales, mesas, personeros y candidatos
2. Admin asigna personeros a mesas y coordinadores a locales
3. [Día de elección] Personeros inician sesión y confirman su mesa
4. Tras el escrutinio, cada personero:
   a. Toma foto del acta electoral
   b. Digita los votos por cada candidato
   c. Envía los resultados → Estado: REPORTADA
5. El coordinador del local:
   a. Revisa resultado + foto del acta
   b. Aprueba → VERIFICADA | Observa (con motivo) → OBSERVADA
6. Si observado, el personero corrige y reenvía
7. El admin ve los resultados verificados en el dashboard en tiempo real
```

## 📁 Estructura del Proyecto

```
sistema-electoral/
├── backend/              # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/       # Configuración (DB, JWT, Supabase)
│   │   ├── controllers/  # Lógica de negocio
│   │   ├── middlewares/  # Auth, auditoría, validación, upload
│   │   ├── routes/       # Endpoints REST
│   │   ├── services/     # Servicios (Storage, WebSocket, auditoría)
│   │   ├── validations/  # Esquemas Zod
│   │   └── app.js        # Entry point
│   ├── migrations/       # Migraciones Knex
│   ├── seeds/            # Datos semilla
│   └── Procfile          # Railway
├── frontend/             # SPA (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/   # UI reutilizables + layouts
│   │   ├── contexts/     # Auth + Socket
│   │   ├── pages/        # Vistas por rol
│   │   └── services/     # API calls
│   └── vercel.json       # Vercel config
└── README.md
```

## 🔒 Seguridad

- JWT con access token (15min) + refresh token (7d)
- Contraseñas bcrypt (12 rounds)
- Rate limiting en autenticación
- Auditoría inalterable (append-only)
- CORS configurado por origen
- Datos personales solo visibles para admin
