import {
  porcentaje, evaluarNulidad, evaluarImpugnados,
  LIMITE_NULIDAD_PORCENTAJE,
} from '../../../src/services/escrutinio.service.js';

// ═══════════════════════════════════════════════════════════════════
// Reglas de escrutinio que se publican en el tablero. Blancos y nulos no se
// computan para nadie; la nulidad se evalua contra 2/3 de los emitidos
// (Constitucion, art. 184). Un error aqui es una cifra publica equivocada.
// ═══════════════════════════════════════════════════════════════════

describe('porcentaje', () => {
  it('redondea a dos decimales', () => {
    expect(porcentaje(1, 3)).toBe(33.33);
    expect(porcentaje(2, 3)).toBe(66.67);
  });

  it('no divide por cero', () => {
    expect(porcentaje(5, 0)).toBe(0);
  });
});

describe('evaluarNulidad', () => {
  it('sin votos emitidos no hay datos que evaluar', () => {
    expect(evaluarNulidad({ emitidos: 0, blanco: 0, nulo: 0 })).toMatchObject({
      nivel: 'sin_datos', supera_limite: false, porcentaje_blanco_nulo: 0,
    });
  });

  it('usa valores por defecto si no recibe argumentos', () => {
    expect(evaluarNulidad().nivel).toBe('sin_datos');
  });

  it('nivel normal con pocos blancos y nulos', () => {
    const r = evaluarNulidad({ emitidos: 1000, blanco: 100, nulo: 50 });
    expect(r).toMatchObject({
      nivel: 'normal', supera_limite: false, votos_blanco_nulo: 150,
      porcentaje_blanco_nulo: 15, porcentaje_blanco: 10, porcentaje_nulo: 5,
      limite_porcentaje: LIMITE_NULIDAD_PORCENTAJE,
    });
  });

  it('avisa en ambar desde el 50 % de blancos + nulos', () => {
    expect(evaluarNulidad({ emitidos: 1000, blanco: 300, nulo: 200 }).nivel).toBe('alerta');
    expect(evaluarNulidad({ emitidos: 1000, blanco: 300, nulo: 199 }).nivel).toBe('normal');
  });

  it('exactamente 2/3 NO supera el limite (la norma dice "superan")', () => {
    const r = evaluarNulidad({ emitidos: 300, blanco: 100, nulo: 100 });
    expect(r.supera_limite).toBe(false);
    expect(r.nivel).toBe('alerta');
    expect(r.porcentaje_blanco_nulo).toBe(66.67);
  });

  it('un voto por encima de 2/3 es critico', () => {
    const r = evaluarNulidad({ emitidos: 300, blanco: 101, nulo: 100 });
    expect(r.supera_limite).toBe(true);
    expect(r.nivel).toBe('critico');
  });

  it('cuenta blancos y nulos por separado o sumados', () => {
    expect(evaluarNulidad({ emitidos: 1000, blanco: 700, nulo: 0 }).supera_limite).toBe(true);
    expect(evaluarNulidad({ emitidos: 1000, blanco: 0, nulo: 700 }).supera_limite).toBe(true);
    expect(evaluarNulidad({ emitidos: 1000, blanco: 350, nulo: 350 }).supera_limite).toBe(true);
  });
});

describe('evaluarImpugnados', () => {
  it('sin candidatos ordenados no calcula margen', () => {
    expect(evaluarImpugnados({ impugnados: 10, actasConImpugnados: 2 })).toEqual({
      votos_impugnados: 10, actas_con_impugnados: 2,
      margen_primero_segundo: null, podrian_cambiar_ganador: false,
    });
  });

  it('usa valores por defecto si no recibe argumentos', () => {
    expect(evaluarImpugnados().margen_primero_segundo).toBeNull();
  });

  it('con un solo candidato no hay margen', () => {
    expect(evaluarImpugnados({ impugnados: 5, votosOrdenados: [100] }).margen_primero_segundo).toBeNull();
  });

  it('ordena los votos antes de calcular el margen', () => {
    const r = evaluarImpugnados({ impugnados: 10, votosOrdenados: [100, 300, 250] });
    expect(r.margen_primero_segundo).toBe(50);
    expect(r.podrian_cambiar_ganador).toBe(false);
  });

  it('avisa si los impugnados alcanzan para empatar o voltear el primer lugar', () => {
    expect(evaluarImpugnados({ impugnados: 50, votosOrdenados: [300, 250] }).podrian_cambiar_ganador).toBe(true);
    expect(evaluarImpugnados({ impugnados: 49, votosOrdenados: [300, 250] }).podrian_cambiar_ganador).toBe(false);
  });

  it('sin impugnados no avisa aunque haya empate', () => {
    expect(evaluarImpugnados({ impugnados: 0, votosOrdenados: [200, 200] }).podrian_cambiar_ganador).toBe(false);
  });
});
