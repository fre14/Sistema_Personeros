#!/bin/bash
# ══════════════════════════════════════════════════════════════════════
#  Despliega (o actualiza) TODO el Sistema Electoral en AWS.
#
#  Ejecutar en AWS CloudShell, desde la carpeta del proyecto:
#      bash aws/desplegar.sh
#
#  Es seguro volver a ejecutarlo: si CloudShell se cierra a la mitad,
#  retoma donde quedo. Si cambio el codigo del backend, reemplaza los
#  servidores de a uno sin cortar el servicio; si solo cambio el frontend,
#  no toca los servidores.
#
#  El numero de servidores se fija al crear (aws/config.env) y despues se
#  cambia SOLO con aws/escalar.sh: este script no lo modifica al actualizar.
#
#  Variables opcionales: STACK, REGION, SALTAR_PRUEBAS=1, FORZAR_BUILD=1,
#  ACTUALIZAR_BASE=1 (nueva AMI de Amazon Linux y Node: reemplaza servidores).
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq curl tar sha256sum openssl npm node

INICIO=$(date +%s)
TRABAJO=${TRABAJO:-/tmp/electoral-build}
mkdir -p "$TRABAJO"
# La cache de npm fuera de $HOME: en CloudShell el home solo tiene 1 GB.
export npm_config_cache="$TRABAJO/.npm"

# ── 0. Cuenta, region y estado de la pila ─────────────────────────────
titulo "0/7 Cuenta y estado"
CUENTA=$(cuenta_aws)
BUCKET=$(bucket_artefactos)
ok "Cuenta $CUENTA · region $REGION · pila '$STACK'"

esperar_pila_estable() {
  local estado
  while true; do
    estado=$(estado_pila)
    case "$estado" in
      REVIEW_IN_PROGRESS) echo "$estado"; return 0 ;;
      *_IN_PROGRESS) echo "  La pila esta en $estado; espero 30 s..." >&2; sleep 30 ;;
      *) echo "$estado"; return 0 ;;
    esac
  done
}
ESTADO=$(esperar_pila_estable)
case "$ESTADO" in
  NO_EXISTE) ok "La pila no existe: se creara desde cero." ;;
  ROLLBACK_COMPLETE|ROLLBACK_FAILED|CREATE_FAILED|DELETE_FAILED|REVIEW_IN_PROGRESS)
    [ "$ESTADO" = "REVIEW_IN_PROGRESS" ] || diagnosticar_pila || true
    aviso "Un intento anterior de creacion no termino (estado $ESTADO). Se elimina y se crea de nuevo."
    aws cloudformation delete-stack --stack-name "$STACK"
    aws cloudformation wait stack-delete-complete --stack-name "$STACK" \
      || morir "No se pudo borrar la pila fallida. Revise la consola de CloudFormation."
    ESTADO=NO_EXISTE ;;
  UPDATE_ROLLBACK_FAILED)
    morir "La pila quedo en UPDATE_ROLLBACK_FAILED. En la consola de CloudFormation use 'Continue update rollback' y reintente." ;;
  *)
    ok "La pila existe ($ESTADO): se actualizara."
    [ "$(parametro_pila MinInstances)" != "0" ] \
      || morir "La pila esta pausada (0 servidores). Primero: bash aws/reanudar.sh" ;;
esac
NUEVA=0
[ "$ESTADO" = "NO_EXISTE" ] && NUEVA=1

# Valores que solo se fijan al crear (despues: escalar.sh)
if [ "$NUEVA" = 1 ]; then
  MIN_I=${MIN_INSTANCIAS:-2}; MAX_I=${MAX_INSTANCIAS:-8}; PICO_I=${INSTANCIAS_PICO:-4}
else
  MIN_I=$(parametro_pila MinInstances); MAX_I=$(parametro_pila MaxInstances); PICO_I=$(parametro_pila PeakInstances)
fi
DB_CLASE=${DB_CLASE:-db.t4g.medium}
INSTANCIA_TIPO=${INSTANCIA_TIPO:-t3.medium}
[ "$MIN_I" -lt "$MAX_I" ] || morir "MIN_INSTANCIAS ($MIN_I) debe ser menor que MAX_INSTANCIAS ($MAX_I)."
[ "$MAX_I" -le 12 ] || morir "MAX_INSTANCIAS no puede superar 12 (limite de conexiones de la base)."
[ "$PICO_I" -le "$MAX_I" ] || morir "INSTANCIAS_PICO ($PICO_I) no puede superar MAX_INSTANCIAS ($MAX_I)."
if [ "$DB_CLASE" = "db.t4g.small" ] && [ "$MAX_I" -gt 6 ]; then
  morir "Con DB_CLASE=db.t4g.small use MAX_INSTANCIAS <= 6 (limite de conexiones)."
