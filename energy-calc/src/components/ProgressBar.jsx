export default function ProgressBar({ current, total }) {
  return (
    <div className="progress-container">
      <div className="progress-dots">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`progress-dot ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}
          />
        ))}
      </div>
      <span className="progress-label">
        {current + 1} / {total}
      </span>
    </div>
  );
}
