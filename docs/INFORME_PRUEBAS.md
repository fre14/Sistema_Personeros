# INFORME DE PRUEBAS — Sistema Electoral de Personeros

**Alcance:** evaluación y reconstrucción de las pruebas unitarias, de integración y de carga del backend.
**Objetivo pedido:** superar el 90 % de cobertura de código.
**Fecha:** septiembre de 2026.

---

## 1. Resultado en una línea

| Métrica | Antes | Después | Objetivo |
|---|---|---|---|
| Statements | 22,79 % | **99,92 %** | 90 % |
| Branches | 28,90 % | **95,87 %** | 90 % |
| Functions | 25,64 % | **100 %** | 90 % |
| Lines | 23,78 % | **100 %** | 90 % |
| Tests | 115 | **633** | — |
| Suites | 6 | **15** | — |
| Tiempo de ejecución | 7,9 s | 8,8 s | — |

Los cuatro ejes se midieron ejecutando la suite, no estimando. El comando que
lo reproduce es `npm test`, y ahora falla si la cobertura baja de los umbrales.

---

## 2. Qué encontré en las pruebas existentes

El `jest.config.js` ya declaraba un umbral del 90 % en los cuatro ejes, y la
suite lo incumplía por un factor de cuatro. Los 115 tests pasaban en verde, así
que el problema no era falta de tests: era que los tests que había no tocaban el
código que importa.

### 2.1 Siete controladores en 0 %

Estaban sin una sola línea cubierta:

| Archivo | Líneas | Qué hace |
|---|---|---|
| `resultados.controller.js` | 549 | **Decide si un acta entra al conteo** |
| `asignaciones.controller.js` | 285 | Quién puede reportar por cada mesa |
| `mesas.controller.js` | 137 | CRUD de mesas de sufragio |
| `usuarios.controller.js` | 101 | Alta de personeros y coordinadores |
| `candidatos.controller.js` | 90 | Catálogo de listas |
| `locales.controller.js` | 86 | CRUD de locales |
| `distritos.controller.js` | 72 | CRUD de distritos |

Los 10 archivos de `src/routes/` también estaban en 0 %, junto con
`cache.service.js`, `errorHandler.js`, `upload.middleware.js`,
`audit.middleware.js` y `config/storage.js`.

### 2.2 Causa raíz: el doble de Knex era un singleton

El mock devolvía **siempre el mismo objeto encadenable** para cualquier
`db('tabla')`. Con eso es imposible simular un controlador que consulta varias
tablas en secuencia. `subirResultado`, por ejemplo, consulta
`asignacion_personeros`, luego `mesas_sufragio`, luego `candidatos`, luego
`resultados_mesa`, y solo entonces abre la transacción. Con un mock singleton no
se puede expresar "la primera consulta devuelve esto y la segunda aquello".

Por eso los controladores grandes quedaron sin tocar: no por desidia, sino
porque la herramienta no daba para más.

**Solución:** `tests/support/knex-mock.js`, un doble con **colas de respuesta
por tabla**. Se encola lo que devuelve cada consulta, en orden, y el builder es
*thenable* en cualquier punto de la cadena. Además invoca los *callbacks* de
`join`, `where` y `whereIn`, que es donde viven los filtros de permisos — sin
eso, ese código aparece como funciones no ejecutadas.

```js
const { db, queue, calls } = createDbMock();
queue('asignacion_personeros', { id: 77 });
queue('mesas_sufragio', { id: 9, estado: 'pendiente' });
await subirResultado(req, res);
expect(calls('detalle_resultados').inserts[0]).toEqual([...]);
```

### 2.3 Un test que probaba una copia, no el código

`tests/unit/validate.middleware.test.js` **reimplementaba el middleware dentro
del propio archivo de test** en vez de importarlo:

```js
// Lo que había en el archivo de test:
const validate = (schema) => (req, res, next) => { ... };   // copia
```

Once tests en verde sobre una copia, y 0 % de cobertura real sobre
`src/middlewares/validate.middleware.js`. Peor: la copia omitía dos
comportamientos del módulo real.

