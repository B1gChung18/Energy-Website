export default function Question({ question, options, selected, onSelect, onNext, onBack, isFirst, isLast }) {
  return (
    <div className="question-card">
      <h2 className="question-text">{question}</h2>
      <div className="options-list">
        {options.map((opt) => (
          <button
            key={opt.label}
            className={`option-btn ${selected?.label === opt.label ? 'selected' : ''}`}
            onClick={() => onSelect(opt)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="nav-buttons">
        {!isFirst && (
          <button className="nav-btn back-btn" onClick={onBack}>
            ← Zurück
          </button>
        )}
        <button
          className="nav-btn next-btn"
          onClick={onNext}
          disabled={!selected}
        >
          {isLast ? 'Ergebnis anzeigen →' : 'Weiter →'}
        </button>
      </div>
    </div>
  );
}
