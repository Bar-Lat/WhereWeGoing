import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  useColorScheme,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import { useTripStore, DayPlan } from '@/stores/tripStore';
import { useAuth } from '@/providers/auth.provider';
import { useNetwork } from '@/providers/network.provider';
import DateRangePicker from '@/components/DateRangePicker'; 
import { deleteTrip, updateTrip } from '@/services/trip.api';

// ─── HELPERY ─────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  transport: '🚌',
  jedzenie: '🍽️',
  atrakcja: '🏛️',
  nocleg: '🏨',
  inne: '📌',
  food: '🍽️',
  attraction: '🏛️',
  accommodation: '🏨',
  other: '📌',
};





function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category?.toLowerCase()] ?? '📍';
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    transport: '#f59e0b',
    jedzenie: '#10b981',
    atrakcja: Colors.brand.blue,
    nocleg: '#3b82f6',
    inne: '#8b5cf6',
  };
  return map[category?.toLowerCase()] ?? Colors.brand.blue;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length < 2) return dateStr;
  const [day, month] = parts;
  const months = ['', 'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  return `${parseInt(day)} ${months[parseInt(month)] ?? ''}`;
}



// ─── KOMPONENT DNIA ───────────────────────────────────────────────────────────
function DayCardView({
  day,
  index,
  currentColors,
  isEditingMode,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onDeleteDay,
  onShowAlert
}: {
  day: DayPlan;
  index: number;
  currentColors: any;
  isEditingMode: boolean;
  onAddActivity: (dayIndex: number) => void;
  onEditActivity: (dayIndex: number, actIndex: number, act: any) => void;
  onDeleteActivity: (dayIndex: number, actIndex: number) => void;
  onDeleteDay: (dayIndex: number) => void;
  onShowAlert: (title: string, msg: string, actions: any[]) => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  const textColor = expanded ? '#fff' : currentColors.text;
  const subtextColor = expanded ? 'rgba(255,255,255,0.85)' : currentColors.subtext;
  const iconColor = expanded ? '#fff' : currentColors.subtext;
  const numberBgColor = expanded ? 'rgba(255,255,255,0.25)' : currentColors.background;
  const numberTextColor = expanded ? '#fff' : Colors.brand.blue;

  const renderHeaderContent = () => (
    <>
      <View style={[styles.dayNumber, { backgroundColor: numberBgColor }]}>
        <Text style={[styles.dayNumberText, { color: numberTextColor }]}>
          {day.day}
        </Text>
      </View>

      <View style={styles.dayInfo}>
        <Text style={[styles.dayDate, { 
          color: textColor,
          textShadowColor: expanded ? 'rgba(0,0,0,0.15)' : 'transparent',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2
        }]}>
          {formatDate(day.date)}
        </Text>
        <Text style={[styles.dayWeekday, { color: subtextColor }]}>
          {day.activities?.length || 0} punktów w planie
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 3 }}>
        {isEditingMode && (
          <TouchableOpacity
            style={{ padding: 8, marginRight: 4 }}
            onPress={() => {
              onShowAlert('Usuwanie', `Czy na pewno chcesz usunąć dzień ${day.day}?`, [
                { text: 'Anuluj', style: 'cancel' },
                { text: 'Usuń', style: 'destructive', onPress: () => onDeleteDay(index) }
              ]);
            }}
          >
            <Ionicons name="trash" size={20} color={expanded ? '#fff' : '#ef4444'} />
          </TouchableOpacity>
        )}
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={iconColor} style={{ marginRight: 4 }} />
      </View>
    </>
  );


  
  return (
    <View style={styles.dayWrapper}>
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.85}
          style={[styles.dayHeaderWrapper, expanded && styles.gradientShadow]}
        >
          {expanded ? (
            <LinearGradient
              colors={Colors.brand.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dayHeaderShared}
            >
              {renderHeaderContent()}
              <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.gloss} />
            </LinearGradient>
          ) : (
            <View style={[styles.dayHeaderShared, { backgroundColor: currentColors.card }]}>
              {renderHeaderContent()}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={[styles.dayContent, { backgroundColor: currentColors.background }]}>
          {day.tips && (
            <View style={{ padding: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, marginVertical: 8 }}>
              <Text style={{ fontSize: 13, color: Colors.brand.blue, fontStyle: 'italic' }}>
                💡 {day.tips}
              </Text>
            </View>
          )}

          {day.activities?.map((activity, actIndex) => {
            const isLast = actIndex === day.activities.length - 1;

            return (
              <View key={actIndex} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: getCategoryColor(activity.category) }]} />
                  {!isLast && <View style={[styles.timelineLine, { backgroundColor: currentColors.border }]} />}
                </View>

                <View style={[styles.activityCard, { backgroundColor: currentColors.card }]}>
                  <View style={styles.activityHeader}>
                    <View style={[styles.activityIconBox, { backgroundColor: currentColors.background }]}>
                      <Text style={styles.activityIcon}>{getCategoryIcon(activity.category)}</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityName, { color: currentColors.text }]} numberOfLines={2}>
                        {activity.name}
                      </Text>
                      <View style={styles.activityMeta}>
                        <Text style={[styles.activityMetaText, { color: currentColors.subtext }]}>🕐 {activity.time}</Text>
                        {activity.estimatedCost > 0 && (
                          <Text style={[styles.activityCost, { color: Colors.brand.blue }]}>{activity.estimatedCost} PLN</Text>
                        )}
                      </View>
                      <Text style={[styles.activityDesc, { color: currentColors.subtext }]} numberOfLines={3}>
                        {activity.description}
                      </Text>
                    </View>

                    {isEditingMode && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                        <TouchableOpacity onPress={() => onEditActivity(index, actIndex, activity)} style={{ padding: 6 }}>
                          <Ionicons name="pencil" size={20} color={Colors.brand.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onShowAlert(
                            "Usuwanie",
                            `Usunąć "${activity.name}"?`,
                            [
                              { text: 'Anuluj', style: 'cancel' },
                              { text: 'Usuń', style: 'destructive', onPress: () => onDeleteActivity(index, actIndex) }
                            ]
                          )}
                          style={{ padding: 6 }}
                        >
                          <Ionicons name="trash-outline" size={20} color={'#ef4444'} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {isEditingMode && (
            <TouchableOpacity style={[styles.addActivityBtn, { borderColor: Colors.brand.blue }]} onPress={() => onAddActivity(index)}>
              <Ionicons name="add" size={18} color={Colors.brand.blue} />
              <Text style={{ color: Colors.brand.blue, fontWeight: '600' }}>Dodaj atrakcję</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── GŁÓWNY EKRAN SZCZEGÓŁÓW ──────────────────────────────────────────────────
export default function TripDetails() {
  const { 
  tripPlan, deleteDay, addDay, addActivity, updateActivity, deleteActivity, 
  isEditingMode, setIsEditingMode 
} = useTripStore();
  const { session } = useAuth();
  const { isOffline } = useNetwork();
  const [isDeleting, setIsDeleting] = useState(false);
  const [backupPlan, setBackupPlan] = useState<TripPlan | null>(null);
  const router = useRouter();

  // Zablokowanie sprzętowego gestu/przycisku Wstecz w trybie edycji
  React.useEffect(() => {
    const onBackPress = () => {
      if (isEditingMode) {
        handleBackPress(); // Wywołujemy naszą bezpieczną funkcję z modalem
        return true; // Blokuje domyślne cofnięcie
      }
      return false; // Pozwala na normalne cofnięcie, jeśli nie jesteśmy w edycji
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isEditingMode, backupPlan]);

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<'schedule' | 'budget'>('schedule');

  const scrollY = useRef(new Animated.Value(0)).current;

  const HEADER_MAX_HEIGHT = 240;
  const HEADER_MIN_HEIGHT = insets.top + 120;
  const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
  const TAB_BAR_HEIGHT = 54;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const navTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const [datesModal, setDatesModal] = useState({ visible: false, startDate: '', endDate: '' });
  const [budgetModal, setBudgetModal] = useState({ visible: false, value: '' });
  const [actModal, setActModal] = useState({
    visible: false,
    mode: 'add' as 'add' | 'edit',
    dayIndex: -1,
    actIndex: -1,
    formData: { name: '', time: '09:00', category: 'inne', description: '', estimatedCost: '0' }
  });
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    actions: [] as any[]
  });

  useEffect(() => {
    if (isOffline) {
      setIsEditingMode(false);
    }
  }, [isOffline]);

  // ─── AUTO-SYNC SYSTEM ───────────────────────────────────────────────────
  const syncPlanWithDb = async (forcedPlan?: any) => {
    if (isOffline) return;

    const planToSave = forcedPlan || useTripStore.getState().tripPlan;
    if (!planToSave?.id || !session?.access_token) return;
    
    try {
      await updateTrip(planToSave.id, planToSave, session.access_token);
      console.log("✅ Zapis w tle udany!");
    } catch (error: any) {
      console.error("❌ Błąd zapisu w tle:", error);
      Alert.alert("Błąd połączenia z bazą", "Zmiany mogły nie zostać zapisane!");
    }
  };

  const showAlert = (title: string, message: string, actions: any[]) => {
    setCustomAlert({ visible: true, title, message, actions });
  };

  const openBudgetModal = () => {
    if (isOffline) return;
    setBudgetModal({ visible: true, value: String(tripPlan?.estimatedTotalCost || 0) });
  };

  const handleSaveBudget = async () => {
    const newBudget = Number(budgetModal.value.replace(/[^0-9]/g, '')) || 0;
    useTripStore.getState().updateBudget(newBudget);
    setBudgetModal({ visible: false, value: '' });
  };

  const openAddActivity = (dayIndex: number) => {
    if (isOffline) return;
    setActModal({
      visible: true,
      mode: 'add',
      dayIndex,
      actIndex: -1,
      formData: { name: '', time: '09:00', category: 'inne', description: '', estimatedCost: '0' }
    });
  };

  const openEditActivity = (dayIndex: number, actIndex: number, activity: any) => {
    if (isOffline) return;
    setActModal({
      visible: true,
      mode: 'edit',
      dayIndex,
      actIndex,
      formData: { 
        name: activity.name, 
        time: activity.time, 
        category: activity.category, 
        description: activity.description || '', 
        estimatedCost: String(activity.estimatedCost || 0) 
      }
    });
  };

  const handleSaveActivity = async () => {
    if (!actModal.formData.name.trim()) {
      Alert.alert('Błąd', 'Nazwa atrakcji jest wymagana');
      return;
    }
    const payload = {
      ...actModal.formData,
      estimatedCost: Number(actModal.formData.estimatedCost) || 0,
      location: ''
    };

    if (actModal.mode === 'add') {
      addActivity(actModal.dayIndex, payload);
    } else {
      updateActivity(actModal.dayIndex, actModal.actIndex, payload);
    }

    setActModal(prev => ({ ...prev, visible: false }));
  };

  const handleAddDay = async () => {
    if (isOffline) return;

    const nextDayNum = (tripPlan?.days?.length || 0) + 1;
    
    // Zabezpieczenie: Inteligentne obliczanie daty kolejnego dnia
    let newDate = '';
    if (tripPlan?.days && tripPlan.days.length > 0) {
      const lastDateStr = tripPlan.days[tripPlan.days.length - 1].date;
      if (lastDateStr && lastDateStr.includes('.')) {
        const [d, m, y] = lastDateStr.split('.');
        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const dd = String(nextDateObj.getDate()).padStart(2, '0');
        const mm = String(nextDateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = nextDateObj.getFullYear();
        newDate = `${dd}.${mm}.${yyyy}`;
      }
    }

    addDay({
      day: nextDayNum,
      date: newDate, // Zamiast tekstu "Dzień...", wstawiamy prawdziwą datę!
      title: 'Nowy dzień',
      activities: [],
      estimatedDayCost: 0,
      tips: ''
    });
    
  };

  const handleLocalDeleteDay = async (dayIndex: number) => {
    if (isOffline) return;
    deleteDay(dayIndex);
  };

  const handleLocalDeleteActivity = async (dayIndex: number, actIndex: number) => {
    if (isOffline) return;
    deleteActivity(dayIndex, actIndex);
  };


  
  const enterEditMode = () => {
    // Robimy głęboką kopię planu, żeby mieć do czego wrócić
    setBackupPlan(JSON.parse(JSON.stringify(tripPlan))); 
    setIsEditingMode(true); 
  };

  const cancelEditMode = () => {
    showAlert(
      "Niezapisane zmiany",
      "Czy na pewno chcesz odrzucić wszystkie wprowadzone zmiany?",
      [
        { text: "Wróć do edycji", style: "cancel" },
        { 
          text: "Odrzuć", 
          style: "destructive", 
          onPress: () => {
            if (backupPlan) {
              useTripStore.getState().setTripPlan(backupPlan); // Przywracamy stary stan!
            }
            setIsEditingMode(false);
            setBackupPlan(null);
          }
        }
      ]
    );
  };

// Zabezpieczenie przycisku Wstecz
  const handleBackPress = () => {
    if (isEditingMode) {
      showAlert("Tryb edycji", "Masz niezapisane zmiany w planie!", [{ text: "Ok" }]);
    } else {
      router.back();
    }
  };
 
  const saveEditMode = async () => {
    await syncPlanWithDb(); // Uderzamy do bazy DOPIERO gdy użytkownik akceptuje zmiany!
    setIsEditingMode(false);
    setBackupPlan(null);
  };
  
  const handleSaveDates = async () => {
    if (isOffline) return;

    if (!datesModal.startDate || !datesModal.endDate) {
      showAlert("Błąd", "Wybierz pełny zakres dat (wylot i powrót).", [{ text: "OK" }]);
      return;
    }

    const parseDate = (dStr: string) => {
      const [d, m, y] = dStr.split('.');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    };

    const start = parseDate(datesModal.startDate);
    const end = parseDate(datesModal.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      showAlert("Błąd", "Nieprawidłowy zakres dat.", [{ text: "OK" }]);
      return;
    }

    const newTotalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const newDays: DayPlan[] = [];

    for (let i = 0; i < newTotalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const yyyy = currentDate.getFullYear();
      const dateString = `${dd}.${mm}.${yyyy}`;

      if (i < (tripPlan?.days?.length || 0)) {
        newDays.push({ ...tripPlan!.days[i], date: dateString, day: i + 1 });
      } else {
        newDays.push({
          day: i + 1,
          date: dateString,
          title: 'Nowy dzień',
          activities: [],
          estimatedDayCost: 0,
          tips: ''
        });
      }
    }

    if ((tripPlan?.days?.length || 0) > newTotalDays) {
      showAlert(
        "Uwaga",
        `Nowy zakres dat jest krótszy. Usunięte zostaną ${tripPlan!.days.length - newTotalDays} dni z końca planu. Kontynuować?`,
        [
          { text: "Anuluj", style: "cancel" },
          {
            text: "Zastosuj",
            style: "destructive",
            onPress: async () => {
              const updated = { ...tripPlan!, days: newDays, totalDays: newTotalDays };
              useTripStore.getState().setTripPlan(updated);
              setDatesModal({ visible: false, startDate: '', endDate: '' });
            }
          }
        ]
      );
      return;
    }

    const updated = { ...tripPlan!, days: newDays, totalDays: newTotalDays };
    useTripStore.getState().setTripPlan(updated);
    setDatesModal({ visible: false, startDate: '', endDate: '' });
  };

  const handleDeleteTrip = () => {
    if (isOffline) return;

    // 1. Zapisujemy ID do stałej lokalnej
    const tripId = tripPlan?.id;
    if (!tripId) return;

    // Używamy Twojego autorskiego modala zamiast systemowego Alert.alert
    showAlert(
      "Usuwanie wycieczki",
      "Czy na pewno chcesz usunąć ten plan? Tej akcji nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        { 
          text: "Usuń", 
          style: "destructive", 
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteTrip(tripId, session!.access_token); 
              useTripStore.getState().reset();
              router.replace('/(main)/trips');
            } catch (error: any) {
              // Tutaj również możesz użyć showAlert, jeśli chcesz pełnej spójności
              showAlert("Błąd", error.message || "Nie udało się usunąć wycieczki.", [{ text: "OK" }]);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (!tripPlan) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: currentColors.subtext, fontSize: 16 }}>Nie znaleziono szczegółów wycieczki.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.brand.blue, fontSize: 16, fontWeight: '600' }}>← Wróć do listy</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroImageUri = tripPlan.imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600';
  const totalDays = tripPlan.days?.length || 0;
  const calculatedTotalCost = tripPlan.days?.reduce((sum, day) => sum + (day.estimatedDayCost || 0), 0) || 0;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Animated.ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: HEADER_MAX_HEIGHT + TAB_BAR_HEIGHT + 16,
            paddingBottom: insets.bottom + 120 
          }
        ]} 
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ top: HEADER_MAX_HEIGHT + TAB_BAR_HEIGHT }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {activeTab === 'schedule' && (
          <View>
            {tripPlan.days?.map((day, index) => (
              <DayCardView 
                key={index} 
                day={day} 
                index={index} 
                currentColors={currentColors} 
                isEditingMode={isEditingMode}
                onAddActivity={openAddActivity}
                onEditActivity={openEditActivity}
                onDeleteActivity={handleLocalDeleteActivity}
                onDeleteDay={handleLocalDeleteDay}
                onShowAlert={showAlert}
              />
            ))}

            {isEditingMode && (
              <TouchableOpacity style={[styles.addDayBtn, { backgroundColor: Colors.brand.blue }]} onPress={handleAddDay}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Dodaj kolejny dzień</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'budget' && (
          <View>
            <View style={[styles.budgetSummaryCard, { backgroundColor: currentColors.card }]}>
              <Text style={{ color: currentColors.subtext, fontSize: 14 }}>Całkowity deklarowany budżet</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
                <Text style={{ color: currentColors.text, fontSize: 28, fontWeight: '800' }}>
                  {tripPlan.estimatedTotalCost} {tripPlan.currency}
                </Text>
                {isEditingMode && (
                  <TouchableOpacity onPress={openBudgetModal} style={{ padding: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20 }}>
                    <Ionicons name="pencil" size={18} color={Colors.brand.blue} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ height: 1, backgroundColor: currentColors.border, width: '100%', marginVertical: 12 }} />
              <Text style={{ color: currentColors.subtext, fontSize: 14 }}>
                 Szacowany koszt planu: <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>{calculatedTotalCost} {tripPlan.currency}</Text>
              </Text>
            </View>
            <Text style={{ color: currentColors.text, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 12 }}>
              Rozbicie na dni
            </Text>
            {tripPlan.days?.map((day, index) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: currentColors.border }}>
                <View>
                   <Text style={{ color: currentColors.text, fontWeight: '600' }}>Dzień {day.day} - {formatDate(day.date)}</Text>
                   <Text style={{ color: currentColors.subtext, fontSize: 12 }}>{day.activities.length} aktywności</Text>
                </View>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700', fontSize: 16 }}>{day.estimatedDayCost} PLN</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <Animated.View style={[styles.headerAbsoluteWrapper, { transform: [{ translateY: headerTranslateY }] }]}>
        <View style={styles.heroContainer}>
          <ImageBackground source={{ uri: heroImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover">
            <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(26,29,58,0.95)']} style={StyleSheet.absoluteFillObject} />
            
            <Animated.View style={[styles.heroNav, { paddingTop: insets.top + 8, transform: [{ translateY: navTranslateY }] }]}>
              <TouchableOpacity style={styles.heroNavBtn} onPress={handleBackPress}>
                <Ionicons name="arrow-back" size={18} color="#fff" />
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
  {!isOffline && (
    isEditingMode ? (
      <>
        {/* KRZYŻYK = ODRZUĆ ZMIANY */}
        <TouchableOpacity
          style={[styles.heroNavBtn, { backgroundColor: '#ef4444' }]}
          onPress={cancelEditMode}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        {/* PTASZEK = ZAPISZ ZMIANY */}
        <TouchableOpacity
          style={[styles.heroNavBtn, { backgroundColor: '#10b981' }]}
          onPress={saveEditMode}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </>
    ) : (
      <>
        {/* OŁÓWEK = EDYTUJ */}
        <TouchableOpacity
          style={[styles.heroNavBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          onPress={enterEditMode}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>

        {/* KOSZ = USUŃ */}
        <TouchableOpacity
          style={[styles.heroNavBtn, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]}
          onPress={handleDeleteTrip}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </>
    )
  )}
</View>
            </Animated.View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroCity} numberOfLines={1}>{tripPlan.destination}</Text>
              <View style={styles.heroBadges}>
                <TouchableOpacity 
                  style={[styles.heroBadge, isEditingMode && { backgroundColor: Colors.brand.blue, borderColor: 'rgba(255,255,255,0.4)' }]}
                  disabled={!isEditingMode}
                  onPress={() => {
                    const firstDay = tripPlan.days?.[0]?.date || '';
                    const lastDay = tripPlan.days?.[tripPlan.days.length - 1]?.date || firstDay;
                    setDatesModal({ visible: true, startDate: firstDay, endDate: lastDay });
                  }}
                >
                  <Ionicons name="calendar-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.heroBadgeText}>
                    {tripPlan.days?.[0]?.date ? `${formatDate(tripPlan.days[0].date)} • ` : ''}{totalDays} dni
                  </Text>
                  {isEditingMode && <Ionicons name="pencil" size={12} color="#fff" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>

                <View style={styles.heroBadge}>
                  <Ionicons name="wallet-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.heroBadgeText}>{tripPlan.estimatedTotalCost || 0} PLN</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={[styles.tabBar, { backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('schedule')}>
            <Text style={[styles.tabText, { color: activeTab === 'schedule' ? Colors.brand.blue : currentColors.subtext }]}>Harmonogram</Text>
            {activeTab === 'schedule' && <View style={[styles.tabUnderline, { backgroundColor: Colors.brand.blue }]} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('budget')}>
            <Text style={[styles.tabText, { color: activeTab === 'budget' ? Colors.brand.blue : currentColors.subtext }]}>Budżet</Text>
            {activeTab === 'budget' && <View style={[styles.tabUnderline, { backgroundColor: Colors.brand.blue }]} />}
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <Modal visible={actModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: currentColors.background }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>{actModal.mode === 'add' ? 'Nowa atrakcja' : 'Edytuj atrakcję'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Nazwa</Text>
              <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]} value={actModal.formData.name} onChangeText={t => setActModal(p => ({ ...p, formData: { ...p.formData, name: t } }))} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Godzina</Text>
                  <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]} value={actModal.formData.time} onChangeText={t => setActModal(p => ({ ...p, formData: { ...p.formData, time: t } }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Koszt (PLN)</Text>
                  <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]} value={actModal.formData.estimatedCost} onChangeText={t => setActModal(p => ({ ...p, formData: { ...p.formData, estimatedCost: t.replace(/[^0-9]/g, '') } }))} keyboardType="numeric" />
                </View>
              </View>
              <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Opis</Text>
              <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, height: 80, textAlignVertical: 'top' }]} value={actModal.formData.description} onChangeText={t => setActModal(p => ({ ...p, formData: { ...p.formData, description: t } }))} multiline />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setActModal(p => ({ ...p, visible: false }))} style={styles.modalCancelBtn}><Text style={{ color: currentColors.subtext, fontWeight: '600' }}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveActivity} style={[styles.modalSaveBtn, { backgroundColor: Colors.brand.blue }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Zapisz</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal visible={budgetModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: currentColors.background, paddingVertical: 32 }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text, marginBottom: 8 }]}>Edytuj budżet</Text>
            <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, width: '100%', fontSize: 24, textAlign: 'center', fontWeight: '700' }]} value={budgetModal.value} onChangeText={t => setBudgetModal(p => ({ ...p, value: t.replace(/[^0-9]/g, '') }))} keyboardType="numeric" />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setBudgetModal(p => ({ ...p, visible: false }))} style={styles.modalCancelBtn}><Text style={{ color: currentColors.subtext, fontWeight: '600' }}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveBudget} style={[styles.modalSaveBtn, { backgroundColor: Colors.brand.blue }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Zapisz</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: currentColors.background, width: '85%', padding: 24 }]}>
            <Text style={[{ fontSize: 20, fontWeight: '800', textAlign: 'center', color: currentColors.text, marginBottom: 12 }]}>{customAlert.title}</Text>
            <Text style={[{ fontSize: 15, textAlign: 'center', color: currentColors.subtext, marginBottom: 24, lineHeight: 22 }]}>{customAlert.message}</Text>
            <View style={{ width: '100%', gap: 10 }}>
              {customAlert.actions.map((action, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    onPress={() => {
                      setCustomAlert(prev => ({ ...prev, visible: false }));
                      if (action.onPress) setTimeout(() => action.onPress(), 150);
                    }}
                    style={[styles.alertBtn, action.style === 'destructive' ? { backgroundColor: '#ef4444' } : action.style === 'cancel' ? { backgroundColor: currentColors.card, borderWidth: 1, borderColor: currentColors.border } : { backgroundColor: Colors.brand.blue }]}
                  >
                    <Text style={[styles.alertBtnText, action.style === 'cancel' ? { color: currentColors.text } : { color: '#fff' }]}>{action.text}</Text>
                  </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={datesModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: currentColors.background, paddingVertical: 24, width: '100%' }]}>
            <Text style={[styles.modalTitle, { color: currentColors.text, marginBottom: 16 }]}>Termin wycieczki</Text>
            <ScrollView style={{ width: '100%', flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <DateRangePicker departureDate={datesModal.startDate} returnDate={datesModal.endDate} onDatesChange={(start, end) => setDatesModal(prev => ({ ...prev, startDate: start, endDate: end }))} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setDatesModal(p => ({ ...p, visible: false }))} style={styles.modalCancelBtn}><Text style={{ color: currentColors.subtext, fontWeight: '600' }}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveDates} style={[styles.modalSaveBtn, { backgroundColor: Colors.brand.blue }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Zapisz</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerAbsoluteWrapper: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  heroContainer: { height: 240, width: '100%', overflow: 'hidden' },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 20 },
  heroNavBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  heroInfo: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroCity: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 10 },
  heroBadges: { flexDirection: 'row', gap: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabBar: { height: 54, flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabText: { fontSize: 14, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  scrollContent: { paddingHorizontal: 16 },
  dayWrapper: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  dayNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 14, zIndex: 2 },
  dayNumberText: { fontSize: 16, fontWeight: '800' },
  dayInfo: { flex: 1, zIndex: 2 },
  dayDate: { fontSize: 16, fontWeight: '800' },
  dayWeekday: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  dayContent: { paddingHorizontal: 12, paddingBottom: 16, paddingTop: 4 },
  dayHeaderWrapper: { borderRadius: 16 },
  timelineRow: { flexDirection: 'row', marginTop: 12 },
  timelineLeft: { width: 24, alignItems: 'center', marginRight: 10 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 16 },
  timelineLine: { flex: 1, width: 2, marginTop: 6 },
  activityCard: { flex: 1, borderRadius: 14, padding: 14, marginBottom: 2 },
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  activityIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityIcon: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  activityMetaText: { fontSize: 12, fontWeight: '500' },
  activityCost: { fontSize: 12, fontWeight: '700' },
  activityDesc: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  budgetSummaryCard: { borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  gradientShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  dayHeaderGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 68 },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  addActivityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 12, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, gap: 6 },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 10, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxHeight: '80%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', marginTop: 24, width: '100%', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  modalSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertBtnText: { fontSize: 16, fontWeight: '700' },
  dayHeaderShared: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 68 },
});
