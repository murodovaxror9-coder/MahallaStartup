import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { C, F, radius } from '@/theme';
import { Text } from './Text';

interface FieldProps extends TextInputProps {
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
  label?: string;
  hint?: string;
  error?: string | null;
}

export function Field({ label, hint, error, multiline, style, onFocus, onBlur, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        aria-invalid={!!error}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
        style={[
          {
            minHeight: multiline ? 88 : 48,
            borderWidth: 1,
            borderColor: error ? C.danger : focused ? C.primary : C.line,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 10,
            fontSize: 16,
            fontFamily: F.regular,
            color: C.ink,
            backgroundColor: C.surface,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="small" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small">{hint}</Text>
      ) : null}
    </View>
  );
}