fi

# Cupo de vCPU de EC2: las cuentas nuevas suelen tener poco y el autoescalado
# fallaria en silencio el dia de la eleccion.
VCPU_TIPO=$(aws ec2 describe-instance-types --instance-types "$INSTANCIA_TIPO" \
  --query 'InstanceTypes[0].VCpuInfo.DefaultVCpus' --output text 2>/dev/null || echo 2)
CUPO=$(aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A \
  --query 'Quota.Value' --output text 2>/dev/null || echo "")
NECESARIO=$(( MAX_I * VCPU_TIPO + 2 ))
if [[ "$CUPO" =~ ^[0-9]+ ]]; then
  if [ "${CUPO%.*}" -lt "$NECESARIO" ]; then
    aviso "Su cuenta permite ${CUPO%.*} vCPU en EC2 y el maximo configurado necesita $NECESARIO."
    aviso "PIDA EL AUMENTO YA (puede tardar horas): Service Quotas > Amazon EC2 >"
    aviso "'Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances' -> $NECESARIO o mas."
  else
    ok "Cupo de vCPU de EC2 suficiente (${CUPO%.*} >= $NECESARIO)"
  fi
else
  aviso "No se pudo leer el cupo de vCPU de EC2; verifiquelo en Service Quotas (necesita $NECESARIO)."
fi

# ── 1. Bucket de artefactos (fuera de la pila) ─────────────────────────
titulo "1/7 Bucket de artefactos"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  ok "s3://$BUCKET ya existe"
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" >/dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  ok "Creado s3://$BUCKET"
fi

# ── 2. Node.js oficial y AMI (fijos: se renuevan solo con ACTUALIZAR_BASE=1) ──
titulo "2/7 Node.js y sistema operativo"
RENOVAR_BASE=0
if [ "$NUEVA" = 1 ] || [ "${ACTUALIZAR_BASE:-0}" = 1 ]; then RENOVAR_BASE=1; fi
NODE_KEY=""
AMI_ID=""
if [ "$RENOVAR_BASE" = 0 ]; then
  NODE_KEY=$(parametro_pila NodeTarballKey)
  [ "$NODE_KEY" = "None" ] && NODE_KEY=""
else
  NODE_LINEA=${NODE_LINEA:-22}
  if SHAS=$(curl -fsSL --max-time 30 "https://nodejs.org/dist/latest-v${NODE_LINEA}.x/SHASUMS256.txt"); then
    NODE_ARCHIVO=$(echo "$SHAS" | awk '/ node-v[0-9.]+-linux-x64\.tar\.gz$/ {print $2}')
    NODE_KEY="node/$NODE_ARCHIVO"
    if ! aws s3api head-object --bucket "$BUCKET" --key "$NODE_KEY" >/dev/null 2>&1; then
      curl -fsSL "https://nodejs.org/dist/latest-v${NODE_LINEA}.x/$NODE_ARCHIVO" -o "$TRABAJO/$NODE_ARCHIVO"
      (cd "$TRABAJO" && echo "$SHAS" | grep " $NODE_ARCHIVO\$" | sha256sum -c --quiet -) \
        || morir "La suma SHA256 de $NODE_ARCHIVO no coincide."
      aws s3 cp "$TRABAJO/$NODE_ARCHIVO" "s3://$BUCKET/$NODE_KEY" --only-show-errors
    fi
  else
    aviso "No se pudo descargar Node.js de nodejs.org; los servidores lo instalaran con dnf."
  fi
  AMI_ID=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
    --query Parameter.Value --output text)
  ok "Amazon Linux 2023: $AMI_ID"
fi
if [ -n "$NODE_KEY" ]; then
  NODE_ARCHIVO=$(basename "$NODE_KEY")
  [ -f "$TRABAJO/$NODE_ARCHIVO" ] || aws s3 cp "s3://$BUCKET/$NODE_KEY" "$TRABAJO/$NODE_ARCHIVO" --only-show-errors
  rm -rf "$TRABAJO/node" && mkdir -p "$TRABAJO/node"
  tar -xzf "$TRABAJO/$NODE_ARCHIVO" -C "$TRABAJO/node" --strip-components 1
  export PATH="$TRABAJO/node/bin:$PATH"
  ok "Node $(node -v) (el mismo que usan los servidores)"
