const INTEREST_LABELS = {
  sightseeing: 'zwiedzanie zabytków',
  food: 'lokalna kuchnia i restauracje',
  nature: 'natura i parki',
  parties: 'życie nocne i imprezy',
  shopping: 'zakupy',
  art: 'muzea i sztuka',
  sport: 'aktywność sportowa',
  beach: 'plaża i relaks',
};

const TRANSPORT_LABELS = {
  walking: 'pieszo',
  metro: 'metro i autobus',
  car: 'samochodem',
  bike: 'rowerem',
};

const buildPrompt = (data) => {
  const interests = (data.interests || []).map((i) => INTEREST_LABELS[i] ?? i).join(', ');
  const transport = (data.transport || []).map((t) => TRANSPORT_LABELS[t] ?? t).join(', ');
  const attractionsPerDay = data.attractionsPerDay ?? 3;
  const transportBudgetLimit = Math.round(Number(data.budget || 0) * 0.3);
  const activitiesBudgetTarget = Math.round(Number(data.budget || 0) * 0.7);
  const minimumPlannedCost = Math.round(Number(data.budget || 0) * 0.75);
  const maximumPlannedCost = Math.round(Number(data.budget || 0) * 0.95);

  return `Jesteś ekspertem od podróży. Wygeneruj szczegółowy plan wycieczki na podstawie poniższych danych.

DANE WYCIECZKI:
- Cel podróży: ${data.destination}
- Przybliżony punkt startu użytkownika: ${data.originLabel || 'nieznany (jeśli brak, przyjmij start z Polski)'}
- Data wylotu: ${data.departureDate}
- Data powrotu: ${data.returnDate}
- Liczba podróżujących: ${data.travelers} osób
- Budżet całkowity: ${data.budget} PLN (${Math.round(data.budget / data.travelers)} PLN/osobę)
- Zainteresowania: ${interests || 'ogólne zwiedzanie'}
- Preferowany transport na miejscu: ${transport || 'dowolny'}
- Liczba atrakcji dziennie: ${attractionsPerDay}
- Orientacyjny limit kosztu dojazdu dalekodystansowego: maksymalnie ok. ${transportBudgetLimit} PLN dla całej grupy
- Orientacyjny budżet na atrakcje, jedzenie i transport lokalny: ok. ${activitiesBudgetTarget} PLN dla całej grupy
- Docelowy koszt całego planu: ok. ${minimumPlannedCost}-${maximumPlannedCost} PLN dla całej grupy

Zwróć WYŁĄCZNIE obiekt JSON (bez markdown, bez komentarzy) w tym schemacie:
{
  "destination": "string",
  "englishDestination": "string (angielska nazwa miasta dla Unsplash)", 
  "summary": "string",
  "imageUrl": "string (zostaw puste, wygenerujemy to sami)",
  "totalDays": number,
  "estimatedTotalCost": number,
  "currency": "PLN",
  "travelWay": "string (srodek transportu do celu po polsku, np. Samolot, Pociag, Autobus, Samochod)",
  "travelCost": number (koszt dojazdu do celu dla calej grupy w PLN),
  "travelDurationMinutes": number (orientacyjny czas dojazdu do celu w minutach),
  "returnWay": "string (srodek transportu powrotnego po polsku)",
  "returnCost": number (koszt powrotu dla calej grupy w PLN),
  "returnDurationMinutes": number (orientacyjny czas powrotu w minutach),
  "days": [
    {
      "day": number,
      "date": "string (dd.mm.rrrr)",
      "title": "string (krótki tytuł dnia)",
      "activities": [
        {
          "time": "string (np. 09:00)",
          "name": "string",
          "description": "string (1-2 zdania)",
          "category": "string (jedzenie|atrakcja|nocleg|inne)",
          "estimatedCost": number,
          "location": "string (pełny adres: nazwa miejsca + ulica/dzielnica + miasto)",
          "durationMinutes": number (realistyczny czas wizyty w minutach),
          "coordinates": {
            "latitude": number (WGS84 — dokładne współrzędne miejsca),
            "longitude": number (WGS84)
          }
        }
      ],
      "estimatedDayCost": number,
      "tips": "string (jedna praktyczna wskazówka na ten dzień)"
    }
  ],
  "generalTips": ["string", "string", "string"],
  "bestTransport": "string (rekomendacja transportu)"
}

Dobierz dojazd do celu podróży realistycznie:
- jeśli podróż jest na inny kontynent albo wyraźnie powyżej 1000 km, rekomenduj samolot, nie samochód;
- dla długich tras w Europie preferuj pociąg, autobus lub samolot, a samochód tylko gdy dystans i kontekst mają sens;
- nie twórz kosztu transportu, który pochłania większość budżetu; transport dalekodystansowy powinien zwykle mieścić się w 20-35% budżetu, chyba że budżet jest skrajnie niski;
- ABSOLUTNIE nie dodawaj lotu, przylotu, wylotu, dojazdu do miasta docelowego ani powrotu do domu jako aktywności w days[].activities; aplikacja pokazuje te odcinki osobno na podstawie wyboru użytkownika;
- nie dodawaj transportu lokalnego jako aktywności; przejazdy między punktami planu obsługuje aplikacja poza days[].activities;
- w bestTransport opisz rekomendowany dojazd i powrót realistycznie, np. pociąg/autobus/samolot zamiast samochodu przez bardzo długą trasę;
- pola travelWay/travelCost oraz returnWay/returnCost sa jedynym miejscem na dojazd do celu i powrot; nie powtarzaj ich w days[].activities;
- travelWay i returnWay muszą być krótką polską nazwą środka transportu, np. "Samolot", "Pociąg", "Autobus", "Samochód";
- travelCost i returnCost muszą być realistycznymi kosztami dla całej grupy w PLN i wliczać się do estimatedTotalCost;
- travelDurationMinutes i returnDurationMinutes muszą być realistyczne: lot Polska/Europa-USA trwa zwykle 600-840 minut, lot po Europie 120-240 minut, Rzeszów-Kraków samochodem ok. 120 minut, Rzeszów-morze samochodem ok. 420-540 minut;
- preferowany transport użytkownika dotyczy też dojazdu do celu, jeśli dystans jest realistyczny: gdy wybrano samochód i trasa jest krajowa/regionalna, ustaw travelWay/returnWay na "Samochód"; gdy wybrano Metro/Bus, dla tras międzymiastowych preferuj "Pociąg" albo "Autobus";
- jeśli travelWay lub returnWay to "Samolot", licz koszt na osobę i przemnoż przez ${data.travelers}: tanie linie po Europie zwykle 200-500 PLN/os. za odcinek, a lot na inny kontynent, np. z Polski/Europy do USA albo Nowego Jorku, zwykle 1800-3000 PLN/os. za odcinek;
- jeśli budżet nie wystarcza na realistyczną drogą podróż, wybierz tańszy wariant i zostaw sensowną część na zwiedzanie.
Każdy dzień powinien mieć dokładnie ${attractionsPerDay} atrakcji kategorii "atrakcja". 
Posiłki (kategoria "jedzenie") i noclegi (kategoria "nocleg") są DODATKIEM i nie wliczają się do tej liczby.
Oznacza to że każdy dzień powinien zawierać ${attractionsPerDay} atrakcji PLUS posiłki i nocleg, jeśli wycieczka trwa dłużej niż 1 dzień.
W KAŻDYM dniu dodaj co najmniej jeden posiłek kategorii "jedzenie" nazwany naturalnie, np. "Obiad w lokalnej restauracji"; jego estimatedCost musi być w estimatedDayCost i w budżecie.
Przy wycieczce wielodniowej uwzględnij realistyczny koszt noclegów dla całej grupy. Dla 4 dni zwykle zaplanuj 3 noclegi, chyba że daty wskazują inaczej.
Wszystkie koszty (estimatedCost, estimatedDayCost, estimatedTotalCost) dotyczą CAŁEJ grupy ${data.travelers} osób, nie jednej osoby.
estimatedDayCost każdego dnia musi być równy sumie estimatedCost aktywności tego dnia.
Suma estimatedDayCost ze wszystkich dni plus travelCost i returnCost powinna być realistyczna, nie powinna przekraczać budżetu ${data.budget} PLN i powinna zwykle wykorzystać 75-95% budżetu.
Nie oddawaj planu za symboliczny ułamek budżetu, np. 400 PLN przy budżecie 3000 PLN na kilka dni, jeśli można sensownie doliczyć nocleg, jedzenie, bilety i transport.
Nie planuj tak, aby sam dojazd dalekodystansowy zostawiał mniej niż ok. 40% budżetu na zwiedzanie, jedzenie i lokalny transport.
Dla KAŻDEJ aktywności OBOWIĄZKOWO podaj location, durationMinutes oraz coordinates (latitude/longitude).
Pole location musi być na tyle precyzyjne, żeby dało się znaleźć miejsce na mapie — podaj nazwę obiektu, ulicę i miasto (np. "Wawel, Wawel 5, Kraków", nie samo "zamek").
Współrzędne muszą odpowiadać temu samemu miejscu co location i leżeć w ${data.destination}.
durationMinutes to realistyczny czas wizyty (np. muzeum 90–120, posiłek 60–90, krótka atrakcja 45–60).
Nie skracaj listy pól — każda aktywność musi mieć komplet danych.
Godziny aktywności muszą rosnąć chronologicznie w ciągu dnia.`;
};

module.exports = { buildPrompt, INTEREST_LABELS, TRANSPORT_LABELS };
