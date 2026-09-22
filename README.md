# Sistema Electoral — Personeros

Sistema web para la gestión de personeros electorales, coordinadores de local y captura de resultados en tiempo real para **783 mesas de sufragio oficiales** (ONPE 2026). Los personeros reciben un enlace, lo abren en el navegador del celular y trabajan desde ahí sin instalar aplicaciones adicionales.

**Versión 2.0** — Dimensionada y optimizada para **850 usuarios concurrentes simultáneos** en AWS Cloud.

---

## Despliegue

### Opción 1: Producción en AWS Cloud (Oficial)

El sistema está presupuestado y optimizado para desplegarse en **Amazon Web Services (AWS)** bajo demanda para la jornada electoral (77 horas de servicio distribuidas en 4 fases, con un costo total estimado de **\$117.64 USD**):

- Guía oficial paso a paso: **[docs/GUIA_DESPLIEGUE_AWS.md](docs/GUIA_DESPLIEGUE_AWS.md)**
- Documentación técnica y arquitectura de AWS: **[docs/aws/](docs/aws/)**
- Resumen ejecutivo y presupuesto: **[docs/aws/RESUMEN_EJECUTIVO.md](docs/aws/RESUMEN_EJECUTIVO.md)**

### Opción 2: Desarrollo Local

```bash
# Iniciar base de datos y caché en local
docker compose up -d postgres redis

# Backend
cd backend
cp .env.example .env
npm install
npm run setup        # migraciones + padrón oficial 783 mesas
npm run dev          # http://localhost:3000

# Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

### Opción 3: Servidor VPS Dedicado (Alternativa Económica Legacy)

Si se requiere desplegar en un único servidor VPS en lugar de AWS:
- Guía VPS: **[docs/legacy/GUIA_DESPLIEGUE_CONTABO.md](docs/legacy/GUIA_DESPLIEGUE_CONTABO.md)**

---

## Arquitectura de Producción (AWS)

```
                   [ Usuarios / Personeros ]
                              │
                    (HTTPS / Puerto 443)
                              ▼
                   [ Amazon CloudFront (CDN) ]
                   - Distribución global estáticos SPA
                   - SSL/TLS vía ACM (Certificado gratis)
                   - Aceleración de carga y caché perimetral
                              │
                              ▼
            [ Application Load Balancer (ALB) ]
            - Multi-AZ (us-east-1a, us-east-1b)
            - Terminación SSL y Health Checks automáticos
            - Sticky sessions para WebSockets (Socket.io)
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
    [ ECS Fargate Tarea 1..6 ]          [ ECS Fargate Tarea 1..6 ]
    - Node.js 20 (Express)              - Node.js 20 (Express)
    - Socket.io con Redis Adapter       - Socket.io con Redis Adapter
    - Subida streaming de actas         - Subida streaming de actas
            │                                   │
            ├─────────────────┬─────────────────┤
            ▼                 ▼                 ▼
   [ Amazon RDS Proxy ]  [ ElastiCache Redis ]  [ Amazon S3 ]
   - Pool de conexiones  - Redis 7 en memoria   - Bucket de actas
   - Evita saturación    - Caché dashboard (5s) - URLs seguras
            │            - Pub/Sub WebSockets   - Backup permanente
            ▼
   [ RDS PostgreSQL 16 ]
   - Multi-AZ (Alta disp.)
   - Padrón 783 mesas
