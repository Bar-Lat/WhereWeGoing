import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
    Linking,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; // Dodana obsługa ikon
import { Colors } from '@/styles/colors';
import {
  type UserProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '@/services/profile.api';
import { useProfile } from '@/providers/profile.provider';

type EditProfileModalProps = {
  visible: boolean;
  accessToken: string | null;
  initialProfile: UserProfile | null;
  onClose: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
};

export default function EditProfileModal({
  visible,
  accessToken,
  initialProfile,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { setProfile } = useProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Przy każdym otwarciu modala synchronizujemy lokalny formularz z profilem z rodzica.
  useEffect(() => {
    if (!visible) return;

    setFirstName(initialProfile?.firstName || '');
    setLastName(initialProfile?.lastName || '');
    setAvatar(initialProfile?.avatar || null);
    setAvatarLoadError(false);
  }, [initialProfile?.avatar, initialProfile?.firstName, initialProfile?.lastName, visible]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatar]);

  const initials = useMemo(() => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName.length > 0) {
      return fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
    }

    const email = initialProfile?.email ?? '';
    return email.slice(0, 2).toUpperCase() || 'U';
  }, [firstName, initialProfile?.email, lastName]);

  // Zapisujemy tylko podstawowe dane tekstowe profilu.
  const onSave = useCallback(async () => {
    if (!accessToken || isSaving) return;

    try {
      setIsSaving(true);
      const response = await updateMyProfile(accessToken, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setFirstName(response.profile.firstName);
      setLastName(response.profile.lastName);
      setAvatar(response.profile.avatar);
      setProfile(response.profile);
      onProfileUpdated(response.profile);
      onClose();
    } catch (error) {
      console.error("Błąd zapisu profilu:", error);
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, firstName, isSaving, lastName, onClose, onProfileUpdated, setProfile]);

  // Wybieramy zdjęcie z galerii i wysyłamy je jako avatar.
  const onPickAvatar = useCallback(async () => {
    if (!accessToken || isUploadingAvatar) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
          'Brak dostępu do zdjęć',
          'Żeby wybrać zdjęcie profilowe, włącz dostęp do zdjęć w ustawieniach telefonu.',
          [
            { text: 'Anuluj', style: 'cancel' },
            {
              text: 'Otwórz ustawienia',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    try {
      setIsUploadingAvatar(true);
      const response = await uploadMyAvatar(accessToken, {
        base64Data: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setAvatar(response.profile.avatar);
      setProfile(response.profile);
      onProfileUpdated(response.profile);
    } catch (error) {
      console.error("Błąd wgrywania awatara:", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [accessToken, isUploadingAvatar, onProfileUpdated, setProfile]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/* 1. Overlay jest teraz na samej górze */}
      <Pressable
        style={styles.overlay}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      >
        {/* 2. KeyboardAvoidingView jest wewnątrz i centruje modal */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrapper}
        >
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              Keyboard.dismiss();
            }}
            style={[
              styles.sheet,
              {
                backgroundColor: currentColors.card,
                borderColor: currentColors.border,
              },
            ]}
          >
            <View style={styles.headerBlock}>
              <Text style={[styles.title, { color: currentColors.text }]}>Edytuj profil</Text>
              <Text style={[styles.subtitle, { color: currentColors.subtext }]}>Zaktualizuj zdjęcie i dane profilu</Text>
            </View>

            {/* 3. SCROLLVIEW zamiast zwykłego View! To robi całą magię. */}
            <ScrollView 
              style={styles.scrollArea} 
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" // Pozwala kliknąć przycisk bez podwójnego tapnięcia (ukrywania klawiatury)
            >
              
              {/* --- SEKCJA ZDJĘCIA --- */}
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  onPress={onPickAvatar}
                  style={styles.avatarWrapper}
                  disabled={isUploadingAvatar}
                  activeOpacity={0.85}
                >
                  <View style={styles.imageContainer}>
                    {avatar && !avatarLoadError ? (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.avatarImage}
                        onError={() => setAvatarLoadError(true)}
                      />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: Colors.brand.blue }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                    )}

                    {isUploadingAvatar && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    )}

                    <View style={[styles.cameraBadge, { backgroundColor: currentColors.background, borderColor: currentColors.border }]}>
                      <Ionicons name="camera" size={16} color={Colors.brand.blue} />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* --- FORMULARZ --- */}
              <View style={styles.fieldBlock}>
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>Imię</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Wpisz imię"
                  placeholderTextColor={currentColors.subtext}
                  style={[
                    styles.input,
                    {
                      borderColor: currentColors.border,
                      color: currentColors.text,
                      backgroundColor: currentColors.background,
                    },
                  ]}
                  autoCapitalize="words"
                />

                <Text style={[styles.inputLabel, { color: currentColors.text }]}>Nazwisko</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Wpisz nazwisko"
                  placeholderTextColor={currentColors.subtext}
                  style={[
                    styles.input,
                    {
                      borderColor: currentColors.border,
                      color: currentColors.text,
                      backgroundColor: currentColors.background,
                    },
                  ]}
                  autoCapitalize="words"
                />
              </View>

              {/* --- PRZYCISKI --- */}
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={[styles.secondaryButton, { borderColor: currentColors.border, backgroundColor: currentColors.background }]}
                >
                  <Text style={[styles.secondaryButtonText, { color: currentColors.text }]}>Anuluj</Text>
                </TouchableOpacity>

                {/* ZMIENIONY PRZYCISK ZAPISZ */}
                <TouchableOpacity
                  onPress={onSave}
                  style={styles.primaryButtonWrapper}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={Colors.brand.logoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Zapisz</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardWrapper: {
    flex: 1,
    justifyContent: 'center', // Trzyma modal na środku ekranu
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%', // ZABEZPIECZENIE: Modal nigdy nie będzie wyższy niż ekran
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    elevation: 10,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  headerBlock: { marginBottom: 20, alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14 },
  scrollArea: { 
    flexShrink: 1 // Pozwala na "ściśnięcie" obszaru roboczego przy otwartej klawiaturze
  },
  content: { 
    gap: 16,
    paddingBottom: 10, // Trochę luzu na dole przy przewijaniu
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
  },
  
  avatarSection: { alignItems: 'center', marginBottom: 10 },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  fieldBlock: { gap: 12 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden', 
  },
  primaryGradient: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});