1. El real hace `req.body = parsed`, de modo que los valores por defecto de Zod
   quedan disponibles para el controlador. La copia no.
2. El real tiene una rama para esquemas compuestos `body`/`query`/`params` que
   nunca se ejecutó.

Ese archivo lo eliminé y lo reemplacé por tests que importan el módulo real
(`tests/unit/middlewares.test.js`).

### 2.4 Cobertura a medias en los servicios

`storage.service.js` solo tenía probada la rama de Supabase. El driver **por
defecto es `local`** y no tenía ni un test. `auditoria.service.js` solo probaba
la firma con objeto; la firma **posicional** es la que usan cinco controladores.

---

## 3. Qué construí

### 3.1 Pruebas unitarias

| Archivo | Tests | Cobertura del módulo |
|---|---|---|
| `tests/support/knex-mock.js` | — | *(harness)* |
| `unit/resultados.controller.test.js` | 80 | 100 % líneas, 96,18 % ramas |
| `unit/crud.controllers.test.js` | 83 | 100 % líneas (5 controladores) |
| `unit/asignaciones.controller.test.js` | 42 | 100 % líneas, 94,11 % ramas |
| `unit/dashboard.controller.test.js` | 49 | 100 % líneas, 96,63 % ramas |
| `unit/coordinador.controller.full.test.js` | 25 | **100 % en los cuatro ejes** |
| `unit/middlewares.test.js` | 49 | **100 % en los 5 middlewares** |
| `unit/services.extra.test.js` | 58 | cache 100 %, storage 100 % |
| `unit/websocket.service.test.js` | 35 | 100 % líneas |
| `unit/config.test.js` | 46 | redis, database y storage al 100 % |

Criterios que guiaron la escritura, no solo perseguir el porcentaje:

- **Aritmética del acta.** División por cero, redondeo a dos decimales, estados
  ausentes, totales que superan los electores hábiles, votos negativos, `NaN`.
  Un error aquí es una cifra pública incorrecta.
- **Regresión de defectos ya corregidos.** El controlador documenta cinco bugs
  históricos (votos guardados como `NaN`, doble respuesta HTTP, orden por una
  columna inexistente). Hay un test por cada uno para que no vuelvan.
- **Inmutabilidad del acta transmitida.** Que un acta ya verificada no se pueda
  reemplazar, y que una observada sí.
- **No dejar fotos huérfanas.** Se verifica que `uploadActaImage` no se llama si
  la validación previa falla.

### 3.2 Pruebas de integración

`tests/integration/api.http.test.js` — **60 tests** sobre la app Express real
con supertest.

A diferencia de las suites de integración que ya existían, esta **no necesita
PostgreSQL levantado**: simula solo la capa de persistencia y ejerce todo lo
demás de verdad — helmet, CORS, rate limiting, parseo del cuerpo, y la cadena
`authenticateToken → requireRole → validate → controlador → errorHandler`.

Eso es lo que llevó los 10 archivos de `routes/` de 0 % a 100 %, pero el valor
real está en otra parte: **las cadenas de autorización no son comprobables con
un test unitario del controlador, porque el guardia vive en la ruta.** Que un
personero no pueda verificar su propia acta solo se puede probar aquí.

Casos cubiertos, entre otros:

- Token firmado con otro secreto → 403.
- Token expirado → 403.
- Token con el rol manipulado en el *payload* pero mal firmado → 403.
- Personero intentando listar usuarios, crear mesas, asignar personeros o
  verificar su propia acta → 403 en los cuatro.
- Coordinador intentando subir un acta → 403.
- Admin intentando usar `/mi-mesa` → 403 (es exclusivo de personeros).
- Subida real multipart de un acta con foto → 201 y total correcto.
- Subida de un `.exe` disfrazado de acta → rechazado, y sin insertar nada.
- Rate limiting: el intento 16 de login desde la misma IP → 429.
- `/api/health/full` → 503 cuando la base no responde.

