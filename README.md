# Sistema Electoral — Personeros

Sistema web para la gestión de personeros electorales, coordinadores de local y
captura de resultados en tiempo real. Los personeros reciben un enlace, lo
abren en el navegador del celular y trabajan desde ahí. Sin instalar nada.

**Versión 2.0** — preparada para 800–1500 usuarios simultáneos.

---

## Empezar

### Desplegar en un servidor (producción)

```bash
bash scripts/instalar-vps.sh     # prepara el servidor (una sola vez)
cp .env.example .env             # y edite las contraseñas
cp backend/.env.example backend/.env
bash scripts/desplegar.sh
```

Guía completa paso a paso: **[docs/GUIA_DESPLIEGUE_CONTABO.md](docs/GUIA_DESPLIEGUE_CONTABO.md)**

### Desarrollo local

```bash
# Base de datos y caché
docker compose up -d postgres redis

# Backend
cd backend
cp .env.example .env
npm install
npm run setup        # migraciones + datos iniciales
npm run dev          # http://localhost:3000

# Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

---

## Arquitectura

```
                 Personeros / Coordinadores / Admin
                      (navegador del celular)
                                │
                                ▼  HTTPS + WSS
                    ┌───────────────────────┐
                    │  Cloudflare (gratis)  │  SSL, anti-DDoS, caché
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Nginx                │  balanceo con ip_hash
                    │  + frontend estático  │  límite de peticiones
                    │  + fotos de actas     │  WebSocket
                    └───────────┬───────────┘
                                │
          ┌──────────┬──────────┼──────────┬──────────┐
          ▼          ▼          ▼          ▼          │
      backend-1  backend-2  backend-3  backend-4      │
       (Node)     (Node)     (Node)     (Node)        │
          └──────────┴─────┬────┴──────────┘          │
                           │                          │
                 ┌─────────▼─────────┐      ┌─────────▼─────────┐
                 │  PgBouncer        │      │  Redis            │
                 │  (multiplexa)     │      │  caché + pub/sub  │
                 └─────────┬─────────┘      └───────────────────┘
                           │
                 ┌─────────▼─────────┐
                 │  PostgreSQL 16    │  + respaldo cada 30 min
                 └───────────────────┘
```

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind, carga diferida por rol |
| Backend | Node.js 20 + Express + Knex, 4 instancias |
| Base de datos | PostgreSQL 16 con PgBouncer |
| Caché y tiempo real | Redis 7 + adapter de Socket.io |
| Balanceador | Nginx con `ip_hash` |
| Fotos de actas | disco local (o Supabase Storage) |

---

## Capacidad

Probado con el escenario de `backend/tests/load/escenario-800-usuarios.js`:

| Métrica | Objetivo |
|---|---|
| Usuarios simultáneos | 800 sostenidos, picos de 1500 |
| Respuesta del dashboard (p95) | < 800 ms |
| Respuesta general (p95) | < 1500 ms |
| Tasa de error | < 2% |
| Servidor | 1 VPS de 6 vCPU / 16 GB (~13 €/mes) |

---

## Roles

**Administrador** — gestiona usuarios, locales, mesas y candidatos; asigna
personeros y coordinadores; ve el tablero en vivo y la auditoría completa.

**Coordinador de local** — supervisa las mesas de sus locales; aprueba u
observa cada acta; recibe avisos en el momento en que un personero envía la suya.

**Personero de mesa** — ve los datos de su mesa, fotografía el acta desde el
navegador, digita los votos y los envía; corrige si el coordinador observa.

---

## Flujo de la jornada

1. El administrador registra todo y comparte el enlace por WhatsApp.
2. El personero entra con su **DNI** y, como contraseña, su **número de mesa**.
3. Tras el escrutinio: foto del acta (se comprime a ~300 KB en el propio
   celular) + digitación de votos → estado **reportada**.
4. El coordinador revisa el acta junto a la foto → **verificada** u
   **observada** con motivo.
5. Si fue observada, el personero corrige y reenvía.
6. El tablero del administrador se actualiza solo, sin refrescar.

---

## Comandos útiles

```bash
bash scripts/verificar.sh                    # diagnóstico completo
bash scripts/respaldar.sh                    # respaldo manual
docker compose ps                            # estado de los servicios
docker compose logs -f backend-1             # registros en vivo
docker compose restart backend-1             # reiniciar una instancia
curl -s localhost/api/health/full            # estado de BD, Redis y WebSocket

docker compose exec backend-1 npm run verificar   # revisar esquema y datos
```

---

## Estructura

```
├── backend/
│   ├── src/
│   │   ├── app.js              arranque, middlewares, apagado ordenado
│   │   ├── config/             base de datos, Redis, JWT, almacenamiento
│   │   ├── controllers/        lógica de cada recurso
│   │   ├── middlewares/        autenticación, roles, subida, validación
│   │   ├── routes/             endpoints de la API
│   │   ├── services/           WebSocket, caché, auditoría, storage
│   │   └── validations/        esquemas Zod
│   ├── migrations/             esquema + índices de rendimiento
│   ├── seeds/                  16 distritos, 97 locales, 787 mesas
│   ├── scripts/                verificación y datos de prueba
│   └── tests/load/             pruebas de carga con k6
├── frontend/src/
│   ├── pages/{admin,coordinador,personero,auth}/
│   ├── contexts/               sesión y conexión en tiempo real
│   └── services/api.js         cliente HTTP con renovación de token
├── nginx/                      balanceador y proxy
├── postgres/                   ajuste de PostgreSQL
├── scripts/                    instalación, despliegue, respaldo, SSL
└── docs/
    ├── GUIA_DESPLIEGUE_CONTABO.md
    └── CAMBIOS_REALIZADOS.md
```

---

## Antes de salir a producción

- [ ] Rotar las credenciales que estaban expuestas en el repositorio anterior
      (ver `docs/CAMBIOS_REALIZADOS.md`, sección 3.1)
- [ ] Generar secretos JWT nuevos con `openssl rand -base64 48`
- [ ] Ajustar `TRUST_PROXY_HOPS` (1 sin Cloudflare, 2 con Cloudflare)
- [ ] Activar HTTPS — sin él los navegadores bloquean la cámara
- [ ] Cambiar la contraseña del administrador tras el primer acceso
- [ ] Ejecutar `bash scripts/verificar.sh` y que salga todo en verde
- [ ] Correr la prueba de carga en un servidor de ensayo
- [ ] Comprobar que hay respaldos en `backups/`