else
  [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ] || morir "Se necesita Node 18+ para compilar."
  ok "Node local $(node -v) para compilar"
fi
[ "$RENOVAR_BASE" = 1 ] || ok "Se conservan la AMI y el Node actuales de los servidores"

# ── 3. Compilar y empaquetar (cada parte se reutiliza si no cambio) ─────
titulo "3/7 Compilacion"
huella() {
  (cd "$RAIZ" && find "$@" -type f \
    -not -path '*/node_modules/*' -not -path 'frontend/dist/*' -not -path 'backend/coverage/*' \
    -not -name '.env' -not -name '.env.*' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-12)
}
APP_KEY="app/$STACK/backend-$(huella backend aws/instancia).tar.gz"
WEB_KEY="app/$STACK/frontend-$(huella frontend).tar.gz"
existe_s3() { aws s3api head-object --bucket "$BUCKET" --key "$1" >/dev/null 2>&1; }
copiar_fuentes() {
  mkdir -p "$TRABAJO/src"
  for d in "$@"; do rm -rf "${TRABAJO:?}/src/$d"; done
  tar -C "$RAIZ" --exclude=node_modules --exclude=dist --exclude=coverage \
    --exclude='.env' --exclude='.env.local' --exclude='.env.production' --exclude='.env.development' \
    -cf - "$@" | tar -C "$TRABAJO/src" -xf -
}

if [ "${FORZAR_BUILD:-0}" != 1 ] && existe_s3 "$APP_KEY"; then
  ok "Backend sin cambios ($(basename "$APP_KEY")); se reutiliza."
else
  copiar_fuentes backend aws/instancia
  echo "Backend: instalando dependencias..."
  (cd "$TRABAJO/src/backend" && npm ci --no-audit --no-fund --loglevel=error)
  if [ "${SALTAR_PRUEBAS:-0}" != 1 ]; then
    echo "Backend: pruebas unitarias y de integracion HTTP (1-2 min)..."
    (cd "$TRABAJO/src/backend" && npm run --silent test:unit -- --silent && npm run --silent test:integration -- --silent) \
      || morir "Las pruebas fallaron: no se despliega. (SALTAR_PRUEBAS=1 omite este control bajo su responsabilidad.)"
    ok "Pruebas del backend en verde"
  else
    aviso "Pruebas omitidas (SALTAR_PRUEBAS=1)"
  fi
  (cd "$TRABAJO/src/backend" && npm prune --omit=dev --no-audit --no-fund --loglevel=error && rm -rf __tests__ coverage)
  tar -C "$TRABAJO/src" -czf "$TRABAJO/backend.tar.gz" backend aws/instancia
  aws s3 cp "$TRABAJO/backend.tar.gz" "s3://$BUCKET/$APP_KEY" --only-show-errors
  rm -rf "$TRABAJO/src/backend/node_modules"
  ok "Backend empaquetado ($(du -h "$TRABAJO/backend.tar.gz" | cut -f1))"
fi

if [ "${FORZAR_BUILD:-0}" != 1 ] && existe_s3 "$WEB_KEY"; then
  ok "Frontend sin cambios ($(basename "$WEB_KEY")); se reutiliza."
else
  copiar_fuentes frontend
  echo "Frontend: instalando dependencias y compilando..."
  (cd "$TRABAJO/src/frontend" && rm -f .env .env.* && npm ci --no-audit --no-fund --loglevel=error \
    && VITE_API_URL=/api VITE_WS_URL='' npm run build)
  [ -f "$TRABAJO/src/frontend/dist/index.html" ] || morir "La compilacion del frontend no genero dist/index.html"
  tar -C "$TRABAJO/src/frontend/dist" -czf "$TRABAJO/frontend.tar.gz" .
  aws s3 cp "$TRABAJO/frontend.tar.gz" "s3://$BUCKET/$WEB_KEY" --only-show-errors
  rm -rf "$TRABAJO/src/frontend/node_modules"
  ok "Frontend compilado ($(du -h "$TRABAJO/frontend.tar.gz" | cut -f1))"
fi

