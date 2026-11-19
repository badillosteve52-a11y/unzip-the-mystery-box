type GrupoCertificado = {
  id: string;
  nombre: string;
  deporte_id: string | null;
};

type MiembroCertificado = {
  grupo_id: string;
  deportista_id: string;
};

export function rutaCertificadoCompartido(deportistaId: string) {
  return `${deportistaId}.pdf`;
}

export function idsSeleccionesLegadasPreferidas(
  seleccionId: string,
  deportistaId: string,
  selecciones: GrupoCertificado[],
  miembros: MiembroCertificado[],
  seleccionesConAccesoEntrenador: string[],
) {
  const seleccionBase = selecciones.find((seleccion) => seleccion.id === seleccionId);
  if (!seleccionBase) return [seleccionId];

  const clave = (seleccion: GrupoCertificado) =>
    JSON.stringify([seleccion.nombre.trim().toLocaleLowerCase(), seleccion.deporte_id]);
  const idsRelacionados = selecciones
    .filter(
      (seleccion) =>
        clave(seleccion) === clave(seleccionBase) &&
        miembros.some(
          (miembro) => miembro.grupo_id === seleccion.id && miembro.deportista_id === deportistaId,
        ),
    )
    .map((seleccion) => seleccion.id)
    .sort();
  const idsConEntrenador = [
    ...new Set(seleccionesConAccesoEntrenador.filter((id) => idsRelacionados.includes(id))),
  ].sort();

  return [...new Set([...idsConEntrenador, seleccionId, ...idsRelacionados])];
}
