# Guía de despliegue en Contabo

Para 800–1500 usuarios simultáneos. Tiempo estimado: 45–60 minutos.

---

## 1. Qué VPS contratar

Todo el sistema corre en **un solo servidor**. No necesita tres.

| Plan Contabo | vCPU | RAM | Disco | Precio aprox. | Para qué alcanza |
|---|---|---|---|---|---|
| **CLOUD VPS 10 NVMe** | 3 | 8 GB | 75 GB | ~7 €/mes | Hasta 400 usuarios |
| **CLOUD VPS 20 NVMe** ← recomendado | 6 | 16 GB | 200 GB | ~13 €/mes | **800–1500 usuarios** |
| CLOUD VPS 30 NVMe | 9 | 24 GB | 400 GB | ~22 €/mes | Más de 2000 |

Elija **VPS 20 NVMe**. Al contratar:

- **Sistema operativo**: Ubuntu 24.04 LTS
- **Región**: European Union o United States (Central) — la latencia desde Perú es similar; EE. UU. suele ir algo mejor
- **Disco**: NVMe, no SSD normal (la diferencia se nota en la base de datos)

Anote la **IP** y la **contraseña de root** que le envían por correo.

---

## 2. Preparar el dominio

En su proveedor de dominios cree un registro A:

```
Tipo: A    Nombre: elecciones    Valor: LA-IP-DE-SU-VPS    TTL: 300
```

Esto le da `elecciones.sudominio.com`.

**Recomendado**: ponga el dominio detrás de Cloudflare (plan gratuito). Le da
protección contra ataques, certificado HTTPS y caché de archivos estáticos sin
costo. En Cloudflare, active el proxy (nube naranja) y en SSL/TLS elija el modo
**Full**.

---

## 3. Preparar el servidor

Conéctese por SSH:

```bash
ssh root@LA-IP-DE-SU-VPS
```

Suba el proyecto (desde su computadora, en otra terminal):

```bash
scp sistema-personeros-pro.zip root@LA-IP-DE-SU-VPS:/opt/
```

De vuelta en el servidor:

```bash
cd /opt
apt-get update && apt-get install -y unzip
unzip sistema-personeros-pro.zip
mv sistema-personeros-pro sistema-electoral
cd sistema-electoral

bash scripts/instalar-vps.sh
```

Ese script instala Docker y Node, configura el cortafuegos (solo abre 22, 80 y
443) y sube los límites del sistema para soportar miles de conexiones abiertas.
Tarda unos 5 minutos.

---

## 4. Configurar las contraseñas

Genere tres secretos distintos:

```bash
openssl rand -base64 48   # para JWT_SECRET
openssl rand -base64 48   # para JWT_REFRESH_SECRET
openssl rand -base64 24   # para las contraseñas de base de datos y Redis
```

Cree los dos archivos de configuración:

```bash
cp .env.example .env
nano .env
```

Complete:

```bash
DB_NAME=sistema_electoral
DB_USER=electoral_user
DB_PASSWORD=<el tercer secreto que generó>
REDIS_PASSWORD=<otro secreto distinto>
```

Guarde con `Ctrl+O`, `Enter`, `Ctrl+X`.

Ahora el del backend:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Los valores que **debe** cambiar:

```bash
NODE_ENV=production
CORS_ORIGIN=https://elecciones.sudominio.com

DB_HOST=pgbouncer
DB_PORT=6432
DB_PASSWORD=<el mismo DB_PASSWORD del archivo anterior>

REDIS_PASSWORD=<el mismo REDIS_PASSWORD del archivo anterior>

JWT_SECRET=<primer secreto generado>
JWT_REFRESH_SECRET=<segundo secreto generado>

STORAGE_DRIVER=local
```

> **Importante sobre `TRUST_PROXY_HOPS`**: si usa Cloudflare, cámbielo a `2`.
> Si entra directo por IP o dominio sin Cloudflare, déjelo en `1`. Un valor
> equivocado hace que el límite de peticiones cuente a todos los usuarios como
> si fueran uno solo, y bloquearía a todo el mundo a la vez.

Configure también el frontend:

```bash
cp frontend/.env.example frontend/.env
```

Déjelo vacío: al servirse desde el mismo dominio, las rutas relativas funcionan
solas.

---

## 5. Desplegar

```bash
bash scripts/desplegar.sh
```

El script compila el frontend, construye las imágenes, levanta PostgreSQL y
Redis, aplica las migraciones (incluidos los índices), carga los 16 distritos,
97 locales y 787 mesas, y levanta los 4 backends con Nginx delante.

Tarda entre 5 y 10 minutos la primera vez. Al terminar debe ver:

```
 Sistema desplegado y respondiendo.
```

Compruebe desde su navegador: `http://LA-IP-DE-SU-VPS`

---

## 6. Activar HTTPS

Obligatorio: sin HTTPS, los navegadores móviles **bloquean la cámara**, y los
personeros no podrán fotografiar el acta.

