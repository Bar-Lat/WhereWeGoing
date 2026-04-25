import React from 'react';
import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  PanResponder, 
  useColorScheme 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import GradientButton from '../../components/GradientButton';
import { useTripStore } from '@/stores/tripStore';
import { Animated, Easing } from 'react-native';
import { styles } from '@/styles/create.styles';
import DateRangePicker from '../../components/DateRangePicker';

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
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const errorAnim = useRef(new Animated.Value(0)).current;
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const totalSteps = 4;

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        setErrors({}); // Czyść błędy przy przejściu dalej
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };
  const validateStep1 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.destination.trim()) {
      newErrors.destination = 'Podaj miejsce docelowe';
    }
    
    if (Object.keys(newErrors).length > 0) {
      showError(Object.values(newErrors)[0]);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  
  const validateStep2 = () => {
    const newErrors: {[key: string]: string} = {};
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    
    if (!formData.departureDate) {
      newErrors.departureDate = 'Podaj datę wylotu';
    } else if (!dateRegex.test(formData.departureDate)) {
      newErrors.departureDate = 'Nieprawidłowy format daty';
    }
    
    if (!formData.returnDate) {
      newErrors.returnDate = 'Podaj datę powrotu';
    } else if (!dateRegex.test(formData.returnDate)) {
      newErrors.returnDate = 'Nieprawidłowy format daty';
    }
    
    if (formData.departureDate && formData.returnDate) {
      const [dayD, monthD, yearD] = formData.departureDate.split('.').map(Number);
      const [dayR, monthR, yearR] = formData.returnDate.split('.').map(Number);
      const departure = new Date(yearD, monthD - 1, dayD);
      const returnDate = new Date(yearR, monthR - 1, dayR);
      
      if (returnDate < departure) {
        newErrors.returnDate = 'Data powrotu musi być późniejsza niż wylotu';
      }
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showError(Object.values(newErrors)[0]);
    }
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (formData.interests.length === 0) {
      newErrors.interests = 'Wybierz co najmniej jedno zainteresowanie';
    }
    
    setErrors(newErrors);
    
    // ✅ Teraz newErrors może mieć wartości
    if (Object.keys(newErrors).length > 0) {
      showError(Object.values(newErrors)[0]);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 4:
        return validateStep4();
      default:
        return true;
    }
  };
  const setStoreFormData = useTripStore((s) => s.setFormData);

  const showError = (message: string) => {
    setErrorMessages([message]);
    
    Animated.sequence([
      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(2400),
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setErrorMessages([]);
    });
  };

  const handleGeneratePlan = () => {
    if (validateStep4()) {
      setStoreFormData(formData);
      router.push('/trip-loading');
    }
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

      <DateRangePicker
        departureDate={formData.departureDate}
        returnDate={formData.returnDate}
        onDatesChange={(departure, ret) =>
          setFormData({ ...formData, departureDate: departure, returnDate: ret })
        }
      />

      <View style={[styles.tipBox, { backgroundColor: currentColors.card + '20', borderColor: '#6366f130', marginTop: 16 }]}>
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
        {/* {errors.interests && (
          <Text style={styles.errorText}>
            {errors.interests}
          </Text>
        )} */}

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
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Header */}
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

      {/* ScrollView z contentem */}
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderProgressBar()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Fiksowany kontener błędów */}
      {errorMessages.length > 0 && (
        <Animated.View 
          style={[
            styles.errorContainer,
            { 
              opacity: errorAnim,
              bottom: 65 + (insets.bottom > 0 ? insets.bottom : 10) + 56 + 16,
            },
          ]}
        >
          <Text style={styles.errorContainerText}>{errorMessages[0]}</Text>
        </Animated.View>
      )}

      {/* Fiksowany przycisk na dole */}
      <View style={[
        styles.fixedButtonContainer, 
        { 
          backgroundColor: currentColors.background,
          bottom: 65 + (insets.bottom > 0 ? insets.bottom : 10),
        }
      ]}>
        {currentStep < totalSteps ? (
          <GradientButton
            onPress={handleNext}
            title="Dalej →"
          />
        ) : (
          <GradientButton
            onPress={handleGeneratePlan}
            title="✨ Generuj mój plan"
          />
        )}
      </View>
    </View>
  );
}
