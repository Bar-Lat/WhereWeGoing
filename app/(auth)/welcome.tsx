import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Logo from '../../assets/images/WhereWeGoingLogo.png';
import GradientButton from '../../components/gradientButton';
import { Colors } from "../../styles/colors";
import { styles } from '../../styles/welcome.styles';

const { width } = Dimensions.get('window');

const DATA = [
  {
    id: '1',
    title: 'Paris',
    description: 'jakies tam pitolenie.',
    image: require('../../assets/images/cities/paris.jpg'),
  },
  {
    id: '2',
    title: 'Barcelona',
    description: 'jakies tam pitolenie',
    image: require('../../assets/images/cities/barcelona.jpg'),
  },
  {
    id: '3',
    title: 'London',
    description: 'jakies tam pitolenie.',
    image: require('../../assets/images/cities/london.jpg'),
  },
  {
    id: '4',
    title: 'Tokyo',
    description: 'jakies tam pitolenie.',
    image: require('../../assets/images/cities/tokyo.jpg'),
  },
  {
    id: '5',
    title: 'Venice',
    description: 'jakies tam pitolenie',
    image: require('../../assets/images/cities/venice.jpg'),
  },
  {
    id: '6',
    title: 'Warsaw',
    description: 'jakies tam pitolenie',
    image: require('../../assets/images/cities/warsaw.jpg'),
  },
];

// Budujemy listę do nieskończonej pętli: [Ostatni, 1, 2, 3, 4, Pierwszy]
const SLIDES = [DATA[DATA.length - 1], ...DATA, DATA[0]];

export default function Welcome() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  // Startujemy od indeksu 1 (prawdziwy pierwszy slajd)
  const [currentIndex, setCurrentIndex] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  // Funkcja do obsługi zapętlenia bez animacji
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);

    // Jeśli jesteśmy na "fałszywym" ostatnim (końcu), skaczemy na prawdziwy pierwszy
    if (index >= SLIDES.length - 1) {
      flatListRef.current?.scrollToOffset({ offset: width, animated: false });
      setCurrentIndex(1);
    } 
    // Jeśli jesteśmy na "fałszywym" pierwszym (początku), skaczemy na prawdziwy ostatni
    else if (index <= 0) {
      flatListRef.current?.scrollToOffset({ offset: width * (SLIDES.length - 2), animated: false });
      setCurrentIndex(SLIDES.length - 2);
    } 
    else {
      setCurrentIndex(index);
    }
  };

  // Automatyczne przesuwanie zawsze w prawo
  useEffect(() => {
    const interval = setInterval(() => {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex]);

const renderItem = ({ item }: { item: typeof DATA[0] }) => (
  <View style={styles.slideWrapper}>
    <View style={styles.slideContainer}>
      <Image source={item.image} style={styles.slideImage} />
      
      {/* Stały blur na poziomie 15 */}
      <BlurView 
        intensity={15} 
        tint="dark" 
        style={StyleSheet.absoluteFill} 
      />
      
      <View style={styles.slideTextWrapper}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  </View>
);

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.middleContent}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          // Optymalizacja przesuwania
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          // Startujemy od razu od pierwszego prawdziwego zdjęcia
          contentOffset={{ x: width, y: 0 }}
        />



        {/* Kropki - mapujemy po oryginalnej tablicy DATA */}
        <View style={styles.dotsContainer}>
          {DATA.map((_, index) => {
            // Logika kropki musi uwzględniać przesunięcie o 1
            const activeDot = (currentIndex - 1 + DATA.length) % DATA.length;
            return (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  { backgroundColor: index === activeDot ? Colors.brand.blue : currentColors.border }
                ]} 
              />
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <GradientButton 
          title="Załóż konto"
          onPress={() => router.push('/(auth)/register')}
          style={{ marginBottom: 0 }} 
        />
        
        <View style={styles.footerBase}>
                  <TouchableOpacity style={styles.loginPrompt} onPress={() => router.push('/(auth)/login')}>
                    <Text style={{ color: currentColors.subtext }}>
                      Masz już konto? <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>Zaloguj się</Text>
                    </Text>
                  </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}