# ── 4. Infraestructura (CloudFormation) ────────────────────────────────
titulo "4/7 Infraestructura"
# Dominio propio: solo si el certificado ya esta emitido. Con uno pendiente,
# CloudFront rechaza el alias y TODO el despliegue se revierte.
if [ -n "${DOMINIO:-}" ] || [ -n "${CERTIFICADO_ACM:-}" ]; then
  EST_CERT=$(aws acm describe-certificate --region us-east-1 --certificate-arn "${CERTIFICADO_ACM:-x}" \
    --query Certificate.Status --output text 2>/dev/null || echo NO_ENCONTRADO)
  if [ -z "${DOMINIO:-}" ] || [ "$EST_CERT" != "ISSUED" ]; then
    aviso "El dominio no se configura en este despliegue (certificado: $EST_CERT)."
    aviso "Cuando el certificado figure como Emitido (ISSUED) en ACM, vuelva a ejecutar: bash aws/desplegar.sh"
    DOMINIO=""; CERTIFICADO_ACM=""
  else
    ok "Certificado de $DOMINIO emitido: se configura el dominio."
  fi
fi
PARAMS=(
  "ArtifactsBucket=$BUCKET"
  "ArtifactKey=$APP_KEY"
  "InstanceType=$INSTANCIA_TIPO"
  "ElectionDaySchedule=${AGENDA_ELECCION:-true}"
  "DbInstanceClass=$DB_CLASE"
  "DbMultiAZ=${DB_MULTI_AZ:-true}"
  "RedisNodeType=${REDIS_TIPO:-cache.t4g.small}"
  "RedisMultiAZ=${REDIS_MULTI_AZ:-true}"
  "AlertEmail=${CORREO_ALERTAS:-}"
  "MonthlyBudgetUsd=${PRESUPUESTO_USD:-200}"
  "CustomDomain=${DOMINIO:-}"
  "CustomDomainCertArn=${CERTIFICADO_ACM:-}"
  "JwtExpiresIn=${JWT_DURACION:-12h}"
)
[ "$RENOVAR_BASE" = 1 ] && PARAMS+=("NodeTarballKey=$NODE_KEY" "AmiId=$AMI_ID")

# ¿Esta actualizacion reemplazara servidores? (cambia el launch template)
normalizar() { sed 's/[[:space:]]*$//' | awk 'NF{p=NR} {l[NR]=$0} END{for(i=1;i<=p;i++) print l[i]}'; }
cambia_servidores() {
  [ "$RENOVAR_BASE" = 1 ] && return 0
  [ "$(parametro_pila ArtifactKey)" != "$APP_KEY" ] && return 0
  [ "$(parametro_pila InstanceType)" != "$INSTANCIA_TIPO" ] && return 0
  [ "$(parametro_pila JwtExpiresIn)" != "${JWT_DURACION:-12h}" ] && return 0
  local antes ahora
  antes=$(aws cloudformation get-template --stack-name "$STACK" --query TemplateBody --output text | normalizar | sha256sum)
  ahora=$(normalizar < "$AWS_DIR/plantilla-electoral.yaml" | sha256sum)
  [ "$antes" != "$ahora" ]
}

if [ "$NUEVA" = 1 ]; then
  PREFIJOS_CF=$(aws ec2 describe-managed-prefix-lists \
    --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
    --query 'PrefixLists[0].PrefixListId' --output text)
  [[ "$PREFIJOS_CF" == pl-* ]] || morir "No se encontro la lista de prefijos de CloudFront en $REGION."
  # Version exacta de PostgreSQL 16 (despues no se cambia: evitaria una actualizacion del motor).
  PGVER=$(aws rds describe-db-engine-versions --engine postgres --engine-version 16 \
    --query 'DBEngineVersions[].EngineVersion' --output text | tr '\t' '\n' | sort -V | tail -n 1)
  if [ -z "$PGVER" ] || [ "$(aws rds describe-orderable-db-instance-options --engine postgres \
       --engine-version "$PGVER" --db-instance-class "$DB_CLASE" \
       --query 'length(OrderableDBInstanceOptions)' --output text)" = "0" ]; then
    PGVER=16
  fi
  PARAMS+=(
    "OriginVerifySecret=$(openssl rand -hex 32)"
    "CloudFrontPrefixListId=$PREFIJOS_CF"
    "DbEngineVersion=$PGVER"
    "MinInstances=$MIN_I" "MaxInstances=$MAX_I" "PeakInstances=$PICO_I"
  )
  ok "PostgreSQL $PGVER · servidores: minimo $MIN_I, maximo $MAX_I, pico del 4/10: $PICO_I"
  aviso "La creacion tarda 20-30 minutos (la base de datos Multi-AZ es lo mas lento)."
  aviso "CloudShell se cierra tras ~20 min sin actividad: pulse Enter de vez en cuando."
  aviso "Si igual se cierra, vuelva a ejecutar 'bash aws/desplegar.sh' y retomara."
