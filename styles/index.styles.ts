import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
  },
  map: {
    width: '100%',
    height: '85%',
  },
  logo: {
    width: 200,
    height: 60,
    resizeMode: 'contain',
  },
  bottomContainer: {
    flex: 1, // Zajmuje 20%
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 45, // Padding góry dla miejsca na przycisk
    backgroundColor: '#222',
  },
  buttonsRow: {
    flexDirection: 'row', // Ustawienie poziome
    justifyContent: 'center', // Rozepchnij przyciski na boki
    gap: 0,
    alignItems: 'center', // Wyśrodkuj w pionie
    width: '100%',
    position: 'absolute', // Kluczowe, by środkowy przycisk wyszedł na mapę
    top: -30, // Przesunięcie całego wiersza w górę
    zIndex: 10,
    paddingHorizontal: 30, // Margines od krawędzi ekranu dla bocznych przycisków
  },
  sideButton: {
    width: 60, // Mniejsze niż środkowy
    height: 80,
    backgroundColor: '#222', // Ciemniejszy kolor
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30, // Obniżamy je, żeby nie wychodziły na mapę tak bardzo jak środkowy
  },
  sideButtonText: {
    fontSize: 25,
  },
  middleButton: {
    width: 90,
    height: 90,
    backgroundColor: '#2c2c2c', // Kolor niebieski tła przycisku
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',

    zIndex: 10,
    // Cienie dla iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Cień dla Androida
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Stylizacja obrazu WEWNĄTRZ przycisku
  buttonImage: {
    width: '80%', // Obraz zajmuje 70% szerokości przycisku (zostawia margines)
    height: '80%', // Taka sama wysokość, by zachować proporcje
    resizeMode: 'contain', // Zapobiega rozciąganiu
  },
  bottomTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bottomText: {
    color: '#a0a0a0',
    fontSize: 14,
    textAlign: 'center',
  },
});