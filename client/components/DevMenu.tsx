import React, { useRef, useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  Animated, PanResponder, Modal, FlatList, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 

// Tutaj definiujemy wszystkie ścieżki w aplikacji
const ROUTES = [
  { name: 'Welcome (Auth)', path: '/(auth)/welcome' },
  { name: 'Login (Auth)', path: '/(auth)/login' },
  { name: 'Register (Auth)', path: '/(auth)/register' },
  { name: 'Home (Main)', path: '/(main)/home' },
  { name: 'Odkrywaj (Main)', path: '/(main)/inspiration' },
  { name: 'Twórz (Main)', path: '/(main)/create' },
  { name: 'Podróże (Main)', path: '/(main)/trips' },
  { name: 'Profil (Main)', path: '/(main)/profile' },
];

export default function DevMenu() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animowane wartości dla pozycji X i Y
  const pan = useRef(new Animated.ValueXY()).current;

  // Konfiguracja gestu przesuwania
  const panResponder = useRef(
    PanResponder.create({
      // Przejmij kontrolę nad gestem tylko, jeśli użytkownik faktycznie przesunął palec (a nie tylko kliknął)
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false } // Wymagane na false przy animacji położenia w ten sposób
      ),
      onPanResponderRelease: () => {
        pan.extractOffset(); // Zapisuje pozycję, żeby przy kolejnym przesunięciu nie wracał na środek
      },
    })
  ).current;

  // Zabezpieczenie: Komponent renderuje się TYLKO w trybie deweloperskim
  if (!__DEV__) return null;

  return (
    <>
      {/* --- Pływający Przycisk --- */}
      <Animated.View
        style={[
          styles.floatingButtonContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.buttonInner} 
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="construct" size={24} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* --- Modal z listą ekranów --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛠 Dev Menu</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ROUTES}
              keyExtractor={(item) => item.path}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.routeItem}
                  onPress={() => {
                    setModalVisible(false);
                    // Używamy push, abyśmy mogli wracać wstecz
                    router.push(item.path as any);
                  }}
                >
                  <Text style={styles.routeText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#888" />
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Zapewnia, że przycisk wisi nad całą aplikacją
  floatingButtonContainer: {
    position: 'absolute',
    top: 100, // Pozycja startowa
    right: 20, // Pozycja startowa
    zIndex: 9999, 
    elevation: 9999,
  },
  buttonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000', // Wyraźny czarny kolor, żeby odróżniał się od designu apki
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Przyciemnienie tła
    justifyContent: 'flex-end', // Modal wysunie się z dołu
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%', // Zajmuje 70% ekranu
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  routeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  routeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});