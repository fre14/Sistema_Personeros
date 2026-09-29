# GUÍA DE IMPLEMENTACIÓN AWS - PASO A PASO

**Sistema Electoral para 850 usuarios concurrentes**  
Stack: Node.js 20 + React 18 + PostgreSQL 16 + Redis 7 + S3 + CloudFront

---

## PREREQ: Instala herramientas necesarias

```bash
# En tu PC1 (Windows)

# 1. AWS CLI v2
https://awscli.amazonaws.com/AWSCLIV2.msi
# Verificar: aws --version

# 2. Docker Desktop
https://www.docker.com/products/docker-desktop

# 3. Node.js 20 LTS
https://nodejs.org/en/

# 4. Terraform (opcional pero recomendado)
https://www.terraform.io/downloads.html

# 5. kubectl (si quieres EKS en futuro)
# Por ahora no necesario, Fargate lo reemplaza
```

---

## FASE 1: PREPARACIÓN LOCAL (2 días)

### PASO 1.1: Clonar y preparar proyecto

```bash
# PC2 (ubuntu server o local)
cd /home/jean/

# Ya tienes el proyecto
unzip Sistema_Personeros-main.zip
cd Sistema_Personeros-main

# Crear .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Editar con valores reales (luego populará desde Secrets Manager)
nano backend/.env
# Agregar:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=sistema-electoral-actas-2026
CLOUDFRONT_DOMAIN=d123xyz.cloudfront.net
```

### PASO 1.2: Actualizar código para AWS S3

**Archivo: backend/src/services/storage.service.js**

```javascript
// ❌ ANTES (storage local)
import fs from 'fs';
const uploadDir = '/app/uploads';

// ✅ DESPUÉS (S3)
import AWS from 'aws-sdk';

const s3Client = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export const uploadFileToS3 = async (file, folder = 'actas') => {
  try {
    const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
      Metadata: {
        'uploaded-by': 'sistema-electoral',
        'timestamp': new Date().toISOString()
      }
    };

    const result = await s3Client.upload(params).promise();
    return {
      url: result.Location,
      key: fileName,
      size: file.size,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('[S3 Upload Error]', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

export const deleteFileFromS3 = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key
  };
  return s3Client.deleteObject(params).promise();
};

export const getSignedUrl = async (key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: expiresIn
  };
  return s3Client.getSignedUrl('getObject', params);
};
```

**Archivo: backend/src/config/storage.js**

```javascript
// Nueva configuración
export default {
  type: 'S3',
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET,
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
  s3Config: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
};
```

### PASO 1.3: Actualizar frontend para CloudFront

**Archivo: frontend/src/services/api.js**

```javascript
// ❌ ANTES
const getPhotoUrl = (photoPath) => {
  return `/actas/${photoPath}`;
};

// ✅ DESPUÉS
const getPhotoUrl = (photoPath) => {
  const cloudFrontDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN 
    || 'd123xyz.cloudfront.net';
  return `https://${cloudFrontDomain}/${photoPath}`;
};
```

**Archivo: frontend/.env**

```env
VITE_API_BASE_URL=https://api.sistema-electoral.gob.pe
VITE_CLOUDFRONT_DOMAIN=d123xyz.cloudfront.net
VITE_SOCKET_URL=https://api.sistema-electoral.gob.pe
```

### PASO 1.4: Actualizar dependencias backend

```bash
cd backend

# Agregar AWS SDK
npm install aws-sdk

# Actualizar packages.json
# package.json ahora incluye:
#   "@aws-sdk/client-s3": "^3.400.0"
#   "@aws-sdk/lib-storage": "^3.400.0"

npm install
```

### PASO 1.5: Build local test

```bash
# Construir imagen backend
docker build -t sistema-electoral-backend:latest .

# Test local
docker run -it \
  -e NODE_ENV=development \
  -e DB_HOST=localhost \
  -p 3000:3000 \
  sistema-electoral-backend:latest

# Debe iniciar sin errores (verás conectando a BD que no existe, es ok)
# Ctrl+C para detener
```

### PASO 1.6: Build frontend

```bash
cd frontend

npm install
npm run build

# Genera /frontend/dist/ con HTML estático listo para CDN
ls dist/
# index.html, assets/, etc.
```

---

## FASE 2: SETUP INFRAESTRUCTURA AWS (1-2 días)

### PASO 2.1: Crear cuenta AWS (si no la tienes)

```bash
# URL: https://aws.amazon.com/
# Datos:
# - Email corporativo
# - Tarjeta de crédito (verificación)
# - Teléfono
# - Dirección Perú