Las dos suites de integración originales (`api.integration.test.js` y
`coordinador.integration.test.js`) **las dejé intactas**: exigen una base real y
siguen siendo útiles como prueba de humo antes de un despliegue. Ahora se corren
aparte con `npm run test:db` y están excluidas de la ejecución por defecto, para
que `npm test` funcione en cualquier máquina sin infraestructura.

### 3.3 Pruebas de carga

El escenario que había (`escenario-800-usuarios.js`) tenía un vacío importante:
**cada personero solo hacía dos GET a `/mi-mesa`**. Nunca subía un acta. Eso mide
el camino barato y deja fuera el evento que satura el sistema.

Con 850 personeros, el momento crítico concentra a la vez:

- subida *multipart* de ~800 KB por persona,
- una transacción de escritura con dos `INSERT` y un `UPDATE` por acta,
- invalidación de caché,
- *fan-out* de WebSocket a coordinadores y admin.

Escribí `tests/load/escenario-jornada-completa.js` con cuatro flujos
concurrentes y cuatro perfiles (`humo`, `rampa`, `jornada`, `estres`):

| Flujo | VUs en perfil `jornada` | Qué hace |
|---|---|---|
| Personero | rampa hasta 850 | Confirma presencia → consulta mesa → **sube acta real con foto** → revisa si fue aprobada |
| Coordinador | 40 | Lista sus locales → revisa mesas → verifica u observa actas (1 de cada 8 la observa) |
| Supervisor | 100 | Refresca el tablero sin parar; cada 5 rondas pide mesas pendientes (la consulta que no pasa por caché) |
| WebSocket | 200 | Mantiene sockets abiertos y ociosos, respondiendo el *ping* |

Incluye `tests/load/acta-muestra.jpg` (860 KB), un acta sintética con ruido para
que el JPEG pese lo que pesaría una foto real — una imagen plana comprimiría a
casi nada y falsearía la medición. Se lee una sola vez en el contexto de *init*
y se comparte entre VUs.

**Decisión de diseño que cambia la lectura del resultado:** un `400` porque la
mesa ya reportó **no es un fallo de capacidad**, es la regla de negocio
funcionando. El escenario los cuenta aparte (`actas_rechazadas_por_negocio`) y
solo suma a la tasa de error los `5xx`, los `429` y los *timeouts*. El escenario
anterior los habría contado como fallos y habría dado una tasa de error inflada.

Umbrales de aprobación, que hacen que k6 termine con código distinto de cero:

```
errores_subida_acta       < 1 %       (si falla, se pierde el voto de una mesa)
tiempo_subida_acta_ms     p95 < 5 s, p99 < 10 s
tiempo_dashboard_ms       p95 < 800 ms
tiempo_mi_mesa_ms         p95 < 1 s
tiempo_login_ms           p95 < 1,5 s
http_req_failed           < 2 %
errores_websocket         < 5 %
```

Comandos (**PC2**, el Ubuntu del servidor):

```bash
npm run carga:humo       # 5 VUs, 1 min — valida que el escenario corre
npm run carga:rampa      # hasta 400 VUs — ensayo intermedio
npm run carga:jornada    # 850 + 100 + 40 + 200 — el escenario real
npm run carga:estres     # busca el punto de quiebre, no es criterio de aprobación
```

---

## 4. Hallazgos en el código

Esto salió de leer el código para escribir los tests. Ninguno lo corregí: son
decisiones tuyas, no defectos de las pruebas. Escribí tests que fijan el
comportamiento actual, así que si los cambias verás exactamente qué se rompe.

### 4.1 `changePassword` permite cambiar la contraseña sin saber la actual

En `auth.controller.js`:

```js
if (user.password_hash && currentPassword) {
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(400).json({ ... });
}
const password_hash = await bcrypt.hash(newPassword, 12);
```

Si quien llama **no envía** `currentPassword`, la condición es falsa y la
comprobación se salta entera. La contraseña se cambia igual.