elif cambia_servidores; then
  aviso "Cambio el backend o la configuracion de los servidores: se reemplazan de a uno"
  aviso "(5-10 min por servidor). Durante ese lapso el autoescalado queda en pausa."
  if [ "$(TZ=America/Lima date +%m%d)" = "1004" ]; then
    aviso "HOY ES EL DIA DE LA ELECCION. Actualizar el backend ahora pausa el autoescalado"
    aviso "y puede saltarse el pre-escalado programado. Hagalo solo si es imprescindible."
    read -r -p "Escriba ACTUALIZAR para continuar: " R
    [ "$R" = "ACTUALIZAR" ] || morir "Cancelado."
  fi
fi

if ! aws cloudformation deploy \
    --stack-name "$STACK" \
    --template-file "$AWS_DIR/plantilla-electoral.yaml" \
    --s3-bucket "$BUCKET" --s3-prefix cfn \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --parameter-overrides "${PARAMS[@]}" \
    --tags Proyecto=sistema-electoral "Pila=$STACK"; then
  diagnosticar_pila
  morir "El despliegue de la infraestructura fallo (ver arriba)."
fi
ok "Infraestructura lista"

URL=$(salida Url)
URL_CF="https://$(salida CloudFrontDomain)"
SITE_BUCKET=$(salida SiteBucketName)
DIST_ID=$(salida DistributionId)

# ── 5. Frontend a S3 + CloudFront ──────────────────────────────────────
titulo "5/7 Frontend"
WEB_DIR="$TRABAJO/web"
rm -rf "$WEB_DIR" && mkdir -p "$WEB_DIR"
aws s3 cp "s3://$BUCKET/$WEB_KEY" "$TRABAJO/frontend.tar.gz" --only-show-errors
tar -xzf "$TRABAJO/frontend.tar.gz" -C "$WEB_DIR"
# Sin --delete a proposito: quien tenga la app abierta sigue pudiendo cargar
# las pantallas de la version anterior (los archivos llevan hash en el nombre).
aws s3 sync "$WEB_DIR" "s3://$SITE_BUCKET" --exclude index.html \
  --cache-control 'public,max-age=31536000,immutable' --only-show-errors
aws s3 cp "$WEB_DIR/index.html" "s3://$SITE_BUCKET/index.html" \
  --cache-control 'no-cache' --content-type 'text/html; charset=utf-8' --only-show-errors
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/index.html' '/' >/dev/null
ok "Frontend publicado"

# Registros del dominio en Route 53 (si la zona esta en esta cuenta).
if [ -n "${DOMINIO:-}" ]; then
  ZONA=""
  NOMBRE=$DOMINIO
  while [ -z "$ZONA" ] && [[ "$NOMBRE" == *.* ]]; do
    ZONA=$(aws route53 list-hosted-zones-by-name --dns-name "$NOMBRE" \
      --query "HostedZones[?Name=='$NOMBRE.' && Config.PrivateZone==\`false\`].Id | [0]" --output text 2>/dev/null || true)
    [ "$ZONA" = "None" ] && ZONA=""
    NOMBRE=${NOMBRE#*.}
  done
  if [ -n "$ZONA" ]; then
    CAMBIOS=$(jq -cn --arg d "$DOMINIO." --arg cf "$(salida CloudFrontDomain)." \
      '{Comment: "electoral: dominio -> CloudFront", Changes: [("A","AAAA") as $t | {Action: "UPSERT",
        ResourceRecordSet: {Name: $d, Type: $t, AliasTarget: {HostedZoneId: "Z2FDTNDATAQYW2", DNSName: $cf, EvaluateTargetHealth: false}}}]}')
    if aws route53 change-resource-record-sets --hosted-zone-id "${ZONA##*/}" --change-batch "$CAMBIOS" >/dev/null; then
      ok "Route 53: $DOMINIO apunta a CloudFront (la propagacion tarda unos minutos)"
    else
      aviso "No se pudieron crear los registros de $DOMINIO en Route 53; creelos a mano (A y AAAA, alias a CloudFront)."
    fi
  else
    aviso "No hay zona de Route 53 para $DOMINIO en esta cuenta: cree registros A/AAAA alias a $(salida CloudFrontDomain)."
  fi
