#!/bin/bash
# Prueba de carga de la jornada electoral completa, contra el sistema real en AWS.
#
#   bash aws/prueba-carga.sh preparar           respaldo de la base + clave de prueba + limites por IP
#   bash aws/prueba-carga.sh ejecutar humo      ~5 min: comprueba que todo el circuito funciona
#   bash aws/prueba-carga.sh ejecutar jornada   ~35 min: la jornada completa (prueba de aprobacion)
#                                               (tambien: ensayo ~12 min, estres ~15 min)
#   bash aws/prueba-carga.sh resultado          vuelve a seguir o mostrar la ultima prueba
#   bash aws/prueba-carga.sh deshacer           borra usuarios, actas y fotos de prueba; devuelve limites y servidores
#                                               (lo que hiciste en el sistema mientras tanto, p. ej. cargar el Excel, se conserva)
#   bash aws/prueba-carga.sh deshacer --restaurar-respaldo
#                                               ademas vuelve la base ENTERA al respaldo de 'preparar' (solo emergencias)
#
# La carga sale de un servidor temporal en AWS (m7i.xlarge, centavos por
# prueba) que se elimina solo al terminar. Cada 'ejecutar' vuelve a crear los
# usuarios de prueba desde cero, asi cada prueba empieza limpia.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq
MARCA="$HOME/.electoral-prueba-carga-$STACK"
RESULTADOS="$HOME/pruebas-carga"
APP_INST=/opt/electoral/app/aws/instancia
TIPOS_GENERADOR="m7i.xlarge m6i.xlarge m5.xlarge c7i.2xlarge"

duracion_min() {
  case "$1" in humo) echo 5 ;; ensayo) echo 12 ;; jornada) echo 35 ;; estres) echo 15 ;; *) echo 0 ;; esac
}

hoy_en_lima() { TZ=America/Lima date +%F; }

# La prueba borra y restaura datos: nunca el dia de la eleccion.
no_el_dia_de_la_eleccion() {
  if [ "$(hoy_en_lima)" = "2026-10-04" ] && [ "${FORZAR:-}" != "1" ]; then
    morir "Hoy es la jornada electoral: las pruebas de carga estan bloqueadas."
  fi
}

exigir_preparada() {
  [ -f "$MARCA" ] || morir "Primero prepare la prueba: bash aws/prueba-carga.sh preparar"
}

exigir_version_nueva() {
  local perfil
  perfil=$(salida GeneradorCargaPerfil 2>/dev/null || true)
  if [ -z "$perfil" ] || [ "$perfil" = "None" ]; then
    morir "El sistema desplegado es anterior a las pruebas de carga. Actualicelo primero: bash aws/desplegar.sh"
  fi
}

servidores_sanos() {
  aws elbv2 describe-target-health --target-group-arn "$(salida ApiTargetGroupArn)" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" --output text
}

esperar_servidores() {
  local objetivo=$1 limite sanos
  limite=$(( $(date +%s) + 900 ))
  while :; do
    sanos=$(servidores_sanos)
    [ "$sanos" -ge "$objetivo" ] && { ok "$sanos servidores en servicio."; return 0; }
    [ "$(date +%s)" -lt "$limite" ] || morir "Tras 15 minutos solo hay $sanos de $objetivo servidores sanos. Revise: bash aws/estado.sh"
    echo "   $sanos de $objetivo servidores listos; esperando..."
    sleep 30
  done
}

actas_reales() {
  local n
  n=$(ejecutar_en_servidor "bash $APP_INST/generar-datos-prueba.sh --contar-reales" 300 \
    | awk -F= '/^ACTAS_REALES=/ {print $2}' | tail -n 1)
  [[ "$n" =~ ^[0-9]+$ ]] || morir "No se pudo consultar si hay actas reales en la base."
  echo "$n"
}

