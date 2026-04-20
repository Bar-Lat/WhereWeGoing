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
  Platform,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
    if (!visible) {
      return;
    }

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
    if (!accessToken || isSaving) {
      return;
    }

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
    } catch {
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, firstName, isSaving, lastName, onClose, onProfileUpdated, setProfile]);

  // Wybieramy zdjęcie z galerii i wysyłamy je jako avatar.
  const onPickAvatar = useCallback(async () => {
    if (!accessToken || isUploadingAvatar) {
      return;
    }

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

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const response = await uploadMyAvatar(accessToken, {
        base64Data: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setAvatar(response.profile.avatar);
      setProfile(response.profile);
      onProfileUpdated(response.profile);
    } catch {
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [accessToken, isUploadingAvatar, onProfileUpdated, setProfile]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      >
        <View
          style={styles.modalContainer}
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
                shadowColor: currentColors.text,
              },
            ]}
          >
            <View style={styles.headerBlock}>
              <Text style={[styles.title, { color: currentColors.text }]}>Edytuj profil</Text>
              <Text style={[styles.subtitle, { color: currentColors.subtext }]}>Zaktualizuj zdjęcie i dane profilu</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  onPress={onPickAvatar}
                  style={styles.avatarWrapper}
                  disabled={isUploadingAvatar}
                  activeOpacity={0.85}
                >
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
                  <Text style={[styles.avatarHintText, { color: currentColors.subtext }]}>
                    {isUploadingAvatar ? 'Przesyłanie...' : 'Zmień zdjęcie'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Imię</Text>
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

                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Nazwisko</Text>
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

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.secondaryButton, { borderColor: currentColors.text }]}
                >
                  <Text style={[styles.secondaryButtonText, { color: currentColors.text }]}>Anuluj</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onSave}
                  style={[styles.primaryButton, { backgroundColor: Colors.brand.blue }]}
                  disabled={isSaving}
                >
                  <Text style={styles.primaryButtonText}>{isSaving ? 'Zapisywanie...' : 'Zapisz'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 0,
    overflow: 'hidden',
    elevation: 10,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  headerBlock: { marginBottom: 12 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, lineHeight: 20 },
  content: { paddingBottom: 6, gap: 14 },
  avatarSection: { alignItems: 'center' },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  avatarHintText: { marginTop: 10, fontSize: 12, fontWeight: '700', color: '#000' },
  fieldBlock: { gap: 10 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 0,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
