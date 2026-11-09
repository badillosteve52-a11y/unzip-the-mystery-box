export const FUENTE_ESCENARIOS = "https://www.espoch.edu.ec/escenarios-deportivos/";
export const FUENTE_CAMPUS = "https://www.espoch.edu.ec/campus-information/";
export const DIRECCION_CAMPUS = "Campus ESPOCH, Riobamba · km 1½ Panamericana Sur";

// Jugadores activos por partido: no son límites de ocupación ni aforos de público.
const JUGADORES: Record<string, { min: number; max: number; detalle: string }> = {
  "Cancha de Tenis": { min: 2, max: 4, detalle: "2 jugadores en individuales o 4 en dobles" },
  "Cancha de Baloncesto": { min: 6, max: 10, detalle: "10 jugadores en 5×5 o 6 en 3×3" },
  "Cancha de Ecuavóley": { min: 6, max: 6, detalle: "6 jugadores · 3 por equipo" },
  "Cancha de Arena": { min: 4, max: 4, detalle: "4 jugadores · 2 por equipo" },
  "Cancha de Fútbol Tenis": { min: 2, max: 6, detalle: "2, 4 o 6 jugadores, según modalidad" },
  "Estadio": { min: 22, max: 22, detalle: "22 jugadores en fútbol 11 · 11 por equipo" },
};

export function jugadoresPorPartido(tipo: string | null) {
  return tipo ? JUGADORES[tipo] ?? null : null;
}

export function usoDeportivo(tipo: string | null): string {
  const jugadores = jugadoresPorPartido(tipo);
  if (jugadores) return `${jugadores.detalle} · referencia deportiva`;
  if (tipo === "Pista Atlética") return "Entrenamiento de atletismo y running; participantes según actividad y organización";
  if (tipo === "Cancha Sintética") return "Fútbol reducido; número de jugadores según la modalidad de la reserva";
  if (tipo === "Gimnasio") return "Entrenamiento y acondicionamiento físico; grupos según equipos y actividad";
  if (tipo === "Sala de Tenis de Mesa") return "Tenis de mesa: 2 jugadores por mesa en individuales o 4 en dobles · referencia deportiva";
  if (tipo === "Piscina") return "Natación y entrenamiento; grupos según carriles y supervisión";
  if (tipo === "Coliseo") return "Deportes de sala y actividades colectivas, según modalidad";
  return "Práctica deportiva en grupos, según actividad";
}

export function ubicacionEscenario(ubicacion: string | null): string {
  return !ubicacion?.trim() || ubicacion.toLowerCase().includes("no especificada") || ubicacion.toLowerCase().startsWith("campus espoch")
    ? DIRECCION_CAMPUS
    : `${ubicacion} · ${DIRECCION_CAMPUS}`;
}