# Despliegue en AWS — Sistema Electoral de Personeros

Todo se despliega con **un solo comando** desde AWS CloudShell. No hay que crear
nada a mano en la consola: ni EC2, ni balanceador, ni base de datos.

> Resumen: sube el proyecto a CloudShell, ejecuta `bash aws/desplegar.sh`,
> espera unos 30 minutos y al final el script te da la URL y la clave del
> administrador.

---

## 1. Qué se crea

```
Personeros (celular) ──HTTPS──► CloudFront ─┬─► S3 (frontend React)
                                            │
                                            └─► /api y /socket.io
                                                    │  (cabecera secreta)
                                                    ▼
                                      Balanceador ALB (2 zonas)
                                        │                 │
                              EC2 Node.js  ...  EC2 Node.js    ← autoescalado 2 a 8
                                        │                 │
               ┌────────────────────────┼─────────────────┤
               ▼                        ▼                 ▼
    RDS PostgreSQL 16          ElastiCache Redis       S3 actas
    Multi-AZ (privada)         TLS + clave (privada)   privado, versionado
```

| Pieza | Para qué sirve |
|---|---|
| **CloudFront** | HTTPS gratis (`https://dxxxx.cloudfront.net`), sirve la app desde Lima y reparte `/api` y `/socket.io` al balanceador. |
| **ALB** | Solo acepta tráfico de CloudFront. `/api` va al servidor menos ocupado; `/socket.io` mantiene afinidad por cookie. |
| **EC2 + Auto Scaling** | 2 servidores fijos (uno por zona), crecen hasta 8 si sube la CPU o las peticiones. El 4 de octubre se garantizan 4 de 06:00 a 10:30 y de 15:00 a 01:00 (hora de Lima). |
| **RDS PostgreSQL 16** | Multi-AZ: si se cae una zona, conmuta sola. Respaldos automáticos de 7 días. |
| **ElastiCache Redis** | Caché del dashboard y sincronización de Socket.io entre servidores. Con réplica. |
| **S3 actas** | Fotos de las actas. Privado, con versiones, y **no se borra** aunque elimines todo lo demás. |
| **CloudWatch** | Panel "electoral-jornada" con peticiones, errores, CPU, base y Redis. Alarmas por correo si configuras uno. |

¿EC2 o "stack"? Las dos cosas: el script crea un **stack de CloudFormation**
(`aws/plantilla-electoral.yaml`) y ese stack crea los EC2 con autoescalado.
Nunca tienes que lanzar un EC2 a mano.

---

## 2. Qué se corrigió en el código para que funcione en AWS

| Problema | Efecto en la jornada | Corrección |
|---|---|---|
| Token vencido devolvía **403** y el frontend solo renovaba ante 401 | A los 15 min el personero no podía enviar su acta | Middleware devuelve 401; el token dura 12 h y se renueva solo |
| `JWT_EXPIRES_IN` se ignoraba (fijo en 15 min) | Igual que arriba | El controlador usa la configuración |
| El socket reusaba el token del login | Tras vencer, el tiempo real no volvía a conectar | El socket lee el token vigente y reconecta tras renovarlo |
| `migrate:latest` fallaba en una base **vacía** (candidatos distritales sin distrito) | La base nueva de RDS no se podía crear | La migración crea los distritos que necesita |
| Candidatos provinciales y `estado_distrital` no se cargaban en base nueva | No se podía votar provincial ni distrital | Nuevo seed `04_candidatos_provinciales` y ajuste del seed 03 |
| Secuencia de `locales_votacion` en 1 | Crear un local desde el panel daba error 500 | `setval` al final del seed |
| Los seeds reseteaban las claves de los admins en cada ejecución | Pérdida de acceso | Ya no tocan `password_hash` |
| Claves de admin publicadas en el repositorio | Cualquiera podía entrar al panel | En AWS los 3 admins reciben una clave generada |
| Redis sin TLS | ElastiCache cifrado no conectaba | `REDIS_TLS=true` usa `rediss://` |
| Sin manejador de error en pub/sub de Socket.io | Un corte breve de Redis tumbaba todos los servidores | Manejadores añadidos |
| `changePassword` sin clave actual | Un token robado bastaba para cambiar la clave | Clave actual obligatoria |
| La limpieza del caché del tablero comparaba el cursor de Redis con texto, y Redis 4 lo entrega como número | **La primera acta subida se quedaba colgada** y el servidor saturaba Redis con miles de consultas por segundo; igual al verificar u observar | Se compara como número, con un tope de vueltas. Lo detectó la prueba de carga con Redis encendido |
| Dos envíos simultáneos de la misma acta (doble toque, reintento en red móvil) | El segundo chocaba con el índice único y respondía error 500: el personero creía que su acta no había llegado | Candado por mesa: el segundo espera y recibe un aviso claro (409). Verificar y observar también releen el acta antes de cambiarla |
| El socket registraba sus eventos después de consultar Redis | Un aviso enviado justo al conectar se perdía | Primero se registran eventos y salas, después se consulta |
| El tablero recargaba todo con **cada** aviso en vivo | En la hora pico, cientos de peticiones por minuto por pantalla: el propio límite por IP (429) congelaba el tablero del administrador | Los avisos se agrupan: como mucho una recarga cada 3 s (1,5 s para coordinadores) |