# Resultado: Account ID (123456789012), credenciales root
# ⚠️ NUNCA uses credenciales root, crea IAM user!

# Setup MFA en root account ASAP
```

### PASO 2.2: Crear IAM User con permisos

```bash
# En AWS Console → IAM → Users → Create User

# Nombre: jean-terraform
# Políticas attach:
#   - AdministratorAccess (temporal, para setup)
#   - EC2FullAccess
#   - RDSFullAccess
#   - S3FullAccess
#   - ElastiCacheFullAccess
#   - ECSFullAccess
#   - CloudFrontFullAccess
#   - Route53FullAccess
#   - CloudWatchFullAccess

# Generar Access Key
# Guardar en PC1: C:\Users\jeanp\.aws\credentials
```

**Archivo: C:\Users\jeanp\.aws\credentials**

```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...

[electoral]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
region = us-east-1
```

### PASO 2.3: Crear VPC y Subnets

```bash
# PC1 PowerShell (o terminal Linux con AWS CLI)

aws configure --profile electoral
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Default output: json

# Crear VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=electoral-vpc}]' \
  --profile electoral \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC ID: $VPC_ID"

# Crear subnets en 2 zonas (High Availability)
SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --profile electoral \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --profile electoral \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Subnets: $SUBNET_1, $SUBNET_2"

# Internet Gateway
IGW=$(aws ec2 create-internet-gateway \
  --profile electoral \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW \
  --profile electoral

# Route table
RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --profile electoral \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW \
  --profile electoral
```

### PASO 2.4: Crear RDS PostgreSQL

```bash
# Variables
DB_IDENTIFIER="sistema-electoral-db"
DB_USER="electoral_user"
DB_PASSWORD="TuContraseña123!XYZ"  # Cambiar
DB_NAME="sistema_electoral"
DB_SUBNET_GROUP="electoral-db-subnet"

# Crear DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name $DB_SUBNET_GROUP \
  --db-subnet-group-description "Subnets para electoral DB" \
  --subnet-ids $SUBNET_1 $SUBNET_2 \
  --profile electoral

# Crear RDS Instance (15 minutos)
aws rds create-db-instance \
  --db-instance-identifier $DB_IDENTIFIER \
  --db-instance-class db.t4g.medium \
  --engine postgres \
  --engine-version 16.0 \
  --master-username $DB_USER \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --iops 3000 \
  --db-name $DB_NAME \
  --db-subnet-group-name $DB_SUBNET_GROUP \
  --publicly-accessible false \
  --storage-encrypted \
  --backup-retention-period 30 \
  --multi-az \
  --enable-cloudwatch-logs-exports postgresql \
  --profile electoral

# Esperar a que esté available
aws rds describe-db-instances \
  --db-instance-identifier $DB_IDENTIFIER \
  --profile electoral \
  --query 'DBInstances[0].DBInstanceStatus'
# Salida: "available" = listo
```

### PASO 2.5: Crear ElastiCache Redis

```bash
# Crear Redis subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name electoral-cache-subnet \
  --cache-subnet-group-description "Redis para Socket.io" \
  --subnet-ids $SUBNET_1 $SUBNET_2 \
  --profile electoral

# Crear Redis cluster
REDIS_PASSWORD="RedisPass123!XYZ"

aws elasticache create-cache-cluster \
  --cache-cluster-id sistema-electoral-cache \
  --cache-node-type cache.t4g.small \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name electoral-cache-subnet \
  --auto-failover-enabled \
  --auth-token "$REDIS_PASSWORD" \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --profile electoral

# Con Multi-AZ (recomendado):
aws elasticache create-replication-group \
  --replication-group-id sistema-electoral-cache-mz \
  --replication-group-description "Redis Multi-AZ" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t4g.small \
  --num-cache-clusters 2 \
  --cache-subnet-group-name electoral-cache-subnet \
  --automatic-failover-enabled \
  --auth-token "$REDIS_PASSWORD" \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --profile electoral
```

### PASO 2.6: Crear S3 Bucket

```bash
# Variables
BUCKET_NAME="sistema-electoral-actas-2026"
REGION="us-east-1"

# Crear bucket
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION \
  --profile electoral

# Habilitar versionado (recuperación de actas)
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled \
  --profile electoral

# Habilitar servidor de logs
aws s3api put-bucket-logging \
  --bucket $BUCKET_NAME \
  --bucket-logging-status file://logging.json \
  --profile electoral

# logging.json:
cat > logging.json <<EOF
{
  "LoggingEnabled": {
    "TargetBucket": "$BUCKET_NAME-logs",
    "TargetPrefix": "s3-access-logs/"
  }
}
EOF

# Crear Lifecycle policy (Glacier después 30 días)
cat > lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "Archive to Glacier after 30 days",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration file://lifecycle.json \
  --profile electoral

# Block public access (seguridad)
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile electoral
```

### PASO 2.7: Crear CloudFront Distribution

```bash
# crear distribucion CDN
cat > cloudfront-config.json <<EOF
{
  "CallerReference": "electoral-$(date +%s)",
  "Comment": "CDN para actas electorales",
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "https-only",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "TargetOriginId": "S3Origin"
  },
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "$BUCKET_NAME.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  }
}
EOF

aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --profile electoral
```

---

## FASE 3: BUILD Y PUSH A ECR (1 día)

### PASO 3.1: Crear ECR Repository

```bash
# Crear registro ECR
aws ecr create-repository \
  --repository-name sistema-electoral-backend \
  --region us-east-1 \
  --profile electoral

# Resultado:
# "repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/sistema-electoral-backend"

REGISTRY_URI="123456789012.dkr.ecr.us-east-1.amazonaws.com"
```

### PASO 3.2: Build y push imagen backend

```bash
# En PC1 PowerShell

cd C:\Users\jeanp\...\Sistema_Personeros-main\backend

# Login a ECR
aws ecr get-login-password --region us-east-1 --profile electoral `
  | docker login --username AWS --password-stdin $REGISTRY_URI

# Build imagen
docker build \
  -t $REGISTRY_URI/sistema-electoral-backend:latest \
  -t $REGISTRY_URI/sistema-electoral-backend:v1.0 \
  .

# Push a ECR
docker push $REGISTRY_URI/sistema-electoral-backend:latest
docker push $REGISTRY_URI/sistema-electoral-backend:v1.0

# Verificar
aws ecr describe-images \
  --repository-name sistema-electoral-backend \
  --profile electoral
```

---

## FASE 4: DEPLOY ECS FARGATE (1 día)

### PASO 4.1: Crear ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name electoral-cluster \
  --profile electoral

# Ver cluster
aws ecs describe-clusters \
  --clusters electoral-cluster \
  --profile electoral
```

### PASO 4.2: Crear Task Definition

```bash
cat > task-definition.json <<EOF
{
  "family": "sistema-electoral-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "$REGISTRY_URI/sistema-electoral-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        },
        {
          "name": "S3_BUCKET",
          "value": "sistema-electoral-actas-2026"
        }
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:electoral/db/host"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:electoral/db/password"
        },
        {
          "name": "AWS_ACCESS_KEY_ID",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:electoral/aws/access-key"
        },
        {
          "name": "AWS_SECRET_ACCESS_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:electoral/aws/secret-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/electoral-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole"
}
EOF

# Registrar task
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --profile electoral
```

### PASO 4.3: Crear ALB (Application Load Balancer)

```bash
# Crear ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name electoral-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups sg-electoral \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --profile electoral \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Crear target group
TG_ARN=$(aws elbv2 create-target-group \
  --name electoral-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 3 \
  --unhealthy-threshold-count 3 \
  --profile electoral \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Listener (HTTP)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --profile electoral
```

### PASO 4.4: Crear ECS Service

```bash
aws ecs create-service \
  --cluster electoral-cluster \
  --service-name backend-service \
  --task-definition sistema-electoral-backend:1 \
  --desired-count 4 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[sg-backend],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=backend,containerPort=3000 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --profile electoral

# Ver servicio
aws ecs describe-services \
  --cluster electoral-cluster \
  --services backend-service \
  --profile electoral
```

---

## FASE 5: VALIDACIÓN Y TESTING (1 día)

### PASO 5.1: Health checks

```bash
# Verificar ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names electoral-alb \
  --profile electoral \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB URL: http://$ALB_DNS"

# Test API
curl -s http://$ALB_DNS/api/health | jq .

# Debe retornar: {"status":"ok"}
```

### PASO 5.2: Verificar tasks running

```bash
aws ecs describe-tasks \
  --cluster electoral-cluster \
  --tasks $(aws ecs list-tasks --cluster electoral-cluster --profile electoral --query 'taskArns[]' --output text) \
  --profile electoral

# Debe mostrar 4 tasks en RUNNING state
```

### PASO 5.3: Load testing (850 usuarios)

```bash
# Instalar K6 (load testing tool)
# https://k6.io/docs/getting-started/installation/

# Ejecutar test
k6 run tests/load/escenario-800-usuarios.js \
  --vus 850 \
  --duration 5m \
  --rps 100 \
  -e API_URL=http://$ALB_DNS

# Resultados esperados:
# - Response time p95: < 500ms
# - Error rate: < 0.1%
# - Throughput: > 100 req/s
```

### PASO 5.4: Test de failover

```bash
# Detener 1 task manualmente
TASK_ID=$(aws ecs list-tasks --cluster electoral-cluster --profile electoral --query 'taskArns[0]' --output text | awk -F/ '{print $NF}')

aws ecs stop-task \
  --cluster electoral-cluster \
  --task $TASK_ID \
  --profile electoral

# ECS Auto Scaling debería:
# 1. Detectar en <30s
# 2. Lanzar tarea nueva
# 3. Usuarios: SIN INTERRUPCIÓN (ALB mantiene conexiones)

# Ver logs de transition
aws ecs describe-services \
  --cluster electoral-cluster \
  --services backend-service \
  --profile electoral | jq '.services[0].events[] | select(.message | contains("task"))'
```

---

## FASE 6: CONFIGURACIÓN DOMINIO Y SSL (1 día)

### PASO 6.1: Route 53 DNS

```bash
# Si no tienes dominio:
# 1. Comprar en Route 53: sistema-electoral.gob.pe
# 2. O transferir dominio existente

# Crear hosted zone (si nuevo dominio)
ZONE_ID=$(aws route53 create-hosted-zone \
  --name sistema-electoral.gob.pe \
  --caller-reference "electoral-$(date +%s)" \
  --profile electoral \
  --query 'HostedZone.Id' \
  --output text)

# Crear registro A (ALB)
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"sistema-electoral.gob.pe\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"Z35SXDOTRQ7X7K\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": true
        }
      }
    }]
  }" \
  --profile electoral

