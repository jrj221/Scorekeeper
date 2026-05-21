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

export type ColorSchemeId = 'ocean' | 'forest' | 'ember' | 'lavender' | 'slate' | 'rose' | 'teal' | 'midnight';

export type ColorSchemeDefinition = {
  id: ColorSchemeId;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
};

const DANGER = '#C05050';

export const COLOR_SCHEMES: ColorSchemeDefinition[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    light: {
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
    dark: {
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
    id: 'forest',
    name: 'Forest',
    light: {
      text: '#1B3A1F',
      textSecondary: '#4A7A50',
      background: '#EBF5EC',
      backgroundElement: '#C8E6CA',
      backgroundSelected: '#A5D6A7',
      accent: '#2E7D32',
      accentText: '#fff',
      negative: '#66BB6A',
      danger: DANGER,
    },
    dark: {
      text: '#E8F5E9',
      textSecondary: '#6ABF6E',
      background: '#0A1F0D',
      backgroundElement: '#1A3D1E',
      backgroundSelected: '#29542D',
      accent: '#43A047',
      accentText: '#fff',
      negative: '#66BB6A',
      danger: DANGER,
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    light: {
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
    dark: {
      text: '#FBE9E7',
      textSecondary: '#FF8A65',
      background: '#1F0A00',
      backgroundElement: '#3D1800',
      backgroundSelected: '#5C2700',
      accent: '#F4511E',
      accentText: '#fff',
      negative: '#FF8A65',
      danger: DANGER,
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    light: {
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
    dark: {
      text: '#EDE7F6',
      textSecondary: '#9575CD',
      background: '#0D0019',
      backgroundElement: '#1E0A38',
      backgroundSelected: '#2E1550',
      accent: '#7E57C2',
      accentText: '#fff',
      negative: '#9575CD',
      danger: DANGER,
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    light: {
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
    dark: {
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
  {
    id: 'rose',
    name: 'Rose',
    light: {
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
    dark: {
      text: '#FCE4EC',
      textSecondary: '#F48FB1',
      background: '#1A0010',
      backgroundElement: '#330020',
      backgroundSelected: '#4D0030',
      accent: '#E91E63',
      accentText: '#fff',
      negative: '#F48FB1',
      danger: DANGER,
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    light: {
      text: '#00272B',
      textSecondary: '#2E7D82',
      background: '#E0F4F5',
      backgroundElement: '#B2E4E6',
      backgroundSelected: '#80CECE',
      accent: '#00838F',
      accentText: '#fff',
      negative: '#26C6DA',
      danger: DANGER,
    },
    dark: {
      text: '#E0F7FA',
      textSecondary: '#4DD0E1',
      background: '#001417',
      backgroundElement: '#00252A',
      backgroundSelected: '#00363D',
      accent: '#00ACC1',
      accentText: '#fff',
      negative: '#4DD0E1',
      danger: DANGER,
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    light: {
      text: '#0D0D1A',
      textSecondary: '#555580',
      background: '#EBEBF5',
      backgroundElement: '#D0D0E8',
      backgroundSelected: '#B5B5D8',
      accent: '#3D3D8F',
      accentText: '#fff',
      negative: '#6666BB',
      danger: DANGER,
    },
    dark: {
      text: '#E8E8FF',
      textSecondary: '#8888CC',
      background: '#05050F',
      backgroundElement: '#0F0F22',
      backgroundSelected: '#1A1A33',
      accent: '#5C5CCC',
      accentText: '#fff',
      negative: '#8888CC',
      danger: DANGER,
    },
  },
];

export const DEFAULT_SCHEME_ID: ColorSchemeId = 'ocean';