Todo el código modificado tiene pruebas; `desplegar.sh` corre las pruebas del
backend y **no despliega si alguna falla**.

---

## 3. Antes de empezar (hazlo hoy)

1. **Cuenta de AWS** con permisos de administrador y tarjeta registrada.
2. **Cupo de vCPU de EC2.** Las cuentas nuevas suelen tener poco y el
   autoescalado fallaría en silencio el día de la elección. En la consola:
   *Service Quotas → Amazon EC2 → Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances*.
   Pide **32 vCPU** o más. Puede tardar horas; el script igual te avisa si falta.
3. **Región.** Por defecto `us-east-1` (la más barata). CloudFront sirve desde
   Lima igual.
4. (Opcional) Un **correo** para alarmas y aviso de presupuesto.

---

## 4. Desplegar paso a paso

1. Entra a la consola de AWS, elige la región (arriba a la derecha) y abre
   **CloudShell** (ícono `>_` en la barra superior).
2. **Actions → Upload file** y sube el ZIP del proyecto. Luego:

   ```bash
   unzip -q Sistema_Personeros-AWS.zip
   cd Sistema_Personeros-main
   ```

3. (Opcional) Configura correo, región o tamaños:

   ```bash
   cp aws/config.ejemplo.env aws/config.env
   nano aws/config.env        # CORREO_ALERTAS=tu@correo.com
   ```

4. Despliega:

   ```bash
   bash aws/desplegar.sh
   ```

El script hace, en orden: crea un bucket para los paquetes, descarga Node 22
oficial (verificado con SHA256), instala dependencias, **corre las pruebas**,
compila el frontend, crea la infraestructura (20–30 min), publica el frontend,
prepara la base (16 distritos, 93 locales, 783 mesas, candidatos, 3 admins) y
al final verifica de punta a punta: HTTPS, base, Redis, Socket.io entre
servidores, rutas del SPA, login y dashboard.

**Si CloudShell se cierra** (pasa tras ~20 min sin tocar el teclado): vuelve a
abrirlo, `cd Sistema_Personeros-main` y ejecuta otra vez `bash aws/desplegar.sh`.
Retoma donde quedó; lo ya compilado se reutiliza.

Al terminar verás algo así:

```
━━ Listo en 31 min ━━
  Direccion del sistema:   https://d1a2b3c4d5e6f7.cloudfront.net
  Administradores:         DNI 00000000, 73884790 y 74725178 · clave inicial: Xk7mP2qR9vTw4N
```

Esa URL es la que envías a personeros y coordinadores. Cada administrador
debe cambiar su clave al entrar (menú de usuario → Cambiar contraseña).

**Dominio propio (sistema-electoral.com).** Pide el certificado en ACM, en la
región **us-east-1**, y valídalo con «Crear registros en Route 53». Cuando
figure como *Emitido*, agrega a `aws/config.env`:

```bash
DOMINIO=sistema-electoral.com
CERTIFICADO_ACM=arn:aws:acm:us-east-1:...:certificate/...
```

y ejecuta `bash aws/desplegar.sh`. El script conecta el dominio a CloudFront y
crea solo los registros A y AAAA en Route 53. Si el certificado todavía no
está emitido, despliega sin dominio y te avisa; no se rompe nada.

---

## 5. Tus datos: empezar de cero o traer la base actual

