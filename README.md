# Sistema Electoral — Personeros Huamanga 2026

Sistema **100% web** para la gestión de personeros electorales, coordinadores de local y captura de resultados en tiempo real para las elecciones municipales de la Provincia de Huamanga, Perú.

> **Sin instalación de apps.** Los personeros reciben un link, lo abren en el navegador de su celular y empiezan a trabajar.

## 📊 Escala del Sistema

| Dato | Valor |
|------|-------|
| Electores | 228,241 |
| Distritos | 16 (Provincia de Huamanga) |
| Locales de votación | 96 |
| Mesas de sufragio | 787 (ONPE oficial) |
| Personeros | ~800 |
| Coordinadores | ~96 |
| Usuarios concurrentes (pico 4PM-8PM) | ~800-1,500 |

## 🏗️ Arquitectura de Producción

```
                       [ PERSONEROS / COORDINADORES / ADMIN ]
                           Abren el link en su navegador
                                      │
                                      ▼ HTTPS / WSS
                        ┌─────────────────────────────┐
                        │     CLOUDFLARE (CDN + WAF)   │
                        │  • SSL gratuito              │
                        │  • Anti-DDoS                 │
                        │  • Cache de assets estáticos │
                        └──────────────┬──────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │   VPS 1: NGINX Load Balancer │
                        │   • Sirve Frontend (React)   │
                        │   • Balancea /api/ y /ws     │
                        │   • Algoritmo: least_conn    │
                        └───────┬─────────────┬───────┘
                                │             │
                 ┌──────────────▼──┐   ┌──────▼──────────────┐
                 │ VPS 2: Backend A │   │ VPS 3: Backend B    │
                 │ • Node.js (PM2)  │   │ • Node.js (PM2)     │
                 │ • Redis 7        │   │ • PostgreSQL 16     │
                 └────────┬─────────┘   └─────────┬───────────┘
                          │                       │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   Supabase Storage     │
                          │   (Fotos de actas)     │
                          └───────────────────────┘
```

### Stack Tecnológico

| Capa | Tecnología | Función |
|------|-----------|---------|
| **Frontend** | React 18 + Vite + Tailwind CSS | Interfaz web responsive (funciona en cualquier navegador móvil o desktop) |
| **Backend** | Node.js 20 + Express + Knex.js | API REST + WebSocket Gateway |
| **Base de datos** | PostgreSQL 16 | 11 tablas relacionales con auditoría append-only |
| **Cache** | Redis 7 | Cache del dashboard + Socket.io Adapter (Pub/Sub entre nodos) |
| **Almacenamiento** | Supabase Storage (S3 compatible) | Fotos de actas electorales comprimidas (gratis hasta 1GB) |
| **Load Balancer** | NGINX (least_conn) | Distribuye tráfico entre backends según carga |
| **CDN + Seguridad** | Cloudflare (gratis) | SSL, anti-DDoS, cache de assets estáticos |
| **Tiempo real** | Socket.io + Redis Adapter | Resultados en vivo sin refrescar la página |

## 💸 Presupuesto Mensual (Contabo VPS)

| Servidor | Especificaciones | Servicios | Costo/mes |
|----------|-----------------|-----------|-----------|
| VPS 1 (Gateway) | 4 vCPU, 6 GB RAM, 100 GB NVMe | NGINX + Frontend estático | ~$6.00 USD |
| VPS 2 (Backend A) | 6 vCPU, 16 GB RAM, 200 GB NVMe | Node.js Backend + Redis 7 | ~$11.50 USD |
| VPS 3 (Backend B) | 6 vCPU, 16 GB RAM, 200 GB NVMe | Node.js Backend + PostgreSQL 16 | ~$11.50 USD |
| Storage (fotos) | Supabase Storage / Cloudflare R2 | ~800 fotos de actas (~500 MB) | $0.00 USD |
| Dominio + DNS | Cloudflare | SSL + CDN + Protección DDoS | ~$1.00 USD |
| **TOTAL** | | | **~$30.00 USD/mes** |

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerequisitos

