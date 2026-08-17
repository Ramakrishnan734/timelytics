/**
 * AuthInput.tsx
 *
 * Shared text input for all auth screens.
 * Matches the Stitch input field design:
 *   - Dark fill (surfaceContainerHigh)
 *   - Outlined on focus (primary border)
 *   - Label above
 *   - Error message below
 *   - Optional eye toggle for password fields
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors }  from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';

interface AuthInputProps extends TextInputProps {
  label:        string;
  error?:       string;
  isPassword?:  boolean;
}

const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  isPassword = false,
  style,
  ...rest
}) => {
  const [focused,  setFocused]  = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[
        styles.inputRow,
        focused && styles.inputRowFocused,
        !!error && styles.inputRowError,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.outline}
          selectionColor={Colors.primary}
          secureTextEntry={isPassword && !revealed}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setRevealed(r => !r)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.eyeBtn}
          >
            <Text style={styles.eyeIcon}>{revealed ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color:      Colors.textSecondary,
    fontSize:   13,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.lg,
    borderWidth:     1.5,
    borderColor:     Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
  },
  inputRowError: {
    borderColor: Colors.danger,
  },
  input: {
    flex:            1,
    color:           Colors.textPrimary,
    fontSize:        15,
    paddingVertical: Spacing.md - 2,
  },
  eyeBtn: {
    paddingLeft: Spacing.sm,
  },
  eyeIcon: {
    fontSize: 16,
  },
  error: {
    color:    Colors.danger,
    fontSize: 12,
    fontWeight: '400',
  },
});

export default AuthInput;
