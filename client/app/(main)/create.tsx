import React from 'react';
import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  PanResponder, 
  useColorScheme 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useTripStore } from '@/stores/tripStore';


// INTERFEJSY I TYPY
interface TripFormData {
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  interests: string[];
  transport: string[];
}

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  currentColors: any;
}

// DANE STATYCZNE
const POPULAR_DESTINATIONS = [
  { city: 'Paryż', country: 'FR', price: 1400 },
  { city: 'Rzym', country: 'IT', price: 1200 },
  { city: 'Barcelona', country: 'ES', price: 990 },
  { city: 'Praga', country: 'CZ', price: 650 },
  { city: 'Londyn', country: 'GB', price: 1600 },
  { city: 'Amsterdam', country: 'NL', price: 1100 },
];

const INTERESTS = [
  { id: 'sightseeing', label: 'Zwiedzanie', icon: '🏛️' },
  { id: 'food', label: 'Jedzenie', icon: '🍽️' },
  { id: 'nature', label: 'Natura', icon: '🌿' },
  { id: 'parties', label: 'Imprezy', icon: '🎉' },
  { id: 'shopping', label: 'Zakupy', icon: '🛍️' },
  { id: 'art', label: 'Sztuka', icon: '🎨' },
  { id: 'sport', label: 'Sport', icon: '⚽' },
  { id: 'beach', label: 'Plaża', icon: '🏖️' },
];

const TRANSPORT_OPTIONS = [
  { id: 'walking', label: 'Pieszo', icon: '🚶' },
  { id: 'metro', label: 'Metro/Bus', icon: '🚇' },
  { id: 'car', label: 'Samochód', icon: '🚗' },
  { id: 'bike', label: 'Rower', icon: '🚲' },
];

// KOMPONENT CUSTOM SLIDER
function CustomSlider({ value, onValueChange, min, max, step }: CustomSliderProps) {
  const sliderRef = useRef<View>(null);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [sliderWidth] = useState(300);
  const thumbSize = 24;

  const calculateValue = (x: number) => {
    const relativeX = x - sliderPosition;
    const percentage = Math.max(0, Math.min(1, relativeX / sliderWidth));
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { pageX } = evt.nativeEvent;
      const newValue = calculateValue(pageX);
      onValueChange(newValue);
    },
    onPanResponderMove: (evt) => {
      const { pageX } = evt.nativeEvent;
      const newValue = calculateValue(pageX);
      onValueChange(newValue);
    },
  });

  const percentage = (value - min) / (max - min);
  const thumbPosition = percentage * sliderWidth;

  return (
    <View 
      style={styles.sliderContainer}
      onLayout={(event) => {
        const { x } = event.nativeEvent.layout;
        setSliderPosition(x);
      }}
    >
      <View 
        ref={sliderRef}
        style={styles.sliderTrack} 
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: thumbPosition }]} />
        <View
          style={[
            styles.sliderThumb,
            { left: thumbPosition - thumbSize / 2 },
          ]}
        />
      </View>
    </View>
  );
}

// KOMPONENT DO FORMATOWANIA DATY Z LEPSZYM BACKSPACE
function DateInput({ 
  value, 
  onChangeText, 
  placeholder, 
  currentColors,
  autoFocus = false
}: { 
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  currentColors: any;
  autoFocus?: boolean;
}) {
  const prevValueRef = useRef<string>(value);

  const handleChangeText = (text: string) => {
    const prevValue = prevValueRef.current;
    prevValueRef.current = text;

    // Jeśli usuwamy znak (text jest krótszy), pozwól na normalne usuwanie
    if (text.length < prevValue.length) {
      // Usuń kropki jeśli zostały same
      const cleaned = text.replace(/\.$/, '');
      onChangeText(cleaned);
      return;
    }

    // Jeśli dodajemy znaki, formatuj
    const numbersOnly = text.replace(/[^0-9]/g, '');
    
    let formatted = '';
    if (numbersOnly.length > 0) {
      const day = numbersOnly.substring(0, 2);
      formatted = day;
      
      if (numbersOnly.length >= 3) {
        formatted += '.';
        const month = numbersOnly.substring(2, 4);
        formatted += month;
      }
      
      if (numbersOnly.length >= 5) {
        formatted += '.';
        const year = numbersOnly.substring(4, 8);
        formatted += year;
      }
    }
    
    onChangeText(formatted);
  };

  return (
    <TextInput
      style={[styles.input, { color: currentColors.text }]}
      placeholder={placeholder}
      placeholderTextColor={currentColors.subtext}
      value={value}
      onChangeText={handleChangeText}
      keyboardType="numeric"
      maxLength={10}
      autoFocus={autoFocus}
    />
  );
}

