import { Stack } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import ButtonLogo from '../../assets/images/HereWeGoLogo.png';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import { useAuth } from '../../providers/auth.provider';
import { styles } from '../../styles/index.styles';

export default function Index() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerTitleAlign: 'center',
          headerTitle: () => (
            <Image 
              source={Logo} 
              style={styles.logo} 
            />
          ),
          headerStyle: { backgroundColor: '#222' },
          headerShadowVisible: true,
          headerRight: () => (
            <TouchableOpacity onPress={() => signOut('manual')} style={{ marginRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Wyloguj</Text>
            </TouchableOpacity>
          ),
        }} 
      />

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 50.0647,
          longitude: 19.9450,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{ latitude: 50.0647, longitude: 19.9450 }}
          title="Centrum"
        />
      </MapView>

      {/* --- DOLNY KONTENER --- */}
      <View style={styles.bottomContainer}>
        
        {/* --- WIERSZ PRZYCISKÓW --- */}
        <View style={styles.buttonsRow}>
          
          <TouchableOpacity style={styles.sideButton} onPress={() => {}}>
            <Text style={styles.sideButtonText}>💡</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sideButton} onPress={() => {}}>
            <Text style={styles.sideButtonText}>🔍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.middleButton} onPress={() => {}}>
            <Image source={ButtonLogo} style={styles.buttonImage} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideButton} onPress={() => {}}>
            <Text style={styles.sideButtonText}>👤</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sideButton} onPress={() => {}}>
            <Text style={styles.sideButtonText}>🌐</Text>
          </TouchableOpacity>
          
        </View>
        
      </View>
      
    </View>
  );
}