fi

# ── 6. Base de datos ───────────────────────────────────────────────────
titulo "6/7 Base de datos"
ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/inicializar-bd.sh" 900

# ── 7. Verificacion de punta a punta (contra el dominio de CloudFront) ─
titulo "7/7 Verificacion"
FALLOS=0
# shellcheck disable=SC2016,SC2034  # las comprobaciones se evaluan con eval
comprobar() { if eval "$2"; then ok "$1"; else error "$1"; FALLOS=$((FALLOS + 1)); fi; }

for _ in $(seq 1 30); do
  curl -fsS -m 10 "$URL_CF/api/health" >/dev/null 2>&1 && break
  sleep 10
done
SALUD=$(curl -fsS -m 20 "$URL_CF/api/health/full" || echo '{}')
comprobar "API responde por HTTPS con la base conectada" '[ "$(echo "$SALUD" | jq -r .db)" = "true" ]'
comprobar "Redis conectado"                              '[ "$(echo "$SALUD" | jq -r .redis)" = "true" ]'
comprobar "Socket.io sincronizado entre servidores (adapter Redis)" \
  '[ "$(echo "$SALUD" | jq -r .websocket.adapterRedis)" = "true" ]'
comprobar "Pagina principal"                             'curl -fsS -m 20 "$URL_CF/" | grep -q "id=\"root\""'
comprobar "Rutas del SPA (/admin/dashboard -> 200)" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" -m 20 "$URL_CF/admin/dashboard")" = "200" ]'
comprobar "Errores reales de la API llegan intactos (404)" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" -m 20 "$URL_CF/api/no-existe")" = "404" ]'
comprobar "HTTP redirige a HTTPS" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" -m 20 "${URL_CF/https:/http:}/")" = "301" ]'

ADMIN_PASS=$(aws secretsmanager get-secret-value --secret-id "$(salida AdminPasswordSecretArn)" \
  --query SecretString --output text)
LOGIN=$(curl -s -m 20 -X POST "$URL_CF/api/auth/login" -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg p "$ADMIN_PASS" '{dni:"00000000",password:$p}')" || echo '{}')
TOKEN=$(echo "$LOGIN" | jq -r '.data.accessToken // empty' 2>/dev/null || true)
if [ -n "$TOKEN" ]; then
  ok "Login del superadministrador"
  comprobar "Dashboard con datos (base + cache)" \
    '[ "$(curl -s -o /dev/null -w "%{http_code}" -m 20 -H "Authorization: Bearer $TOKEN" "$URL_CF/api/dashboard/resumen")" = "200" ]'
else
  aviso "El login con la clave generada no funciono (normal si importo una base con otras claves)."
fi

MINUTOS=$(( ($(date +%s) - INICIO) / 60 ))
titulo "Listo en $MINUTOS min"
cat <<EOF
  Direccion del sistema:   ${C_OK}$URL${C_0}
  Administradores:         DNI 00000000, 73884790 y 74725178 · clave inicial: ${C_OK}$ADMIN_PASS${C_0}
                           (solo si la base se creo aqui; cada uno debe cambiarla al entrar)
  Panel de monitoreo:      $(salida DashboardUrl)

  Comandos utiles (desde esta carpeta):
    bash aws/estado.sh                       estado de servidores, base y cache
    bash aws/escalar.sh <min> <max>          cambiar numero de servidores
    bash aws/importar-respaldo.sh <archivo>  cargar su base de datos actual
    bash aws/respaldar.sh                    respaldo de la base a S3
    bash aws/prueba-carga.sh preparar        prueba de carga de la jornada completa
    bash aws/verificar-actas.sh              revisa que las actas guardadas cuadren
    bash aws/pausar.sh / reanudar.sh         apagar servidores y base entre fechas
    bash aws/eliminar.sh                     baja total al terminar la eleccion
EOF
if [ -f "$HOME/.electoral-prueba-carga-$STACK" ]; then
  aviso "Hay una prueba de carga preparada. Al terminar de probar: bash aws/prueba-carga.sh deshacer"
fi
[ "$FALLOS" -eq 0 ] || { error "$FALLOS verificaciones fallaron: revise 'bash aws/estado.sh'."; exit 1; }
