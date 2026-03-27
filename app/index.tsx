import { Stack } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import ButtonLogo from '../assets/images/HereWeGoLogo.png';
import Logo from '../assets/images/WhereWeGoingLogo.png';
import { styles } from './index.styles';

export default function Index() {
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
          
          {/* LEWY PRZYCISK (np. Inspiracje czy cos) */}
          <TouchableOpacity style={styles.sideButton} onPress={() => console.log('LeftLeftButtonClicked')}>
            <Text style={styles.sideButtonText}>💡</Text>
          </TouchableOpacity>
          {/* LEWY PRZYCISK (np. nie wiem tez na razie) */}
          <TouchableOpacity style={styles.sideButton} onPress={() => console.log('LeftButtonClicked')}>
            <Text style={styles.sideButtonText}>🔍</Text>
          </TouchableOpacity>

          {/* ŚRODKOWY PRZYCISK (generowanie podrozy) */}
          <TouchableOpacity style={styles.middleButton} onPress={() => console.log('MiddleButtonClicked')}>
            <Image 
              source={ButtonLogo} 
              style={styles.buttonImage} 
            />
          </TouchableOpacity>

          {/* PRAWY PRZYCISK (np. Profil) */}
          <TouchableOpacity style={styles.sideButton} onPress={() => console.log('RightButtonClicked')}>
            <Text style={styles.sideButtonText}>👤</Text>
          </TouchableOpacity>
          {/* PRAWY PRAWY PRZYCISK (nie mam pojecia co jeszcze, na razie holder) */}
          <TouchableOpacity style={styles.sideButton} onPress={() => console.log('RightRightButtonClicked')}>
            <Text style={styles.sideButtonText}>🌐</Text>
          </TouchableOpacity>
          
        </View>
        
      </View>
      
    </View>
  );
}
