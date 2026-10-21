export const FACULTADES_Y_CARRERAS: Record<string, string[]> = {
  "FACULTAD DE ADMINISTRACIÓN DE EMPRESAS": [
    "Administración de Empresas",
    "Contabilidad y Auditoría",
    "Finanzas",
    "Mercadotecnia",
    "Gestión del Transporte",
    "Gestión de Inteligencia de Negocios",
    "Comercio Exterior",
    "Economía",
  ],
  "FACULTAD DE CIENCIAS": [
    "Física",
    "Matemática",
    "Estadística",
    "Ingeniería Química",
    "Ingeniería Ambiental",
    "Química",
    "Bioquímica y Farmacia",
  ],
  "FACULTAD DE CIENCIAS PECUARIAS": [
    "Zootecnia",
    "Agroindustria",
    "Medicina Veterinaria",
  ],
  "FACULTAD DE INFORMÁTICA Y ELECTRÓNICA": [
    "Diseño Gráfico",
    "Software",
    "Tecnologías de la Información",
    "Telecomunicaciones",
    "Telemática",
    "Electricidad",
    "Electrónica y Automatización",
  ],
  "FACULTAD DE MECÁNICA": [
    "Mecánica",
    "Ingeniería Industrial",
    "Mantenimiento Industrial",
    "Ingeniería Automotriz",
  ],
  "FACULTAD DE RECURSOS NATURALES": [
    "Agronomía",
    "Ingeniería Forestal",
    "Turismo",
    "Recursos Naturales Renovables",
    "Minas",
    "Geología Ambiental",
    "Geomática",
  ],
  "FACULTAD DE SALUD PÚBLICA": [
    "Medicina",
    "Nutrición y Dietética",
    "Gastronomía",
    "Promoción de la Salud",
  ],
};

export const LISTA_FACULTADES = Object.keys(FACULTADES_Y_CARRERAS);


export function getCarrerasPorFacultad(facultad: string | null | undefined): string[] {
  if (!facultad) return [];
  const facTrim = facultad.trim();
  if (FACULTADES_Y_CARRERAS[facTrim]) {
    return FACULTADES_Y_CARRERAS[facTrim];
  }
  const facUpper = facTrim.toUpperCase();
  for (const [key, carreras] of Object.entries(FACULTADES_Y_CARRERAS)) {
    if (key.toUpperCase() === facUpper) return carreras;
    const sinPrefijo = key.replace(/^FACULTAD DE\s+/i, "").toUpperCase();
    const facSinPrefijo = facUpper.replace(/^FACULTAD DE\s+/i, "");
    if (sinPrefijo === facSinPrefijo) return carreras;
  }
  return [];
}

export function normalizarFacultad(facultad: string | null | undefined): string | null {
  if (!facultad) return null;
  const facTrim = facultad.trim();
  if (FACULTADES_Y_CARRERAS[facTrim]) return facTrim;
  const facUpper = facTrim.toUpperCase();
  for (const key of Object.keys(FACULTADES_Y_CARRERAS)) {
    if (key.toUpperCase() === facUpper) return key;
    const sinPrefijo = key.replace(/^FACULTAD DE\s+/i, "").toUpperCase();
    const facSinPrefijo = facUpper.replace(/^FACULTAD DE\s+/i, "");
    if (sinPrefijo === facSinPrefijo) return key;
  }
  return facTrim;
}

