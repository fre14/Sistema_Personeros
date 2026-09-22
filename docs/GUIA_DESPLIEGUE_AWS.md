# Guía Oficial de Despliegue en AWS (850 Usuarios Concurrentes)

> **Sistema Electoral de Personeros 2026 — 783 Mesas de Sufragio**  
> **Modalidad:** Infraestructura bajo demanda por consumo en AWS (sin contrato anual ni permanencia).  
> **Presupuesto Total:** \$117.64 USD (~S/ 441.17 referencial) por 77 horas de servicio en 4 fases.

---

## 1. Arquitectura en la Nube

La infraestructura está dimensionada para soportar un pico crítico de **850 usuarios concurrentes simultáneos** (personeros transmitiendo actas, coordinadores supervisando y administradores monitoreando en tiempo real):

```
                   [ Usuarios / Personeros ]
                              │
                    (HTTPS / Puerto 443)
                              ▼
                   [ Amazon CloudFront (CDN) ]
                   - Distribución global estáticos SPA
                   - SSL/TLS vía ACM (Certificado gratis)
                   - Aceleración de carga y caché perimetral
                              │
                              ▼
            [ Application Load Balancer (ALB) ]
            - Multi-AZ (us-east-1a, us-east-1b)
            - Terminación SSL y Health Checks automáticos
            - Sticky sessions para WebSockets (Socket.io)
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
    [ ECS Fargate Tarea 1..6 ]          [ ECS Fargate Tarea 1..6 ]
    - Node.js 20 (Express)              - Node.js 20 (Express)
    - Socket.io con Redis Adapter       - Socket.io con Redis Adapter
    - Subida streaming de actas         - Subida streaming de actas
            │                                   │
            ├─────────────────┬─────────────────┤
            ▼                 ▼                 ▼
   [ Amazon RDS Proxy ]  [ ElastiCache Redis ]  [ Amazon S3 ]
   - Pool de conexiones  - Redis 7 en memoria   - Bucket de actas
   - Evita saturación    - Caché dashboard (5s) - URLs seguras
            │            - Pub/Sub WebSockets   - Backup permanente
            ▼
   [ RDS PostgreSQL 16 ]
   - Multi-AZ (Alta disp.)
   - Padrón 783 mesas
```

---

## 2. Fases de Operación y Cronograma

| Fase | Fechas | Horas | Capacidad (Servidores) | Actividad Principal | Costo Estimado |
|---|---|---|---|---|---|
| **Fase 1: Prueba de Carga** | 26 de setiembre | 5 h | 6 tareas Fargate | Simulación con 850 usuarios (k6) | \$31.92 USD |
| **Intermedio: Sin costo** | 27 set – 3 oct | 0 h | Apagado completo | Infraestructura destruida o pausada | \$0.00 USD |
| **Fase 2: Pico Electoral** | 4 de octubre | 5 h | 6 tareas Fargate | Cierre de mesas y transmisión masiva | \$32.92 USD |
| **Fase 3: Cierre Escrutinio** | 4 de octubre | 19 h | 2 tareas Fargate | Monitoreo y validación de actas | \$12.02 USD |
| **Fase 4: Descarga de Datos** | 5 y 6 de octubre | 48 h | 2 tareas Fargate | Descarga de actas por 4 usuarios | \$30.09 USD |
| **Desmontaje Total** | 6 oct (noche) | - | 0 tareas | Eliminación total de recursos | \$0.00 USD |
| **SUBTOTAL** | | **77 h** | | | **\$106.95 USD** |
| **Contingencia (10%)** | | | | Margen de fluctuación de consumo | **\$10.69 USD** |
| **TOTAL APROBADO** | | | | | **\$117.64 USD** |

---

## 3. Desglose del Presupuesto por Servicio