# Generadores de carga de esta pila que siguen encendidos (por etiqueta).
generadores_activos() {
  aws ec2 describe-instances \
    --filters "Name=tag:Proyecto,Values=$STACK" "Name=tag-key,Values=PruebaCarga" \
              "Name=instance-state-name,Values=pending,running" \
    --query 'Reservations[].Instances[].InstanceId' --output text 2>/dev/null | tr '\t' ' '
}

estado_instancia() { # id -> pending|running|...|terminated (NotFound cuenta como terminada)
  local r
  if r=$(aws ec2 describe-instances --instance-ids "$1" \
      --query 'Reservations[0].Instances[0].State.Name' --output text 2>&1); then
    echo "$r"
  elif echo "$r" | grep -q "InvalidInstanceID.NotFound"; then
    echo terminated
  else
    echo desconocido
  fi
}

# ─────────────────────────────────────────────────────────────────────
preparar() {
  no_el_dia_de_la_eleccion
  exigir_version_nueva
  [ -f "$MARCA" ] && morir "Ya hay una prueba preparada. Ejecute pruebas o deshaga con: bash aws/prueba-carga.sh deshacer"
  case "$(estado_pila)" in
    CREATE_COMPLETE|UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE) ;;
    *) morir "La pila no esta lista ($(estado_pila)). Revise: bash aws/estado.sh" ;;
  esac
  local bucket salida_resp clave inicio
  bucket=$(bucket_artefactos)
  inicio=$(date +%s%3N)

  titulo "1/3 Respaldo de la base de datos"
  local reales
  reales=$(actas_reales)
  [ "$reales" = "0" ] || morir "Ya hay $reales actas reales en el sistema. La prueba de carga es solo para ANTES de la jornada."
  salida_resp=$(ejecutar_en_servidor "bash $APP_INST/respaldo-bd.sh" 1800)
  echo "$salida_resp"
  clave=$(echo "$salida_resp" | awk -F= '/^RESPALDO_S3=/ {print $2}' | tail -n 1)
  [ -n "$clave" ] || morir "No se obtuvo el respaldo; no se continua."
  # Desde aqui, si algo falla, 'deshacer' sabe volver atras.
  echo "$clave" > "$MARCA"
  echo "$inicio" > "$MARCA.inicio"

  titulo "2/3 Clave de los usuarios de prueba"
  umask 077
  openssl rand -hex 12 > "$MARCA.clave"
  aws s3 cp "$MARCA.clave" "s3://$bucket/prueba-carga/clave.txt" --only-show-errors
  ok "Clave generada (solo para los usuarios de prueba, que desaparecen al deshacer)."

  titulo "3/3 Limites por IP"
  # Toda la carga sale de UNA sola IP: con los limites normales casi todo
  # seria rechazado (429) y la prueba mediria el limitador, no la capacidad.
  local err
  if ! err=$(aws s3api head-object --bucket "$bucket" --key "config/$STACK/app.env.extra" 2>&1 >/dev/null); then
    echo "$err" | grep -qE "404|Not Found|NoSuchKey" || morir "No se pudo leer la configuracion actual: $err"
    : > "$MARCA.config"   # no habia ajustes previos
  else
    aws s3 cp "s3://$bucket/config/$STACK/app.env.extra" "$MARCA.config" --only-show-errors
  fi
  bash "$AWS_DIR/ajustar-app.sh" RATE_LIMIT_AUTH=100000 RATE_LIMIT_API=1000000 RATE_LIMIT_WRITE=100000

  titulo "Listo para probar"
  echo "  1) Prueba corta (5 min):        bash aws/prueba-carga.sh ejecutar humo"
  echo "  2) Si sale APROBADA, la jornada: bash aws/prueba-carga.sh ejecutar jornada"
  echo "  3) Al terminar, SIEMPRE:         bash aws/prueba-carga.sh deshacer"
}

# ─────────────────────────────────────────────────────────────────────
lanzar_generador() {
  local run=$1 prefijo=$2 minutos=$3 bucket perfil_iam ami datos id tipo subred
  bucket=$(bucket_artefactos)
  perfil_iam=$(salida GeneradorCargaPerfil)
  ami=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
    --query Parameter.Value --output text)
  datos=$(mktemp)
  cat > "$datos" <<EOF