# Crear registro CNAME para API
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"api.sistema-electoral.gob.pe\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"$ALB_DNS\"}]
      }
    }]
  }" \
  --profile electoral
```

### PASO 6.2: SSL Certificate (ACM)

```bash
# Solicitar certificado SSL
CERT_ARN=$(aws acm request-certificate \
  --domain-name sistema-electoral.gob.pe \
  --subject-alternative-names api.sistema-electoral.gob.pe \
  --validation-method DNS \
  --region us-east-1 \
  --profile electoral \
  --query 'CertificateArn' \
  --output text)

# Validar certificado (DNS validation)
# AWS enviará email con instrucciones de validación
# O usar CloudFormation para auto-validar

# Esperar validación (~5 minutos)
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --profile electoral \
  --query 'Certificate.DomainValidationOptions[0].ValidationStatus'
```

### PASO 6.3: HTTPS en ALB

```bash
# Crear listener HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
  --profile electoral

# Redirigir HTTP → HTTPS
aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --profile electoral
```

---

## FASE 7: SECRETS Y VARIABLES ENTORNO (1 día)

### PASO 7.1: AWS Secrets Manager

```bash
# Almacenar credenciales de forma segura
aws secretsmanager create-secret \
  --name electoral/db/host \
  --secret-string "sistema-electoral-db.xxxxx.us-east-1.rds.amazonaws.com" \
  --region us-east-1 \
  --profile electoral

aws secretsmanager create-secret \
  --name electoral/db/password \
  --secret-string "TuContraseña123!XYZ" \
  --region us-east-1 \
  --profile electoral

aws secretsmanager create-secret \
  --name electoral/db/user \
  --secret-string "electoral_user" \
  --region us-east-1 \
  --profile electoral

aws secretsmanager create-secret \
  --name electoral/redis/host \
  --secret-string "sistema-electoral-cache.xxxxx.ng.0001.use1.cache.amazonaws.com" \
  --region us-east-1 \
  --profile electoral

aws secretsmanager create-secret \
  --name electoral/redis/password \
  --secret-string "RedisPass123!XYZ" \
  --region us-east-1 \
  --profile electoral

aws secretsmanager create-secret \
  --name electoral/aws/access-key \
  --secret-string "AKIA...." \
  --region us-east-1 \
  --profile electoral
