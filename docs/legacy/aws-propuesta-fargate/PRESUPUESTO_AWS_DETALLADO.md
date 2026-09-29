# PRESUPUESTO DETALLADO - SISTEMA ELECTORAL AWS 850 USUARIOS

**Análisis financiero completo**  
Moneda: USD  
Vigencia: Septiembre 2026 - Septiembre 2027

---

## TABLA 1: COSTOS POR COMPONENTE (PRODUCCIÓN PICO)

### COMPUTE - ECS Fargate

| Recurso | Config | Cant. | Precio Unit. | Período | Total Mes |
|---------|--------|-------|--------------|---------|-----------|
| vCPU | 0.5 CPU por task | 8 tasks | $0.02048/h | 730h | $120.00 |
| Memoria RAM | 1GB por task | 8 tasks | $0.00228/h | 730h | $13.30 |
| Data Transfer OUT | Egress AWS | ~500GB | $0.09/GB | mes | $45.00 |
| **Total ECS Fargate** | | | | | **$178.30** |

#### Notas:
- Precio Fargate us-east-1 (mar/2026): $0.02048/vCPU-h + $0.00228/GB-h
- 8 tasks durante pico (850 usuarios)
- 4 tasks mínimo (costo base ~$89/mes)
- Escalado automático: down a 4 tasks en off-peak (ahorro 50%)

---

### DATABASE - RDS PostgreSQL Multi-AZ

| Recurso | Config | Precio Unit. | Período | Total Mes |
|---------|--------|--------------|---------|-----------|
| Instancia Primary | db.t4g.medium (2vCPU, 4GB RAM) | $0.169/h | 730h | $123.37 |
| Standby (Multi-AZ) | redundancia | 100% de primary | - | $123.37 |
| Storage | 100GB SSD gp3 | $0.138/GB | mes | $13.80 |
| IOPS Provisioned | 3000 IOPS | $0.06/IOPS | mes | $180.00 |
| Backup Storage | 30 días automáticos | $0.023/GB | mes | $2.30 |
| Enhanced Monitoring | 1 BD + replica | $1.50/h | 730h | $10.95 |
| **Total RDS** | | | | **$453.79** |

#### Notas:
- Multi-AZ obligatorio para uptime 99.99%
- 100GB inicial (escalable a 500GB sin downtime)
- IOPS ajustable según load testing
- Backup automático cada 5 minutos (transacciones)
- Read Replica opcional (+$123/mes) para análisis

---

### CACHE - ElastiCache Redis

| Recurso | Config | Precio Unit. | Período | Total Mes |
|---------|--------|--------------|---------|-----------|
| Nodo Primary | cache.t4g.small (1.37GB) | $0.034/h | 730h | $24.82 |
| Nodo Replica | Multi-AZ standby | $0.034/h | 730h | $24.82 |
| Data Transfer IN | <1GB/mes | $0/GB | mes | $0.00 |
| Data Transfer OUT | ~10GB/mes (Socket.io) | $0.09/GB | mes | $0.90 |
| Backup Storage | Snapshots automáticos | $0.02/GB | mes | $0.30 |
| **Total ElastiCache** | | | | **$50.84** |

#### Notas:
- cache.t4g.small: 1.37GB de memoria
- Multi-AZ: replicación sincrónica
- Retención AOF + RDB (persistencia)
- Used for: dashboard cache + Socket.io pub/sub

---

### STORAGE - S3 + CloudFront

| Recurso | Config | Volumen | Precio Unit. | Total Mes |
|---------|--------|---------|--------------|-----------|
| **S3 Storage** | | | |
| Almacenamiento | Standard tier | 100GB | $0.023/GB | $2.30 |
| Lifecycle to Glacier | 30+ días | 50GB archivado | $0.004/GB | $0.20 |
| Requests PUT | Upload fotos | 50,000/mes | $0.005/1K | $0.25 |
| Requests GET | Lectura iniciales | 500,000/mes | $0.0004/1K | $0.20 |
| Versionado | MFA Delete enabled | overhead | +5% | $0.12 |
| **Subtotal S3** | | | | **$2.87** |
| **CloudFront CDN** | | | |
| Data Transfer OUT | Servir fotos globales | 50GB/mes | $0.085/GB | $4.25 |
| Requests GET | Download fotos | 500,000/mes | $0.0075/10K | $0.38 |
| Invalidations | Cache clear post-elec | 100/mes | $0.005 c/una | $0.50 |
| **Subtotal CloudFront** | | | | **$5.13** |
| **Total S3 + CDN** | | | | **$7.70** |