#!/bin/bash
export BUCKET=$bucket PREFIJO=$prefijo REGION=$REGION TOPE_MIN=$(( minutos + 30 ))
aws s3 cp --region $REGION --only-show-errors "s3://$bucket/$prefijo/generador-carga.sh" /root/generador-carga.sh \
  && bash /root/generador-carga.sh
shutdown -h now
EOF
  for tipo in $TIPOS_GENERADOR; do
    for subred in $(salida SubredPublicaA) $(salida SubredPublicaB); do
      if id=$(aws ec2 run-instances --image-id "$ami" --instance-type "$tipo" --subnet-id "$subred" \
          --iam-instance-profile "Name=$perfil_iam" --instance-initiated-shutdown-behavior terminate \
          --metadata-options HttpTokens=required,HttpEndpoint=enabled \
          --user-data "file://$datos" \
          --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$STACK-generador-carga},{Key=Proyecto,Value=$STACK},{Key=PruebaCarga,Value=$run}]" \
          --query 'Instances[0].InstanceId' --output text 2>"$datos.err"); then
        rm -f "$datos" "$datos.err"
        echo "$id $tipo"
        return 0
      fi
      if grep -q "VcpuLimitExceeded" "$datos.err"; then
        cat "$datos.err" >&2
        morir "Se alcanzo el limite de vCPU de la cuenta. Baje servidores (bash aws/escalar.sh 2) o pida mas cuota."
      fi
    done
  done
  cat "$datos.err" >&2
  rm -f "$datos" "$datos.err"
  morir "No se pudo crear el servidor generador de carga."
}

mostrar_lineas_nuevas() { # archivo desde_linea
  local archivo=$1 desde=$2 avisos
  tail -n +"$((desde + 1))" "$archivo" \
    | grep -E 'tablero provincial|Perfil ' \
    | sed -E 's/^time="[^"]*" level=[a-z]+ msg="//; s/" source=console$//; s/^/   /' || true
  avisos=$(tail -n +"$((desde + 1))" "$archivo" | grep -cE 'level=(warning|error)' || true)
  if [ "${avisos:-0}" -gt 0 ]; then
    aviso "$avisos avisos nuevos de k6, por ejemplo:"
    tail -n +"$((desde + 1))" "$archivo" | grep -E 'level=(warning|error)' | head -n 3 \
      | sed -E 's/^time="[^"]*" //; s/^/     /' | cut -c1-220 || true
  fi
}

