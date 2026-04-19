import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Colors } from '../styles/colors';
import Logo from '../assets/images/WhereWeGoingLogo.png';

interface ScreenHeaderProps {
  // Co pokazujemy na środku/po lewej?
  showLogo?: boolean;
  title?: string;
  
  // Opcje dla powiadomień
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  
  // Opcje dla profilu
  showProfile?: boolean;
  onProfilePress?: () => void;
  userAvatarUrl?: string | null; // <--- NOWOŚĆ: URL do zdjęcia z API
}

export default function ScreenHeader({ 
  showLogo = false, 
  title, 
  showNotifications = true,
  onNotificationPress,
  showProfile = true,
  onProfilePress,
  userAvatarUrl = 'https://i.pravatar.cc/100' // TODO: Zamienić na null, gdy API będzie gotowe i nie będzie placeholdera
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  return (
    <View style={[
      styles.header, 
      { 
        paddingTop: insets.top > 0 ? insets.top + 10 : 30, 
        backgroundColor: currentColors.card,
        borderBottomColor: currentColors.border 
      }
    ]}>
      {/* LEWA STRONA / ŚRODEK */}
      <View style={styles.leftContainer}>
        {showLogo ? (
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        ) : (
          <Text style={[styles.title, { color: currentColors.text }]}>{title}</Text>
        )}
      </View>

      {/* PRAWA STRONA (Ikony w rzędzie) */}
      <View style={styles.rightContainer}>
        
        {/* Ikona powiadomień */}
        {showNotifications && (
          <TouchableOpacity style={styles.headerButton} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={28} color={Colors.brand.blue} />
          </TouchableOpacity>
        )}

        {/* Ikona profilu / Awatar */}
        {showProfile && (
          <TouchableOpacity style={styles.headerButton} onPress={onProfilePress}>
            {userAvatarUrl ? (
              // Jeśli API zwróciło URL, pokazujemy okrągły obrazek
              <Image 
                source={{ uri: userAvatarUrl }} 
                style={[styles.avatarImage]} 
              />
            ) : (
              // Jeśli nie ma URL (brak awatara), pokazujemy domyślną ikonę
              <Ionicons name="person-circle-outline" size={40} color={Colors.brand.blue} />
            )}
          </TouchableOpacity>
        )}
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  leftContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8, 
  },
  logo: {
    width: 160,
    height: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  // NOWY STYL DLA ZDJĘCIA Z API
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 24, // Dokładnie połowa szerokości, żeby było kółkiem
    borderWidth: 1, // Delikatna ramka, żeby zdjęcie nie zlewało się z tłem
    borderColor: Colors.brand.blue, // Ramka w kolorze marki
  }
});