// Mapa de alias → nombre oficial de carrera
// Cubre nombres abreviados, incorrectos o inventados que aparecen en datos de ejemplo.
const ALIAS_CARRERAS: Record<string, string> = {
  // FIE
  "ingeniería en sistemas":           "Software",
  "ingenieria en sistemas":           "Software",
  "sistemas":                         "Software",
  "ing. sistemas":                    "Software",
  "ingeniería de software":           "Software",
  "ingenieria de software":           "Software",
  "diseño":                           "Diseño Gráfico",
  "diseno":                           "Diseño Gráfico",
  "diseno grafico":                   "Diseño Gráfico",
  "ti":                               "Tecnologías de la Información",
  "tecnologias de la informacion":   "Tecnologías de la Información",
  "telecom":                          "Telecomunicaciones",
  "electrónica":                      "Electrónica y Automatización",
  "electronica":                      "Electrónica y Automatización",
  // FADE
  "contabilidad":                     "Contabilidad y Auditoría",
  "auditoria":                        "Contabilidad y Auditoría",
  "auditoría":                        "Contabilidad y Auditoría",
  "administracion":                   "Administración de Empresas",
  "administración":                   "Administración de Empresas",
  "marketing":                        "Mercadotecnia",
  // Salud Pública
  "nutricion":                        "Nutrición y Dietética",
  "nutrición":                        "Nutrición y Dietética",
  "dietetica":                        "Nutrición y Dietética",
  "dietética":                        "Nutrición y Dietética",
  "gastronomia":                      "Gastronomía",
  "promocion de la salud":            "Promoción de la Salud",
  // Mecánica
  "ingeniería civil":                 "Ingeniería Industrial",
  "ingenieria civil":                 "Ingeniería Industrial",
  "civil":                            "Ingeniería Industrial",
  "ingeniería mecánica":              "Mecánica",
  "ingenieria mecanica":              "Mecánica",
  "industrial":                       "Ingeniería Industrial",
  "automotriz":                       "Ingeniería Automotriz",
  "mantenimiento":                    "Mantenimiento Industrial",
  // Recursos Naturales
  "agronomía y recursos naturales":   "Agronomía",
  "agronomia":                        "Agronomía",
  "forestal":                         "Ingeniería Forestal",
  "ecoturismo":                       "Turismo",
  // Ciencias
  "quimica":                          "Química",
  "ingenieria quimica":               "Ingeniería Química",
  "ambiental":                        "Ingeniería Ambiental",
  "ingenieria ambiental":             "Ingeniería Ambiental",
  "bioquimica":                       "Bioquímica y Farmacia",
  "bioquímica":                       "Bioquímica y Farmacia",
  "farmacia":                         "Bioquímica y Farmacia",
  "fisica":                           "Física",
  "matematica":                       "Matemática",
  "estadistica":                      "Estadística",
  // Pecuarias
  "veterinaria":                      "Medicina Veterinaria",
};

/**
 * Dada una carrera (posiblemente abreviada/incorrecta) y la facultad oficial,
 * devuelve el nombre exacto de la carrera en el catálogo.
 * Devuelve siempre el string oficial canónico (con mayúsculas y acentos correctos).
 */
export function normalizarCarrera(
  carrera: string | null | undefined,
  facultadOficial: string | null | undefined,
): string | null {
  if (!carrera) return null;
  const trimmed = carrera.trim();
  const lc = trimmed.toLowerCase();

  // 1. Alias exacto
  if (ALIAS_CARRERAS[lc]) return ALIAS_CARRERAS[lc];

  // 2. Coincidencia exacta o sin acentos en todo el catálogo de carreras
  const todasCarreras = Object.values(FACULTADES_Y_CARRERAS).flat();
  const matchExacto = todasCarreras.find(
    (c) => c.toLowerCase() === lc || c.localeCompare(trimmed, undefined, { sensitivity: "base" }) === 0,
  );
  if (matchExacto) return matchExacto;

  // 3. Buscar coincidencia parcial dentro de la facultad oficial
  if (facultadOficial) {
    const oferta = getCarrerasPorFacultad(facultadOficial);
    const match = oferta.find(
      (c) => c.toLowerCase().includes(lc) || lc.includes(c.toLowerCase()),
    );
    if (match) return match;
  }

  // 4. No se pudo normalizar → devolver como está
  return trimmed;
}

