export type TemplateLayout = 'moderne' | 'classique' | 'minimal';

export interface TemplateColors {
  page: string;      // fond de la page
  ink: string;       // texte principal
  muted: string;     // texte secondaire
  accent: string;    // bandeaux, filets, éléments forts
  bandText: string;  // texte sur le bandeau
}

export interface InvoiceTemplate {
  id: string;
  label: string;
  layout: TemplateLayout;
  colors: TemplateColors;
}

export const DEFAULT_TEMPLATE = 'moderne-noir';

export const TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'moderne-noir', label: 'Moderne · Noir', layout: 'moderne',
    colors: { page: '#FAF9F6', ink: '#111111', muted: '#555555', accent: '#1C1B17', bandText: '#FFFFFF' },
  },
  {
    id: 'moderne-bleu', label: 'Moderne · Bleu nuit', layout: 'moderne',
    colors: { page: '#F8F9FB', ink: '#141B26', muted: '#4A5568', accent: '#2C3E5D', bandText: '#FFFFFF' },
  },
  {
    id: 'moderne-bordeaux', label: 'Moderne · Bordeaux', layout: 'moderne',
    colors: { page: '#FBF8F6', ink: '#241312', muted: '#5C4844', accent: '#6B2E2A', bandText: '#FFFFFF' },
  },
  {
    id: 'moderne-creme', label: 'Moderne · Papier crème', layout: 'moderne',
    colors: { page: '#F6F1E7', ink: '#2B2A26', muted: '#6E5F4B', accent: '#2B2A26', bandText: '#F6F1E7' },
  },
  {
    id: 'classique-noir', label: 'Classique · Noir', layout: 'classique',
    colors: { page: '#FFFFFF', ink: '#111111', muted: '#555555', accent: '#1C1B17', bandText: '#FFFFFF' },
  },
  {
    id: 'classique-vert', label: 'Classique · Vert registre', layout: 'classique',
    colors: { page: '#FDFCF8', ink: '#1E2A22', muted: '#4F5F54', accent: '#33523F', bandText: '#FFFFFF' },
  },
  {
    id: 'classique-taupe', label: 'Classique · Taupe', layout: 'classique',
    colors: { page: '#FAF9F6', ink: '#2B2A26', muted: '#6E5F4B', accent: '#8A8273', bandText: '#FFFFFF' },
  },
  {
    id: 'minimal-noir', label: 'Minimal · Noir', layout: 'minimal',
    colors: { page: '#FFFFFF', ink: '#111111', muted: '#666666', accent: '#111111', bandText: '#FFFFFF' },
  },
  {
    id: 'minimal-sepia', label: 'Minimal · Sépia', layout: 'minimal',
    colors: { page: '#FBF9F4', ink: '#3A342A', muted: '#7A6E5A', accent: '#6E5F4B', bandText: '#FFFFFF' },
  },
  {
    id: 'minimal-rouge', label: 'Minimal · Rouge de marge', layout: 'minimal',
    colors: { page: '#FDFBF8', ink: '#26211E', muted: '#6B5F58', accent: '#C05A47', bandText: '#FFFFFF' },
  },
];

export function getTemplate(id: string | null | undefined): InvoiceTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
