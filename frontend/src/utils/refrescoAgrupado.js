/**
 * Agrupa los avisos en tiempo real que llegan en rafaga.
 *
 * El primer aviso refresca enseguida. Los que llegan dentro de la ventana se
 * juntan en UN solo refresco al terminarla, con los datos mas recientes.
 *
 * Por que: en la hora pico llegan varias actas por segundo. Si cada aviso
 * recargara la pantalla, el tablero del administrador lanzaria cientos de
 * peticiones por minuto, el servidor lo frenaria por exceso (error 429) y
 * justo en ese momento dejaria de verse en vivo.
 *
 * @param {Function} fn       funcion que recarga los datos de la pantalla
 * @param {number}   esperaMs ventana minima entre dos recargas
 */
export function crearRefrescoAgrupado(fn, esperaMs = 3000) {
  let temporizador = null;
  let ultimo = 0;

  const ejecutar = () => {
    temporizador = null;
    ultimo = Date.now();
    fn();
  };

  const disparar = () => {
    if (temporizador) return; // ya hay una recarga en camino: se aprovecha esa
    const restante = Math.max(0, ultimo + esperaMs - Date.now());
    temporizador = setTimeout(ejecutar, restante);
  };

  const cancelar = () => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
  };

  return { disparar, cancelar };
}

/**
 * Suscribe una pantalla a eventos del socket con recarga agrupada.
 * Devuelve la funcion de limpieza para usar en useEffect.
 */
export function escucharEnVivo(socket, eventos, fn, esperaMs) {
  if (!socket) return undefined;
  const refresco = crearRefrescoAgrupado(fn, esperaMs);
  eventos.forEach((evento) => socket.on(evento, refresco.disparar));
  return () => {
    eventos.forEach((evento) => socket.off(evento, refresco.disparar));
    refresco.cancelar();
  };
}
