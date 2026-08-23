export type TemplateLayout = 'moderne' | 'minimal' | 'bandeau' | 'laterale' | 'elegant';

export interface TemplateColors {
  page: string;      // fond de la page
  ink: string;       // texte principal
  muted: string;     // texte secondaire
  accent: string;    // bandeaux, filets, éléments forts
  bandText: string;  // texte sur l'accent
}

export interface InvoiceTemplate {
  id: string;
  label: string;
  layout: TemplateLayout;
  colors: TemplateColors;
}

export const DEFAULT_TEMPLATE = 'moderne-noir';

const C: Record<string, TemplateColors> = {
  noir:     { page: '#FAF9F6', ink: '#111111', muted: '#555555', accent: '#1C1B17', bandText: '#FFFFFF' },
  bleu:     { page: '#F8F9FB', ink: '#141B26', muted: '#4A5568', accent: '#2C3E5D', bandText: '#FFFFFF' },
  bordeaux: { page: '#FBF8F6', ink: '#241312', muted: '#5C4844', accent: '#6B2E2A', bandText: '#FFFFFF' },
  creme:    { page: '#F6F1E7', ink: '#2B2A26', muted: '#6E5F4B', accent: '#2B2A26', bandText: '#F6F1E7' },
  sepia:    { page: '#FBF9F4', ink: '#3A342A', muted: '#7A6E5A', accent: '#6E5F4B', bandText: '#FFFFFF' },
  rouge:    { page: '#FDFBF8', ink: '#26211E', muted: '#6B5F58', accent: '#C05A47', bandText: '#FFFFFF' },
  ardoise:  { page: '#F5F8F8', ink: '#17282A', muted: '#4A5F61', accent: '#2F5D62', bandText: '#FFFFFF' },
  vert:     { page: '#FDFCF8', ink: '#1E2A22', muted: '#4F5F54', accent: '#33523F', bandText: '#FFFFFF' },
  prune:    { page: '#FBF7FA', ink: '#241624', muted: '#5C4A5C', accent: '#5B3A5B', bandText: '#FFFFFF' },
  taupe:    { page: '#FAF9F6', ink: '#2B2A26', muted: '#6E5F4B', accent: '#8A8273', bandText: '#FFFFFF' },
};

export const TEMPLATES: InvoiceTemplate[] = [
  // Moderne — grand titre à droite, tableau à bandeau
  { id: 'moderne-noir', label: 'Moderne · Noir', layout: 'moderne', colors: C.noir },
  { id: 'moderne-bleu', label: 'Moderne · Bleu nuit', layout: 'moderne', colors: C.bleu },
  { id: 'moderne-bordeaux', label: 'Moderne · Bordeaux', layout: 'moderne', colors: C.bordeaux },
  { id: 'moderne-creme', label: 'Moderne · Papier crème', layout: 'moderne', colors: C.creme },

  // Minimal — centré, filets fins, sans bandeau
  { id: 'minimal-noir', label: 'Minimal · Noir', layout: 'minimal', colors: C.noir },
  { id: 'minimal-sepia', label: 'Minimal · Sépia', layout: 'minimal', colors: C.sepia },
  { id: 'minimal-rouge', label: 'Minimal · Rouge de marge', layout: 'minimal', colors: C.rouge },
  { id: 'minimal-ardoise', label: 'Minimal · Ardoise', layout: 'minimal', colors: C.ardoise },

  // En-tête plein — bandeau de couleur pleine largeur en haut
  { id: 'bandeau-noir', label: 'En-tête · Noir', layout: 'bandeau', colors: C.noir },
  { id: 'bandeau-bleu', label: 'En-tête · Bleu nuit', layout: 'bandeau', colors: C.bleu },
  { id: 'bandeau-vert', label: 'En-tête · Vert', layout: 'bandeau', colors: C.vert },
  { id: 'bandeau-prune', label: 'En-tête · Prune', layout: 'bandeau', colors: C.prune },

  // Bande latérale — colonne de couleur à gauche
  { id: 'laterale-noir', label: 'Bande latérale · Noir', layout: 'laterale', colors: C.noir },
  { id: 'laterale-bordeaux', label: 'Bande latérale · Bordeaux', layout: 'laterale', colors: C.bordeaux },
  { id: 'laterale-vert', label: 'Bande latérale · Vert', layout: 'laterale', colors: C.vert },
  { id: 'laterale-taupe', label: 'Bande latérale · Taupe', layout: 'laterale', colors: C.taupe },

  // Élégant — typographie serif, très aéré
  { id: 'elegant-noir', label: 'Élégant · Noir', layout: 'elegant', colors: C.noir },
  { id: 'elegant-sepia', label: 'Élégant · Sépia', layout: 'elegant', colors: C.sepia },
  { id: 'elegant-bleu', label: 'Élégant · Bleu nuit', layout: 'elegant', colors: C.bleu },
  { id: 'elegant-prune', label: 'Élégant · Prune', layout: 'elegant', colors: C.prune },
];

export function getTemplate(id: string | null | undefined): InvoiceTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
