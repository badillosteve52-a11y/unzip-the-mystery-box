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
  grupo?: string;
}

export const TIPOS_ESCENARIOS = [
  "Estadio",
  "Pista Atlética",
  "Piscina",
  "Cancha Sintética",
  "Cancha de Fútbol Tenis",
  "Cancha de Baloncesto",
  "Cancha de Ecuavóley",
  "Cancha de Tenis",
  "Cancha de Arena",
  "Gimnasio",
] as const;

export const UBICACIONES_ESCENARIOS = [
  "Campus Matriz - Centro de Deportes",
  "Campus Matriz - Estadio 1",
  "Campus Matriz - Estadio 2",
] as const;

export const CATALOGO_ESCENARIOS: CatalogoEscenario[] = [
  {
    nombre: "Estadio 1",
    capacidad: null,
    tipo: "Estadio",
    ubicacion: "Centro de Deportes",
    observaciones: "",
    grupo: "Estadios 1 y 2",
  },
  {
    nombre: "Estadio 2",
    capacidad: null,
    tipo: "Estadio",
    ubicacion: "Centro de Deportes",
    observaciones: "",
    grupo: "Estadios 1 y 2",
  },
  {
    nombre: "Pista atlética Estadio 1",
    capacidad: null,
    tipo: "Pista Atlética",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Pista Estadio 2",
    capacidad: null,
    tipo: "Pista Atlética",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Pista de running Estadio 2",
    capacidad: null,
    tipo: "Pista Atlética",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Cancha de vóley playa",
    capacidad: null,
    tipo: "Cancha de Arena",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Cancha de ecuavóley de tierra",
    capacidad: null,
    tipo: "Cancha de Ecuavóley",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Cancha de fútbol tenis",
    capacidad: null,
    tipo: "Cancha de Fútbol Tenis",
    ubicacion: "No especificada",
    observaciones: "",
  },
  {
    nombre: "Cancha sintética de fútbol",
    capacidad: 100,
    tipo: "Cancha Sintética",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Gimnasio institucional",
    capacidad: 100,
    tipo: "Gimnasio",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
  },
  {
    nombre: "Piscina",
    capacidad: 200,
    tipo: "Piscina",
    ubicacion: "Centro de Deportes",
    observaciones: "",
  },
  {
    nombre: "Cancha de tenis 1",
    capacidad: null,
    tipo: "Cancha de Tenis",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas de tenis",
  },
  {
    nombre: "Cancha de tenis 2",
    capacidad: null,
    tipo: "Cancha de Tenis",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas de tenis",
  },
  {
    nombre: "Cancha de tenis 3",
    capacidad: null,
    tipo: "Cancha de Tenis",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas de tenis",
  },
  {
    nombre: "Cancha de tenis 4",
    capacidad: null,
    tipo: "Cancha de Tenis",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas de tenis",
  },
  {
    nombre: "Cancha de tenis 5",
    capacidad: null,
    tipo: "Cancha de Tenis",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas de tenis",
  },
  {
    nombre: "Cancha de ecuavóley de cemento 1",
    capacidad: null,
    tipo: "Cancha de Ecuavóley",
    ubicacion: "Centro de Deportes",
    observaciones: "",
    grupo: "Canchas de ecuavóley de cemento",
  },
  {
    nombre: "Cancha de ecuavóley de cemento 2",
    capacidad: null,
    tipo: "Cancha de Ecuavóley",
    ubicacion: "Centro de Deportes",
    observaciones: "",
    grupo: "Canchas de ecuavóley de cemento",
  },
  {
    nombre: "Cancha de ecuavóley de cemento 3",
    capacidad: null,
    tipo: "Cancha de Ecuavóley",
    ubicacion: "Centro de Deportes",
    observaciones: "",
    grupo: "Canchas de ecuavóley de cemento",
  },
  {
    nombre: "Cancha central de básquet 1",
    capacidad: null,
    tipo: "Cancha de Baloncesto",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas centrales de básquet",
  },
  {
    nombre: "Cancha central de básquet 2",
    capacidad: null,
    tipo: "Cancha de Baloncesto",
    ubicacion: "Centro de Educación Física",
    observaciones: "",
    grupo: "Canchas centrales de básquet",
  },
];