### Si usa Cloudflare (más simple)

Ya tiene HTTPS. Solo active en Cloudflare: SSL/TLS → **Full**, y en
Edge Certificates active **Always Use HTTPS**.

### Si no usa Cloudflare

```bash
bash scripts/activar-ssl.sh elecciones.sudominio.com su-correo@dominio.com
```

---

## 7. Verificar antes del día de la elección

```bash
bash scripts/verificar.sh
```

Debe mostrar todo en verde. Los puntos que importan:

- Base de datos conectada
- **Socket.io sincronizado entre instancias** ← si esto falla, los coordinadores no verán las actas en vivo
- Índices de rendimiento: 20 o más
- Tablas creadas: 11

Y la comprobación del backend:

```bash
docker compose exec backend-1 npm run verificar
```

---

## 8. Prueba de carga real (hágala una semana antes)

**En un servidor de ensayo, nunca en el de producción.**

Instale k6:

```bash
gpg -k
gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | tee /etc/apt/sources.list.d/k6.list
apt-get update && apt-get install -y k6
```

Cree 800 personeros de prueba y lance el escenario:

```bash
docker compose exec backend-1 node scripts/generar-datos-prueba.js 800
k6 run -e BASE_URL=http://localhost backend/tests/load/escenario-800-usuarios.js
```

Criterio de aprobación: **p95 por debajo de 1500 ms y menos de 2% de fallos**.

Al terminar, borre los datos de prueba:

```bash
docker compose exec backend-1 node scripts/generar-datos-prueba.js --limpiar
```

---

## 9. Cargar los datos reales

1. Entre como administrador y **cambie la contraseña** de inmediato.
2. Registre los candidatos (Administración → Candidatos).
3. Cree los usuarios coordinadores y personeros (o impórtelos).
4. Asigne coordinadores a locales y personeros a mesas.
5. Comparta el enlace por WhatsApp.

Los personeros pueden entrar con su **DNI** y, como contraseña, el **número de
mesa** que tienen asignado. Es lo más simple de explicar por teléfono.

---

## 10. El día de la elección

Deje una terminal abierta vigilando:

```bash
watch -n 5 'docker compose ps && curl -s http://localhost/api/health/full'
```

Y otra con los registros:

```bash
docker compose logs -f --tail=50 backend-1 backend-2
```

### Qué hacer si algo va mal

**El sistema va lento**

```bash
docker stats --no-stream
docker compose logs --tail=100 backend-1 | grep -i "pool saturado"
```

Si aparece "pool saturado", suba `DB_POOL_MAX` a 60 en `backend/.env` y
reinicie los backends:

```bash
docker compose restart backend-1 backend-2 backend-3 backend-4
```

**Un backend dejó de responder**

Nginx lo saca del reparto automáticamente. Para revivirlo:

```bash
docker compose restart backend-2
```

Los usuarios no se enteran: siguen atendidos por los otros tres.

**Los coordinadores no ven las actas en vivo**

```bash
curl -s http://localhost/api/health/full | grep adapterRedis
```

Si dice `false`, Redis está caído:

```bash
docker compose restart redis
docker compose restart backend-1 backend-2 backend-3 backend-4
```

**Hay que reiniciar todo**

```bash
docker compose restart
```

Tarda unos 30 segundos. Los datos no se pierden: están en PostgreSQL y hay
respaldo automático cada 30 minutos en `backups/`.

**Restaurar un respaldo**

```bash
ls -lh backups/
gunzip -c backups/respaldo-AAAAMMDD-HHMM.sql.gz | \
  docker compose exec -T postgres psql -U electoral_user sistema_electoral
```

---

## 11. Capacidad y costos

| Concepto | Valor |
|---|---|
| VPS Contabo 20 NVMe | ~13 €/mes |
| Dominio | ~10 €/año |
| Cloudflare | gratis |
| Almacenamiento de actas | en el mismo disco, gratis |
| **Total** | **~14 €/mes** |

Con esta configuración el sistema soporta cómodamente 800 usuarios
simultáneos y aguanta picos de hasta 1500.

### Si necesita más capacidad

Editar `docker-compose.yml`, duplicar el bloque de un backend como
`backend-5` y `backend-6`, y añadirlos al `upstream backend_cluster` de
`nginx/nginx.conf`. Luego:

```bash
docker compose up -d
docker compose restart nginx
```

---

## 12. Después de la elección

Guarde todo antes de dar de baja el servidor:

```bash
bash scripts/respaldar.sh
docker compose exec postgres pg_dump -U electoral_user sistema_electoral \
  > /opt/respaldo-final-completo.sql
tar czf /opt/actas-finales.tar.gz -C /var/lib/docker/volumes/sistema-electoral_actas_data/_data .
```

Descargue ambos archivos a su computadora con `scp` y consérvelos: la tabla de
auditoría es el registro legal de quién hizo qué y cuándo.