**Base nueva:** ya está lista con el padrón. Crea coordinadores y personeros y
asígnalos desde el panel.

**Traer la base que ya tienes** (usuarios, asignaciones, candidatos). En tu
servidor actual:

```bash
docker exec electoral-db pg_dump -U electoral_user sistema_electoral | gzip > base.sql.gz
```

Sube `base.sql.gz` a CloudShell (*Actions → Upload file*) y:

```bash
bash aws/importar-respaldo.sh ~/base.sql.gz
```

Antes de reemplazar hace un respaldo de lo que hay en AWS. La restauración va
en **una sola transacción**: si el archivo está dañado, la base queda como
estaba. Después aplica las migraciones que falten. Los usuarios entran con las
claves que ya tenían.

---

## 6. Prueba de carga: la jornada completa antes del 4 de octubre

La prueba reproduce el día entero sobre el sistema real de AWS, con usuarios
de prueba en **todas** las mesas que aún no tienen personero:

- **Mañana:** personeros y coordinadores entran, confirman su mesa y se quedan
  conectados (WebSocket abierto todo el tiempo).
- **Tarde:** los personeros suben el acta con foto (~860 KB, el doble de lo que
  envía el celular). Primero pocos, luego la avalancha, al final los rezagados.
  Donde hay elección distrital suben dos actas. El 3 % toca «Enviar» dos veces.
- **Revisión:** los coordinadores (uno cada 12 mesas de su local) reciben el
  aviso en vivo, abren el acta y la **aprueban u observan** (15 % observadas).
  El personero recibe el aviso y corrige la observada; la segunda versión
  todavía puede ser observada (5 %).
- **Tablero:** 5 administradores de prueba con el tablero abierto, más 20
  pantallas que lo consultan cada 5-10 s.
- **Cierre:** cada personero comprueba que el sistema guardó exactamente las
  cifras que envió, y el resumen cruza lo enviado con lo que muestra el tablero.

La carga sale de un **servidor temporal en AWS** (m7i.xlarge; la prueba
completa cuesta centavos) que se elimina solo al terminar. Ni CloudShell ni una
PC tienen el ancho de banda para cientos de fotos simultáneas.

**Requisito:** haber desplegado esta versión (`bash aws/desplegar.sh`) y
hacerlo **antes de cargar el Excel de personeros** (la prueba usa las mesas sin
personero). Nunca el 4 de octubre: el script se niega.

```bash
bash aws/prueba-carga.sh preparar          # respaldo de la base, clave de prueba, límites por IP altos
bash aws/prueba-carga.sh ejecutar humo     # ~5 min: comprueba que todo el circuito funciona
bash aws/prueba-carga.sh ejecutar jornada  # ~35 min: la jornada completa (la que cuenta)
bash aws/prueba-carga.sh deshacer          # SIEMPRE al final: todo vuelve a como estaba
```

| Perfil | Duración | Qué simula |
|---|---|---|
| `humo` | ~5 min | 12 personeros. Solo verifica que el circuito completo funciona |
| `ensayo` | ~12 min | 200 personeros |
| `jornada` | ~35 min | Todas las mesas. La tarde en 15 minutos de subidas: unas **6 veces** el ritmo real. Sube a 4 servidores como el 4/10 |
| `estres` | ~15 min | Todas las mesas subiendo en 4 minutos (~20 veces el ritmo real). Busca el límite; no es criterio de aprobación |

**Mientras corre**, entra al sistema con tu usuario administrador y mira el
tablero de resultados: verás llegar las actas de prueba en vivo. En CloudShell
aparece el avance cada 30 s y en el panel de CloudWatch verás la CPU, las
conexiones y, si hace falta, cómo se suman servidores. Puedes cerrar CloudShell:
la prueba sigue en AWS y `bash aws/prueba-carga.sh resultado` la retoma.

**Cómo leer el resultado.** Al final se imprime un informe con CUMPLE / NO
CUMPLE por punto y un veredicto:

| Punto | Criterio de aprobación |
|---|---|
| Subida del acta | 95 % en menos de 5 s y menos de 1 % de errores |
| Doble toque en «Enviar» | Ninguna acta duplicada |
| Revisión del coordinador | Aviso al coordinador en menos de 5 s; aprobar/observar en menos de 2 s |
| Aviso al personero | Más del 95 % llega por el socket (prueba el tiempo real entre servidores) |
| Tablero en vivo | Una acta nueva aparece en menos de 8 s (95 %) |
| Integridad | Actas y votos aprobados = lo que muestra el tablero; ninguna acta con cifras distintas a las enviadas |

