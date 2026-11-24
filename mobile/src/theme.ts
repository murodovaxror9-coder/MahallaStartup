import { useColorScheme } from 'react-native';

const light = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  surfaceAlt: '#f0f2f5',
  border: '#e2e5ea',
  text: '#14181f',
  muted: '#647084',
  primary: '#0f766e',
  primaryText: '#ffffff',
  danger: '#b42318',
  warning: '#b54708',
  success: '#067647',
  info: '#175cd3',
};

const dark: typeof light = {
  bg: '#0e1116',
  surface: '#161b22',
  surfaceAlt: '#1e252e',
  border: '#2a323d',
  text: '#e8ecf1',
  muted: '#8b97a8',
  primary: '#2dd4bf',
  primaryText: '#04201c',
  danger: '#f97066',
  warning: '#fdb022',
  success: '#47cd89',
  info: '#84adff',
};

export type Colors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export function useTheme() {
  const scheme = useColorScheme();
  return { colors: scheme === 'dark' ? dark : light, spacing, radius };
}
