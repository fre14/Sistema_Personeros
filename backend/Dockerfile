FROM node:20-alpine

# dumb-init reenvia las senales del sistema al proceso Node, para que el
# apagado ordenado funcione y no se corten peticiones al reiniciar.
RUN apk add --no-cache dumb-init curl tzdata && \
    cp /usr/share/zoneinfo/America/Lima /etc/localtime && \
    echo "America/Lima" > /etc/timezone

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY . .

# Carpeta de actas cuando se usa almacenamiento local
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]