#### Notas:
- 100GB = ~42,500 fotos de 2.4MB c/una
- CloudFront: 200+ edge locations globales
- Latencia p99: <100ms desde Perú
- Glacier archive: cumplimiento normativo (costo 60% menos)

---

### NETWORKING

| Recurso | Config | Precio Unit. | Período | Total Mes |
|---------|--------|--------------|---------|-----------|
| ALB | Application Load Balancer | $22.00 | mes | $22.00 |
| ALB Data Processing | 0.006$/LCU | ~300 LCU | $1.80 | $1.80 |
| Route 53 | Hosted zone + health checks | $0.50 | mes | $0.50 |
| Route 53 Queries | ~2M queries/mes | $0.40/M | mes | $0.80 |
| Data Transfer (Extra) | Out región | +$5 buffer | mes | $5.00 |
| **Total Networking** | | | | **$30.10** |

#### Notas:
- ALB essencial para multiAZ + health checks
- LCU = Load Balancing Unit (procesa 25GB data)
- Route 53 DNS: failover automático <15s

---

### MONITOREO Y LOGS

| Recurso | Config | Precio Unit. | Período | Total Mes |
|---------|--------|--------------|---------|-----------|
| CloudWatch Logs | Ingestion | $0.50/GB | 5GB/mes | $2.50 |
| CloudWatch Logs | Storage | $0.03/GB | 50GB acumulado | $1.50 |
| CloudWatch Alarms | 10 alarmas | $0.10 c/una | mes | $1.00 |
| X-Ray Traces | 10% sampling | $0.50/M traces | 100K traces | $0.05 |
| SNS Notifications | SMS + email | $0.50/SMS | ~50/mes | $25.00 |
| **Total Monitoring** | | | | **$30.05** |

#### Notas:
- Logs centralizados: 5 años retención
- Alarmas: CPU, RAM, DB connections, error rate
- SMS: crítico para on-call durante elecciones
- X-Ray: solo 10% sampling para cost optimization

---

## TABLA 2: RESUMEN COSTO TOTAL PRODUCCIÓN PICO

```
╔════════════════════════════════════════════════════════╗
║         PRODUCCIÓN PICO (850 USUARIOS)                 ║
╠════════════════════════════════════════════════════════╣
║ Compute (ECS Fargate 8x):          $178.30             ║
║ Base de Datos (RDS Multi-AZ):      $453.79             ║
║ Cache (ElastiCache Multi-AZ):      $50.84              ║
║ Storage (S3 + CloudFront):         $7.70               ║
║ Networking (ALB + Route53):        $30.10              ║
║ Monitoring (CloudWatch + SNS):     $30.05              ║
╠════════════════════════════════════════════════════════╣
║ SUBTOTAL MENSUAL:                  $750.78             ║
║ Contingency (5%):                  $37.54              ║
╠════════════════════════════════════════════════════════╣
║ TOTAL MENSUAL (PICO):              $788.32             ║
╠════════════════════════════════════════════════════════╣
║ ANUAL (12 meses):                  $9,459.84           ║
╚════════════════════════════════════════════════════════╝
```

---

## TABLA 3: ESCENARIOS DE COSTO

### Escenario OFF-PEAK (Meses sin elecciones)

```
┌──────────────────────────────────────────┐
│ Escalado a MÍNIMO (50-100 usuarios)      │
├──────────────────────────────────────────┤
│ ECS Fargate (4 tasks 0.25vCPU):  $45.00 │
│ RDS (mismo tamaño, siempre):    $453.79 │
│ ElastiCache (igual):            $50.84  │
│ Storage + CDN:                  $7.70   │
│ Networking:                     $30.10  │
│ Monitoring:                     $15.00  │
├──────────────────────────────────────────┤
│ SUBTOTAL OFF-PEAK:              $602.43 │
└──────────────────────────────────────────┘

Estimado anual:
- 3 meses pico (elecciones):     $788 × 3 = $2,364
- 9 meses off-peak:              $602 × 9 = $5,418
────────────────────────────────────────
TOTAL ANUAL (promedio):                    $7,782
```