| Servicio AWS | Concepto Facturable | Importe 4 Fases | % del Total |
|---|---|---|---|
| **Balanceador de carga (ALB)** | Horas ALB + unidades LCU procesadas | \$6.07 USD | 5.7% |
| **Servidores de aplicación (ECS Fargate)** | vCPU (0.5) y Memoria (1 GB) por tarea | \$12.58 USD | 11.8% |
| **Caché y mensajería (ElastiCache Redis)** | Instancia cache.t4g.micro | \$5.46 USD | 5.1% |
| **Base de datos (RDS + RDS Proxy)** | db.t4g.small + 100 GB gp3 + Proxy | \$11.53 USD | 10.8% |
| **Almacenamiento (S3)** | Almacenamiento actas + operaciones PUT/GET | \$6.03 USD | 5.6% |
| **Red de contenido (CloudFront)** | Transferencia de salida + solicitudes | \$23.95 USD | 22.4% |
| **Salida a Internet (NAT Gateway)** | Horas NAT Gateway (2 AZ) + datos procesados | \$11.50 USD | 10.8% |
| **Dominio y DNS (Route 53)** | Registro dominio .com (1 año) + zona + consultas | \$19.40 USD | 18.1% |
| **Servicios de apoyo** | ECR, Secrets Manager, CloudWatch Logs, ACM | \$10.42 USD | 9.7% |
| **TOTAL GENERAL** | | **\$106.95 USD** | **100%** |

---

## 4. Requisitos Previos para el Despliegue

1. **Cuenta de AWS activa** con permisos de Administrador.
2. **AWS CLI v2** configurado localmente (`aws configure`).
3. **Docker** instalado para construir la imagen del backend y subirla a Amazon ECR.
4. **Dominio** registrado en Route 53 o delegado.

---

## 5. Procedimiento de Despliegue Paso a Paso

### 5.1. Construcción y Subida de Imagen Docker a ECR

```bash
# Iniciar sesión en ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Crear repositorio si no existe
aws ecr create-repository --repository-name sistema-electoral-backend --region us-east-1

# Construir imagen de producción
docker build -t sistema-electoral-backend ./backend

# Etiquetar y subir
docker tag sistema-electoral-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sistema-electoral-backend:v2.0.0
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sistema-electoral-backend:v2.0.0
```

### 5.2. Despliegue del Frontend a S3 + CloudFront

```bash
# Compilar frontend
cd frontend
npm run build
cd ..

# Sincronizar archivos estáticos al bucket S3 del frontend
aws s3 sync ./frontend/dist s3://sistema-electoral-frontend-2026 --delete

# Invalidar caché de CloudFront
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

### 5.3. Escalado Dinámico de Tareas Fargate por Fase

```bash
# Para Fase 1 (Prueba de carga) y Fase 2 (Pico electoral) - 6 servidores:
aws ecs update-service \
  --cluster sistema-electoral-cluster \
  --service backend-service \
  --desired-count 6

# Para Fase 3 (Cierre) y Fase 4 (Descarga) - 2 servidores:
aws ecs update-service \
  --cluster sistema-electoral-cluster \
  --service backend-service \
  --desired-count 2

# Para Pausar entre el 27 de setiembre y el 3 de octubre - 0 servidores ($0.00):
aws ecs update-service \
  --cluster sistema-electoral-cluster \
  --service backend-service \
  --desired-count 0
```

---

## 6. Procedimiento de Apagado Total y Verificación de Costo Cero

Al concluir la Fase 4 (la noche del 6 de octubre de 2026), se procede a la baja total de todos los recursos para garantizar que no existan cobros posteriores:

1. **Exportar Respaldo Final de Base de Datos y Actas:**
   ```bash
   # Descargar actas de S3 a almacenamiento local
   aws s3 sync s3://sistema-electoral-actas-2026 ./respaldo_final_actas/
   ```

2. **Eliminar Servicios Computacionales:**
   ```bash
   aws ecs update-service --cluster sistema-electoral-cluster --service backend-service --desired-count 0
   aws ecs delete-service --cluster sistema-electoral-cluster --service backend-service --force
   aws ecs delete-cluster --cluster sistema-electoral-cluster
   ```

3. **Eliminar Base de Datos y Caché:**
   ```bash
   aws rds delete-db-instance --db-instance-identifier sistema-electoral-db --skip-final-snapshot
   aws elasticache delete-serverless-cache --serverless-cache-name sistema-electoral-cache
   ```

4. **Eliminar Balanceador y NAT Gateways:**
   ```bash
   aws elbv2 delete-load-balancer --load-balancer-arn <ALB_ARN>
   aws ec2 delete-nat-gateway --nat-gateway-id <NAT_GW_ID>
   ```

5. **Verificación de Consumo:**
   Revisar AWS Cost Explorer el 7 de octubre para confirmar que el consumo diario es **\$0.00 USD**.
