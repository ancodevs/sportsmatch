// Utilidades para canchas deportivas

// Tipos de deporte con sus nombres en español
export const sportTypes = {
  football: { label: 'Fútbol', emoji: '⚽' },
  futsal: { label: 'Fútbol Sala / Futsal', emoji: '⚽' },
  tennis: { label: 'Tenis', emoji: '🎾' },
  paddle: { label: 'Pádel', emoji: '🎾' },
  basketball: { label: 'Básquetbol', emoji: '🏀' },
  volleyball: { label: 'Vóleibol', emoji: '🏐' },
  handball: { label: 'Handball', emoji: '🤾' },
  rugby: { label: 'Rugby', emoji: '🏉' },
  hockey: { label: 'Hockey', emoji: '🏑' },
  cricket: { label: 'Cricket', emoji: '🏏' },
  baseball: { label: 'Béisbol', emoji: '⚾' },
  softball: { label: 'Softball', emoji: '🥎' },
  athletics: { label: 'Atletismo', emoji: '🏃' },
  swimming: { label: 'Natación', emoji: '🏊' },
  other: { label: 'Otro', emoji: '🏟️' },
} as const;

// Tipos de superficie con sus nombres en español
export const surfaceTypes = {
  natural_grass: { label: 'Césped Natural', emoji: '🌱' },
  synthetic_grass: { label: 'Césped Sintético', emoji: '🟢' },
  concrete: { label: 'Cemento', emoji: '⬜' },
  parquet: { label: 'Parquet', emoji: '🟫' },
  clay: { label: 'Tierra / Arcilla', emoji: '🟤' },
  hardwood: { label: 'Madera Dura', emoji: '🪵' },
  rubber: { label: 'Caucho', emoji: '⚫' },
  sand: { label: 'Arena', emoji: '🟡' },
  asphalt: { label: 'Asfalto', emoji: '⬛' },
  carpet: { label: 'Alfombra / Carpet', emoji: '🔵' },
  other: { label: 'Otro', emoji: '▫️' },
} as const;

// Función para obtener el nombre del deporte
export function getSportName(sportType: string | null | undefined): string {
  if (!sportType) return 'Sin especificar';
  const sport = sportTypes[sportType as keyof typeof sportTypes];
  return sport ? `${sport.emoji} ${sport.label}` : sportType;
}

// Función para obtener el nombre de la superficie
export function getSurfaceName(surfaceType: string | null | undefined): string {
  if (!surfaceType) return 'Sin especificar';
  const surface = surfaceTypes[surfaceType as keyof typeof surfaceTypes];
  return surface ? surface.label : surfaceType;
}

// Función para obtener solo el label sin emoji
export function getSportLabel(sportType: string | null | undefined): string {
  if (!sportType) return 'Sin especificar';
  const sport = sportTypes[sportType as keyof typeof sportTypes];
  return sport ? sport.label : sportType;
}

// Array de opciones para usar en selects
export const sportOptions = Object.entries(sportTypes).map(([value, { label }]) => ({
  value,
  label,
}));

export const surfaceOptions = Object.entries(surfaceTypes).map(([value, { label }]) => ({
  value,
  label,
}));