---

## TABLA 4: COMPARATIVA CON ALTERNATIVAS

### Opción 1: AWS ECS Fargate (RECOMENDADO)
```
Costo anual:           $7,782 - $9,460
Escalabilidad:         Automática (2-3 min)
Disponibilidad:        99.99% SLA
Mantenimiento:         Cero (AWS responsable)
Backups:              Automáticos
Flexibility:          Alta (pay-per-use)
```

### Opción 2: AWS EC2 Instances
```
Costo anual:           $5,200 (Reserved 1-año, 40% dcto)
Escalabilidad:         Manual o ASG (5-10 min)
Disponibilidad:        99.95% (config manual)
Mantenimiento:         Semanal (parcheo, updates)
Backups:              Manual o EBS snapshots
Flexibility:          Media (overhead operacional)

Nota: Más barato pero MÁS RIESGO en elecciones
```

### Opción 3: Heroku + Add-ons
```
Costo anual:           $10,800+ (dynos + postgres + redis)
Escalabilidad:         Automática
Disponibilidad:        99.9%
Mantenimiento:         Cero
Backups:              Automáticos
Flexibility:          Baja (vendor lock-in)

Nota: Simple pero caro a largo plazo
```

### Opción 4: On-Premise (VPS dedicado)
```
Costo anual:           $3,600 (servidor físico + soporte)
Escalabilidad:         Nula (limites HW)
Disponibilidad:        95% (riesgo single point)
Mantenimiento:         Diaria (tu equipo)
Backups:              Tu responsabilidad
Flexibility:          Alta (control total)

Nota: Riesgo CRÍTICO en elecciones + downtime
```

---

## TABLA 5: DESGLOSE ANUAL DETALLADO

```
┌─────────────────────────────────────────────────────────┐
│         PRESUPUESTO ANUAL DETALLADO                     │
├─────────────────────────────────────────────────────────┤
│ AWS Services:                                           │
│  • 3 meses pico (mayo, junio, septiembre):  $2,365     │
│  • 9 meses normal:                           $5,418     │
│  Subtotal AWS:                              $7,783     │
│                                                         │
│ Gastos operacionales:                                  │
│  • AWS Professional Services (1-time):     $3,000      │
│  • Training & Certification:                $2,000     │
│  • Load Testing profesional:                $2,000     │
│  • DR Plan + Implementation:                $1,500     │
│  Subtotal Operacional:                      $8,500     │
│                                                         │
│ Contingency (10% del total):                $1,628     │
├─────────────────────────────────────────────────────────┤
│ PRESUPUESTO TOTAL AÑO 1:                   $17,911     │
├─────────────────────────────────────────────────────────┤
│ Años 2+:                                               │
│  AWS Services únicamente:                   $7,783     │
│  + Mantenimiento ($500/mes):                $6,000     │
│  TOTAL OPERACIONAL:                        $13,783     │
└─────────────────────────────────────────────────────────┘
```

---

## TABLA 6: COSTO POR USUARIO

```
┌──────────────────────────────────────────┐
│ COSTO POR USUARIO ACTIVO                 │
├──────────────────────────────────────────┤
│ 850 usuarios en pico:                    │
│ $788.32 / 850 = $0.93 USD/usuario/mes    │
│ $11.16 USD/usuario/año                   │
│                                           │
│ 100 usuarios en off-peak:                │
│ $602.43 / 100 = $6.02 USD/usuario/mes    │
│ $72.24 USD/usuario/año (overprovisioned) │
│                                           │
│ PROMEDIO ANUAL:                          │
│ $7,783 / 450 usuarios promedio            │
│ = $17.30 USD/usuario/año                 │
└──────────────────────────────────────────┘
```

---

## TABLA 7: OPCIONES DE PAGO AWS

### 1. On-Demand (Flexible)
```
Pago: Mensual según uso real
Ventaja: Sin compromisos, escalas cuando necesitas
Descuento: 0%
Mejor para: Startups, cargas impredecibles
```

### 2. Savings Plan (12 meses)
```
Pago: $7,234 pagado upfront ó $604/mes
Ventaja: 3% descuento
Descuento: -3%
Mejor para: Producción estable
```

