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
});