seguir() {
  local run perfil id prefijo bucket limite visto=0 est="" anterior="" carpeta st total
  read -r run perfil id < "$MARCA.ultima"
  prefijo="prueba-carga/$run"
  bucket=$(bucket_artefactos)
  carpeta="$RESULTADOS/$run"
  mkdir -p "$carpeta"
  limite=$(( $(date +%s) + ( $(duracion_min "$perfil") + 35 ) * 60 ))
  echo "   (Puede cerrar CloudShell: la prueba sigue en AWS. Para volver: bash aws/prueba-carga.sh resultado)"
  while :; do
    est=$(aws s3 cp "s3://$bucket/$prefijo/estado.txt" - 2>/dev/null || true)
    if [ -n "$est" ] && [ "$est" != "$anterior" ]; then
      echo "[$(date +%T)] Generador: $est"
      anterior=$est
    fi
    if aws s3 cp "s3://$bucket/$prefijo/progreso.log" "$carpeta/progreso.log" --only-show-errors 2>/dev/null; then
      total=$(wc -l < "$carpeta/progreso.log")
      if [ "$total" -gt "$visto" ]; then
        mostrar_lineas_nuevas "$carpeta/progreso.log" "$visto"
        visto=$total
      fi
    fi
    case "$est" in fin*|error*) break ;; esac
    st=$(estado_instancia "$id")
    if [ "$st" = "terminated" ] || [ "$st" = "shutting-down" ] || [ "$st" = "stopped" ]; then
      sleep 5
      est=$(aws s3 cp "s3://$bucket/$prefijo/estado.txt" - 2>/dev/null || true)
      case "$est" in fin*|error*) break ;; esac
      aws s3 cp "s3://$bucket/$prefijo/generador.log" - 2>/dev/null | tail -n 30 || true
      aws ec2 get-console-output --instance-id "$id" --latest --output text 2>/dev/null | tail -n 20 || true
      morir "El generador se apago antes de terminar (estado: ${est:-sin datos})."
    fi
    if [ "$(date +%s)" -ge "$limite" ]; then
      aws ec2 terminate-instances --instance-ids "$id" >/dev/null 2>&1 || true
      morir "La prueba supero el tiempo maximo; se elimino el generador. Revise $carpeta/progreso.log"
    fi
    sleep 20
  done

  if [ "${est#error}" != "$est" ]; then
    aws s3 cp "s3://$bucket/$prefijo/generador.log" - 2>/dev/null | tail -n 40 || true
    morir "El generador no pudo correr la prueba: $est"
  fi

  titulo "Resultado de la prueba ($perfil)"
  aws s3 cp "s3://$bucket/$prefijo/resultado-jornada.txt" "$carpeta/resultado-jornada.txt" --only-show-errors 2>/dev/null || true
  aws s3 cp "s3://$bucket/$prefijo/resultado-jornada.json.gz" "$carpeta/resultado-jornada.json.gz" --only-show-errors 2>/dev/null || true
  if [ -s "$carpeta/resultado-jornada.txt" ]; then
    cat "$carpeta/resultado-jornada.txt"
  else
    tail -n 40 "$carpeta/progreso.log" 2>/dev/null || true
    aviso "k6 no dejo resumen (codigo: ${est#fin })."
  fi

  titulo "Revision de la base de datos"
  ( ejecutar_en_servidor "bash $APP_INST/verificar-integridad.sh" 600 ) || true

  titulo "Siguiente paso"
  echo "  Resultados guardados en: $carpeta"
  case "$perfil" in
    humo) echo "  Si salio APROBADA:   bash aws/prueba-carga.sh ejecutar jornada" ;;
    *)    echo "  Puede repetir la prueba o terminar." ;;
  esac
  echo "  Al terminar SIEMPRE: bash aws/prueba-carga.sh deshacer"
  echo "                       (borra usuarios y actas de prueba y devuelve servidores y limites)"
}

