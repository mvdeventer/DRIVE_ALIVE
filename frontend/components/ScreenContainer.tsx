/**
 * ScreenContainer — constrains content width on web so layouts don't
 * stretch across ultra-wide monitors, while passing through on mobile.
 *
 *   <ScreenContainer>
 *     <YourScreenContent />
 *   </ScreenContainer>
 *
 * Use as the outermost layout view inside screens.
 */
import React from 'react';
import { Platform, View, ViewProps } from 'react-native';

interface Props extends ViewProps {
  /** Override max-width breakpoint class. Default 'max-w-5xl'. */
  maxWidthClass?: string;
}

export default function ScreenContainer({
  children,
  className = '',
  maxWidthClass = 'max-w-5xl',
  ...rest
}: Props & { className?: string }) {
  const widthClass = Platform.OS === 'web' ? `w-full ${maxWidthClass} self-center` : 'flex-1';
  return (
    <View className={`flex-1 ${widthClass} ${className}`} {...rest}>
      {children}
    </View>
  );
}
