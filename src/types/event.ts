export interface Event {
  id: string;
  orquesta: string;
  municipio: string;
  lugar: string;
  hora: string;
  day: string;
  tipo: string;
  editing: boolean;
  cancelado: boolean;
  FechaAgregado: string;
  FechaEditado: string;
}

export interface EventFormData {
  orquesta: string;
  municipio: string;
  lugar: string;
  hora: string;
  day: string;
  tipo: string;
  customTipo: string;
}

export const MUNICIPIOS = [
  'Adeje', 'Arafo', 'Arico', 'Arona', 'Buenavista', 'Candelaria',
  'Rosario', 'Sauzal', 'Tanque', 'Fasnia', 'Garachico', 'Granadilla',
  'Guancha', 'Guía', 'Güímar', 'Icod', 'Matanza', 'Orotava', 'Puerto',
  'Realejos', 'Laguna', 'San Juan Rambla', 'San Miguel', 'Santa Cruz',
  'Santa Úrsula', 'Santiago Teide', 'Tacoronte', 'Tegueste', 'Victoria',
  'Vilaflor', 'Silos'
];

export const TIPOS_EVENTO = [
  'Baile Normal', 'Romería', 'Baile Magos', 'Tapas y Vinos', 'Paseo Romero',
  'Tapas', 'Romería Chica', 'Carnaval', 'Taifa', 'Infantil', 'Inclusiva',
  'Vinos', 'Aniversario', 'Solidario', 'Romería Barquera', 'Pamela', 'Blanco',
  'Sombrero', 'Sardinada','Otro'
];