- [Node.js](https://nodejs.org/) v20+
- [Git](https://git-scm.com/)
- PostgreSQL local o cuenta en [Supabase](https://supabase.com/) (gratis)

### 1. Clonar y configurar

```bash
git clone <URL_DE_TU_REPOSITORIO>
cd sistema-electoral
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # Editar con tus credenciales
npm install
npm run migrate              # Crear las 11 tablas
npm run seed                 # Cargar 16 distritos + admin
npm run dev                  # Servidor en http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                  # App en http://localhost:5173
```

### 4. Abrir en el navegador

Ir a `http://localhost:5173` — login con las credenciales por defecto.

## 👤 Credenciales por Defecto

| Rol | DNI | Contraseña |
|-----|-----|------------|
| Administrador | 00000000 | admin123 |

> Los demás usuarios (coordinadores y personeros) se crean desde el panel de administración.

## 📋 Roles del Sistema

### 🔧 Administrador
- Gestión completa: usuarios, locales, mesas, candidatos
- Asignar personeros a mesas y coordinadores a locales
- Dashboard de resultados en tiempo real
- Auditoría del sistema (log inalterable)

### 📋 Coordinador de Local
- Supervisar las mesas de sus locales asignados
- **Aprobar ✅ u observar ⚠️** los resultados de cada personero
- Ver estado en tiempo real de cada mesa

### 📱 Personero de Mesa
- Ver datos de su mesa asignada
- Tomar foto del acta desde el navegador del celular
- Digitar votos por candidato y enviar
- Corregir resultados si el coordinador los observa

## 🔄 Flujo de Trabajo

```
1. Admin registra locales, mesas, personeros y candidatos
2. Admin asigna personeros a mesas y coordinadores a locales
3. Admin comparte el LINK del sistema por WhatsApp a cada personero
4. [Día de elección] Personeros abren el link en su celular
5. Inician sesión con DNI + contraseña
6. Tras el escrutinio, cada personero:
   a. Toma foto del acta electoral (desde el navegador)
   b. La foto se comprime automáticamente (~300KB)
   c. Digita los votos por cada candidato
   d. Envía los resultados → Estado: REPORTADA
7. El coordinador del local:
   a. Revisa resultado + foto del acta en su pantalla
   b. Aprueba → VERIFICADA | Observa (con motivo) → OBSERVADA
8. Si observado, el personero corrige y reenvía
9. El admin ve los resultados verificados en el dashboard en tiempo real
```

## 📁 Estructura del Proyecto

```
sistema-electoral/
├── docker-compose.yml         # Orquestación de producción (2 backends + Redis + PG + NGINX)
├── nginx/
│   └── nginx.conf             # Load balancer con least_conn + WebSocket + SPA routing
├── backend/                   # API REST (Node.js 20 + Express + Knex)
│   ├── src/
│   │   ├── app.js             # Entry point (Express + Socket.io + CORS + Rate limiting)
│   │   ├── config/            # database.js, auth.js (JWT), storage.js (Supabase)
│   │   ├── controllers/       # auth, resultados, mesas, dashboard, usuarios, etc.
│   │   ├── middlewares/       # JWT auth, roles, auditoría, upload (Multer), validación
│   │   ├── routes/            # /api/auth, /api/resultados, /api/mesas, /api/dashboard...
│   │   ├── services/          # storage.service, websocket.service, auditoria.service
│   │   └── validations/       # Esquemas Zod (validación aritmética de votos)
│   ├── migrations/            # 11 migraciones SQL (distritos → auditoria)
│   ├── seeds/                 # 16 distritos de Huamanga + admin + locales/mesas
│   ├── Dockerfile             # Imagen de producción (Node 20 Alpine)
│   └── Procfile               # Para Railway/Heroku (alternativa a VPS)
├── frontend/                  # SPA Web (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── App.jsx            # Router con rutas protegidas por rol
│   │   ├── components/        # UI: Button, Card, Modal, Table, Badge, Spinner...
│   │   │   └── layout/        # AdminLayout, CoordinadorLayout, PersoneroLayout
│   │   ├── contexts/          # AuthContext (JWT), SocketContext (tiempo real)
│   │   ├── pages/
│   │   │   ├── admin/         # Dashboard, Usuarios, Locales, Mesas, Candidatos...
│   │   │   ├── auth/          # LoginPage (DNI + contraseña)
│   │   │   ├── coordinador/   # MisLocales, MesasLocal, ResultadoDetalle
│   │   │   └── personero/     # MiMesa, CargarResultado, EstadoResultado
│   │   ├── services/          # api.js (Axios con interceptores JWT)
│   │   └── utils/             # imageCompressor.js (Canvas API, ~6MB → ~300KB)
│   ├── Dockerfile             # Build multi-stage (Node → NGINX)
│   └── vercel.json            # SPA rewrite para Vercel (alternativa)
└── README.md
```

## 🌐 Despliegue en Producción (Contabo VPS)

### Opción A: Docker Compose (Recomendado)

```bash
# En tu VPS, clonar el repo
git clone <URL> /opt/sistema-electoral
cd /opt/sistema-electoral

# Compilar frontend
cd frontend && npm ci && npm run build && cd ..

# Configurar variables de entorno
cp backend/.env.example backend/.env
nano backend/.env  # Editar credenciales reales

# Levantar todo con Docker Compose
docker compose up -d

# Correr migraciones y seeds (solo la primera vez)
docker compose exec backend-1 npm run migrate
docker compose exec backend-1 npm run seed
```

### Opción B: Despliegue manual en 3 VPS (Escalamiento máximo)

Ver la guía completa en la propuesta de arquitectura.

## 🔒 Seguridad

- JWT con access token (15min) + refresh token (7d)
- Contraseñas bcrypt (12 rounds)
- Rate limiting en autenticación (10 intentos/minuto)
- Auditoría inalterable (append-only con IP, User-Agent, coordenadas)
- CORS configurado por origen
- Helmet (headers de seguridad HTTP)
- Datos personales solo visibles para admin

## 🗄️ Base de Datos (11 Tablas)

| Tabla | Descripción |
|-------|-------------|
| `distritos` | 16 distritos de la Provincia de Huamanga |
| `locales_votacion` | 96 centros de votación |
| `mesas_sufragio` | 787 mesas oficiales ONPE |
| `usuarios` | Admin, coordinadores y personeros |
| `candidatos` | Candidatos y organizaciones políticas |
| `asignacion_coordinadores` | Coordinador ↔ Local (1:N) |
| `asignacion_personeros` | Personero ↔ Mesa (1:1 estricto) |
| `historial_asignaciones` | Trazabilidad de cambios |
| `resultados_mesa` | Actas: votos, foto, estado, observaciones |
| `detalle_resultados` | Votos por candidato (desglose) |
| `auditoria` | Log append-only con IP, acción, datos JSONB |
