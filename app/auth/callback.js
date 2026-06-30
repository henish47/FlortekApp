import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export default function AuthCallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A237E" />
      <Text style={styles.text}>Completing secure login...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  text: {
    marginTop: 16,
    color: '#546E7A',
    fontWeight: '700',
    fontSize: 15,
  },
});