Después revisa la base con las mismas comprobaciones de la noche de la
elección (duplicados, sumas, estados, fotos). Los resultados quedan en
`~/pruebas-carga/`. «Rechazadas por regla» no son fallas: son el segundo envío
del doble toque.

`deshacer` borra los usuarios, actas y fotos de prueba, devuelve las mesas a
«pendiente», los límites por IP y el número de servidores. Lo demás de la base
no se toca: si entre la prueba y el `deshacer` cargaste el Excel, se conserva.
Mientras no lo ejecutes, `estado.sh` y `desplegar.sh` te lo recuerdan. Solo en
una emergencia, `deshacer --restaurar-respaldo` devuelve la base ENTERA al
respaldo tomado en `preparar` (se pierde todo lo hecho después).

---

## 7. Operación

| Comando | Qué hace |
|---|---|
| `bash aws/estado.sh` | Servidores sanos, base, Redis y salud de la API |
| `bash aws/escalar.sh 6 10` | Mínimo 6 servidores, máximo 10 (sin cortes) |
| `bash aws/escalar.sh 2` | Vuelve a 2 |
| `bash aws/ajustar-app.sh RATE_LIMIT_AUTH=150` | Cambia una variable del backend en todos los servidores sin redesplegar (reinicia de a uno, ~3 s cada uno). `--ver` muestra los ajustes, `--reset` los quita |
| `bash aws/respaldar.sh` | Respaldo de la base a S3 y copia en `~/respaldos/` |
| `bash aws/verificar-actas.sh` | Revisa que las actas guardadas cuadren (duplicados, sumas, estados, fotos). No modifica nada; úsalo la noche de la elección antes de publicar |
| `bash aws/pausar.sh` | Respalda la base, apaga servidores y detiene la base. Se conservan datos, dominio, balanceador y caché. Deja programado un encendido de seguridad el 4/10 a las 04:30 |
| `bash aws/pausar.sh 2026-10-03 08:00` | Igual, pero se enciende solo en esa fecha y hora de Lima |
| `bash aws/reanudar.sh` | Enciende base y servidores ya (cancela el encendido programado). También sirve para comprobar el sistema tras un encendido automático |
| `bash aws/desplegar.sh` | Publica cambios de código: si cambió el backend, reemplaza servidores de a uno sin cortar el servicio |
| `bash aws/eliminar.sh` | Baja total (ver sección 9) |

**Día de la elección**

- Abre el panel `electoral-jornada` de CloudWatch (URL al final del despliegue).
- El pre-escalado a 4 servidores es automático. Si quieres más margen desde la
  mañana: `bash aws/escalar.sh 6 10`.
- **No publiques código el 4 de octubre.** Mientras se reemplazan servidores el
  autoescalado queda en pausa; el script pide confirmación si lo intentas.
- Los logs de cada servidor están en CloudWatch → Log groups (el nombre sale en
  `bash aws/estado.sh`). Para entrar a un servidor: EC2 → la instancia →
  *Connect → Session Manager* (no hace falta SSH ni claves).

**Calendario sugerido**

| Fecha | Acción |
|---|---|
| Hoy | Pedir cupo de vCPU. `desplegar.sh`, importar tu base o cargar datos |
| Antes de cargar el Excel | Prueba de carga (`humo`, luego `jornada`) y `deshacer` |
| Días libres | `pausar.sh` para ahorrar, o `pausar.sh 2026-10-03 08:00` para que se encienda solo (AWS enciende sola una base detenida a los 7 días) |
| 3/10 | `reanudar.sh`, `estado.sh`, prueba con un personero real |
| 4/10 | Jornada |
| 5–6/10 | Descarga de actas desde el panel (Descargas) y `respaldar.sh` |
| Al terminar | `eliminar.sh` |

---

## 8. Costos aproximados (us-east-1)

| Estado | Por hora | Por día |
|---|---|---|
| Encendido, 2 servidores | ~US$ 0.34 | ~US$ 8 |
| Pico, 8 servidores | ~US$ 0.65 | — |
| Pausado (`pausar.sh`) | ~US$ 0.10 | ~US$ 2.5 |
| Dado de baja (`eliminar.sh`) | — | centavos (respaldo e instantánea) |

