#!/bin/bash
# Arma /etc/electoral/app.env = app.env.base (lo que genera arranque.sh) +
# ajustes opcionales de s3://<artefactos>/config/<pila>/app.env.extra.
# En un archivo de entorno, si una variable se repite gana la ultima linea.
# Se usa con `source` desde arranque.sh y aplicar-config.sh.
# Solo lineas VAR=valor con caracteres seguros (nada que el shell interprete).
EXTRA=$(aws s3 cp "s3://$ARTIFACTS_BUCKET/config/$STACK/app.env.extra" - --region "$REGION" 2>/dev/null \
  | tr -d '\r' | grep -E '^[A-Z][A-Z0-9_]*=[A-Za-z0-9_.,:/@%+=-]*$' || true)
umask 077
{
  cat /etc/electoral/app.env.base
  if [ -n "$EXTRA" ]; then
    echo "# --- ajustes de aws/ajustar-app.sh ---"
    echo "$EXTRA"
  fi
} > /etc/electoral/app.env.nuevo
mv /etc/electoral/app.env.nuevo /etc/electoral/app.env
umask 022
if [ -n "$EXTRA" ]; then
  echo "[$(date '+%F %T')] Ajustes aplicados: $(echo "$EXTRA" | cut -d= -f1 | tr '\n' ' ')"
fi