Consecuencia: un token de acceso robado alcanza para secuestrar la cuenta de
forma permanente, sin conocer la contraseña. El token dura 15 minutos; el
secuestro, para siempre.

Corrección: exigir `currentPassword` siempre que el usuario ya tenga
`password_hash`, y devolver 400 si falta.

### 4.2 La autodetección de SSL nunca se activa con `DATABASE_URL`

En `config/database.js`:

```js
const local = valor.includes('localhost') || valor.includes('127.0.0.1') ||
              valor.includes('postgres') || valor.includes('pgbouncer');
```

Cuando se usa `DATABASE_URL`, esta función recibe **la cadena de conexión
completa**. Y toda cadena de PostgreSQL empieza por `postgres://`, así que
`valor.includes('postgres')` siempre coincide y la clasifica como local.

Consecuencia: si se despliega con `DATABASE_URL` apuntando a una base gestionada
(RDS, Supabase, Neon) y no se define `DB_SSL=true` de forma explícita, **el
tráfico con la base viaja sin cifrar**. Relevante justo para el despliegue en AWS
que estás preparando.

Mitigación inmediata: fijar `DB_SSL=true` en el entorno de producción. Está
documentado en `tests/unit/config.test.js` con dos tests marcados `[defecto]` y
`[mitigación]`.

### 4.3 El número de mesa funciona como contraseña

En `auth.controller.js`, un personero puede autenticarse con su `numero_mesa` si
la contraseña normal falla. Entiendo por qué está: simplifica el acceso de
personeros que no recuerdan una clave el día de la elección.

El coste es que los números de mesa son información pública del padrón, y los DNI
tampoco son secretos. La pareja (DNI, número de mesa) es suficiente para entrar y
enviar un acta en nombre de otro.

Si se mantiene, conviene al menos: limitar esa vía a la ventana horaria de la
jornada, exigir que la mesa esté en estado `pendiente`, y registrar en auditoría
qué método de autenticación se usó.

### 4.4 Observaciones menores

- `req.user?.id || null` en `asignaciones.controller.js` anticipa peticiones sin
  usuario, pero dos líneas más abajo se usa `req.user.id` sin protección. Las
  rutas exigen token, así que en la práctica no ocurre; queda documentado por si
  algún día se expone un endpoint interno.
