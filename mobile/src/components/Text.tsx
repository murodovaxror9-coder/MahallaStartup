import { Text as RNText, type TextProps } from 'react-native';
import { C, F } from '@/theme';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'small'
  | 'smallStrong'
  | 'tiny'
  // eski nomlar (moslik)
  | 'title'
  | 'heading'
  | 'muted';

const STYLES: Record<Variant, { fontSize: number; lineHeight: number; fontFamily: string; color: string }> = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: F.bold, color: C.ink },
  h1: { fontSize: 22, lineHeight: 28, fontFamily: F.semibold, color: C.ink },
  h2: { fontSize: 18, lineHeight: 24, fontFamily: F.semibold, color: C.ink },
  h3: { fontSize: 16, lineHeight: 21, fontFamily: F.semibold, color: C.ink },
  body: { fontSize: 15, lineHeight: 22, fontFamily: F.regular, color: C.ink },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontFamily: F.semibold, color: C.ink },
  label: { fontSize: 14, lineHeight: 19, fontFamily: F.semibold, color: C.ink },
  small: { fontSize: 13, lineHeight: 18, fontFamily: F.regular, color: C.muted },
  smallStrong: { fontSize: 13, lineHeight: 18, fontFamily: F.semibold, color: C.ink },
  tiny: { fontSize: 11, lineHeight: 14, fontFamily: F.medium, color: C.muted },
  title: { fontSize: 22, lineHeight: 28, fontFamily: F.semibold, color: C.ink },
  heading: { fontSize: 16, lineHeight: 21, fontFamily: F.semibold, color: C.ink },
  muted: { fontSize: 13, lineHeight: 18, fontFamily: F.regular, color: C.muted },
};

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[STYLES[variant], style]} />;
}
