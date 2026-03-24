import { useState } from 'react';
import { questions } from './data/questions';
import QuestionCard from './components/QuestionCard';
import Sidebar from './components/Sidebar';
import Results from './components/Results';
import EnergyCalc from './components/EnergyCalc';
import './App.css';

export default function App() {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;

  function handleSelect(questionId, opt) {
    setAnswers((prev) => ({ ...prev, [questionId]: opt }));
    setShowResults(false);
  }

  function handleCalculate() {
    setShowResults(true);
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function handleReset() {
    setAnswers({});
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="header-logo">⚡</span>
          <h1 className="header-title">Energie Kalkulator</h1>
        </div>
      </header>

      <main className="main">
        <div className="two-col">
          {/* Left: Questions */}
          <div className="questions-col">
            <p className="questions-intro">
              Beantworten Sie die folgenden Fragen, um Ihren geschätzten Jahresstromverbrauch
              zu berechnen. Die Grafik rechts aktualisiert sich in Echtzeit.
            </p>
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                index={i}
                question={q.question}
                options={q.options}
                selected={answers[q.id] || null}
                onSelect={(opt) => handleSelect(q.id, opt)}
              />
            ))}

            <div className="calculate-bar">
              <span className="answered-count">
                {answeredCount} von {questions.length} Fragen beantwortet
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

          {/* Right: Sticky Sidebar */}
          <div className="sidebar-col">
            <Sidebar answers={answers} />
          </div>
        </div>

        {/* Results */}
        {showResults && (
          <div id="results-section" className="results-wrapper">
            <Results answers={answers} onReset={handleReset} />
          </div>
        )}
      </main>

      <EnergyCalc />

      <footer className="footer">
        <p>Energie Kalkulator · Proof of Concept · 2026</p>
      </footer>
    </div>
  );
}
