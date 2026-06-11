const { normalizeTripTravelCosts } = require('../../utils/tripTravelFields');

describe('tripTravelFields', () => {
  it('podnosi zbyt niski koszt lotu po Europie do minimum tanich linii dla calej grupy', () => {
    const plan = normalizeTripTravelCosts(
      {
        travelWay: 'Samolot',
        travelCost: 50,
        returnWay: 'Samolot',
        returnCost: 50,
        days: [{ estimatedDayCost: 300 }],
      },
      { destination: 'Oslo', travelers: 2 }
    );

    expect(plan.travelCost).toBe(400);
    expect(plan.returnCost).toBe(400);
    expect(plan.estimatedTotalCost).toBe(1100);
  });

  it('podnosi zbyt niski koszt lotu miedzykontynentalnego do realistycznego minimum', () => {
    const plan = normalizeTripTravelCosts(
      {
        travelWay: 'Samolot',
        travelCost: 500,
        returnWay: 'Samolot',
        returnCost: 500,
        days: [{ estimatedDayCost: 900 }],
      },
      { destination: 'Tokio', travelers: 1 }
    );

    expect(plan.travelCost).toBe(1800);
    expect(plan.returnCost).toBe(1800);
    expect(plan.travelDurationMinutes).toBe(720);
    expect(plan.returnDurationMinutes).toBe(720);
    expect(plan.estimatedTotalCost).toBe(4500);
  });

  it('rozpoznaje odmiane Nowego Jorku jako trase miedzykontynentalna', () => {
    const plan = normalizeTripTravelCosts(
      {
        travelWay: 'Samolot',
        travelCost: 500,
        returnWay: 'Samolot',
        returnCost: 500,
        days: [{ estimatedDayCost: 1000 }],
      },
      { destination: 'wycieczka do Nowego Jorku', travelers: 1 }
    );

    expect(plan.travelCost).toBe(1800);
    expect(plan.returnCost).toBe(1800);
    expect(plan.estimatedTotalCost).toBe(4600);
  });

  it('wybiera samochod dla krajowej trasy, gdy uzytkownik preferuje auto', () => {
    const plan = normalizeTripTravelCosts(
      {
        travelWay: 'Pociąg',
        travelCost: 80,
        returnWay: 'Pociąg',
        returnCost: 80,
        days: [{ estimatedDayCost: 500 }],
      },
      {
        destination: 'Kraków',
        originLabel: 'Rzeszów, Polska',
        originCoordinates: { latitude: 50.0413, longitude: 21.999 },
        travelers: 2,
        transport: ['car'],
      }
    );

    expect(plan.travelWay).toBe('Samochód');
    expect(plan.returnWay).toBe('Samochód');
    expect(plan.travelDurationMinutes).toBeGreaterThanOrEqual(90);
    expect(plan.travelDurationMinutes).toBeLessThanOrEqual(150);
  });

  it('nadpisuje auto lub pociag samolotem przy trasie miedzykontynentalnej', () => {
    const plan = normalizeTripTravelCosts(
      {
        travelWay: 'Pociąg',
        travelCost: 300,
        returnWay: 'Pociąg',
        returnCost: 300,
        days: [{ estimatedDayCost: 1500 }],
      },
      {
        destination: 'Malezja',
        originLabel: 'Rzeszów, Polska',
        originCoordinates: { latitude: 50.0413, longitude: 21.999 },
        travelers: 1,
        transport: ['car', 'metro'],
      }
    );

    expect(plan.travelWay).toBe('Samolot');
    expect(plan.returnWay).toBe('Samolot');
    expect(plan.travelCost).toBeGreaterThanOrEqual(1800);
    expect(plan.travelDurationMinutes).toBe(720);
  });
});