```

### PASO 7.2: IAM Roles para ECS

```bash
# Crear IAM role para ejecución (pull imágenes, acceder Secrets)
cat > ecs-task-execution-role.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:electoral/*"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-role.json \
  --profile electoral

# Crear IAM role para aplicación (acceso S3, Secrets)
cat > ecs-task-role.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sistema-electoral-actas-2026",
        "arn:aws:s3:::sistema-electoral-actas-2026/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:electoral/*"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://ecs-task-role.json \
  --profile electoral
```

---

## FASE 8: MONITOREO Y ALERTAS (1 día)

### PASO 8.1: CloudWatch Logs

```bash
# Crear log group
aws logs create-log-group \
  --log-group-name /ecs/electoral-backend \
  --region us-east-1 \
  --profile electoral

# Retención: 30 días
aws logs put-retention-policy \
  --log-group-name /ecs/electoral-backend \
  --retention-in-days 30 \
  --region us-east-1 \
  --profile electoral
```

### PASO 8.2: CloudWatch Alarms

```bash
# CPU alta
aws cloudwatch put-metric-alarm \
  --alarm-name electoral-ecs-cpu-high \
  --alarm-description "Alertar si CPU > 85%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:AlertaSNS \
  --profile electoral

# DB Connections altas
aws cloudwatch put-metric-alarm \
  --alarm-name electoral-db-connections-high \
  --alarm-description "Alertar si conexiones > 80" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:AlertaSNS \
  --profile electoral
```

### PASO 8.3: SNS para notificaciones

```bash
# Crear SNS Topic
TOPIC_ARN=$(aws sns create-topic \
  --name electoral-alerts \
  --region us-east-1 \
  --profile electoral \
  --query 'TopicArn' \
  --output text)

# Suscribir email
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint tu-email@gob.pe \
  --region us-east-1 \
  --profile electoral

# Suscribir SMS
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol sms \
  --notification-endpoint "+51999999999" \
  --region us-east-1 \
  --profile electoral
```

---

## CHECKLIST FINAL

- [ ] VPC + Subnets creados
- [ ] RDS PostgreSQL online (verify: describe-db-instances)
- [ ] ElastiCache Redis online
- [ ] S3 bucket con lifecycle policy
- [ ] ECR repository creado
- [ ] Task definition registrada
- [ ] ECS Service corriendo (4 tasks)
- [ ] ALB health checks green
- [ ] Route 53 DNS resolviendo
- [ ] SSL Certificate validado
- [ ] Secrets Manager poblado
- [ ] CloudWatch logs activos
- [ ] Alarms configuradas
- [ ] Load test pasado (850 usuarios)
- [ ] Failover test pasado

---

## COMANDO FINAL DE VERIFICACIÓN

```bash
#!/bin/bash
# save como verify-deployment.sh

PROFILE="electoral"

echo "=== VERIFICACIÓN DE DESPLIEGUE ==="

# 1. ECS
echo -n "✓ ECS Cluster: "
aws ecs describe-clusters --clusters electoral-cluster --profile $PROFILE --query 'clusters[0].clusterStatus' --output text

# 2. Tasks
echo -n "✓ ECS Tasks running: "
aws ecs list-tasks --cluster electoral-cluster --profile $PROFILE --query 'taskArns | length(@)' --output text

# 3. RDS
echo -n "✓ RDS Status: "
aws rds describe-db-instances --db-instance-identifier sistema-electoral-db --profile $PROFILE --query 'DBInstances[0].DBInstanceStatus' --output text

# 4. Redis
echo -n "✓ Redis Status: "
aws elasticache describe-cache-clusters --cache-cluster-id sistema-electoral-cache --profile $PROFILE --query 'CacheClusters[0].CacheClusterStatus' --output text

# 5. ALB
echo -n "✓ ALB Health: "
ALB_ARN=$(aws elbv2 describe-load-balancers --names electoral-alb --profile $PROFILE --query 'LoadBalancers[0].LoadBalancerArn' --output text)
aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names electoral-backend-tg --profile $PROFILE --query 'TargetGroups[0].TargetGroupArn' --output text) --profile $PROFILE --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' --output text

# 6. S3
echo -n "✓ S3 Bucket: "
aws s3api head-bucket --bucket sistema-electoral-actas-2026 --region us-east-1 --profile $PROFILE 2>&1 && echo "OK" || echo "ERROR"

echo ""
echo "=== DESPLIEGUE COMPLETADO ==="
```

```bash
bash verify-deployment.sh
```

---

## PRÓXIMOS PASOS DESPUÉS DE DEPLOYMENT

1. **Crear políticas de backup**
   ```bash
   # RDS: snapshots automáticos cada 24h (ya default)
   # S3: versionado + Glacier (ya configurado)
   ```

2. **Setup CI/CD (GitHub Actions)**
   - Push a GitHub → automático ECR build+push → ECS update

3. **Configurar CloudFormation** (IaC)
   - Replicable deployment en otras cuentas/regiones

4. **Loadbalancer con WAF**
   - Protección contra SQL injection, XSS, DDoS

5. **Multi-region DR** (futuro)
   - Replicar a sa-east-1 São Paulo (backup región)

---

**Documento completado**: Septiembre 2026  
**Duración total estimada**: 8 días laborales  
**Equipo recomendado**: 1 DevOps Senior + 1 Backend Developer
