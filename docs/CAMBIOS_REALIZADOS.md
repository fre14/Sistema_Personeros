# Cambios realizados

Versión 2.0 — 16 de septiembre de 2026

Dos bloques: **errores que impedían que el sistema funcionara** y
**cuellos de botella que lo habrían tumbado con 800 usuarios**.

---

## Parte 1 — Errores que rompían el funcionamiento

### 1.1 El backend consultaba tablas que no existen

**Lo que pasaba**: las migraciones crean `mesas_sufragio` y
`locales_votacion`, pero seis controladores consultaban `mesas` y `locales`.
El sistema solo funcionaba si alguien ejecutaba a mano `node create_views.js`,
un script suelto que creaba vistas con esos nombres. En un servidor nuevo, sin
ese paso, cualquier pantalla de mesas, locales, resultados o dashboard
devolvía error 500.

**Corregido**: las 48 consultas ahora apuntan a las tablas reales, con alias
para no romper el resto del código. El script `create_views.js` ya no hace
falta.

### 1.2 Los votos por candidato se guardaban mal — el más grave

En `resultados.controller.js`:

```javascript
const detalleInserts = parsedVotos.map(v => ({
  resultado_id: resultId,
  candidato_id: v.candidato_id,
  votos: Number(votos)        // ← el array completo, no v.votos
}));
```

`Number(array)` devuelve `NaN`. **Cada acta enviada guardaba los votos de
todos los candidatos como nulos o cero.** El acta parecía enviarse bien, el
coordinador la verificaba, pero el conteo real se perdía.

**Corregido**: `votos: v.votos`, con validación de que sea un número no
negativo y de que el candidato exista.

### 1.3 Respuestas duplicadas dentro de transacciones

Varias validaciones hacían `res.status(403).json(...)` dentro de
`db.transaction()` sin cortar el flujo. La transacción seguía ejecutándose y
después se intentaba responder otra vez, provocando
`Cannot set headers after they are sent` y, peor, dejando datos escritos a
medias.

**Corregido**: las validaciones lanzan un error que revierte la transacción y
produce una sola respuesta.

### 1.4 El dashboard devolvía listas vacías

`getResultadosPorDistrito` y `getResultadosPorLocal` tenían el cuerpo
reemplazado por `res.json({ data: [] })` con el comentario
*"Simplification due to complexity"*. El panel de avance por distrito —
justamente lo que mira un director de campaña — nunca mostró nada.

**Corregido**: ambos están implementados, con avance por distrito y por local,
porcentajes y conteo de mesas por estado.

### 1.5 Ordenamientos por columnas inexistentes

Se ordenaba `resultados_mesa` por `created_at` (la columna es `subido_en`) y
la auditoría por `created_at` (es `fecha`). Ambas consultas fallaban.

### 1.6 Subir un acta era imposible sin Supabase

`storage.service.js` lanzaba un error si faltaban las credenciales de
Supabase. En un despliegue propio sin esa cuenta, ningún personero podía
enviar su acta.

**Corregido**: se añadió almacenamiento local en disco (`STORAGE_DRIVER=local`,
el valor por defecto). Nginx sirve las fotos desde un volumen compartido.
Supabase sigue disponible como opción.

### 1.7 Los coordinadores no recibían avisos

El servidor solo suscribía al coordinador a un local si el cliente enviaba
`join_local`, cosa que el frontend nunca hacía. Además, el nombre de la sala
al emitir (`coordinador:${localId}`) no coincidía con el de suscripción.

**Corregido**: al conectarse, el coordinador se suscribe automáticamente a
todos sus locales, y los nombres de sala coinciden.

### 1.8 Otros arreglos

- La foto se subía al storage **antes** de validar los votos: si la validación
  fallaba, quedaba una imagen huérfana. Ahora se valida primero.
- `mesa.numero` (inexistente) al nombrar el archivo → `mesa.numero_mesa`.
- `personero_id` nunca se guardaba en `resultados_mesa`, así que no se sabía
  quién envió cada acta.
- `confirmarMesa` era un marcador de posición que no hacía nada; ahora
  registra la presencia con coordenadas en auditoría y avisa al coordinador.
- Un personero podía consultar el detalle del acta de cualquier mesa
  conociendo el id. Ahora se valida la pertenencia.

---

## Parte 2 — Cuellos de botella de escalabilidad

### 2.1 Socket.io sin sincronización entre instancias

Con dos o más backends, cada uno mantenía su propia lista de conexiones. Un
aviso emitido por el backend-1 no llegaba a quienes estaban conectados al
backend-2. Con cuatro instancias, **tres de cada cuatro usuarios no habrían
recibido ninguna notificación**.

**Corregido**: adapter de Redis (pub/sub). Si Redis cae, el sistema sigue
funcionando en modo degradado en vez de fallar.

### 2.2 Sin índices

Ningún índice fuera de las claves primarias. Cada consulta del dashboard
recorría las tablas completas.

**Corregido**: 21 índices, incluidos parciales sobre las filas que realmente
se consultan (`WHERE activo = true`, `WHERE estado = 'verificado'`), más
autovacuum agresivo en las dos tablas que más cambian durante la jornada.

### 2.3 Pool de conexiones insuficiente

`min: 2, max: 20` para todo el sistema. Con 800 usuarios, las peticiones se
encolan hasta agotar el tiempo de espera.

**Corregido**: configurable por variable de entorno (por defecto 5–40 por
instancia), con aviso automático en los registros cuando se satura, y
**PgBouncer** delante de PostgreSQL en modo *transaction pooling*: los 160
sockets de los cuatro backends se multiplexan en unas 25 conexiones reales.