ejecutar() {
  local perfil=${1:-} minutos bucket prefijo run min pico datos_s3 linea id tipo
  minutos=$(duracion_min "$perfil")
  [ "$minutos" != 0 ] || morir "Uso: bash aws/prueba-carga.sh ejecutar humo|ensayo|jornada|estres"
  no_el_dia_de_la_eleccion
  exigir_preparada
  exigir_version_nueva
  bucket=$(bucket_artefactos)
  if [ -n "$(generadores_activos)" ]; then
    morir "Ya hay una prueba corriendo. Para seguirla: bash aws/prueba-carga.sh resultado"
  fi

  if [ "$perfil" = "jornada" ] || [ "$perfil" = "estres" ]; then
    min=$(parametro_pila MinInstances)
    pico=$(parametro_pila PeakInstances)
    if [ "$min" -lt "$pico" ]; then
      titulo "Servidores como el 4 de octubre"
      echo "El dia de la eleccion habra $pico servidores desde las 15:00. Subo de $min a $pico para la prueba"
      echo "(al deshacer vuelven a $min). El autoescalado puede agregar mas si hace falta."
      [ -f "$MARCA.min" ] || echo "$min" > "$MARCA.min"
      bash "$AWS_DIR/escalar.sh" "$pico"
    fi
    esperar_servidores "$(parametro_pila MinInstances)"
  fi

  titulo "Usuarios de prueba (se recrean para que la prueba empiece limpia)"
  linea=$(ejecutar_en_servidor "bash $APP_INST/generar-datos-prueba.sh 10000 5" 900)
  echo "$linea" | grep -E 'Listo:|Se borraron|RESUMEN_PRUEBA|Error' || echo "$linea" | tail -n 5
  datos_s3=$(echo "$linea" | awk -F= '/^DATOS_S3=/ {print $2}' | tail -n 1)
  [ -n "$datos_s3" ] || morir "No se generaron los datos de prueba."

  titulo "Generador de carga"
  run="$(date +%Y%m%d-%H%M%S)-$perfil"
  prefijo="prueba-carga/$run"
  {
    echo "BASE_URL=https://$(salida CloudFrontDomain)"
    echo "PERFIL=$perfil"
    echo "PASS_PRUEBA=$(cat "$MARCA.clave")"
  } > "$MARCA.run.env"
  aws s3 cp "$MARCA.run.env" "s3://$bucket/$prefijo/config.env" --only-show-errors
  rm -f "$MARCA.run.env"
  aws s3 cp "s3://$bucket/$datos_s3" "s3://$bucket/$prefijo/datos-prueba.json" --only-show-errors
  aws s3 cp "$RAIZ/backend/__tests__/load/escenario-jornada-completa.js" "s3://$bucket/$prefijo/" --only-show-errors
  aws s3 cp "$RAIZ/backend/__tests__/load/acta-muestra.jpg" "s3://$bucket/$prefijo/" --only-show-errors
  aws s3 cp "$AWS_DIR/generador-carga.sh" "s3://$bucket/$prefijo/" --only-show-errors

  local creado
  creado=$(lanzar_generador "$run" "$prefijo" "$minutos") || exit 1
  read -r id tipo <<< "$creado"
  echo "$run $perfil $id" > "$MARCA.ultima"
  ok "Generador $id ($tipo) creado. Instala k6 y arranca en ~2 minutos."
  echo
  echo "   Mientras corre, mire el sistema EN VIVO:"
  echo "   - Tablero de resultados: $(salida Url)  (entre con su usuario administrador)"
  echo "   - Servidores y base de datos: $(salida DashboardUrl)"
  echo
  seguir
}

# ─────────────────────────────────────────────────────────────────────
borrar_fotos_de_prueba() {
  local desde=$1 bucket claves n
  bucket=$(salida ActasBucketName)
  # Las fotos se guardan como actas/<mesa>/<milisegundos>-<uuid>.jpg: se borran
  # solo las que se crearon despues de preparar la prueba.
  claves=$(mktemp)
  aws s3api list-objects-v2 --bucket "$bucket" --prefix actas/ --query 'Contents[].Key' --output json 2>/dev/null \
    | jq -r --argjson desde "$desde" '.[]? | select((capture("/(?<t>[0-9]{13})-") | .t | tonumber) >= $desde)' \
    > "$claves" || true
  n=$(wc -l < "$claves")
  if [ "$n" -gt 0 ]; then
    split -l 1000 "$claves" "$claves.parte."
    for parte in "$claves".parte.*; do
      jq -Rn '{Objects: [inputs | {Key: .}], Quiet: true}' < "$parte" > "$parte.json"
      aws s3api delete-objects --bucket "$bucket" --delete "file://$parte.json" >/dev/null
    done
  fi
  rm -f "$claves" "$claves".parte.*
  ok "Fotos de prueba borradas del bucket de actas: $n"
}

