import React, {useEffect} from 'react';
import { useNotifications } from '@/providers/notifications.provider';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/styles/colors';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const { notifications, markAllAsRead, registerNotificationsScreenOpen } = useNotifications();

    useEffect(() => {
      const openScreen = async () => {
        await registerNotificationsScreenOpen();
        await markAllAsRead();
      };

      void openScreen();
    }, [markAllAsRead, registerNotificationsScreenOpen]);

    const handleNotificationPress = (item: typeof notifications[number]) => {
      if (item.target?.type === 'inspiration') {
        router.push({
          pathname: '/(main)/inspiration',
          params: {
            offerId: item.target.offerId,
          },
        });
      }
      if (item.target?.type === 'trip') {
        router.push({
          pathname: '/(main)/trips',
          params: {
            tripId: item.target.tripId,
          },
        });
      }
    };

    const formatNotificationTime = (item: { createdAt: string; time?: string }) => {
    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const yesterdayKey = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');

    const itemDateKey = item.createdAt.slice(0, 10);

    if (itemDateKey === todayKey) {
      return item.time ?? '';
    }

    if (itemDateKey === yesterdayKey) {
      return 'Wczoraj';
    }

    return itemDateKey;
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: currentColors.card,
            borderBottomColor: currentColors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: currentColors.background }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={currentColors.text} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>
            Powiadomienia
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => handleNotificationPress(item)}
            style={[
              styles.notificationCard,
              {
                backgroundColor: currentColors.card,
                borderColor: currentColors.border,
              },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>

            <View style={styles.notificationBody}>
              <View style={styles.notificationTopRow}>
                <Text
                  style={[styles.notificationTitle, { color: currentColors.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.notificationTime, { color: currentColors.subtext }]}>
                  {formatNotificationTime(item)}
                </Text>
              </View>

              <Text
                style={[styles.notificationMessage, { color: currentColors.subtext }]}
              >
                {item.message}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  notificationCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
});