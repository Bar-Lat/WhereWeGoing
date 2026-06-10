import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Logo from '@/assets/images/WhereWeGoingLogo.png';
import GradientButton from '@/components/GradientButton';
import { Colors } from '@/styles/colors';
import { styles } from '@/styles/welcome.styles';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Używamy aliasu @/ dla pewności, że bundler znajdzie pliki
const DATA = [
  {
    id: '1',
    title: 'Paryż',
    description: 'Wieża Eiffla i romantyczne uliczki',
    image: require('@/assets/images/cities/paris.jpg'),
    days: 4,
    price: 1200,
  },
  {
    id: '2',
    title: 'Barcelona',
    description: 'Słońce, Gaudí i pyszne tapas',
    image: require('@/assets/images/cities/barcelona.jpg'),
    days: 5,
    price: 1450,
  },
  {
    id: '3',
    title: 'Londyn',
    description: 'Kultowe miejsca i herbata o piątej',
    image: require('@/assets/images/cities/london.jpg'),
    days: 3,
    price: 980,
  },
  {
    id: '4',
    title: 'Tokio',
    description: 'Tradycja spotyka nowoczesność',
    image: require('@/assets/images/cities/tokyo.jpg'),
    days: 7,
    price: 3500,
  },
  {
    id: '5',
    title: 'Wenecja',
    description: 'Rejsy gondolą o zachodzie słońca',
    image: require('@/assets/images/cities/venice.jpg'),
    days: 4,
    price: 1300,
  },
  {
    id: '6',
    title: 'Warszawa',
    description: 'Dynamiczna stolica pełna historii i nocnego życia',
    image: require('@/assets/images/cities/warsaw.jpg'),
    days: 3,
    price: 850,
  },
];

const SLIDES = [DATA[DATA.length - 1], ...DATA, DATA[0]];

export default function Welcome() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const [currentIndex, setCurrentIndex] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);

    if (index >= SLIDES.length - 1) {
      flatListRef.current?.scrollToOffset({ offset: width, animated: false });
      setCurrentIndex(1);
    } else if (index <= 0) {
      flatListRef.current?.scrollToOffset({ offset: width * (SLIDES.length - 2), animated: false });
      setCurrentIndex(SLIDES.length - 2);
    } else {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const formatPrice = (price: number) => {
    return `${new Intl.NumberFormat('pl-PL').format(price)} PLN`;
  };

  const renderItem = ({ item }: { item: typeof DATA[0] }) => (
    <View style={styles.slideWrapper}>
      <View style={styles.slideContainer}>
        <Image source={item.image} style={styles.slideImage} />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)']}
          locations={[0.4, 1]}
          style={styles.slideGradientOverlay}
        />
        
        <View style={styles.slideTextWrapper}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.metaRow}>
            <View style={styles.welcomeMetaPill}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={styles.welcomeMetaText}>{item.days} dni</Text>
            </View>
            
            <View style={styles.welcomeMetaPill}>
              <Ionicons name="cash-outline" size={14} color="#fff" />
              <Text style={styles.welcomeMetaText}>{formatPrice(item.price)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
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
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          contentOffset={{ x: width, y: 0 }}
        />
        
        <View style={styles.dotsContainer}>
          {DATA.map((_, index) => {
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
    </SafeAreaView>
  );
}