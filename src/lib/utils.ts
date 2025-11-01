import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utilidades de validación y normalización
export function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      times.push(time);
    }
  }
  times.push('23:59');
  return times;
}

export function estandarizarNombre(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getDayClassName(dayName: string): string {
  const classes: Record<string, string> = {
    'lunes': 'border-[brown]',
    'martes': 'border-[orange]',
    'miércoles': 'border-[yellow]',
    'jueves': 'border-[purple]',
    'viernes': 'border-[green]',
    'sabado': 'border-white',
    'domingo': 'border-[violet]'
  };
  return classes[dayName] || '';
}