export const CATALOGO_DEPORTES = [
  "Fútbol",
  "Baloncesto",
  "Voleibol",
  "Vóley",
  "Futsala",
  "Atletismo",
  "Natación",
  "Taekwondo",
  "Hípica",
  "Judo",
  "Tenis de Mesa",
  "Tenis de Campo",
  "Tenis de Playa",
  "Ecuavóley",
  "Running",
  "Defensa Personal",
  "Acondicionamiento Físico",
  "Ajedrez",
];

export const CATALOGO_CLUBES = [
  "Club de Acondicionamiento Físico",
  "Club de Tenis de Campo",
  "Club de Tenis de Mesa",
  "Club de Fútbol",
  "Club de Running",
  "Club de Ajedrez",
  "Club de Baloncesto",
  "Club de Voleibol",
  "Club de Defensa Personal",
  "Club de Ecuavóley",
];

export const CATALOGO_SELECCIONES = [
  "Fútbol Masculino",
  "Fútbol Femenino",
  "Baloncesto Masculino",
  "Baloncesto Femenino",
  "Voleibol Masculino",
  "Voleibol Femenino",
  "Futsala Masculino",
  "Futsala Femenino",
  "Atletismo Masculino",
  "Atletismo Femenino",
  "Natación Masculino",
  "Natación Femenino",
  "Taekwondo Masculino",
  "Taekwondo Femenino",
  "Hípica Masculino",
  "Hípica Femenino",
  "Judo Masculino",
  "Judo Femenino",
  "Tenis de Mesa",
  "Tenis de Campo",
  "Ajedrez",
];

export interface CatalogoEscenario {
  nombre: string;
  capacidad: number | null;
  tipo: string;
  ubicacion: string;
  observaciones: string;
}

export const TIPOS_ESCENARIOS = [
  "Estadio",
  "Pista Atlética",
  "Coliseo",
  "Piscina",
  "Cancha Sintética",
  "Cancha de Baloncesto",
  "Cancha de Ecuavóley",
  "Cancha de Tenis",
  "Cancha de Arena",
  "Cancha Múltiple",
  "Cancha Deportiva",
  "Gimnasio",
  "Sala Especializada",
  "Espacio Abierto / Ecuestre",
  "Pista / Circuito",
  "Instalación de Apoyo",
] as const;

export const UBICACIONES_ESCENARIOS = [
  "Campus Matriz - Centro de Deportes",
  "Campus Matriz - Centro de Educación Física",
  "Campus Matriz - Estadio 2",
  "Campus Matriz - Zona Deportiva",
  "Campus Matriz - Complejo Deportivo",
  "Campus Matriz (Perímetro Institucional)",
  "Campus Matriz - Sector Centro de Educación Física",
  "Facultad de Administración de Empresas (FADE)",
  "Facultad de Informática y Electrónica (FIE)",
  "Facultad de Mecánica",
  "Facultad de Ciencias Pecuarias (FCP)",
  "Facultad de Recursos Naturales",
  "Facultad de Salud Pública",
  "Facultad de Ciencias",
  "Estación Experimental Tunshi / Prado (Ciencias Pecuarias)",
] as const;

