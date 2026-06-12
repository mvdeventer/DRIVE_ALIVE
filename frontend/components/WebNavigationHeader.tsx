/**
 * Web Navigation Header Component
 * Intentionally disabled to avoid duplicate headers with native-stack web headers.
 */
import React from 'react';

interface WebNavigationHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function WebNavigationHeader(_props: WebNavigationHeaderProps) {
  return null;
}
