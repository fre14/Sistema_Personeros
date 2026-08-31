-- =====================================================
-- SISTEMA ELECTORAL HUAMANGA 2026 - INICIALIZACION BD
-- =====================================================

-- 1. TABLA DISTRITOS
CREATE TABLE IF NOT EXISTS distritos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA USUARIOS
DO  BEGIN
    CREATE TYPE rol_usuario AS ENUM ('admin', 'coordinador', 'personero');
EXCEPTION WHEN duplicate_object THEN null; END ;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA LOCALES DE VOTACION
CREATE TABLE IF NOT EXISTS locales_votacion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    direccion VARCHAR(300),
    distrito_id INTEGER NOT NULL REFERENCES distritos(id) ON DELETE RESTRICT,
    total_mesas INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA MESAS DE SUFRAGIO
DO  BEGIN
    CREATE TYPE estado_mesa AS ENUM ('pendiente', 'reportada', 'verificada', 'observada');
EXCEPTION WHEN duplicate_object THEN null; END ;

CREATE TABLE IF NOT EXISTS mesas_sufragio (
    id SERIAL PRIMARY KEY,
    numero_mesa VARCHAR(10) UNIQUE NOT NULL,
    local_id INTEGER NOT NULL REFERENCES locales_votacion(id) ON DELETE CASCADE,
    total_electores_habiles INTEGER DEFAULT 0,
    estado estado_mesa DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA CANDIDATOS
CREATE TABLE IF NOT EXISTS candidatos (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    organizacion_politica VARCHAR(200) NOT NULL,
    siglas VARCHAR(20),
    logo_url VARCHAR(500),
    numero_lista INTEGER NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA ASIGNACION COORDINADORES
CREATE TABLE IF NOT EXISTS asignacion_coordinadores (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id INTEGER NOT NULL REFERENCES locales_votacion(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    asignado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_usuario_local UNIQUE (usuario_id, local_id)
);

-- 7. TABLA ASIGNACION PERSONEROS
CREATE TABLE IF NOT EXISTS asignacion_personeros (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mesa_id INTEGER NOT NULL UNIQUE REFERENCES mesas_sufragio(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    asignado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA HISTORIAL ASIGNACIONES
DO  BEGIN
    CREATE TYPE tipo_asignacion AS ENUM ('coordinador', 'personero');
EXCEPTION WHEN duplicate_object THEN null; END ;

CREATE TABLE IF NOT EXISTS historial_asignaciones (
    id SERIAL PRIMARY KEY,
    tipo tipo_asignacion NOT NULL,
    usuario_anterior_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nuevo_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mesa_id INTEGER REFERENCES mesas_sufragio(id) ON DELETE SET NULL,
    local_id INTEGER REFERENCES locales_votacion(id) ON DELETE SET NULL,
    motivo_cambio TEXT,
    cambiado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA RESULTADOS MESA
DO  BEGIN
    CREATE TYPE estado_resultado AS ENUM ('pendiente', 'verificado', 'observado');
EXCEPTION WHEN duplicate_object THEN null; END ;

CREATE TABLE IF NOT EXISTS resultados_mesa (
    id SERIAL PRIMARY KEY,
    mesa_id INTEGER NOT NULL REFERENCES mesas_sufragio(id) ON DELETE CASCADE,
    personero_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    foto_acta_url VARCHAR(500),
    votos_blanco INTEGER DEFAULT 0,
    votos_nulo INTEGER DEFAULT 0,
    votos_impugnados INTEGER DEFAULT 0,
    total_votos_emitidos INTEGER DEFAULT 0,
    total_cedulas_votacion INTEGER DEFAULT 0,
    estado estado_resultado DEFAULT 'pendiente',
    observaciones_personero TEXT,
    observaciones_coordinador TEXT,
    verificado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    verificado_en TIMESTAMP,
    version INTEGER DEFAULT 1,
    subido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA DETALLE RESULTADOS
CREATE TABLE IF NOT EXISTS detalle_resultados (
    id SERIAL PRIMARY KEY,
    resultado_id INTEGER NOT NULL REFERENCES resultados_mesa(id) ON DELETE CASCADE,
    candidato_id INTEGER NOT NULL REFERENCES candidatos(id) ON DELETE RESTRICT,
    votos INTEGER DEFAULT 0,
    CONSTRAINT unq_resultado_candidato UNIQUE (resultado_id, candidato_id)
);

-- 11. TABLA AUDITORIA
DO  BEGIN
    CREATE TYPE accion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION WHEN duplicate_object THEN null; END ;

CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id INTEGER NOT NULL,
    accion accion_auditoria NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);

-- =====================================================
-- SEED DATA: DISTRITOS DE HUAMANGA
-- =====================================================
INSERT INTO distritos (nombre, codigo) VALUES
    ('Ayacucho', 'AYA'),
    ('Acocro', 'ACO'),
    ('Acos Vinchos', 'ACV'),
    ('Carmen Alto', 'CAL'),
    ('Chiara', 'CHI'),
    ('Jesús Nazareno', 'JNA'),
    ('Ocros', 'OCR'),
    ('Pacaycasa', 'PAC'),
    ('Quinua', 'QUI'),
    ('San José de Ticllas', 'SJT'),
    ('San Juan Bautista', 'SJB'),
    ('Santiago de Pischa', 'SDP'),
    ('Socos', 'SOC'),
    ('Tambillo', 'TAM'),
    ('Vinchos', 'VIN'),
    ('Andrés Avelino Cáceres Dorregaray', 'AAC')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- SEED DATA: USUARIO ADMINISTRADOR (DNI: 00000000 / Clave: admin123)
-- =====================================================
INSERT INTO usuarios (dni, nombres, apellidos, password_hash, rol, activo) VALUES
    ('00000000', 'Administrador', 'Sistema', '.fG3pZ1c7e9K3pZ1c7e9K3pZ1c7', 'admin', TRUE)
ON CONFLICT (dni) DO NOTHING;

-- =====================================================
-- SEED DATA: LOCALES Y MESAS DE HUAMANGA (787 MESAS)
-- =====================================================
DO 
DECLARE
    v_dist_id INT;
    v_local_id INT;
BEGIN
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE GENERAL TRINIDAD MORAN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE GENERAL TRINIDAD MORAN', 'AV 6 DE OCTUBRE SN', v_dist_id, 16)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000001', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000002', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000003', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000004', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000005', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000006', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000007', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000008', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000009', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000010', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000011', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000012', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000013', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000014', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000015', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000016', v_local_id, 275, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38574 - SECCELAMBRAS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38574 - SECCELAMBRAS', 'PLAZA PRINCIPAL SN', v_dist_id, 4)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000017', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000018', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000019', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000020', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE HERMILIO VALDIZAN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE HERMILIO VALDIZAN', 'JR MARISCAL CACERES SN - PAMPAMARCA', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000021', v_local_id, 247, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000022', v_local_id, 247, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000023', v_local_id, 246, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE CORONEL SANTIAGO MARCELINO CARREÑO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE CORONEL SANTIAGO MARCELINO CARREÑO', 'CCPP JESUS NAZARENO DE CHONTACA SN', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000024', v_local_id, 249, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000025', v_local_id, 249, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000026', v_local_id, 249, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-29' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-29', 'CCPP SAN MARTIN DE CCOLLCCA SN', v_dist_id, 4)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000027', v_local_id, 224, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000028', v_local_id, 224, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000029', v_local_id, 224, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000030', v_local_id, 223, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acos Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MARISCAL GUILLERMO MILLER' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE MARISCAL GUILLERMO MILLER', 'JR AQUILES LANAO FLORES SN', v_dist_id, 16)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000031', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000032', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000033', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000034', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000035', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000036', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000037', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000038', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000039', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000040', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000041', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000042', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000043', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000044', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000045', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000046', v_local_id, 269, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Andrés Avelino Cáceres Dorregaray';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE NUESTRA SEÑORA DE LAS MERCEDES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE NUESTRA SEÑORA DE LAS MERCEDES', 'AV LAS MERCEDES 351', v_dist_id, 32)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000047', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000048', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000049', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000050', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000051', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000052', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000053', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000054', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000055', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000056', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000057', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000058', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000059', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000060', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000061', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000062', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000063', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000064', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000065', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000066', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000067', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000068', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000069', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000070', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000071', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000072', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000073', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000074', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000075', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000076', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000077', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000078', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Andrés Avelino Cáceres Dorregaray';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-18 JOSÉ ABEL ALFARO PACHECO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-18 JOSÉ ABEL ALFARO PACHECO', 'JR MARÍA AUXILIADORA SN', v_dist_id, 10)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000079', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000080', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000081', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000082', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000083', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000084', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000085', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000086', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000087', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000088', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Andrés Avelino Cáceres Dorregaray';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SIMON BOLIVAR' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE SIMON BOLIVAR', 'JR MOQUEGUA SN', v_dist_id, 12)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000089', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000090', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000091', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000092', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000093', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000094', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000095', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000096', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000097', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000098', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000099', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000100', v_local_id, 281, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'PLANTELES DE APLICACIÓN GUAMÁN POMA DE AYALA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('PLANTELES DE APLICACIÓN GUAMÁN POMA DE AYALA', 'PSJ SAN JOAQUÍN 101', v_dist_id, 17)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000101', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000102', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000103', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000104', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000105', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000106', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000107', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000108', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000109', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000110', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000111', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000112', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000113', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000114', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000115', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000116', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000117', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 9 DE DICIEMBRE' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 9 DE DICIEMBRE', 'JR BELLIDO 541', v_dist_id, 15)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000118', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000119', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000120', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000121', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000122', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000123', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000124', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000125', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000126', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000127', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000128', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000129', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000130', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000131', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000132', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MARÍA PARADO DE BELLIDO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE MARÍA PARADO DE BELLIDO', 'JR CALLAO 289', v_dist_id, 12)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000133', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000134', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000135', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000136', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000137', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000138', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000139', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000140', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000141', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000142', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000143', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000144', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE NUESTRA SEÑORA DE FÁTIMA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE NUESTRA SEÑORA DE FÁTIMA', 'CALLE CORCOVADO 120', v_dist_id, 16)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000145', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000146', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000147', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000148', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000149', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000150', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000151', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000152', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000153', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000154', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000155', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000156', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000157', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000158', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000159', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000160', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE BALTA MONTERO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JOSE BALTA MONTERO', 'PLAZA PRINCIPAL SN', v_dist_id, 1)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000161', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MARISCAL CACERES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE MARISCAL CACERES', 'AV INDEPENDENCIA 435', v_dist_id, 49)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000162', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000163', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000164', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000165', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000166', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000167', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000168', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000169', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000170', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000171', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000172', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000173', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000174', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000175', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000176', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000177', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000178', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000179', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000180', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000181', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000182', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000183', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000184', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000185', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000186', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000187', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000188', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000189', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000190', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000191', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000192', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000193', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000194', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000195', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000196', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000197', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000198', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000199', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000200', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000201', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000202', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000203', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000204', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000205', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000206', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000207', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000208', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000209', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000210', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38083 LOS LICENCIADOS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38083 LOS LICENCIADOS', 'AV LA MARINA SN', v_dist_id, 11)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000211', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000212', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000213', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000214', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000215', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000216', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000217', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000218', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000219', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000220', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000221', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-12 CARLOS LABORDE' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-12 CARLOS LABORDE', 'PSJ TONY MARMANILLO COCER COVADONGA', v_dist_id, 11)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000222', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000223', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000224', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000225', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000226', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000227', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000228', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000229', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000230', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000231', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000232', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 39003 CORAZON DE JESÚS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 39003 CORAZON DE JESÚS', 'ASOC 16 DE ABRIL SN', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000233', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000234', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000235', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000236', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000237', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000238', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000239', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000240', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE REPUBLICA BOLIVARIANA DE VENEZUELA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE REPUBLICA BOLIVARIANA DE VENEZUELA', 'JR 29 DE MARZO SN', v_dist_id, 16)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000241', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000242', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000243', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000244', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000245', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000246', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000247', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000248', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000249', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000250', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000251', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000252', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000253', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000254', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000255', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000256', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38059 ABILIO SOTO YUPANQUI' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38059 ABILIO SOTO YUPANQUI', 'JR ARRIBA PERU 303', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000257', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000258', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000259', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000260', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000261', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000262', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000263', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP CESAR ABRAHAM VALLEJO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEP CESAR ABRAHAM VALLEJO', 'JR PIZARRO 380', v_dist_id, 16)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000264', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000265', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000266', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000267', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000268', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000269', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000270', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000271', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000272', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000273', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000274', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000275', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000276', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000277', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000278', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000279', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP CRISTIANO EL BUEN PASTOR' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEP CRISTIANO EL BUEN PASTOR', 'JR GRAU 824', v_dist_id, 12)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000280', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000281', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000282', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000283', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000284', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000285', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000286', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000287', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000288', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000289', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000290', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000291', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEPE SAN RAMÓN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEPE SAN RAMÓN', 'AV VALDELIRIOS 754', v_dist_id, 48)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000292', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000293', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000294', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000295', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000296', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000297', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000298', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000299', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000300', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000301', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000302', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000303', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000304', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000305', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000306', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000307', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000308', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000309', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000310', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000311', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000312', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000313', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000314', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000315', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000316', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000317', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000318', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000319', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000320', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000321', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000322', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000323', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000324', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000325', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000326', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000327', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000328', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000329', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000330', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000331', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000332', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000333', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000334', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000335', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000336', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000337', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000338', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000339', v_local_id, 262, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MELITON CARVAJAL' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE MELITON CARVAJAL', 'JR UNSCH 511', v_dist_id, 12)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000340', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000341', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000342', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000343', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000344', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000345', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000346', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000347', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000348', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000349', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000350', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000351', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38023 NUESTRA SEÑORA DEL CARMEN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38023 NUESTRA SEÑORA DEL CARMEN', 'AV MARISCAL CACERES 204', v_dist_id, 11)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000352', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000353', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000354', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000355', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000356', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000357', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000358', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000359', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000360', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000361', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000362', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ABRAHAM VALDELOMAR' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE ABRAHAM VALDELOMAR', 'AV ABRAHAM VALDELOMAR SN', v_dist_id, 17)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000363', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000364', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000365', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000366', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000367', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000368', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000369', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000370', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000371', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000372', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000373', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000374', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000375', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000376', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000377', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000378', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000379', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSÉ GABRIEL CONDORCANQUI' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JOSÉ GABRIEL CONDORCANQUI', 'JR SACSAYHUAMAN MZ B LT 2', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000380', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000381', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000382', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000383', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000384', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000385', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000386', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000387', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SIGNOS DE FE DE LA SALLE' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE SIGNOS DE FE DE LA SALLE', 'JR LOS MOLLES MZ F LT 1A', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000388', v_local_id, 277, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000389', v_local_id, 277, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000390', v_local_id, 276, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-26 LOS POKRAS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-26 LOS POKRAS', 'AV HUAMANGA MZ F LT 2 AAHH LOS POKRAS', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000391', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000392', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000393', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MIGUEL GRAU SEMINARIO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE MIGUEL GRAU SEMINARIO', 'JR OREJA DE PERRO SN', v_dist_id, 9)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000394', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000395', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000396', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000397', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000398', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000399', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000400', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000401', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000402', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38022 MARI CARMEN SALAS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38022 MARI CARMEN SALAS', 'AV MARISCAL CÁCERES 108', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000403', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000404', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000405', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000406', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000407', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000408', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-10 LA PAZ' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-10 LA PAZ', 'AV 8 DE MARZO SN', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000409', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000410', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000411', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000412', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000413', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000414', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000415', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-13 LA FLORIDA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-13 LA FLORIDA', 'JR AYACUCHO MZ U LT 1', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000416', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000417', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000418', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000419', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000420', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000421', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000422', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38035' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38035', 'JR SAN MARTIN SN', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000423', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000424', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000425', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000426', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000427', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000428', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE CRNL JUAN VALER SANDOVAL' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE CRNL JUAN VALER SANDOVAL', 'JR SAN MARTIN SN', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000429', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000430', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000431', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000432', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000433', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000434', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 406' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 406', 'JR SAN MARTIN SN', v_dist_id, 1)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000435', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE BASILIO AUQUI HUAYTALLA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE BASILIO AUQUI HUAYTALLA', 'CALLE SAN ANTONIO MANALLASACC SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000436', v_local_id, 212, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000437', v_local_id, 212, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 432-15 ALLPACHACA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 432-15 ALLPACHACA', 'PLAZA PRINCIPAL SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000438', v_local_id, 181, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000439', v_local_id, 180, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 432-37 QUISHUARCANCHA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 432-37 QUISHUARCANCHA', 'CALLE QUISHUARCANCHA SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000440', v_local_id, 193, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000441', v_local_id, 192, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38072 SACHABAMBA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38072 SACHABAMBA', 'AV PLAZA PRINCIPAL', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000442', v_local_id, 243, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000443', v_local_id, 243, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000444', v_local_id, 241, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'ESFAP FELIPE GUAMAN POMA DE AYALA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('ESFAP FELIPE GUAMAN POMA DE AYALA', 'JR MARIANO MELGAR 368', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000445', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000446', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000447', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000448', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000449', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000450', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SEÑOR DE LOS MILAGROS - SECUNDARIA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE SEÑOR DE LOS MILAGROS - SECUNDARIA', 'JR CIRO ALEGRIA 500', v_dist_id, 16)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000451', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000452', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000453', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000454', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000455', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000456', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000457', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000458', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000459', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000460', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000461', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000462', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000463', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000464', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000465', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000466', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38977 VILLA SAN CRISTOBAL - PRIMARIA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38977 VILLA SAN CRISTOBAL - PRIMARIA', 'PROL AV LOS INCAS MZ LL LT7', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000467', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000468', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000469', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000470', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000471', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000472', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000473', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000474', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 104 SIMON BOLIVAR' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 104 SIMON BOLIVAR', 'AV LOS INCAS SN', v_dist_id, 4)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000475', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000476', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000477', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000478', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38019 SEÑOR DE LOS MILAGROS - PRIMARIA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38019 SEÑOR DE LOS MILAGROS - PRIMARIA', 'JR CIRO ALEGRIA 435', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000479', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000480', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000481', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000482', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000483', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP 38020 LAS NAZARENAS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEP 38020 LAS NAZARENAS', 'JR PORRAS BARRENECHEA 477', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000484', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000485', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000486', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000487', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000488', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000489', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP LOGIC SCHOOL' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEP LOGIC SCHOOL', 'JR ABRAHAM VALDELOMAR 1007', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000490', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000491', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000492', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000493', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000494', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000495', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ANDRES AVELINO CACERES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE ANDRES AVELINO CACERES', 'CALLE SN', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000496', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000497', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000498', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000499', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000500', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000501', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38024' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38024', 'PLAZA PRINCIPAL SN', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000502', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000503', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000504', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000505', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000506', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SANTA ISABEL DE CHUMBES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE SANTA ISABEL DE CHUMBES', 'CALLE SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000507', v_local_id, 215, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000508', v_local_id, 214, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ANTONIA MORENO DE CACERES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE ANTONIA MORENO DE CACERES', 'CALLE SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000509', v_local_id, 226, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000510', v_local_id, 225, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE VICTOR RAUL HAYA DE LA TORRE' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE VICTOR RAUL HAYA DE LA TORRE', 'CALLE SN', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000511', v_local_id, 232, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000512', v_local_id, 232, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000513', v_local_id, 231, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE HERMES ANYOSA SALVATIERRA - MAYABAMBA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE HERMES ANYOSA SALVATIERRA - MAYABAMBA', 'CALLE SN CCPP MAYABAMBA', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000514', v_local_id, 208, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000515', v_local_id, 208, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38983 BRAULIO ZAGA PARIONA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38983 BRAULIO ZAGA PARIONA', 'CARRETERA CUSI - VALLE SAN FRANSICO', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000516', v_local_id, 154, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000517', v_local_id, 154, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Pacaycasa';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38283 MARISCAL ANTONIO JOSE DE SUCRE' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38283 MARISCAL ANTONIO JOSE DE SUCRE', 'JR ESMERALDA DE LOS ANDES SN', v_dist_id, 10)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000518', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000519', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000520', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000521', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000522', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000523', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000524', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000525', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000526', v_local_id, 289, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000527', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Quinua';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE LIBERTAD DE AMERICA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE LIBERTAD DE AMERICA', 'JR LA MAR SN', v_dist_id, 19)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000528', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000529', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000530', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000531', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000532', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000533', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000534', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000535', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000536', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000537', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000538', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000539', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000540', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000541', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000542', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000543', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000544', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000545', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000546', v_local_id, 270, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San José de Ticllas';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ENRIQUE LOPEZ ALBUJAR' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE ENRIQUE LOPEZ ALBUJAR', 'JR FELIX LOPEZ LEON SN', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000547', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000548', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000549', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000550', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000551', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000552', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000553', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000554', v_local_id, 275, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 39009 EL MAESTRO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 39009 EL MAESTRO', 'JR MARIANO BELLIDO 175', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000555', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000556', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000557', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000558', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000559', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000560', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000561', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000562', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE ABELARDO QUIÑONES GONZALES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JOSE ABELARDO QUIÑONES GONZALES', 'AV LAS MALVINAS SN', v_dist_id, 20)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000563', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000564', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000565', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000566', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000567', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000568', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000569', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000570', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000571', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000572', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000573', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000574', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000575', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000576', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000577', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000578', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000579', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000580', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000581', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000582', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SAN JUAN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE SAN JUAN', 'JR BASILIO AUQUI 301', v_dist_id, 21)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000583', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000584', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000585', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000586', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000587', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000588', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000589', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000590', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000591', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000592', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000593', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000594', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000595', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000596', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000597', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000598', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000599', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000600', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000601', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000602', v_local_id, 285, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000603', v_local_id, 278, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38056 SEÑOR DE AREQUIPA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38056 SEÑOR DE AREQUIPA', 'AV RAMÓN CASTILLA 836', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000604', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000605', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000606', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000607', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000608', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000609', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000610', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38030 SAN MARTIN DE PORRES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38030 SAN MARTIN DE PORRES', 'JR JOSE OLAYA 235', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000611', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000612', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000613', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000614', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000615', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000616', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000617', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000618', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JEAN PIAGET' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JEAN PIAGET', 'AV MAGISTERIAL 101', v_dist_id, 11)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000619', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000620', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000621', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000622', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000623', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000624', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000625', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000626', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000627', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000628', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000629', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38057 SANTA ROSA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38057 SANTA ROSA', 'JR POKRAS 155', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000630', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000631', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000632', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000633', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000634', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'CETPRO RIKCHARISUN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('CETPRO RIKCHARISUN', 'AV ARENALES 296', v_dist_id, 4)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000635', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000636', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000637', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000638', v_local_id, 281, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 403 SEÑOR DE QUINUAPATA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 403 SEÑOR DE QUINUAPATA', 'JR SUCRE MZ C LT 20', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000639', v_local_id, 230, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000640', v_local_id, 230, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP CIENTIFICO SAIRY' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEP CIENTIFICO SAIRY', 'AV LAS AMERICAS MZ A LT 19', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000641', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000642', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000643', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000644', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000645', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000646', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000647', v_local_id, 297, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP JOSE MARIA ARGUEDAS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEP JOSE MARIA ARGUEDAS', 'AV LAS AMERICAS MZ A LT 8', v_dist_id, 10)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000648', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000649', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000650', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000651', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000652', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000653', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000654', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000655', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000656', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000657', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE FE Y ALEGRIA 50 PADRE CARLOS SMITH SJ' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE FE Y ALEGRIA 50 PADRE CARLOS SMITH SJ', 'PSJ LAS FLORES SN', v_dist_id, 6)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000658', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000659', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000660', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000661', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000662', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000663', v_local_id, 295, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 397 DIVINO NIÑO JESUS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 397 DIVINO NIÑO JESUS', 'JR LAS MAGNOLIAS SN', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000664', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000665', v_local_id, 294, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000666', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38867 MIRAFLORES' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38867 MIRAFLORES', 'AV NICARAGUA 290', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000667', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000668', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000669', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000670', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000671', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000672', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000673', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38928 LEONCIO PRADO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38928 LEONCIO PRADO', 'JR CAÑETE SN', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000674', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000675', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000676', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000677', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000678', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Santiago de Pischa';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE INCA GARCILAZO DE LA VEGA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE INCA GARCILAZO DE LA VEGA', 'CARRETERA PRINCIPAL SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000679', v_local_id, 190, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000680', v_local_id, 189, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Santiago de Pischa';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38046 SAN PEDRO DE CACHI' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38046 SAN PEDRO DE CACHI', 'JR TUPAC AMARU 104', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000681', v_local_id, 280, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000682', v_local_id, 280, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Santiago de Pischa';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE CARLOS MARIATEGUI' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JOSE CARLOS MARIATEGUI', 'JR SAN LORENZO DE INKIPAMPA SN', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000683', v_local_id, 259, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000684', v_local_id, 259, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000685', v_local_id, 259, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38048 JOSE ENCINAS FRANCO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38048 JOSE ENCINAS FRANCO', 'JR 15 DE AGOSTO SN', v_dist_id, 10)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000686', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000687', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000688', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000689', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000690', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000691', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000692', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000693', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000694', v_local_id, 266, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000695', v_local_id, 261, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 394 SOCOS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 394 SOCOS', 'JR PROGRESO SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000696', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000697', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'CETPRO VIRGEN DE LA ASUNCION DE SOCOS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('CETPRO VIRGEN DE LA ASUNCION DE SOCOS', 'JR SAN CRISTOBAL SN', v_dist_id, 1)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000698', v_local_id, 283, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-7 PUCALOMA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38984-7 PUCALOMA', 'AV NUEVA GENERACION SN', v_dist_id, 4)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000699', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000700', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000701', v_local_id, 287, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000702', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38583 TOQYASQA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38583 TOQYASQA', 'AV PLAZA PRINCIPAL SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000703', v_local_id, 208, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000704', v_local_id, 207, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SAN CRISTOBAL' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE SAN CRISTOBAL', 'JR SAN MARTIN SN', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000705', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000706', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000707', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000708', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000709', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000710', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000711', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000712', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JEC GUSTAVO ESCUDERO OTERO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JEC GUSTAVO ESCUDERO OTERO', 'AV EMANCIPACION SN', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000713', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000714', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000715', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000716', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000717', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000718', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000719', v_local_id, 293, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000720', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38052' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38052', 'AV PLAZA PRINCIPAL SN', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000721', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000722', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000723', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000724', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000725', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38841 LOS MARTIRES DE LA EDUCACION' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38841 LOS MARTIRES DE LA EDUCACION', 'AV LOS CONDORES 101', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000726', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000727', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000728', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000729', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000730', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000731', v_local_id, 282, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000732', v_local_id, 279, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 409' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 409', 'AV EMANCIPACION SN', v_dist_id, 1)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000733', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38104 - OCCOLLO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38104 - OCCOLLO', 'PLAZA PRINCIPAL DE OCCOLLO ALTO', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000734', v_local_id, 254, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000735', v_local_id, 254, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000736', v_local_id, 254, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE DE SAN MARTIN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JOSE DE SAN MARTIN', 'BARRIO ACCOPAMPA SN', v_dist_id, 7)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000737', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000738', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000739', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000740', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000741', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000742', v_local_id, 296, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000743', v_local_id, 292, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38049 SAN FRANCISCO DE ASIS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38049 SAN FRANCISCO DE ASIS', 'PLAZA PRINCIPAL SN', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000744', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000745', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000746', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000747', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000748', v_local_id, 290, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 308 ARCANGEL SAN GABRIEL' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEI 308 ARCANGEL SAN GABRIEL', 'AV JOSE MARIA GAMBOA SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000749', v_local_id, 299, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000750', v_local_id, 298, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MIXTO HAYA DE LA TORRE' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE MIXTO HAYA DE LA TORRE', 'CARRETERA CASACANCHA SN', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000751', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000752', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000753', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000754', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000755', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000756', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000757', v_local_id, 272, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000758', v_local_id, 269, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE OLAYA - PUTAQA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE JOSE OLAYA - PUTAQA', 'PLAZA PRINCIPAL DE PUTACCA', v_dist_id, 4)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000759', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000760', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000761', v_local_id, 288, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000762', v_local_id, 286, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE LUIS DONAYRE VASALLO - ANCHAC HUASI' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE LUIS DONAYRE VASALLO - ANCHAC HUASI', 'AV PRINCIPAL SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000763', v_local_id, 274, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000764', v_local_id, 273, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38099 ANCHAC HUASI' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 38099 ANCHAC HUASI', 'AV PRINCIPAL SN', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000765', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000766', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000767', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000768', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000769', v_local_id, 300, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ARISTIDES GUILLEN VALDIVIA' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE ARISTIDES GUILLEN VALDIVIA', 'CCPP PACCHA SN', v_dist_id, 5)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000770', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000771', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000772', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000773', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000774', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE PABLO VALERIANO MESAHUAMAN' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE PABLO VALERIANO MESAHUAMAN', 'PLAZA PRINCIPAL SN', v_dist_id, 2)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000775', v_local_id, 255, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000776', v_local_id, 255, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEST VINCHOS' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IEST VINCHOS', 'TOMACCPAMPA SN', v_dist_id, 8)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000777', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000778', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000779', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000780', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000781', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000782', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000783', v_local_id, 291, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000784', v_local_id, 284, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    IF v_dist_id IS NOT NULL THEN
        SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 11 DE AGOSTO' AND distrito_id = v_dist_id;
        IF v_local_id IS NULL THEN
            INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
            VALUES ('IE 11 DE AGOSTO', 'JR AREQUIPA SN', v_dist_id, 3)
            RETURNING id INTO v_local_id;
        END IF;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000785', v_local_id, 231, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000786', v_local_id, 231, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
        INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
        VALUES ('000787', v_local_id, 229, 'pendiente')
        ON CONFLICT (numero_mesa) DO NOTHING;
    END IF;
END ;
