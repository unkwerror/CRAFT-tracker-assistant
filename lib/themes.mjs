export const THEMES = {
  dark: {
    id: 'dark',
    label: 'Тёмная',
    colors: {
      bg: '14 14 14',
      surface: '22 22 22',
      surface2: '28 28 28',
      border: '38 38 38',
      border2: '51 51 51',
      accent: '91 164 245',
      green: '66 199 116',
      purple: '201 160 255',
      orange: '255 177 85',
      red: '255 123 114',
      cyan: '109 216 224',
      muted: '122 136 153',
    },
  },
  midnight: {
    id: 'midnight',
    label: 'Полночь',
    colors: {
      bg: '9 11 16',
      surface: '15 18 24',
      surface2: '21 25 34',
      border: '30 35 48',
      border2: '42 48 64',
      accent: '122 162 247',
      green: '158 206 106',
      purple: '187 154 247',
      orange: '224 175 104',
      red: '247 118 142',
      cyan: '125 207 255',
      muted: '86 95 137',
    },
  },
  light: {
    id: 'light',
    label: 'Светлая',
    colors: {
      bg: '250 250 250',
      surface: '255 255 255',
      surface2: '245 245 245',
      border: '229 229 229',
      border2: '212 212 212',
      accent: '37 99 235',
      green: '22 163 74',
      purple: '147 51 234',
      orange: '234 88 12',
      red: '220 38 38',
      cyan: '8 145 178',
      muted: '107 114 128',
    },
  },
};

export const DEFAULT_THEME = 'dark';

export function getThemeCSS(themeId) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  return Object.entries(theme.colors)
    .map(([key, val]) => `--craft-${key}: ${val}`)
    .join('; ');
}