- En `mesas.controller.js`, `res.json()` se llama **dentro** de
  `db.transaction()`. Hoy funciona, pero es exactamente el patrón que
  `resultados.controller.js` documenta como bug corregido ("Cannot set headers
  after they are sent"). Vale la pena unificarlo.
- Con 850 personeros detrás del NAT de un mismo local de votación,
  `RATE_LIMIT_WRITE=30` por minuto y por IP se agota. Si en la prueba de carga
  aparecen `429`, ese es el motivo, no falta de capacidad.

---

## 5. Cómo se ejecuta

Todos los comandos se corren en **PC2** (el Ubuntu del servidor), desde
`backend/`. En **PC1** funcionan igual si tienes Node 20 instalado.

```bash
npm install

npm test                 # Todo + cobertura. Falla si baja de los umbrales.
npm run test:unit        # Solo unitarias (rápido, para iterar)
npm run test:integration # Solo integración HTTP (no necesita base de datos)
npm run test:db          # Integración contra PostgreSQL real (requiere base levantada)
npm run test:ci          # Para el pipeline: --ci --runInBand
```

El informe HTML de cobertura queda en `coverage/lcov-report/index.html`.

### Umbrales configurados en `jest.config.js`

Globales: `statements 95 %`, `lines 95 %`, `functions 95 %`, `branches 90 %`.

Y por archivo, más exigentes donde el error cuesta un voto:

| Archivo | Umbral |
|---|---|
| `resultados.controller.js` | 100 % líneas y funciones, 95 % ramas |
| `coordinador.controller.js` | 100 % en los cuatro ejes |
| `auth.middleware.js` | 100 % en los cuatro ejes |
| `validate.middleware.js` | 100 % en los cuatro ejes |
| `cache.service.js` | 100 % en los cuatro ejes |

`src/app.js` está excluido del cálculo: su bloque de arranque (`listen`,
`SIGTERM`, apagado ordenado) no se puede ejercer sin levantar el proceso real, y
dejarlo dentro falsearía el porcentaje hacia abajo sin aportar nada.

---

## 6. Qué no está cubierto, y por qué

Ser explícito aquí vale más que un 100 % de adorno.

- **`src/app.js`, bloque de arranque.** Excluido a propósito, como se explica
  arriba. El resto de `app.js` (rutas, *health checks*, rate limiting, 404,
  manejo de errores) sí se ejerce en la suite de integración HTTP.
- **Migraciones y *seeds* de Knex.** Son scripts de un solo uso que se validan
  ejecutándolos contra una base real, no con tests unitarios.
- **Frontend.** El pedido era sobre las pruebas del backend. Los 35 componentes
  React no tienen ninguna prueba: no hay Vitest ni Testing Library configurados.
  Es el hueco más grande que queda en el proyecto.
- **32 ramas sueltas** (4,13 % del total), casi todas defensivas: `error.message`
  cuando el error no trae mensaje, `?? 0` sobre agregaciones que en la práctica
  siempre devuelven fila. Cubrirlas exigiría forzar estados que el motor de base
  de datos no produce.

---

## 7. Recomendaciones, por orden de importancia

1. **Corregir el bypass de `changePassword`.** Es la única de esta lista que es
   una vulnerabilidad explotable hoy.
2. **Fijar `DB_SSL=true`** en el entorno de producción antes del despliegue en
   AWS, hasta que se corrija la detección automática.
3. **Correr `npm run carga:jornada` contra el entorno real de AWS** antes de la
   elección, con datos sembrados. El número que hay que mirar primero es
   `tiempo_subida_acta_ms p95`: si pasa de 5 s, el cuello de botella está en el
   almacenamiento o en el pool de escritura, no en la capacidad de cómputo.
4. **Meter `npm run test:ci` en el pipeline** como puerta antes de desplegar.
   Con los umbrales por archivo, una regresión en el conteo de actas rompe la
   construcción en vez de llegar a producción.
5. **Empezar las pruebas del frontend.** Aunque sea solo `CargarResultadoPage` y
   `imageCompressor.js`, que son los que tocan el acta.
6. **Revisar la decisión del número de mesa como contraseña**, con las
   mitigaciones del punto 4.3 si se mantiene.

---

## 8. Archivos entregados

### Nuevos

```
backend/tests/support/knex-mock.js                      harness de Knex con colas por tabla
backend/tests/unit/resultados.controller.test.js        80 tests
backend/tests/unit/crud.controllers.test.js             83 tests
backend/tests/unit/asignaciones.controller.test.js      42 tests
backend/tests/unit/dashboard.controller.test.js         49 tests
backend/tests/unit/coordinador.controller.full.test.js  25 tests
backend/tests/unit/middlewares.test.js                  49 tests
backend/tests/unit/services.extra.test.js               58 tests
backend/tests/unit/websocket.service.test.js            35 tests
backend/tests/unit/config.test.js                       46 tests
backend/tests/integration/api.http.test.js              60 tests
backend/tests/load/escenario-jornada-completa.js        escenario k6 de jornada completa
backend/tests/load/acta-muestra.jpg                     acta sintética de 860 KB
```

### Modificados

```
backend/jest.config.js       umbrales globales y por archivo (copia en jest.config.js.original)
backend/package.json         scripts de test y de carga
```

### Eliminado

```
backend/tests/unit/validate.middleware.test.js   probaba una copia inline del middleware,
                                                 no el módulo real (§ 2.3)
```

### Intactos

Las suites originales `api.integration.test.js`, `coordinador.integration.test.js`,
`auth.middleware.test.js`, `controllers.test.js`, `coordinador.controller.test.js`,
`services.test.js`, `validations.test.js` y todos los escenarios de carga previos
siguen donde estaban y siguen pasando.
