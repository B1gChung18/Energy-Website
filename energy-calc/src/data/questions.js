export const questions = [
  {
    id: 'residents',
    question: 'Wie viele Personen leben in Ihrem Haushalt?',
    options: [
      { label: '1 Person', value: 1500 },
      { label: '2 Personen', value: 2800 },
      { label: '4 Personen', value: 4500 },
    ],
  },
  {
    id: 'stories',
    question: 'Wie viele Stockwerke hat Ihr Zuhause?',
    options: [
      { label: '1 Stockwerk', value: 300 },
      { label: '2 Stockwerke', value: 600 },
      { label: '3 Stockwerke', value: 900 },
    ],
  },
  {
    id: 'ev',
    question: 'Besitzen Sie ein Elektrofahrzeug?',
    options: [
      { label: 'Ja', value: 2000 },
      { label: 'Nein', value: 0 },
    ],
  },
  {
    id: 'storage',
    question: 'Verfügen Sie über einen Stromspeicher?',
    options: [
      { label: 'Ja', value: -400 },
      { label: 'Nein', value: 0 },
    ],
  },
  {
    id: 'climate',
    question: 'Wie häufig nutzen Sie Klimatisierung oder Heizung aktiv?',
    options: [
      { label: 'Oft', value: 1500 },
      { label: 'Manchmal', value: 500 },
      { label: 'Nie', value: 0 },
    ],
  },
];

export const metricsTable = [
  {
    category: 'Haushaltsgröße',
    rows: [
      { option: '1 Person', kwh: 1.500 },
      { option: '2 Personen', kwh: 2.800 },
      { option: '4 Personen', kwh: 4.500 },
    ],
  },
  {
    category: 'Stockwerke',
    rows: [
      { option: '1 Stockwerk', kwh: 300 },
      { option: '2 Stockwerke', kwh: 600 },
      { option: '3 Stockwerke', kwh: 900 },
    ],
  },
  {
    category: 'Elektrofahrzeug',
    rows: [
      { option: 'Ja', kwh: 2000 },
      { option: 'Nein', kwh: 0 },
    ],
  },
  {
    category: 'Stromspeicher',
    rows: [
      { option: 'Ja', kwh: -400 },
      { option: 'Nein', kwh: 0 },
    ],
  },
  {
    category: 'Klimatisierung / Heizung',
    rows: [
      { option: 'Oft', kwh: 1500 },
      { option: 'Manchmal', kwh: 500 },
      { option: 'Nie', kwh: 0 },
    ],
  },
];
