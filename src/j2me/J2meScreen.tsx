import React from 'react';
import { Platform, requireNativeComponent, StyleProp, View, ViewStyle } from 'react-native';

export interface J2meScreenProps {
  jarPath?: string;
  style?: StyleProp<ViewStyle>;
}

const NativeJ2meScreen =
  Platform.OS === 'android'
    ? requireNativeComponent<J2meScreenProps>('J2meScreen')
    : null;

export const J2meScreen: React.FC<J2meScreenProps> = ({ jarPath, style }) => {
  if (!NativeJ2meScreen) {
    return <View style={[{ backgroundColor: '#000' }, style]} />;
  }
  return <NativeJ2meScreen jarPath={jarPath} style={style} />;
};