export const CATALOGO_ESCENARIOS: CatalogoEscenario[] = [
  // --- Estadios y Atletismo ---
  {
    nombre: "Estadio Politécnico 1",
    capacidad: 700,
    tipo: "Estadio",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Estadio principal de fútbol con cancha reglamentaria de césped natural, graderíos y camerinos para campeonatos institucionales y federados.",
  },
  {
    nombre: "Estadio 2",
    capacidad: 700,
    tipo: "Estadio",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Estadio secundario para partidos oficiales de fútbol, entrenamientos de selecciones y torneos interfacultades.",
  },
  {
    nombre: "Pista Atlética del Estadio 2",
    capacidad: 700,
    tipo: "Pista Atlética",
    ubicacion: "Campus Matriz - Estadio 2",
    observaciones: "Pista de carreras y pruebas de campo para entrenamientos de atletismo, velocidad, fondo, salto y preparación del Club de Running.",
  },
  {
    nombre: "Circuito Perimetral de Running",
    capacidad: 250,
    tipo: "Pista / Circuito",
    ubicacion: "Campus Matriz (Perímetro Institucional)",
    observaciones: "Ruta y sendero señalizado para entrenamiento aeróbico, acondicionamiento y trote libre de la comunidad politécnica.",
  },

  // --- Coliseo y Deportes Bajo Techo ---
  {
    nombre: "Coliseo Institucional Politécnico",
    capacidad: 800,
    tipo: "Coliseo",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Coliseo cubierto polideportivo con graderíos, apto para baloncesto (5x5 y 3x3), voleibol, futsala y ceremonias institucionales.",
  },

  // --- Piscina ---
  {
    nombre: "Piscina Semiolímpica Politécnica",
    capacidad: 200,
    tipo: "Piscina",
    ubicacion: "Campus Matriz - Centro de Educación Física",
    observaciones: "Piscina temperada semiolímpica para natación formativa, entrenamientos de la selección y horarios recreativos politécnicos.",
  },

  // --- Canchas Sintéticas ---
  {
    nombre: "Cancha Sintética 1 (Fútbol)",
    capacidad: 150,
    tipo: "Cancha Sintética",
    ubicacion: "Campus Matriz - Zona Deportiva",
    observaciones: "Césped sintético reglamentario con cerramiento e iluminación artificial para torneos nocturnos de fulbito y minifútbol.",
  },
  {
    nombre: "Cancha Sintética 2 (Minifútbol)",
    capacidad: 120,
    tipo: "Cancha Sintética",
    ubicacion: "Campus Matriz - Zona Deportiva",
    observaciones: "Cancha de césped sintético para entrenamientos de fútbol formativo y torneos rápidos de indor/fulbito.",
  },

  // --- Canchas Centrales Abiertas ---
  {
    nombre: "Canchas Centrales de Baloncesto (Canchas 1 y 2)",
    capacidad: 250,
    tipo: "Cancha de Baloncesto",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Dos canchas exteriores de cemento con tableros reglamentarios para básquetbol 5x5 y 3x3.",
  },
  {
    nombre: "Canchas Centrales de Ecuavóley (Cemento y Tierra)",
    capacidad: 200,
    tipo: "Cancha de Ecuavóley",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Espacios tradicionales con superficie de tierra y cemento para la práctica y torneos del Club de Ecuavóley.",
  },
  {
    nombre: "Canchas de Tenis de Campo",
    capacidad: 300,
    tipo: "Cancha de Tenis",
    ubicacion: "Campus Matriz - Sector Centro de Educación Física",
    observaciones: "Canchas reglamentarias de tenis con graderíos y aforo para 300 personas, aptas para torneos locales e interuniversitarios.",
  },
  {
    nombre: "Canchas de Arena (Voleibol y Tenis de Playa)",
    capacidad: 150,
    tipo: "Cancha de Arena",
    ubicacion: "Campus Matriz - Complejo Deportivo",
    observaciones: "Área reglamentaria de arena sílice para voleibol playero y tenis de playa de los clubes politécnicos.",
  },

  // --- Gimnasio y Salas Especializadas ---
  {
    nombre: "Gimnasio Institucional de Musculación y Fuerza",
    capacidad: 80,
    tipo: "Gimnasio",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Equipado con máquinas de pesas, barras, mancuernas, poleas y área de cardio para acondicionamiento físico de alto rendimiento.",
  },
  {
    nombre: "Sala de Tenis de Mesa",
    capacidad: 50,
    tipo: "Sala Especializada",
    ubicacion: "Campus Matriz - Centro de Educación Física",
    observaciones: "Espacio cubierto acondicionado con mesas de tenis de mesa (ping-pong) para entrenamiento competitivo y recreativo.",
  },
  {
    nombre: "Sala de Ajedrez Politécnica",
    capacidad: 40,
    tipo: "Sala Especializada",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Sala equipada con tableros, relojes de competición y material pedagógico para la selección y torneos de ajedrez.",
  },
  {
    nombre: "Dojo de Artes Marciales (Taekwondo / Judo / Defensa Personal)",
    capacidad: 60,
    tipo: "Sala Especializada",
    ubicacion: "Campus Matriz - Centro de Deportes",
    observaciones: "Área techada con tatami homologado para entrenamientos de Taekwondo, Judo y Club de Defensa Personal.",
  },

  // --- Canchas de Facultades ---
  {
    nombre: "Cancha Múltiple de la FADE",
    capacidad: 150,
    tipo: "Cancha Múltiple",
    ubicacion: "Facultad de Administración de Empresas (FADE)",
    observaciones: "Cancha para indor, básquetbol y ecuavóley en los predios de la FADE, utilizada para la Copa FADE e intercarreras.",
  },
  {
    nombre: "Cancha Múltiple de la FIE",
    capacidad: 150,
    tipo: "Cancha Múltiple",
    ubicacion: "Facultad de Informática y Electrónica (FIE)",
    observaciones: "Cancha de uso múltiple para básquet e indor fútbol intercarreras en la zona deportiva de la FIE.",
  },
  {
    nombre: "Canchas de la Facultad de Mecánica",
    capacidad: 150,
    tipo: "Cancha Múltiple",
    ubicacion: "Facultad de Mecánica",
    observaciones: "Cancha de uso múltiple para torneos deportivos de las carreras de ingeniería mecánica, automotriz e industrial.",
  },
  {
    nombre: "Canchas de la Facultad de Ciencias Pecuarias",
    capacidad: 150,
    tipo: "Cancha Deportiva",
    ubicacion: "Facultad de Ciencias Pecuarias (FCP)",
    observaciones: "Canchas de indor y ecuavóley en las inmediaciones de la FCP para actividades estudiantiles y de integración.",
  },
  {
    nombre: "Cancha Múltiple de Recursos Naturales",
    capacidad: 120,
    tipo: "Cancha Múltiple",
    ubicacion: "Facultad de Recursos Naturales",
    observaciones: "Cancha polideportiva para indor, ecuavóley y básquetbol en el sector de Agronomía y Recursos Naturales.",
  },
  {
    nombre: "Cancha Múltiple de Salud Pública",
    capacidad: 120,
    tipo: "Cancha Múltiple",
    ubicacion: "Facultad de Salud Pública",
    observaciones: "Cancha polivalente para actividades deportivas y recreativas de medicina, nutrición y promoción de la salud.",
  },
  {
    nombre: "Cancha Múltiple de la Facultad de Ciencias",
    capacidad: 100,
    tipo: "Cancha Múltiple",
    ubicacion: "Facultad de Ciencias",
    observaciones: "Cancha de cemento para fútbol indor y baloncesto en los predios de la Facultad de Ciencias.",
  },

  // --- Espacios Ecuestres y Servicios ---
  {
    nombre: "Picadero / Área Ecuestre",
    capacidad: 100,
    tipo: "Espacio Abierto / Ecuestre",
    ubicacion: "Estación Experimental Tunshi / Prado (Ciencias Pecuarias)",
    observaciones: "Instalación de arena y manga para adiestramiento, prácticas ecuestres y selección de hípica.",
  },
  {
    nombre: "Módulo de Préstamo de Implementos (Zona Deportiva)",
    capacidad: 30,
    tipo: "Instalación de Apoyo",
    ubicacion: "Campus Matriz - Centro de Educación Física",
    observaciones: "Punto de atención para préstamo gratuito de balones, raquetas, mallas y cronómetros a la comunidad con carnet estudiantil.",
  },
];

