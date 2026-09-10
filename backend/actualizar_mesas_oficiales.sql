-- =====================================================
-- ACTUALIZACION DE MESAS CON NUMEROS OFICIALES ONPE
-- Total: 787 Mesas Oficiales en 16 Distritos de Huamanga
-- =====================================================

DO $$
DECLARE
    v_dist_id INT;
    v_local_id INT;
BEGIN
    -- Limpiar asignaciones y mesas anteriores para reinsertar con numeración oficial
    TRUNCATE TABLE asignacion_personeros CASCADE;
    TRUNCATE TABLE mesas_sufragio CASCADE;

    -- Local: PLANTELES DE APLICACIÓN GUAMÁN POMA DE AYALA (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'PLANTELES DE APLICACIÓN GUAMÁN POMA DE AYALA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('PLANTELES DE APLICACIÓN GUAMÁN POMA DE AYALA', 'Huamanga', v_dist_id, 17)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009434', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009435', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009436', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009437', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009438', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009439', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009440', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009441', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009442', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009443', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009444', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009445', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009446', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009447', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009448', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009449', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009450', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 9 DE DICIEMBRE (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 9 DE DICIEMBRE' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 9 DE DICIEMBRE', 'Huamanga', v_dist_id, 15)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009451', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009452', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009453', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009454', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009455', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009456', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009457', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009458', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009459', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009460', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009461', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009462', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009463', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009464', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009465', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE MARÍA PARADO DE BELLIDO (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MARÍA PARADO DE BELLIDO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE MARÍA PARADO DE BELLIDO', 'Huamanga', v_dist_id, 12)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009466', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009467', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009468', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009469', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009470', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009471', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009472', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009473', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009474', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009475', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009476', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009477', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE NUESTRA SEÑORA DE FÁTIMA (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE NUESTRA SEÑORA DE FÁTIMA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE NUESTRA SEÑORA DE FÁTIMA', 'Huamanga', v_dist_id, 16)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009478', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009479', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009480', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009481', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009482', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009483', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009484', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009485', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009486', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009487', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009488', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009489', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009490', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009491', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009492', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009493', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JOSE BALTA MONTERO (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE BALTA MONTERO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JOSE BALTA MONTERO', 'Huamanga', v_dist_id, 1)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900912', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE MARISCAL CACERES (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MARISCAL CACERES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE MARISCAL CACERES', 'Huamanga', v_dist_id, 49)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009494', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009495', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009496', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009497', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009498', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009499', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009500', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009501', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009502', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009503', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009504', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009505', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009506', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009507', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009508', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009509', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009510', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009511', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009512', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009513', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009514', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009515', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009516', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009517', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009518', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009519', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009520', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009521', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009522', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009523', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009524', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009525', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009526', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009527', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009528', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009529', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009530', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009531', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009532', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009533', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009534', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009535', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009536', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009537', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009538', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009539', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009540', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009541', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009542', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38083 LOS LICENCIADOS (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38083 LOS LICENCIADOS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38083 LOS LICENCIADOS', 'Huamanga', v_dist_id, 11)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009543', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009544', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009545', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009546', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009547', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009548', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009549', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009550', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009551', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009552', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009553', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-12 CARLOS LABORDE (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-12 CARLOS LABORDE' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-12 CARLOS LABORDE', 'Huamanga', v_dist_id, 11)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009554', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009555', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009556', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009557', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009558', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009559', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009560', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009561', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009562', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009563', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009564', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 39003 CORAZON DE JESÚS (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 39003 CORAZON DE JESÚS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 39003 CORAZON DE JESÚS', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009565', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009566', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009567', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009568', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009569', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009570', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009571', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009572', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE REPUBLICA BOLIVARIANA DE VENEZUELA (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE REPUBLICA BOLIVARIANA DE VENEZUELA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE REPUBLICA BOLIVARIANA DE VENEZUELA', 'Huamanga', v_dist_id, 16)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009573', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009574', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009575', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009576', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009577', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009578', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009579', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009580', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009581', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009582', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009583', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009584', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009585', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009586', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009587', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009588', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38059 ABILIO SOTO YUPANQUI (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38059 ABILIO SOTO YUPANQUI' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38059 ABILIO SOTO YUPANQUI', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009589', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009590', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009591', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009592', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009593', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009594', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009595', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEP CESAR ABRAHAM VALLEJO (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP CESAR ABRAHAM VALLEJO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEP CESAR ABRAHAM VALLEJO', 'Huamanga', v_dist_id, 16)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009596', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009597', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009598', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009599', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009600', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009601', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009602', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009603', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009604', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009605', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009606', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009607', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009608', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009609', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009610', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009611', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEP CRISTIANO EL BUEN PASTOR (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP CRISTIANO EL BUEN PASTOR' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEP CRISTIANO EL BUEN PASTOR', 'Huamanga', v_dist_id, 12)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009612', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009613', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009614', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009615', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009616', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009617', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009618', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009619', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009620', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009621', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009622', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009623', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEPE SAN RAMÓN (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEPE SAN RAMÓN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEPE SAN RAMÓN', 'Huamanga', v_dist_id, 48)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009624', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009625', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009626', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009627', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009628', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009629', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009630', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009631', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009632', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009633', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009634', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009635', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009636', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009637', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009638', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009639', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009640', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009641', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009642', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009643', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009644', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009645', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009646', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009647', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009648', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009649', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009650', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009651', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009652', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009653', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009654', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009655', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009656', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009657', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009658', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009659', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009660', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009661', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009662', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009663', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009664', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009665', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009666', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009667', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009668', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009669', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009670', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009671', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE MELITON CARVAJAL (Ayacucho)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ayacucho';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MELITON CARVAJAL' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE MELITON CARVAJAL', 'Huamanga', v_dist_id, 12)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009672', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009673', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009674', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009675', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009676', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009677', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009678', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009679', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009680', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009681', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009682', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009683', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE MARISCAL GUILLERMO MILLER (Acos Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acos Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MARISCAL GUILLERMO MILLER' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE MARISCAL GUILLERMO MILLER', 'Huamanga', v_dist_id, 16)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009684', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009685', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009686', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009687', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009688', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009689', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009690', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009691', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009692', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009693', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009694', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009695', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009696', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009697', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009698', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009699', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38023 NUESTRA SEÑORA DEL CARMEN (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38023 NUESTRA SEÑORA DEL CARMEN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38023 NUESTRA SEÑORA DEL CARMEN', 'Huamanga', v_dist_id, 11)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009700', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009701', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009702', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009703', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009704', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009705', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009706', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009707', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009708', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009709', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009710', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE ABRAHAM VALDELOMAR (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ABRAHAM VALDELOMAR' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE ABRAHAM VALDELOMAR', 'Huamanga', v_dist_id, 17)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009711', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009712', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009713', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009714', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009715', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009716', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009717', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009718', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009719', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009720', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009721', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009722', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009723', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009724', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009725', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009726', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009727', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JOSÉ GABRIEL CONDORCANQUI (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSÉ GABRIEL CONDORCANQUI' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JOSÉ GABRIEL CONDORCANQUI', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009728', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009729', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009730', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009731', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009732', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009733', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009734', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009735', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE SIGNOS DE FE DE LA SALLE (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SIGNOS DE FE DE LA SALLE' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE SIGNOS DE FE DE LA SALLE', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009756', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009757', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009758', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-26 LOS POKRAS (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-26 LOS POKRAS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-26 LOS POKRAS', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009759', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009760', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009761', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE MIGUEL GRAU SEMINARIO (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MIGUEL GRAU SEMINARIO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE MIGUEL GRAU SEMINARIO', 'Huamanga', v_dist_id, 9)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009762', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009763', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009764', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009765', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009766', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009767', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009768', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009769', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009770', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38022 MARI CARMEN SALAS (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38022 MARI CARMEN SALAS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38022 MARI CARMEN SALAS', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009736', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009737', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009738', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009739', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009740', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009741', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-10 LA PAZ (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-10 LA PAZ' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-10 LA PAZ', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009742', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009743', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009744', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009745', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009746', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009747', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009748', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-13 LA FLORIDA (Carmen Alto)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Carmen Alto';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-13 LA FLORIDA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-13 LA FLORIDA', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009749', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009750', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009751', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009752', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009753', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009754', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009755', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38035 (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38035' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38035', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009771', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009772', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009773', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009774', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009775', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009776', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE CRNL JUAN VALER SANDOVAL (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE CRNL JUAN VALER SANDOVAL' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE CRNL JUAN VALER SANDOVAL', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009777', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009778', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009779', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009780', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009781', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009782', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 406 (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 406' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 406', 'Huamanga', v_dist_id, 1)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009783', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE BASILIO AUQUI HUAYTALLA (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE BASILIO AUQUI HUAYTALLA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE BASILIO AUQUI HUAYTALLA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900913', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900914', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 432-15 ALLPACHACA (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 432-15 ALLPACHACA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 432-15 ALLPACHACA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900915', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900916', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 432-37 QUISHUARCANCHA (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 432-37 QUISHUARCANCHA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 432-37 QUISHUARCANCHA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900917', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900918', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38072 SACHABAMBA (Chiara)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Chiara';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38072 SACHABAMBA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38072 SACHABAMBA', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900919', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900920', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900921', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE LIBERTAD DE AMERICA (Quinua)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Quinua';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE LIBERTAD DE AMERICA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE LIBERTAD DE AMERICA', 'Huamanga', v_dist_id, 19)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009784', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009785', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009786', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009787', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009788', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009789', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009790', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009791', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009792', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009793', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009794', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009795', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009796', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009797', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009798', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009799', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009800', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009801', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009802', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE ENRIQUE LOPEZ ALBUJAR (San José de Ticllas)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San José de Ticllas';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ENRIQUE LOPEZ ALBUJAR' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE ENRIQUE LOPEZ ALBUJAR', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009803', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009804', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009805', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009806', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009807', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009808', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009809', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009810', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 39009 EL MAESTRO (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 39009 EL MAESTRO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 39009 EL MAESTRO', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009811', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009812', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009813', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009814', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009815', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009816', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009817', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009818', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JOSE ABELARDO QUIÑONES GONZALES (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE ABELARDO QUIÑONES GONZALES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JOSE ABELARDO QUIÑONES GONZALES', 'Huamanga', v_dist_id, 20)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009819', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009820', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009821', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009822', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009823', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009824', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009825', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009826', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009827', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009828', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009829', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009830', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009831', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009832', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009833', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009834', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009835', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009836', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009837', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009838', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE SAN JUAN (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SAN JUAN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE SAN JUAN', 'Huamanga', v_dist_id, 21)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009839', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009840', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009841', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009842', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009843', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009844', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009845', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009846', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009847', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009848', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009849', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009850', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009851', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009852', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009853', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009854', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009855', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009856', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009857', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009858', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009859', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38056 SEÑOR DE AREQUIPA (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38056 SEÑOR DE AREQUIPA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38056 SEÑOR DE AREQUIPA', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009860', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009861', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009862', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009863', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009864', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009865', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009866', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38030 SAN MARTIN DE PORRES (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38030 SAN MARTIN DE PORRES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38030 SAN MARTIN DE PORRES', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009867', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009868', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009869', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009870', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009871', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009872', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009873', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009874', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JEAN PIAGET (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JEAN PIAGET' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JEAN PIAGET', 'Huamanga', v_dist_id, 11)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009896', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009897', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009898', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009899', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009900', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009901', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009902', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009903', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009904', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009905', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009906', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38057 SANTA ROSA (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38057 SANTA ROSA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38057 SANTA ROSA', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009907', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009908', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009909', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009910', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009911', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: CETPRO RIKCHARISUN (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'CETPRO RIKCHARISUN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('CETPRO RIKCHARISUN', 'Huamanga', v_dist_id, 4)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009912', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009913', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009914', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009915', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 403 SEÑOR DE QUINUAPATA (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 403 SEÑOR DE QUINUAPATA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 403 SEÑOR DE QUINUAPATA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009916', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009917', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEP CIENTIFICO SAIRY (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP CIENTIFICO SAIRY' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEP CIENTIFICO SAIRY', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009918', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009919', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009920', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009921', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009922', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009923', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009924', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEP JOSE MARIA ARGUEDAS (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP JOSE MARIA ARGUEDAS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEP JOSE MARIA ARGUEDAS', 'Huamanga', v_dist_id, 10)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009925', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009926', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009927', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009928', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009929', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009930', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009931', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009932', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009933', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009934', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE FE Y ALEGRIA 50 PADRE CARLOS SMITH SJ (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE FE Y ALEGRIA 50 PADRE CARLOS SMITH SJ' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE FE Y ALEGRIA 50 PADRE CARLOS SMITH SJ', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009875', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009876', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009877', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009878', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009879', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009880', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 397 DIVINO NIÑO JESUS (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 397 DIVINO NIÑO JESUS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 397 DIVINO NIÑO JESUS', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009881', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009882', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009883', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38867 MIRAFLORES (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38867 MIRAFLORES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38867 MIRAFLORES', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009884', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009885', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009886', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009887', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009888', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009889', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009890', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38928 LEONCIO PRADO (San Juan Bautista)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'San Juan Bautista';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38928 LEONCIO PRADO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38928 LEONCIO PRADO', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009891', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009892', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009893', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009894', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009895', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE INCA GARCILAZO DE LA VEGA (Santiago de Pischa)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Santiago de Pischa';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE INCA GARCILAZO DE LA VEGA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE INCA GARCILAZO DE LA VEGA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900922', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900923', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38046 SAN PEDRO DE CACHI (Santiago de Pischa)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Santiago de Pischa';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38046 SAN PEDRO DE CACHI' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38046 SAN PEDRO DE CACHI', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009935', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009936', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JOSE CARLOS MARIATEGUI (Santiago de Pischa)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Santiago de Pischa';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE CARLOS MARIATEGUI' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JOSE CARLOS MARIATEGUI', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009937', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009938', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009939', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38104 - OCCOLLO (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38104 - OCCOLLO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38104 - OCCOLLO', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900924', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900925', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900926', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JOSE DE SAN MARTIN (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE DE SAN MARTIN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JOSE DE SAN MARTIN', 'Huamanga', v_dist_id, 15)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009940', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009941', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009942', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009943', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009944', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009945', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009946', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009961', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009962', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009963', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009964', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009965', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009966', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009967', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009968', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38049 SAN FRANCISCO DE ASIS (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38049 SAN FRANCISCO DE ASIS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38049 SAN FRANCISCO DE ASIS', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009947', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009948', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009949', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009950', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009951', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 308 ARCANGEL SAN GABRIEL (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 308 ARCANGEL SAN GABRIEL' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 308 ARCANGEL SAN GABRIEL', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009952', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009953', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE MIXTO HAYA DE LA TORRE (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE MIXTO HAYA DE LA TORRE' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE MIXTO HAYA DE LA TORRE', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900927', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900928', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900929', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900930', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900931', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900932', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900933', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900934', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JOSE OLAYA - PUTAQA (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JOSE OLAYA - PUTAQA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JOSE OLAYA - PUTAQA', 'Huamanga', v_dist_id, 4)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900935', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900936', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900937', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900938', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE LUIS DONAYRE VASALLO - ANCHAC HUASI (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE LUIS DONAYRE VASALLO - ANCHAC HUASI' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE LUIS DONAYRE VASALLO - ANCHAC HUASI', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009954', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009955', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38099 ANCHAC HUASI (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38099 ANCHAC HUASI' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38099 ANCHAC HUASI', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009956', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009957', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009958', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009959', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009960', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE ARISTIDES GUILLEN VALDIVIA (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ARISTIDES GUILLEN VALDIVIA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE ARISTIDES GUILLEN VALDIVIA', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900939', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900940', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900941', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900942', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900943', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE PABLO VALERIANO MESAHUAMAN (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE PABLO VALERIANO MESAHUAMAN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE PABLO VALERIANO MESAHUAMAN', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900944', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900945', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 11 DE AGOSTO (Vinchos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Vinchos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 11 DE AGOSTO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 11 DE AGOSTO', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900946', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900947', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900948', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: ESFAP FELIPE GUAMAN POMA DE AYALA (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'ESFAP FELIPE GUAMAN POMA DE AYALA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('ESFAP FELIPE GUAMAN POMA DE AYALA', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010056', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010057', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010058', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010059', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010060', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010061', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE SEÑOR DE LOS MILAGROS - SECUNDARIA (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SEÑOR DE LOS MILAGROS - SECUNDARIA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE SEÑOR DE LOS MILAGROS - SECUNDARIA', 'Huamanga', v_dist_id, 16)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010062', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010063', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010064', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010065', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010066', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010067', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010068', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010069', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010070', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010071', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010072', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010073', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010074', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010075', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010076', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010077', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38977 VILLA SAN CRISTOBAL - PRIMARIA (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38977 VILLA SAN CRISTOBAL - PRIMARIA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38977 VILLA SAN CRISTOBAL - PRIMARIA', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010078', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010079', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010080', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010081', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010082', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010083', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010084', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010085', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 104 SIMON BOLIVAR (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 104 SIMON BOLIVAR' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 104 SIMON BOLIVAR', 'Huamanga', v_dist_id, 4)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010103', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010104', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010105', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010106', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38019 SEÑOR DE LOS MILAGROS - PRIMARIA (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38019 SEÑOR DE LOS MILAGROS - PRIMARIA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38019 SEÑOR DE LOS MILAGROS - PRIMARIA', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010086', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010087', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010088', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010089', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010090', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEP 38020 LAS NAZARENAS (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP 38020 LAS NAZARENAS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEP 38020 LAS NAZARENAS', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010091', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010092', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010093', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010094', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010095', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010096', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEP LOGIC SCHOOL (Jesús Nazareno)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Jesús Nazareno';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEP LOGIC SCHOOL' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEP LOGIC SCHOOL', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010097', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010098', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010099', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010100', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010101', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010102', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE NUESTRA SEÑORA DE LAS MERCEDES (Andrés Avelino Cáceres Dorregaray)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Andrés Avelino Cáceres Dorregaray';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE NUESTRA SEÑORA DE LAS MERCEDES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE NUESTRA SEÑORA DE LAS MERCEDES', 'Huamanga', v_dist_id, 32)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010119', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010120', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010121', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010122', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010123', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010124', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010125', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010126', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010127', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010128', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010129', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010130', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010131', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010132', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010133', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010134', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010135', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010136', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010137', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010138', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010139', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010140', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010141', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010142', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010143', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010144', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010145', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010146', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010147', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010148', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010149', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010150', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-18 JOSÉ ABEL ALFARO PACHECO (Andrés Avelino Cáceres Dorregaray)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Andrés Avelino Cáceres Dorregaray';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-18 JOSÉ ABEL ALFARO PACHECO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-18 JOSÉ ABEL ALFARO PACHECO', 'Huamanga', v_dist_id, 10)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010151', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010152', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010153', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010154', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010155', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010156', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010157', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010158', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010159', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010160', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE SIMON BOLIVAR (Andrés Avelino Cáceres Dorregaray)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Andrés Avelino Cáceres Dorregaray';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SIMON BOLIVAR' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE SIMON BOLIVAR', 'Huamanga', v_dist_id, 12)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010107', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010108', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010109', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010110', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010111', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010112', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010113', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010114', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010115', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010116', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010117', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010118', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38048 JOSE ENCINAS FRANCO (Socos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38048 JOSE ENCINAS FRANCO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38048 JOSE ENCINAS FRANCO', 'Huamanga', v_dist_id, 10)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010010', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010011', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010012', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010013', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010014', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010015', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010016', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010017', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010018', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010019', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 394 SOCOS (Socos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 394 SOCOS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 394 SOCOS', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010028', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010029', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: CETPRO VIRGEN DE LA ASUNCION DE SOCOS (Socos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'CETPRO VIRGEN DE LA ASUNCION DE SOCOS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('CETPRO VIRGEN DE LA ASUNCION DE SOCOS', 'Huamanga', v_dist_id, 1)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010030', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-7 PUCALOMA (Socos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-7 PUCALOMA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-7 PUCALOMA', 'Huamanga', v_dist_id, 4)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010031', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010032', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010033', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010034', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38583 TOQYASQA (Socos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38583 TOQYASQA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38583 TOQYASQA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900959', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900960', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE SAN CRISTOBAL (Socos)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Socos';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SAN CRISTOBAL' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE SAN CRISTOBAL', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010020', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010021', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010022', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010023', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010024', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010025', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010026', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010027', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE ANDRES AVELINO CACERES (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ANDRES AVELINO CACERES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE ANDRES AVELINO CACERES', 'Huamanga', v_dist_id, 6)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010035', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010036', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010037', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010038', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010039', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010040', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38024 (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38024' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38024', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010041', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010042', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010043', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010044', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010045', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE SANTA ISABEL DE CHUMBES (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE SANTA ISABEL DE CHUMBES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE SANTA ISABEL DE CHUMBES', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900961', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900962', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE ANTONIA MORENO DE CACERES (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE ANTONIA MORENO DE CACERES' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE ANTONIA MORENO DE CACERES', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900963', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900964', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE VICTOR RAUL HAYA DE LA TORRE (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE VICTOR RAUL HAYA DE LA TORRE' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE VICTOR RAUL HAYA DE LA TORRE', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900965', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900966', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900967', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE HERMES ANYOSA SALVATIERRA - MAYABAMBA (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE HERMES ANYOSA SALVATIERRA - MAYABAMBA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE HERMES ANYOSA SALVATIERRA - MAYABAMBA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900968', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900969', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38983 BRAULIO ZAGA PARIONA (Ocros)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Ocros';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38983 BRAULIO ZAGA PARIONA' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38983 BRAULIO ZAGA PARIONA', 'Huamanga', v_dist_id, 2)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900970', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900971', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38283 MARISCAL ANTONIO JOSE DE SUCRE (Pacaycasa)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Pacaycasa';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38283 MARISCAL ANTONIO JOSE DE SUCRE' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38283 MARISCAL ANTONIO JOSE DE SUCRE', 'Huamanga', v_dist_id, 10)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010046', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010047', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010048', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010049', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010050', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010051', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010052', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010053', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010054', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010055', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE JEC GUSTAVO ESCUDERO OTERO (Tambillo)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE JEC GUSTAVO ESCUDERO OTERO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE JEC GUSTAVO ESCUDERO OTERO', 'Huamanga', v_dist_id, 8)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009969', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009970', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009971', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009972', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009973', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009974', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009975', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009976', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38052 (Tambillo)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38052' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38052', 'Huamanga', v_dist_id, 5)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009978', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009979', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009980', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009981', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009982', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38841 LOS MARTIRES DE LA EDUCACION (Tambillo)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38841 LOS MARTIRES DE LA EDUCACION' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38841 LOS MARTIRES DE LA EDUCACION', 'Huamanga', v_dist_id, 7)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009983', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009984', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009985', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009986', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009987', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009988', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009989', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IEI 409 (Tambillo)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Tambillo';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IEI 409' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IEI 409', 'Huamanga', v_dist_id, 1)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009977', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE GENERAL TRINIDAD MORAN (Acocro)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE GENERAL TRINIDAD MORAN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE GENERAL TRINIDAD MORAN', 'Huamanga', v_dist_id, 16)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009990', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009991', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009992', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009993', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009994', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009995', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009996', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009997', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009998', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('009999', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010000', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010001', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010002', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010003', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010004', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010005', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38574 - SECCELAMBRAS (Acocro)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38574 - SECCELAMBRAS' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38574 - SECCELAMBRAS', 'Huamanga', v_dist_id, 4)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010006', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010007', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010008', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('010009', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE HERMILIO VALDIZAN (Acocro)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE HERMILIO VALDIZAN' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE HERMILIO VALDIZAN', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900949', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900950', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900951', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE CORONEL SANTIAGO MARCELINO CARREÑO (Acocro)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE CORONEL SANTIAGO MARCELINO CARREÑO' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE CORONEL SANTIAGO MARCELINO CARREÑO', 'Huamanga', v_dist_id, 3)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900952', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900953', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900954', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

    -- Local: IE 38984-29 (Acocro)
    SELECT id INTO v_dist_id FROM distritos WHERE nombre = 'Acocro';
    SELECT id INTO v_local_id FROM locales_votacion WHERE nombre = 'IE 38984-29' AND distrito_id = v_dist_id;
    IF v_local_id IS NULL THEN
        INSERT INTO locales_votacion (nombre, direccion, distrito_id, total_mesas)
        VALUES ('IE 38984-29', 'Huamanga', v_dist_id, 4)
        RETURNING id INTO v_local_id;
    END IF;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900955', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900956', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900957', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;
    INSERT INTO mesas_sufragio (numero_mesa, local_id, total_electores_habiles, estado)
    VALUES ('900958', v_local_id, 300, 'pendiente')
    ON CONFLICT (numero_mesa) DO UPDATE SET local_id = EXCLUDED.local_id;

END $$;