Lo más caro es la base Multi-AZ (US$ 0.13/h) y Redis con réplica (US$ 0.064/h).
CloudFront entra en la capa gratuita (1 TB y 10 millones de peticiones al mes).
Desplegar hoy, pausar los días libres y dar de baja el 6 de octubre queda en
torno a **US$ 60–70**, dentro de los US$ 117 aprobados. Confirma con
[calculator.aws](https://calculator.aws) antes de presentarlo; los precios
cambian. Si configuraste un correo, AWS te avisa al 80% del presupuesto mensual.

---

## 9. Baja al terminar

1. Descarga las actas desde el panel de administrador (**Descargas**, ZIP
   provincial y distrital) y guarda el último respaldo (`bash aws/respaldar.sh`).
2. `bash aws/eliminar.sh` → borra servidores, balanceador, CloudFront, base y
   Redis. Conserva las fotos de actas, una instantánea final de la base y los
   respaldos (centavos al mes).
3. Cuando ya no los necesites: `bash aws/eliminar.sh --todo` → costo 0.
4. Unos días después revisa *Billing → Cost Explorer*.

---

## 10. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `desplegar.sh` se detiene en las pruebas | Muestra qué prueba falló. Corrige o, bajo tu responsabilidad, `SALTAR_PRUEBAS=1 bash aws/desplegar.sh` |
| La creación falla | El script muestra el motivo y el log de arranque del servidor. Al volver a ejecutarlo borra el intento fallido y reintenta |
| "No se pudo crear la distribución de CloudFront" | Cuenta nueva sin verificar: abre un caso en AWS Support (*Account and billing*) |
| Un servidor no pasa el health check | `bash aws/estado.sh`, luego los logs en CloudWatch. El autoescalado lo reemplaza solo |
| Personeros ven "Demasiados intentos" | Muchos detrás de la misma IP (wifi del colegio o red del operador). `bash aws/ajustar-app.sh RATE_LIMIT_AUTH=200 RATE_LIMIT_API=1500` (por IP, por servidor y por minuto; por defecto 60 y 600) |

---

## 11. Límites conocidos

- Entre CloudFront y el balanceador el tráfico va por HTTP dentro de la red de
  AWS. Para cifrar también ese tramo hace falta un dominio propio con
  certificado en el ALB.
- Los personeros pueden entrar con DNI + número de mesa (regla de negocio
  existente). Ambos datos son públicos; considera asignarles clave propia.
- El repositorio de GitHub es público y contiene DNI de administradores.
  Conviene hacerlo privado.

---

## Archivos

```
aws/
├── plantilla-electoral.yaml   Infraestructura completa (CloudFormation)
├── desplegar.sh               Despliegue y actualizaciones
├── config.ejemplo.env         Opciones (copiar a config.env)
├── estado.sh · escalar.sh · pausar.sh · reanudar.sh
├── ajustar-app.sh             Variables del backend en caliente (p. ej. límites por IP)
├── respaldar.sh · importar-respaldo.sh · eliminar.sh
├── prueba-carga.sh            Prueba de carga de la jornada completa (preparar/ejecutar/deshacer)
├── generador-carga.sh         Corre dentro del servidor temporal que genera la carga (k6)
├── verificar-actas.sh         Revisión de integridad de las actas guardadas
├── lib.sh                     Funciones comunes
└── instancia/                 Lo que corre dentro de cada servidor EC2
    ├── arranque.sh            Instala Node, lee secretos, migra y arranca el servicio
    ├── inicializar-bd.sh      Migraciones + datos iniciales si la base está vacía
    ├── migrar-con-candado.mjs Migraciones de a un servidor (candado de PostgreSQL)
    ├── respaldo-bd.sh · restaurar-bd.sh · generar-datos-prueba.sh
    ├── verificar-integridad.sh/.mjs   Comprobaciones de las actas en la base
    ├── componer-env.sh · aplicar-config.sh   Ajustes de ajustar-app.sh
    └── comun.sh · consulta.mjs · ejecutar-knex.sh
```

La propuesta anterior con ECS Fargate quedó como referencia en
`docs/legacy/aws-propuesta-fargate/`; no corresponde a lo desplegado.
