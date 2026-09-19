# CONTEXTO — Sistema Electoral de Personeros

**Guardar en (PC1):** `C:\Users\jeanp\Desktop\CARPETA CONTEXTO ACTUAL\contexto en tiempo real\IA CONTEXTO EN MD`

---

## Estado del proyecto

Backend Node.js 20 + Express, frontend React 18 + Vite, PostgreSQL 16, Redis 7.
Se prepara para desplegar en AWS con capacidad para 850 personeros concurrentes.

- Backend: 42 archivos JS (`src/controllers`, `routes`, `services`, `middlewares`, `validations`)
- Frontend: 35 archivos JSX
- Ya viene containerizado (`docker-compose.yml` con 4 backends + PgBouncer)

---

## Sesión 1 — Arquitectura AWS

Propuesta: **ECS Fargate** con autoescalado 4–8 tareas, RDS PostgreSQL 16
Multi-AZ, ElastiCache Redis Multi-AZ, S3 + CloudFront para las fotos de actas,
ALB, Route 53, CloudWatch.

Presupuesto estimado: **US$ 17.911 el primer año**, US$ 13.783 los siguientes.
Cronograma: 8 semanas.

Documentos: `RESUMEN_EJECUTIVO.md`, `ARQUITECTURA_AWS_850_USUARIOS.md`,
`PRESUPUESTO_AWS_DETALLADO.md`, `IMPLEMENTACION_AWS_PASO_A_PASO.md`,
`INDICE_MAESTRO.md`.

> Nota: los cálculos de precios de esos documentos se hicieron sin consultar la
> calculadora de AWS. Conviene contrastarlos con
> https://calculator.aws antes de presentarlos a finanzas.

---

## Sesión 2 — Pruebas (unitarias, integración y carga)

### Resultado medido

| Métrica | Antes | Después |
|---|---|---|
| Statements | 22,79 % | **99,92 %** |
| Branches | 28,90 % | **95,87 %** |
| Functions | 25,64 % | **100 %** |
| Lines | 23,78 % | **100 %** |
| Tests | 115 | **633** |

### Problemas de fondo encontrados

1. El doble de Knex era un **singleton compartido** → imposible simular
   consultas secuenciales a varias tablas → 7 controladores en 0 %.
   Resuelto con `tests/support/knex-mock.js` (colas por tabla).
2. `validate.middleware.test.js` **reimplementaba el middleware inline** en vez
   de importarlo: 11 tests en verde sobre una copia, 0 % real. Eliminado.
3. El escenario k6 **nunca subía un acta**, solo hacía dos GET. Reemplazado por
   `escenario-jornada-completa.js` con subida multipart real de 860 KB.

### Hallazgos en el código (NO corregidos, decisión pendiente)

1. **`changePassword` tiene bypass.** Si no se envía `currentPassword`, la
   verificación se salta entera. Un token robado permite secuestrar la cuenta.
   → Es lo primero que hay que arreglar.
2. **SSL nunca se autoactiva con `DATABASE_URL`.** `usaSSL()` recibe la cadena
   completa, que siempre contiene "postgres", así que la marca como local.
   → Fijar `DB_SSL=true` en producción AWS.
3. **El número de mesa funciona como contraseña** para personeros. DNI + número
   de mesa (ambos públicos) bastan para entrar.

### Comandos (PC2 = Ubuntu del servidor, desde `backend/`)

```bash
npm test                  # todo + cobertura, falla si baja de umbrales
npm run test:unit         # solo unitarias
npm run test:integration  # integración HTTP (sin base de datos)
npm run test:db           # integración con PostgreSQL real
npm run carga:humo        # k6, 5 VUs, valida el escenario
npm run carga:jornada     # k6, 850 personeros + 100 supervisores + 40 coordinadores
```

---

## Pendiente

- [ ] Corregir el bypass de `changePassword`
- [ ] Fijar `DB_SSL=true` en el entorno de producción
- [ ] Correr `npm run carga:jornada` contra AWS con datos sembrados
- [ ] Meter `npm run test:ci` en el pipeline
- [ ] Empezar pruebas del frontend (0 tests hoy; no hay Vitest configurado)
- [ ] Contrastar el presupuesto AWS con la calculadora oficial
- [ ] Decidir sobre el login con número de mesa
