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

## 6. Prueba de carga (recomendado antes del 3 de octubre)

```bash
bash aws/prueba-carga.sh preparar 800     # respaldo + 800 personeros de prueba + límites por IP altos
```

Desde tu PC (con [k6](https://k6.io) instalado), en la carpeta `backend/`,
ejecuta el comando que imprime el script:

```bash
k6 run -e BASE_URL=https://dxxxx.cloudfront.net -e PASS_ADMIN='<clave admin>' \
  __tests__/load/escenario-800-usuarios.js
```

k6 sale desde una sola IP; por eso `preparar` sube temporalmente los límites
por IP (si no, casi todo sería rechazado y la prueba mediría el limitador, no
la capacidad). Mientras corre, mira el panel de CloudWatch: deberías ver subir
los servidores.
Al terminar:

```bash
bash aws/prueba-carga.sh deshacer         # la base y los límites vuelven EXACTOS a como estaban
```

---

## 7. Operación

| Comando | Qué hace |
|---|---|
| `bash aws/estado.sh` | Servidores sanos, base, Redis y salud de la API |
| `bash aws/escalar.sh 6 10` | Mínimo 6 servidores, máximo 10 (sin cortes) |
| `bash aws/escalar.sh 2` | Vuelve a 2 |
| `bash aws/ajustar-app.sh RATE_LIMIT_AUTH=150` | Cambia una variable del backend en todos los servidores sin redesplegar (reinicia de a uno, ~3 s cada uno). `--ver` muestra los ajustes, `--reset` los quita |
| `bash aws/respaldar.sh` | Respaldo de la base a S3 y copia en `~/respaldos/` |
| `bash aws/pausar.sh` | Apaga servidores y base (la URL y los datos se conservan) |
| `bash aws/reanudar.sh` | Enciende base y servidores |
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
| Antes del 3/10 | Prueba de carga y `deshacer` |
| Días libres | `pausar.sh` para ahorrar (la base se enciende sola a los 7 días) |
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
| Pausado | ~US$ 0.10 | ~US$ 2.5 |

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
├── respaldar.sh · importar-respaldo.sh · prueba-carga.sh · eliminar.sh
├── lib.sh                     Funciones comunes
└── instancia/                 Lo que corre dentro de cada servidor EC2
    ├── arranque.sh            Instala Node, lee secretos, migra y arranca el servicio
    ├── inicializar-bd.sh      Migraciones + datos iniciales si la base está vacía
    ├── migrar-con-candado.mjs Migraciones de a un servidor (candado de PostgreSQL)
    ├── respaldo-bd.sh · restaurar-bd.sh · generar-datos-prueba.sh
    ├── componer-env.sh · aplicar-config.sh   Ajustes de ajustar-app.sh
    └── comun.sh · consulta.mjs · ejecutar-knex.sh
```

La propuesta anterior con ECS Fargate quedó como referencia en
`docs/legacy/aws-propuesta-fargate/`; no corresponde a lo desplegado.