// GŁÓWNY KOMPONENT
export default function Create() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 30;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TripFormData>({
    destination: '',
    departureDate: '',
    returnDate: '',
    travelers: 1,
    budget: 3000,
    interests: [],
    transport: [],
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const setStoreFormData = useTripStore((s) => s.setFormData);

  const handleGeneratePlan = () => {
    setStoreFormData(formData); // używa lokalnego formData z useState
    router.push('/trip-loading');
  };
  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <React.Fragment key={index}>
            <View
              style={[
                styles.progressDot,
                { 
                  backgroundColor: isActive ? '#6366f1' : isCompleted ? '#6366f1' : currentColors.border,
                },
                isActive && styles.progressDotActive,
              ]}
            >
              {isActive && <View style={styles.progressDotInner} />}
            </View>
            {index < totalSteps - 1 && (
              <View 
                style={[
                  styles.progressLine,
                  { backgroundColor: isCompleted ? '#6366f1' : currentColors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Dokąd chcesz pojechać? 🌍
      </Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext }]}>
        Wpisz miasto lub kraj docelowy
      </Text>

      <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.input, { color: currentColors.text }]}
          placeholder="np. Paryż, Francja"
          placeholderTextColor={currentColors.subtext}
          value={formData.destination}
          onChangeText={(text) => setFormData({ ...formData, destination: text })}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: currentColors.subtext }]}>POPULARNE KIERUNKI</Text>

      <View style={styles.destinationsGrid}>
        {POPULAR_DESTINATIONS.map((dest) => (
          <TouchableOpacity
            key={dest.city}
            style={[
              styles.destinationCard,
              { backgroundColor: currentColors.card, borderColor: currentColors.border },
              formData.destination === dest.city && { borderColor: '#6366f1', borderWidth: 2 },
            ]}
            onPress={() => setFormData({ ...formData, destination: dest.city })}
          >
            <Text style={styles.destinationCountry}>{dest.country}</Text>
            <Text style={[styles.destinationCity, { color: currentColors.text }]}>{dest.city}</Text>
            <Text style={[styles.destinationPrice, { color: currentColors.subtext }]}>
              ~{dest.price} PLN
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: currentColors.text }]}>
        Kiedy wyjeżdżasz? 📅
      </Text>
      <Text style={[styles.stepSubtitle, { color: currentColors.subtext }]}>
        Wybierz daty wyjazdu i powrotu
      </Text>

      {/* TODO: Dodać funkcjonalność szybkich wyborów */}
      <View style={styles.quickDatesContainer}>
        <TouchableOpacity style={[styles.quickDateCard, { backgroundColor: currentColors.card }]}>
          <Text style={styles.quickDateIcon}>🌙</Text>
          <Text style={[styles.quickDateTitle, { color: currentColors.text }]}>Weekend</Text>
          <Text style={[styles.quickDateSubtitle, { color: currentColors.subtext }]}>2-3 dni</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickDateCard, { backgroundColor: currentColors.card }]}>
          <Text style={styles.quickDateIcon}>📆</Text>
          <Text style={[styles.quickDateTitle, { color: currentColors.text }]}>Tydzień</Text>
          <Text style={[styles.quickDateSubtitle, { color: currentColors.subtext }]}>7 dni</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickDateCard, { backgroundColor: currentColors.card }]}>
          <Text style={styles.quickDateIcon}>🗺️</Text>
          <Text style={[styles.quickDateTitle, { color: currentColors.text }]}>Dwa tygodnie</Text>
          <Text style={[styles.quickDateSubtitle, { color: currentColors.subtext }]}>14 dni</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: currentColors.text }]}>Data wylotu</Text>
      <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <DateInput
          value={formData.departureDate}
          onChangeText={(text) => setFormData({ ...formData, departureDate: text })}
          placeholder="dd.mm.rrrr"
          currentColors={currentColors}
          autoFocus={true}
        />
      </View>

      <Text style={[styles.label, { color: currentColors.text }]}>Data powrotu</Text>
      <View style={[styles.inputContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <DateInput
          value={formData.returnDate}
          onChangeText={(text) => setFormData({ ...formData, returnDate: text })}
          placeholder="dd.mm.rrrr"
          currentColors={currentColors}
        />
      </View>

      <View style={[styles.tipBox, { backgroundColor: currentColors.card + '20', borderColor: '#6366f130' }]}>
        <Text style={styles.tipIcon}>📅</Text>
        <Text style={[styles.tipText, { color: currentColors.text }]}>
          Wskazówka: Wyjazdy w środku tygodnia są często nawet 30% tańsze!
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => {
    const budgetPerPerson = Math.round(formData.budget / formData.travelers);

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: currentColors.text }]}>
          Kto jedzie i jaki budżet? 💰
        </Text>

        <Text style={[styles.label, { color: currentColors.text, marginTop: 20 }]}>Liczba podróżujących</Text>
        
        <View style={[styles.travelersCard, { backgroundColor: currentColors.card }]}>
          <View style={styles.travelersCounter}>
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: currentColors.border }]}
              onPress={() => formData.travelers > 1 && setFormData({ ...formData, travelers: formData.travelers - 1 })}
            >
              <Text style={styles.counterButtonText}>−</Text>
            </TouchableOpacity>
            
            <Text style={[styles.travelersCount, { color: currentColors.text }]}>{formData.travelers}</Text>
            
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: '#6366f1' }]}
              onPress={() => setFormData({ ...formData, travelers: formData.travelers + 1 })}
            >
              <Text style={[styles.counterButtonText, { color: '#fff' }]}>+</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.travelersLabel, { color: currentColors.subtext }]}>osoby</Text>
          
          <View style={styles.travelersDots}>
            {Array.from({ length: formData.travelers }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.travelerDot,
                  { backgroundColor: index === 0 ? '#a5b4fc' : index === 1 ? '#c4b5fd' : '#f0abfc' },
                ]}
              >
                <Text style={styles.travelerDotText}>{String.fromCharCode(65 + index)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.label, { color: currentColors.text, marginTop: 30 }]}>Budżet całkowity</Text>
        
        <View style={[styles.budgetCard, { backgroundColor: currentColors.card }]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.budgetLabel, { color: currentColors.subtext }]}>Budżet całkowity</Text>
            <Text style={[styles.budgetValue, { color: '#6366f1' }]}>{formData.budget.toLocaleString()} PLN</Text>
          </View>

          <CustomSlider
            value={formData.budget}
            onValueChange={(value) => setFormData({ ...formData, budget: value })}
            min={500}
            max={20000}
            step={100}
            currentColors={currentColors}
          />

          <View style={styles.budgetRange}>
            <Text style={[styles.rangeText, { color: currentColors.subtext }]}>500 PLN</Text>
            <Text style={[styles.rangeText, { color: currentColors.subtext }]}>20 000 PLN</Text>
          </View>

          <Text style={[styles.budgetPerPerson, { color: currentColors.subtext }]}>
            ≈ {budgetPerPerson.toLocaleString()} PLN na osobę
          </Text>
        </View>

        {/* TODO: Dodać funkcjonalność presetów budżetu */}
        <View style={styles.budgetPresets}>
          <TouchableOpacity style={[styles.budgetPreset, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            <Text style={styles.budgetPresetIcon}>🎒</Text>
            <Text style={[styles.budgetPresetTitle, { color: currentColors.text }]}>Oszczędny</Text>
            <Text style={[styles.budgetPresetSubtitle, { color: currentColors.subtext }]}>&lt; 1000 PLN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.budgetPreset, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            <Text style={styles.budgetPresetIcon}>🏨</Text>
            <Text style={[styles.budgetPresetTitle, { color: currentColors.text }]}>Komfortowy</Text>
            <Text style={[styles.budgetPresetSubtitle, { color: currentColors.subtext }]}>1-3k PLN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.budgetPreset, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            <Text style={styles.budgetPresetIcon}>💎</Text>
            <Text style={[styles.budgetPresetTitle, { color: currentColors.text }]}>Luksusowy</Text>
            <Text style={[styles.budgetPresetSubtitle, { color: currentColors.subtext }]}>&gt; 3000 PLN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep4 = () => {
    const toggleInterest = (id: string) => {
      if (formData.interests.includes(id)) {
        setFormData({ ...formData, interests: formData.interests.filter((i) => i !== id) });
      } else {
        setFormData({ ...formData, interests: [...formData.interests, id] });
      }
    };

    const toggleTransport = (id: string) => {
      if (formData.transport.includes(id)) {
        setFormData({ ...formData, transport: formData.transport.filter((t) => t !== id) });
      } else {
        setFormData({ ...formData, transport: [...formData.transport, id] });
      }
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: currentColors.text }]}>
          Twoje preferencje 🎯
        </Text>

        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Co Cię interesuje?</Text>

        <View style={styles.interestsGrid}>
          {INTERESTS.map((interest) => {
            const isSelected = formData.interests.includes(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.interestChip,
                  { backgroundColor: isSelected ? '#6366f1' : currentColors.card, borderColor: currentColors.border },
                ]}
                onPress={() => toggleInterest(interest.id)}
              >
                <Text style={styles.interestChipIcon}>{interest.icon}</Text>
                <Text style={[styles.interestChipText, { color: isSelected ? '#fff' : currentColors.text }]}>
                  {interest.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 30 }]}>Preferowany transport</Text>

        <View style={styles.transportGrid}>
          {TRANSPORT_OPTIONS.map((transport) => {
            const isSelected = formData.transport.includes(transport.id);
            return (
              <TouchableOpacity
                key={transport.id}
                style={[
                  styles.transportCard,
                  { backgroundColor: currentColors.card, borderColor: isSelected ? '#6366f1' : currentColors.border },
                  isSelected && { backgroundColor: currentColors.card + '40' },
                ]}
                onPress={() => toggleTransport(transport.id)}
              >
                <Text style={styles.transportIcon}>{transport.icon}</Text>
                <Text style={[styles.transportLabel, { color: currentColors.text }]}>{transport.label}</Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.quickPlanBox, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}>
          <Text style={styles.quickPlanIcon}>⚡</Text>
          <View style={styles.quickPlanContent}>
            <Text style={[styles.quickPlanTitle, { color: '#92400e' }]}>Opcja Quick Plan</Text>
            <Text style={[styles.quickPlanText, { color: '#a16207' }]}>
              AI wybierze najlepsze opcje automatycznie — gotowy plan w 3 sekundy!
            </Text>
          </View>
        </View>

        <View style={styles.generateButtonContainer}>
          <GradientButton
            onPress={handleGeneratePlan}
            title="✨ Generuj mój plan"
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonTop}>
          <Text style={styles.backButtonTextTop}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.stepIndicator, { color: currentColors.subtext }]}>
            Krok {currentStep} z {totalSteps}
          </Text>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>
            {currentStep === 1 && 'Dokąd?'}
            {currentStep === 2 && 'Kiedy?'}
            {currentStep === 3 && 'Kto & Budżet'}
            {currentStep === 4 && 'Preferencje'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {renderProgressBar()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {currentStep < totalSteps && (
          <View style={styles.navigationButtons}>
            <View style={styles.nextButtonContainer}>
              <GradientButton
                onPress={handleNext}
                title="Dalej →"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// STYLE
const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header Top
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonTextTop: {
    fontSize: 28,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: -10,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  
  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    width: 32,
    height: 10,
    borderRadius: 5,
  },
  progressDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  progressLine: {
    width: 30,
    height: 2,
    marginHorizontal: 4,
  },

  // Step Container
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },

  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginTop: 8,
  },

  // Destinations Grid
  destinationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  destinationCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  destinationCountry: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  destinationCity: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  destinationPrice: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Quick Dates
  quickDatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickDateCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickDateIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickDateTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickDateSubtitle: {
    fontSize: 12,
  },

  // Label
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Tip Box
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Travelers
  travelersCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  travelersCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  travelersCount: {
    fontSize: 48,
    fontWeight: 'bold',
    marginHorizontal: 24,
  },
  travelersLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  travelersDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  travelerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  travelerDotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Budget
  budgetCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  budgetRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeText: {
    fontSize: 12,
  },
  budgetPerPerson: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderTrack: {
    width: 300,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#6366f1',
    borderRadius: 3,
    left: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -9,
    backgroundColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  budgetPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  budgetPreset: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  budgetPresetIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  budgetPresetTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  budgetPresetSubtitle: {
    fontSize: 12,
  },

  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    width: '48%',
    justifyContent: 'center',
  },
  interestChipIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Transport
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transportCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  transportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transportLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: '#6366f1',
    fontWeight: 'bold',
  },

  // Quick Plan
  quickPlanBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    marginBottom: 20,
  },
  quickPlanIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  quickPlanContent: {
    flex: 1,
  },
  quickPlanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickPlanText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Navigation
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  nextButtonContainer: {
    flex: 1,
  },
  generateButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
});