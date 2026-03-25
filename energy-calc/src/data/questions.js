// 1. Gebäude & Verbrauch
export const QUESTION_DEFS = [
  {
    id: 'allg_stromverbrauch',
    question: 'Wie hoch ist Ihr allgemeiner Stromverbrauch?',
    type: 'number_or_unknown',
    unit: 'kWh',
    placeholder: 'z. B. 3000',
  },
  {
    id: 'allg_vorjahr',
    question: 'Was war Ihr Stromverbrauch im letzten Jahr?',
    type: 'number',
    unit: 'kWh',
    placeholder: 'z. B. 3000',
    parent: 'allg_stromverbrauch',
    parentValue: 'unbekannt',
  },
  {
    id: 'grundflaeche',
    question: 'Wie groß ist die Grundfläche Ihres Hauses?',
    type: 'number',
    unit: 'm²',
    placeholder: 'z. B. 120',
    hint: '40 – 300 m²',
  },
  {
    id: 'baujahr',
    question: 'Wann wurde Ihr Haus gebaut?',
    type: 'text',
    placeholder: 'z. B. 1985',
  },
  {
    id: 't_innen',
    question: 'Gewünschte Innentemperatur',
    type: 'slider',
    min: 16,
    max: 26,
    step: 1,
    defaultValue: 20,
    unit: '°C',
  },

  // 2. Wärmepumpe
  {
    id: 'hat_WP',
    question: 'Haben Sie eine Wärmepumpe?',
    type: 'yesno',
  },

  // 3. Wallbox / E-Auto
  {
    id: 'e_auto',
    question: 'Haben Sie ein Elektroauto / eine Wallbox?',
    type: 'yesno',
  },
  {
    id: 'km_jahr',
    question: 'Wie viele Kilometer fahren Sie jährlich?',
    type: 'number',
    unit: 'km / Jahr',
    placeholder: 'z. B. 15000',
    hint: '5.000 – 50.000 km',
    parent: 'e_auto',
  },
  {
    id: 'lade_beginn',
    question: 'Wann beginnen Sie das E-Auto zu laden?',
    type: 'slider',
    min: 0,
    max: 23,
    step: 1,
    defaultValue: 17,
    unit: ' Uhr',
    parent: 'e_auto',
  },
  {
    id: 'lade_dauer',
    question: 'Wie lange laden Sie das E-Auto?',
    type: 'number',
    unit: 'h',
    placeholder: 'z. B. 4',
    parent: 'e_auto',
  },

  // 4. PV-Anlage & Batteriespeicher
  {
    id: 'pv_anlage',
    question: 'Haben Sie eine PV-Anlage?',
    type: 'yesno',
  },
  {
    id: 'pv_flaeche',
    question: 'Wie groß ist die Fläche der PV-Anlage?',
    type: 'number',
    unit: 'm²',
    placeholder: 'z. B. 20',
    parent: 'pv_anlage',
  },
  {
    id: 'pv_ausrichtung',
    question: 'Wie ist die Ausrichtung Ihrer PV-Anlage?',
    type: 'slider',
    min: 0,
    max: 180,
    step: 10,
    defaultValue: 0,
    unit: '°',
    parent: 'pv_anlage',
  },
  {
    id: 'pv_winkel',
    question: 'Wie groß ist der Neigungswinkel Ihrer PV-Anlage?',
    type: 'slider',
    min: 0,
    max: 90,
    step: 10,
    defaultValue: 30,
    unit: '°',
    parent: 'pv_anlage',
  },
  {
    id: 'speicher',
    question: 'Haben Sie einen Batteriespeicher?',
    type: 'yesno',
  },
  {
    id: 'speicher_groesse',
    question: 'Wie groß ist Ihr Speicher (Kapazität)?',
    type: 'number',
    unit: 'kWh',
    placeholder: 'z. B. 10',
    parent: 'speicher',
  },
];

// All questions in display order
export const ALL_QUESTIONS = [...QUESTION_DEFS];
