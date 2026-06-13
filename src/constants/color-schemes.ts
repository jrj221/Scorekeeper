export type ThemeColors = {
  text: string;
  textSecondary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  accent: string;
  accentText: string;  // text on top of accent-coloured buttons (usually white)
  negative: string;    // colour for displaying negative scores
  danger: string;      // destructive / error colour
};

export type ColorSchemeId = 'ocean' | 'midnight' | 'lavender' | 'ember' | 'rose' | 'slate' | 'monotone';

export type ColorSchemeDefinition = {
  id: ColorSchemeId;
  name: string;
  colors: ThemeColors;
};

const DANGER = '#C05050';

export const COLOR_SCHEMES: ColorSchemeDefinition[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      text: '#0A2540',
      textSecondary: '#4A7FA5',
      background: '#E8F4FD',
      backgroundElement: '#C8E6F5',
      backgroundSelected: '#A8D4ED',
      accent: '#0077B6',
      accentText: '#fff',
      negative: '#4CABD4',
      danger: DANGER,
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      text: '#E0F2FF',
      textSecondary: '#6BAED4',
      background: '#061A2E',
      backgroundElement: '#0D2B45',
      backgroundSelected: '#163D5E',
      accent: '#0096D6',
      accentText: '#fff',
      negative: '#4CABD4',
      danger: DANGER,
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    colors: {
      text: '#1A0533',
      textSecondary: '#7057A0',
      background: '#EEE8F6',
      backgroundElement: '#D4C5EA',
      backgroundSelected: '#B9A3D8',
      accent: '#6A3FB5',
      accentText: '#fff',
      negative: '#9575CD',
      danger: DANGER,
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: {
      text: '#3E1800',
      textSecondary: '#A05020',
      background: '#FBF0EA',
      backgroundElement: '#FFD0B0',
      backgroundSelected: '#FFBB8A',
      accent: '#E64A19',
      accentText: '#fff',
      negative: '#FF8A65',
      danger: DANGER,
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      text: '#3B0A1F',
      textSecondary: '#A0395A',
      background: '#FCE8EF',
      backgroundElement: '#F5C6D5',
      backgroundSelected: '#EDA0BC',
      accent: '#C2185B',
      accentText: '#fff',
      negative: '#E91E8C',
      danger: DANGER,
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      text: '#102027',
      textSecondary: '#546E7A',
      background: '#ECEFF1',
      backgroundElement: '#CFD8DC',
      backgroundSelected: '#B0BEC5',
      accent: '#37474F',
      accentText: '#fff',
      negative: '#78909C',
      danger: DANGER,
    },
  },
  {
    id: 'monotone',
    name: 'Monotone',
    colors: {
      text: '#ECEFF1',
      textSecondary: '#90A4AE',
      background: '#0D1519',
      backgroundElement: '#1C2B32',
      backgroundSelected: '#263D47',
      accent: '#546E7A',
      accentText: '#fff',
      negative: '#90A4AE',
      danger: DANGER,
    },
  },
];

export const DEFAULT_SCHEME_ID: ColorSchemeId = 'ocean';