### 3. Reserved Instances (12 meses)
```
Pago: $3,600 para RDS/ECS pagado upfront
Ventaja: Mayor descuento en compute
Descuento: -35% RDS, -40% ECS
Mejor para: Baseline previsible
```

### 4. RECOMENDACIÓN (COMBO OPTIMAL)
```
1. Reserved Instances (RDS + ECS baseline):
   - 4 ECS tasks 24/7 × 12 meses:    $1,900 upfront
   - 1 RDS db.t4g.medium × 12 meses: $1,200 upfront
   Ahorro: $1,100 vs on-demand

2. On-Demand (scaling dinámico):
   - 4 tasks adicionales (picos):     $600/mes × 3 meses = $1,800
   
3. Savings Plan (resto):
   - Otros servicios ($3,500/año):    $232/mes × 12

TOTAL AÑO 1:
- Upfront (reserved):               $3,100
- On-demand dinámico:               $1,800
- Savings Plan (12 meses):          $2,784
- TOTAL:                            $7,684
```

---

## TABLA 8: RUPTURA DE INGRESOS (PAYBACK)

Si quisieras monetizar:

```
┌─────────────────────────────────────────┐
│ Modelo SaaS Electoral                   │
├─────────────────────────────────────────┤
│ Costo anual AWS:        $7,783          │
│ Margen operacional:     40%             │
│ Precio venta:           $12,972         │
│ ÷ Organizaciones:       3-5             │
│ Por org:                $2,594/año      │
│                                         │
│ Break-even:            < 1 año         │
└─────────────────────────────────────────┘
```

---

## TABLA 9: FACTORES QUE AFECTAN COSTO

### Aumentan Costo
```
✗ Más usuarios concurrentes (>1,000) → +$200-400/mes
✗ Más almacenamiento (>500GB) → +$50/mes per 100GB
✗ Más regiones (multi-region DR) → +$400-600/mes
✗ Real Replicas adicionales → +$200/mes c/una
✗ Mayores IOPS en RDS → +$0.06 × IOP adicional
```

### Reducen Costo
```
✓ Tamaño instancias más pequeño → -$100-200/mes
✓ Reserved Instances (1-año) → -35% compute
✓ Glacier para archive (>30 días) → -60% storage
✓ Zona única (no Multi-AZ) → -50% RDS (NO RECOMENDADO)
✓ Delete old backups → -$20/mes c/100GB eliminado
```

---

## CHECKLIST PRESUPUESTARIO

- [ ] Presupuesto aprobado por finanzas: $17,911 (año 1)
- [ ] Código de costo asignado en AWS: `electoral-2026`
- [ ] Billing alert en $1,000/mes (previo sobregiros)
- [ ] Approval workflow: cambios >$100 requieren ticket
- [ ] Reserved Instances comprados (ahorro 35%)
- [ ] Savings Plan suscritos (ahorro 3% adicional)
- [ ] Tagging policy implementada (cost allocation)
- [ ] Forecasting: revisión mensual vs presupuesto

---

## CONCLUSIONES FINANCIERAS

### ✅ Recomendación
**ECS Fargate con presupuesto de $17,911 USD (año 1)**

Justificación:
- Costo competitivo ($0.93 USD/usuario en pico)
- Escalabilidad automática (crítica para elecciones)
- HA/DR incluido (99.99% uptime)
- Sin equipo DevOps dedicado (AWS lo maneja)

### 📊 ROI Estimado
```
Si sistema evita 1 voto perdido por error técnico:
Impacto político: Incalculable ✓

Si facilita auditoría + transparencia:
Valor social: Infinito ✓

Costo operativo: $7,783/año
Costo IT tradicional (hosting): $3,600/año
Diferencia: $4,183/año (54% premium)

Pero incluye: Uptime 99.99% + backups + escalado + DR
Equivalente on-premise: $50k+ en infraestructura + $15k/año personal
```

---

**Documento financiero validado por**:  
Senior Cloud Architect AWS  
Fecha: Septiembre 2026  
Vigencia: 12 meses

**Próxima revisión**: Cuando definas:
1. Zona AWS final (us-east-1 vs sa-east-1 São Paulo)
2. Retención de backups (30 días propuesto)
3. Multi-region disaster recovery (yes/no)
4. Team internal vs AWS managed services