deshacer() {
  exigir_preparada
  local modo=${1:-} clave bucket reales ids
  [ -z "$modo" ] || [ "$modo" = "--restaurar-respaldo" ] \
    || morir "Uso: bash aws/prueba-carga.sh deshacer [--restaurar-respaldo]"
  clave=$(cat "$MARCA")
  bucket=$(bucket_artefactos)

  ids=$(generadores_activos)
  if [ -n "$ids" ]; then
    aviso "Hay una prueba corriendo; se detiene el generador."
    # shellcheck disable=SC2086
    aws ec2 terminate-instances --instance-ids $ids >/dev/null
  fi

  if [ "$modo" = "--restaurar-respaldo" ]; then
    no_el_dia_de_la_eleccion
    aviso "La base ENTERA volvera al respaldo de 'preparar' ($clave)."
    aviso "Se pierde TODO lo hecho despues en el sistema (Excel cargado, usuarios, cambios)."
  else
    echo "Se borraran los usuarios, actas y fotos de prueba. Lo demas de la base no se toca."
  fi
  read -r -p "Escriba SI para continuar: " R
  [ "$R" = "SI" ] || morir "Cancelado."

  titulo "1/4 Datos de prueba"
  reales=$(actas_reales)
  if [ "$modo" = "--restaurar-respaldo" ]; then
    [ "$reales" = "0" ] || morir "Hay $reales actas REALES en la base: no se restaura el respaldo."
    ejecutar_en_servidor "bash $APP_INST/restaurar-bd.sh '$clave'" 3600
    ok "Base restaurada al momento previo a la prueba."
  else
    ejecutar_en_servidor "bash $APP_INST/generar-datos-prueba.sh --limpiar" 900
    ok "Usuarios, actas y asignaciones de prueba eliminados; las mesas vuelven a pendiente."
  fi

  titulo "2/4 Limites por IP"
  if [ ! -f "$MARCA.config" ]; then
    echo "Sin cambios (la preparacion no llego a subirlos)."
  else
    if [ -s "$MARCA.config" ]; then
      aws s3 cp "$MARCA.config" "s3://$bucket/config/$STACK/app.env.extra" --only-show-errors
    else
      aws s3 rm "s3://$bucket/config/$STACK/app.env.extra" --only-show-errors 2>/dev/null || true
    fi
    ejecutar_en_todos "bash $APP_INST/aplicar-config.sh"
    ok "Limites restaurados."
  fi

  titulo "3/4 Fotos y archivos de prueba"
  if [ "$reales" != "0" ]; then
    aviso "Hay actas reales: no se borran fotos por fecha (las de prueba no afectan resultados)."
  elif [ -f "$MARCA.inicio" ]; then
    borrar_fotos_de_prueba "$(cat "$MARCA.inicio")"
  fi
  aws s3 rm "s3://$bucket/prueba-carga/clave.txt" --only-show-errors 2>/dev/null || true
  aws s3 rm "s3://$bucket/diagnostico/prueba-carga/" --recursive --only-show-errors 2>/dev/null || true
  # Las configuraciones de cada prueba tenian la clave: se borran, quedan los resultados.
  aws s3 rm "s3://$bucket/prueba-carga/" --recursive --exclude "*" --include "*/config.env" \
    --include "*/datos-prueba.json" --only-show-errors 2>/dev/null || true

  titulo "4/4 Servidores"
  if [ -f "$MARCA.min" ]; then
    bash "$AWS_DIR/escalar.sh" "$(cat "$MARCA.min")"
  else
    echo "Sin cambios (la prueba no los habia subido)."
  fi

  rm -f "$MARCA" "$MARCA.config" "$MARCA.clave" "$MARCA.inicio" "$MARCA.min" "$MARCA.ultima"
  titulo "Listo: el sistema quedo sin rastros de la prueba"
  echo "  Los resultados de las pruebas siguen en: $RESULTADOS"
}

case "${1:-}" in
  preparar) preparar ;;
  ejecutar) ejecutar "${2:-}" ;;
  resultado)
    exigir_preparada
    [ -f "$MARCA.ultima" ] || morir "Todavia no se ejecuto ninguna prueba."
    seguir
    ;;
  deshacer) deshacer "${2:-}" ;;
  *) morir "Uso: bash aws/prueba-carga.sh preparar | ejecutar humo|ensayo|jornada|estres | resultado | deshacer" ;;
esac