```

| Capa | Tecnología AWS / Producción | Alternativa Local |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind en S3 + CloudFront | Servidor Vite local |
| **Backend** | ECS Fargate (2 a 6 tareas autoescalables, Node.js 20) | Node.js local / Docker Compose |
| **Balanceador** | Application Load Balancer (ALB) Multi-AZ | Nginx con `ip_hash` |
| **Base de datos** | Amazon RDS PostgreSQL 16 Multi-AZ + RDS Proxy | PostgreSQL 16 local + PgBouncer |
| **Caché y WebSockets** | Amazon ElastiCache Redis 7 | Redis 7 Alpine |
| **Almacenamiento Actas** | Amazon S3 con URLs firmadas y CloudFront | Disco local (`/app/uploads`) |

---

## Suite de Pruebas y Cobertura (Visual Studio Code Ready)

El sistema cuenta con una suite integral de **633 pruebas automatizadas** que cubren el 99.9% del código fuente, organizada en `backend/__tests__/`:

```bash
cd backend

# Ejecutar suite completa con reporte de cobertura
npm test

# Ejecutar únicamente pruebas unitarias por módulo
npm run test:unit

# Ejecutar pruebas de integración HTTP (60 endpoints y flujos)
npm run test:integration

# Pruebas de carga (k6)
npm run carga:humo       # prueba de humo rápida
npm run carga:jornada    # simulación de jornada completa 850 usuarios
```

### Métricas de Cobertura
- **Declaraciones (Statements):** 99.92%
- **Ramas (Branches):** 95.35%
- **Funciones (Functions):** 100%
- **Líneas (Lines):** 100%

Compatible de forma nativa con **Visual Studio Code**: incluye `.vscode/settings.json` para ejecución y visualización de cobertura directamente desde el explorador de pruebas.

---

## Roles del Sistema

- **Administrador:** Gestiona usuarios, locales, mesas y candidatos; asigna personeros y coordinadores; visualiza el tablero de control en vivo, gráficos de resultados por distrito/local y auditoría completa.
- **Coordinador de local:** Supervisa automáticamente todas las mesas de sus locales asignados; valida, aprueba u observa actas con foto adjunta en tiempo real.
- **Personero de mesa:** Accede con su DNI y número de mesa asignado; fotografía el acta electoral desde el celular, digita los votos y transmite la información al centro de cómputo.

---

## Estructura del Repositorio

```
├── backend/
│   ├── src/
│   │   ├── app.js              # Arranque Express, middlewares y graceful shutdown
│   │   ├── config/             # Base de datos, Redis, JWT, almacenamiento
│   │   ├── controllers/        # Controladores (auth, mesas, resultados, dashboard, etc.)
│   │   ├── middlewares/        # Autenticación, roles, subida, validación
│   │   ├── routes/             # Enrutamiento de la API REST
│   │   ├── services/           # WebSocket, caché, auditoría, storage
│   │   └── validations/        # Esquemas Zod de validación
│   ├── __tests__/              # Suite completa de pruebas (633 tests)
│   │   ├── setup/              # Dobles de prueba y mocks de Knex
│   │   ├── unit/               # Pruebas unitarias (controllers, middlewares, services, config)
│   │   ├── integration/        # Pruebas de integración HTTP
│   │   └── load/               # Escenarios de carga k6 (850 usuarios simultáneos)
│   ├── migrations/             # Migraciones PostgreSQL con 21 índices
│   └── seeds/                  # Padrón oficial ONPE 2026 (783 mesas, 93 locales)
├── frontend/src/               # SPA en React 18 + Vite + Tailwind CSS
├── nginx/                      # Configuración de proxy para desarrollo
├── postgres/                   # Configuración PostgreSQL local
├── scripts/                    # Scripts de administración y verificación
├── .vscode/                    # Configuración de Visual Studio Code para Jest
└── docs/
    ├── GUIA_DESPLIEGUE_AWS.md          # Guía oficial de despliegue en AWS
    ├── INFORME_PRUEBAS.md              # Informe de calidad y pruebas de carga
    ├── CONTEXTO_SISTEMA_PERSONEROS.md  # Contexto electoral y reglas de negocio
    ├── CAMBIOS_REALIZADOS.md           # Registro histórico de cambios v2.0
    ├── aws/                            # Documentación de arquitectura AWS
    └── legacy/                         # Documentación de despliegue en VPS
```
