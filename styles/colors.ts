export const Colors = {

  light: {

    // Delikatny, ciepły szary zamiast czystej bieli - mniej męczy oczy

    background: '#F8F9FA',

    // Karty nieco ciemniejsze od tła, by były widoczne

    card: '#FFFFFF',

    text: '#1A1C1E', // Bardzo ciemny granat/szary zamiast czystego czarnego

    subtext: '#6C757D',

    border: '#E9ECEF',

    primary: '#2196F3',

  },

  dark: {

    // "Nocny granat/antracyt" zamiast czystej czerni - lepiej widać cienie i głębię

    background: '#121417',

    // Karty nieco jaśniejsze od tła (zasada: im wyżej w hierarchii, tym jaśniej)

    card: '#1E2125',

    text: '#F8F9FA', // Off-white zamiast czystej bieli - mniejszy kontrast "świecenia"

    subtext: '#ADB5BD',

    border: '#2C3036',

    primary: '#2196F3',

  },
  // Kolory brandowe wyciągnięte bezpośrednio z logo
  brand: {
    blue: '#498ee6',
    green: '#20a079',
    yellow: '#e4d03f',
    // Możesz też dodać je jako tablicę dla ułatwienia w GradientButton
    logoGradient: ['#498ee6', '#20a079', '#e4d03f'] as const,
  }

};