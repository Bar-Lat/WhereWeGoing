/**
 * TESTY JEDNOSTKOWE – buildPrompt()
 *
 * Logika budowania promptu dla Groq bez zależności od HTTP ani bazy.
 */

const { buildPrompt } = require('../../utils/buildTripPrompt');

const BASE_DATA = {
  destination: 'Krakow',
  departureDate: '01.06.2026',
  returnDate: '05.06.2026',
  travelers: 4,
  budget: 4000,
};

describe('buildPrompt()', () => {
  it('uwzglednia pole destination w tresci promptu', () => {
    const prompt = buildPrompt(BASE_DATA);

    expect(prompt).toContain('Cel podróży: Krakow');
    expect(prompt).toContain('leżeć w Krakow');
  });

  it('uwzglednia pola departureDate i returnDate', () => {
    const prompt = buildPrompt(BASE_DATA);

    expect(prompt).toContain('Data wylotu: 01.06.2026');
    expect(prompt).toContain('Data powrotu: 05.06.2026');
  });

  it('mapuje identyfikatory zainteresowan na etykiety po polsku', () => {
    const prompt = buildPrompt({
      ...BASE_DATA,
      interests: ['sightseeing', 'food'],
    });

    expect(prompt).toContain('zwiedzanie zabytków');
    expect(prompt).toContain('lokalna kuchnia i restauracje');
  });

  it('mapuje identyfikatory transportu na etykiety po polsku', () => {
    const prompt = buildPrompt({
      ...BASE_DATA,
      transport: ['walking', 'metro'],
    });

    expect(prompt).toContain('pieszo');
    expect(prompt).toContain('metro i autobus');
  });

  it('uwzglednia wartosc attractionsPerDay w tresci promptu', () => {
    const prompt = buildPrompt({
      ...BASE_DATA,
      attractionsPerDay: 5,
    });

    expect(prompt).toContain('Liczba atrakcji dziennie: 5');
    expect(prompt).toContain('dokładnie 5 atrakcji');
  });

  it('uzywa wartosci domyslnych dla pustych tablic interests i transport', () => {
    const prompt = buildPrompt({
      ...BASE_DATA,
      interests: [],
      transport: [],
    });

    expect(prompt).toContain('Zainteresowania: ogólne zwiedzanie');
    expect(prompt).toContain('Preferowany transport na miejscu: dowolny');
  });

  it('oblicza budzet na osobe jako budget / travelers', () => {
    const prompt = buildPrompt({
      ...BASE_DATA,
      travelers: 4,
      budget: 4000,
    });

    expect(prompt).toContain('4000 PLN (1000 PLN/osobę)');
  });

  it('wymusza realistyczny transport dla tras dalekodystansowych', () => {
    const prompt = buildPrompt(BASE_DATA);

    expect(prompt).toContain('powyżej 1000 km');
    expect(prompt).toContain('rekomenduj samolot, nie samochód');
    expect(prompt).toContain('20-35% budżetu');
    expect(prompt).toContain('ABSOLUTNIE nie dodawaj lotu');
    expect(prompt).toContain('dojazdu do miasta docelowego ani powrotu do domu jako aktywności');
    expect(prompt).toContain('aplikacja pokazuje te odcinki osobno');
    expect(prompt).toContain('nie dodawaj transportu lokalnego jako aktywności');
    expect(prompt).toContain('w bestTransport opisz rekomendowany dojazd i powrót');
    expect(prompt).toContain('"travelWay"');
    expect(prompt).toContain('"travelCost"');
    expect(prompt).toContain('"returnWay"');
    expect(prompt).toContain('"returnCost"');
    expect(prompt).toContain('pola travelWay/travelCost oraz returnWay/returnCost sa jedynym miejscem');
    expect(prompt).toContain('tanie linie po Europie zwykle 200-500 PLN/os.');
    expect(prompt).toContain('z Polski/Europy do USA albo Nowego Jorku');
    expect(prompt).toContain('1800-3000 PLN/os.');
  });

  it('wymaga obiadu jako kosztu w planie dnia', () => {
    const prompt = buildPrompt(BASE_DATA);

    expect(prompt).toContain('W KAŻDYM dniu dodaj co najmniej jeden posiłek');
    expect(prompt).toContain('Obiad w lokalnej restauracji');
    expect(prompt).toContain('estimatedCost musi być w estimatedDayCost');
  });

  it('wymaga sensownego wykorzystania budzetu i noclegow przy dluzszych wyjazdach', () => {
    const prompt = buildPrompt({
      ...BASE_DATA,
      destination: 'Gdansk',
      budget: 3000,
    });

    expect(prompt).toContain('2250-2850 PLN');
    expect(prompt).toContain('75-95% budżetu');
    expect(prompt).toContain('400 PLN przy budżecie 3000 PLN');
    expect(prompt).toContain('Dla 4 dni zwykle zaplanuj 3 noclegi');
  });

  it('domyslnie ustawia attractionsPerDay na 3 gdy brak w danych', () => {
    const prompt = buildPrompt(BASE_DATA);

    expect(prompt).toContain('Liczba atrakcji dziennie: 3');
    expect(prompt).toContain('dokładnie 3 atrakcji');
  });
});
