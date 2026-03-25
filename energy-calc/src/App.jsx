import { useState } from 'react';
import { ALL_QUESTIONS } from './data/questions';
import Sidebar from './components/Sidebar';
import Results from './components/Results';
import './App.css';

function isVisible(q, formData) {
  if (!q.parent) return true;
  const expected = q.parentValue ?? 'ja';
  return formData[q.parent] === expected;
}

function isAnswered(q, formData) {
  if (q.type === 'slider') return true;
  if (q.type === 'number_or_unknown') {
    const val = formData[q.id];
    return val === 'unbekannt' || (val != null && val !== '');
  }
  const val = formData[q.id];
  return val != null && val !== '';
}

function sliderLabel(q, value) {
  if (q.id === 'pv_ausrichtung') {
    if (value === 0)   return 'Süd';
    if (value <= 45)   return 'Süd-West / Süd-Ost';
    if (value <= 90)   return 'West / Ost';
    if (value <= 135)  return 'Nord-West / Nord-Ost';
    return 'Nord';
  }
  return null;
}

export default function App() {
  const [formData, setFormData] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [enabledQuestions, setEnabledQuestions] = useState(
    new Set(ALL_QUESTIONS.map((q) => q.id))
  );

  // Derive annual consumption from Q1: direct value or fallback sub-question
  const rawConsumption = formData.allg_stromverbrauch;
  const jv = rawConsumption === 'unbekannt'
    ? (parseFloat(formData.allg_vorjahr) || 0)
    : (parseFloat(rawConsumption) || 0);

  function setAnswer(id, value) {
    setFormData((prev) => ({ ...prev, [id]: value }));
    setShowResults(false);
  }

  function toggleEnabled(id) {
    if (id === JAHRESVERBRAUCH_Q.id) return; // always required
    setEnabledQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Count only enabled + currently visible questions
  const countableQs = ALL_QUESTIONS.filter(
    (q) => enabledQuestions.has(q.id) && isVisible(q, formData)
  );
  const answeredCount = countableQs.filter((q) => isAnswered(q, formData)).length;
  const totalCount = countableQs.length;
  const allAnswered = answeredCount === totalCount && jv > 0;

  function handleCalculate() {
    setShowResults(true);
    setShowOptions(false);
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function handleReset() {
    setFormData({});
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Build question list with main-question numbering
  let mainCounter = 0;
  const questionItems = ALL_QUESTIONS.map((q) => {
    if (!q.parent) mainCounter++;
    return { q, mainIndex: q.parent ? null : mainCounter };
  });

  function renderQuestion({ q, mainIndex }) {
    if (!isVisible(q, formData)) return null;
    const isSubQ = !!q.parent;
    const isEnabled = enabledQuestions.has(q.id);

    return (
      <div
        key={q.id}
        className={`question-card${isSubQ ? ' sub-question-card' : ''}${!isEnabled ? ' question-disabled' : ''}`}
      >
        <div className="question-number">
          {isSubQ ? '→' : `Frage ${mainIndex}`}
        </div>
        <div className="question-text">{q.question}</div>

        {(q.type === 'number' || q.type === 'text') && (
          <div className="kwh-input-row">
            <input
              className="kwh-input"
              type={q.type === 'number' ? 'number' : 'text'}
              min={q.type === 'number' ? '0' : undefined}
              placeholder={q.placeholder || ''}
              value={formData[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
            />
            {q.unit && <span className="kwh-unit">{q.unit}</span>}
          </div>
        )}

        {q.type === 'number_or_unknown' && (() => {
          const isUnknown = formData[q.id] === 'unbekannt';
          return (
            <div className="kwh-input-row">
              <input
                className="kwh-input"
                type="number"
                min="0"
                placeholder={q.placeholder || ''}
                value={isUnknown ? '' : (formData[q.id] || '')}
                disabled={isUnknown}
                onChange={(e) => setAnswer(q.id, e.target.value)}
              />
              {q.unit && <span className="kwh-unit">{q.unit}</span>}
              <button
                className={`option-btn${isUnknown ? ' selected' : ''}`}
                style={{ marginLeft: '0.75rem' }}
                onClick={() => setAnswer(q.id, isUnknown ? '' : 'unbekannt')}
              >
                Unbekannt
              </button>
            </div>
          );
        })()}

        {q.type === 'slider' && (() => {
          const val = formData[q.id] !== undefined ? Number(formData[q.id]) : q.defaultValue;
          const label = sliderLabel(q, val);
          return (
            <div className="slider-wrapper">
              <div className="slider-value-row">
                <span className="slider-current-value">{val}{q.unit}</span>
                {label && <span className="slider-direction-label">{label}</span>}
              </div>
              <input
                className="slider-input"
                type="range"
                min={q.min}
                max={q.max}
                step={q.step}
                value={val}
                onChange={(e) => setAnswer(q.id, Number(e.target.value))}
              />
              <div className="slider-ticks">
                <span>{q.min}{q.unit}</span>
                <span>{q.max / 2}{q.unit}</span>
                <span>{q.max}{q.unit}</span>
              </div>
            </div>
          );
        })()}

        {q.type === 'yesno' && (
          <div className="options-list">
            {['ja', 'nein'].map((val) => (
              <button
                key={val}
                className={`option-btn${formData[q.id] === val ? ' selected' : ''}`}
                onClick={() => setAnswer(q.id, val)}
              >
                {val === 'ja' ? 'Ja' : 'Nein'}
              </button>
            ))}
          </div>
        )}

        {q.type === 'choice' && (
          <div className="options-list">
            {q.options.map((opt) => (
              <button
                key={opt}
                className={`option-btn${formData[q.id] === opt ? ' selected' : ''}`}
                onClick={() => setAnswer(q.id, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="header-logo">⚡</span>
          <h1 className="header-title">Energie Kalkulator</h1>
          <button
            className={`options-btn${showOptions ? ' options-btn-active' : ''}`}
            onClick={() => setShowOptions((v) => !v)}
          >
            ⚙ Optionen
          </button>
        </div>
      </header>

      {showOptions && (
        <div className="options-panel">
          <div className="options-panel-inner">
            <h3 className="options-title">Pflichtfragen konfigurieren</h3>
            <p className="options-desc">
              Deaktivierte Fragen werden nicht in der Gesamtzahl berücksichtigt und sind nicht erforderlich.
            </p>
            <ul className="options-list-items">
              {ALL_QUESTIONS.map((q) => (
                <li key={q.id} className="options-item">
                  <label className={`options-label${q.id === JAHRESVERBRAUCH_Q.id ? ' options-label-locked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={enabledQuestions.has(q.id)}
                      disabled={q.id === JAHRESVERBRAUCH_Q.id}
                      onChange={() => toggleEnabled(q.id)}
                    />
                    <span>{q.parent ? '→ ' : ''}{q.question}</span>
                    {q.id === JAHRESVERBRAUCH_Q.id && (
                      <span className="options-locked-badge">Pflichtfeld</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <main className="main">
        <div className="two-col">
          <div className="questions-col">
            <p className="questions-intro">
              Beantworten Sie die folgenden Fragen. Die Grafik rechts aktualisiert sich sobald
              Sie Ihren Jahresverbrauch eingeben.
            </p>

            {questionItems.map(renderQuestion)}

            <div className="calculate-bar">
              <span className="answered-count">
                {answeredCount} von {totalCount} Fragen beantwortet
              </span>
              <button
                className="calculate-btn"
                onClick={handleCalculate}
                disabled={!allAnswered}
              >
                Berechnen →
              </button>
            </div>
          </div>

          <div className="sidebar-col">
            <Sidebar jahresverbrauch={jv} />
          </div>
        </div>

        {showResults && (
          <div id="results-section" className="results-wrapper">
            <Results
              formData={formData}
              jahresverbrauch={jv}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Energie Kalkulator · Proof of Concept · 2026</p>
      </footer>
    </div>
  );
}
