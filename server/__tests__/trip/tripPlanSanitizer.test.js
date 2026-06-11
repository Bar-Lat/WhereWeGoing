const {
  isTravelToDestinationActivity,
  removeTravelToDestinationActivities,
} = require('../../utils/tripPlanSanitizer');

describe('tripPlanSanitizer', () => {
  it('rozpoznaje lot do miejsca docelowego jako aktywnosc techniczna', () => {
    expect(
      isTravelToDestinationActivity(
        {
          name: 'Lot do Oslo',
          description: 'Przelot do miasta docelowego',
          category: 'transport',
          location: 'Lotnisko Oslo Gardermoen',
        },
        0,
        3
      )
    ).toBe(true);
  });

  it('nie usuwa zwyklej atrakcji z tekstem niezawierajacym dojazdu', () => {
    expect(
      isTravelToDestinationActivity(
        {
          name: 'Muzeum Muncha',
          description: 'Zwiedzanie galerii',
          category: 'atrakcja',
          location: 'Edvard Munchs Plass 1, Oslo',
        },
        0,
        3
      )
    ).toBe(false);
  });

  it('usuwa transport do celu z planu i przelicza koszty', () => {
    const plan = {
      destination: 'Oslo',
      estimatedTotalCost: 1200,
      days: [
        {
          day: 1,
          estimatedDayCost: 800,
          activities: [
            { name: 'Lot do Oslo', category: 'transport', estimatedCost: 500 },
            { name: 'Opera w Oslo', category: 'atrakcja', estimatedCost: 120 },
            { name: 'Kolacja', category: 'jedzenie', estimatedCost: 180 },
          ],
        },
      ],
    };

    const sanitized = removeTravelToDestinationActivities(plan);

    expect(sanitized.days[0].activities.map((activity) => activity.name)).toEqual([
      'Opera w Oslo',
      'Kolacja',
    ]);
    expect(sanitized.days[0].estimatedDayCost).toBe(300);
    expect(sanitized.estimatedTotalCost).toBe(300);
  });
});
