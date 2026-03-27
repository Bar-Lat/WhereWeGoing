import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Register() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create Account', headerStyle: { backgroundColor: '#131313' }, headerTintColor: '#fff' }} />
      <Text style={styles.title}>Register Page</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.replace('/(main)')}
      >
        <Text style={styles.buttonText}>Register and go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131313' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, fontWeight: 'bold' },
  button: { backgroundColor: '#2c2c2c', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});