### 2.4 Nginx repartía sin fijar sesión

Con `least_conn`, el handshake de Socket.io (que son varias peticiones
seguidas) podía repartirse entre backends distintos, y la conexión nunca se
establecía.

**Corregido**: `ip_hash`, más:
- límite de peticiones diferenciado (login 1/s, envío de actas 2/s, resto 20/s)
- detección de la IP real detrás de Cloudflare
- reintento automático en otro backend si uno falla
- caché de un año para archivos con hash, sin caché para `index.html`
- registro solo de errores, para no competir por disco con la base de datos

### 2.5 Sin caché

Cada refresco del panel lanzaba seis agregaciones. Con ~100 pantallas abiertas
son cientos de consultas por minuto sobre los mismos datos.

**Corregido**: caché en Redis de 5 segundos con invalidación automática cuando
cambia el estado de un acta. Para el usuario sigue siendo tiempo real; para la
base de datos es una sola consulta.

### 2.6 Sin apagado ordenado

Al reiniciar, las peticiones en curso se cortaban en seco: un personero podía
perder el acta que estaba subiendo.

**Corregido**: cierre ordenado con `dumb-init`, espera a que terminen las
peticiones en vuelo y cierre limpio de conexiones.

### 2.7 Sin límite de conexiones por usuario

Un personero con cinco pestañas abiertas eran cinco WebSockets. 800 × 5 = 4000
conexiones innecesarias.

**Corregido**: máximo 3 por usuario (configurable).

### 2.8 Sesión que expiraba a los 15 minutos

El token duraba 15 minutos y no se renovaba solo: el usuario era expulsado al
login en mitad del trabajo.

**Corregido**: renovación automática y transparente; la petición interrumpida
se reintenta sola. La duración por defecto subió a 8 horas, que cubre la
jornada completa.

### 2.9 Paquete del frontend único

El celular de un personero descargaba también el panel de administración, la
auditoría y las gráficas.

**Corregido**: carga diferida por rol y separación de librerías pesadas.

---

## Parte 3 — Seguridad

### 3.1 Credenciales expuestas en el repositorio — urgente

El archivo `backend/.env.example` del repositorio público contenía valores
reales:

- URL y contraseña de la base de datos Supabase
- `SUPABASE_SERVICE_KEY` completa (da acceso total al almacenamiento, saltándose
  cualquier permiso)
- Los dos secretos JWT (con ellos se puede fabricar un token de administrador)

**Acción requerida de su parte, cuanto antes:**

1. En Supabase: Settings → API → rotar la `service_role key`.
2. Cambiar la contraseña de la base de datos.
3. Generar secretos JWT nuevos: `openssl rand -base64 48`.
4. Como el historial de Git conserva los valores antiguos, borrar el
   repositorio y crear uno nuevo, o reescribir el historial con
   `git filter-repo`.

En esta versión el `.env.example` ya no contiene ningún valor real.

### 3.2 Otros cambios de seguridad

- PostgreSQL y Redis ya no publican puertos al exterior; solo son accesibles
  desde la red interna de Docker.
- Los contenedores corren como usuario sin privilegios.
- Límites de CPU y memoria por contenedor: un pico en un backend no asfixia a
  la base de datos.
- Contraseñas obligatorias: `docker compose` se niega a arrancar si faltan.
- Cortafuegos configurado: solo 22, 80 y 443.

---

## Parte 4 — Operación

Añadido:

- `scripts/instalar-vps.sh` — prepara un servidor Contabo desde cero
- `scripts/desplegar.sh` — despliegue completo, con comprobaciones previas
- `scripts/verificar.sh` — diagnóstico del sistema en marcha
- `scripts/respaldar.sh` — respaldo manual
- `scripts/activar-ssl.sh` — certificado HTTPS gratuito
- `backend/scripts/verificar-sistema.js` — comprueba esquema, índices y datos
- `backend/scripts/generar-datos-prueba.js` — crea 800 personeros de prueba
- `backend/tests/load/escenario-800-usuarios.js` — prueba de carga realista
- Respaldo automático de la base cada 30 minutos, con rotación a 48 horas
- `/api/health/full` — estado real de base de datos, Redis, WebSocket y pool

---

## Resumen

| | Antes | Ahora |
|---|---|---|
| Dashboard | error 500 sin un script manual | funciona |
| Votos por candidato | se guardaban como NaN | correctos |
| Avance por distrito | lista vacía | implementado |
| Subir acta sin Supabase | imposible | funciona en disco local |
| Avisos al coordinador | no llegaban | llegan |
| WebSocket multi-instancia | roto | sincronizado con Redis |
| Índices | 0 | 21 |
| Pool de conexiones | 20 en total | 40 por instancia + PgBouncer |
| Caché del dashboard | ninguna | Redis, 5 s |
| Sesión | expiraba a los 15 min | renovación automática, 8 h |
| Respaldos | ninguno | automáticos cada 30 min |
| Backends | 2 | 4 |

---

## Qué falta por decidir

Cosas que no se incluyeron porque dependen de su criterio:

1. **Modo sin conexión**: si hay locales sin señal, convendría que el personero
   pueda llenar el acta y que se envíe al recuperar cobertura. Requiere un
   service worker y unas 8 horas de trabajo.

2. **Doble verificación de actas**: hoy un solo coordinador aprueba. En
   procesos con impugnaciones se suele pedir dos aprobaciones independientes.

3. **Exportación a Excel/PDF** de resultados consolidados para actas oficiales.

4. **Alertas por WhatsApp o SMS** cuando una mesa lleva demasiado tiempo sin
   reportar.
