/**
 * Reglas de escrutinio para presentar resultados (Peru).
 *
 * - Votos validos = emitidos - blancos - nulos - impugnados. Los impugnados
 *   quedan fuera hasta que el JEE los resuelve (luego pasan a una lista o a nulos).
 * - Para el resultado, blancos y nulos se tratan IGUAL: no se computan a favor
 *   de nadie ("Los votos viciados o en blanco no se computan"). Solo se
 *   registran por separado.
 * - Nulidad: el JNE anula el proceso cuando los votos nulos o en blanco,
 *   sumados o separadamente, superan los dos tercios de los votos emitidos
 *   (Constitucion, art. 184). Si alguno supera por separado, la suma tambien
 *   supera, asi que basta evaluar la suma.
 */

export const LIMITE_NULIDAD_PORCENTAJE = 66.67;
/** A partir de este % de blancos + nulos el tablero avisa en ambar. */
export const UMBRAL_ALERTA_NULIDAD_PORCENTAJE = 50;

export const porcentaje = (parte, total) =>
  (total > 0 ? Number(((parte / total) * 100).toFixed(2)) : 0);

/**
 * Evalua el limite constitucional de nulidad para un conjunto de actas.
 * nivel: 'sin_datos' | 'normal' | 'alerta' (>= 50 %) | 'critico' (> 2/3).
 */
export const evaluarNulidad = ({ emitidos = 0, blanco = 0, nulo = 0 } = {}) => {
  const blancoNulo = blanco + nulo;
  const base = {
    limite_porcentaje: LIMITE_NULIDAD_PORCENTAJE,
    votos_blanco_nulo: blancoNulo,
    porcentaje_blanco_nulo: porcentaje(blancoNulo, emitidos),
    porcentaje_blanco: porcentaje(blanco, emitidos),
    porcentaje_nulo: porcentaje(nulo, emitidos),
  };
  if (!emitidos) return { ...base, supera_limite: false, nivel: 'sin_datos' };

  // "Superan los dos tercios": comparacion exacta en enteros, sin redondeos.
  const supera = blancoNulo * 3 > emitidos * 2;
  let nivel = 'normal';
  if (supera) nivel = 'critico';
  else if (blancoNulo * 100 >= emitidos * UMBRAL_ALERTA_NULIDAD_PORCENTAJE) nivel = 'alerta';

  return { ...base, supera_limite: supera, nivel };
};

/**
 * Impacto de los votos impugnados pendientes sobre el primer lugar.
 * votosOrdenados: votos de los candidatos de UNA contienda (o null si el
 * ambito no es una contienda completa y el margen no tiene sentido).
 */
export const evaluarImpugnados = ({
  impugnados = 0,
  actasConImpugnados = 0,
  votosOrdenados = null,
} = {}) => {
  const resultado = {
    votos_impugnados: impugnados,
    actas_con_impugnados: actasConImpugnados,
    margen_primero_segundo: null,
    podrian_cambiar_ganador: false,
  };
  if (!Array.isArray(votosOrdenados) || votosOrdenados.length < 2) return resultado;

  const [primero, segundo] = [...votosOrdenados].sort((a, b) => b - a);
  const margen = primero - segundo;
  return {
    ...resultado,
    margen_primero_segundo: margen,
    // Si todos los impugnados fueran para el segundo, empataria o pasaria adelante.
    podrian_cambiar_ganador: impugnados > 0 && impugnados >= margen,
  };
};
