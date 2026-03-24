export default function QuestionCard({ question, options, selected, onSelect, index }) {
  return (
    <div className="question-card">
      <div className="question-number">Frage {index + 1}</div>
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
    </div>
  );
}
