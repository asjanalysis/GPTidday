export function WeirdnessMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  return <div className={`meter ${compact ? 'meter-compact' : ''}`} aria-label={`Absurdity index ${score} out of 100`}>
    <div className="meter-label"><span>{compact ? 'WEIRD' : 'ABSURDITY INDEX'}</span><strong>{score}</strong></div>
    <div className="meter-track"><i style={{ width: `${score}%` }}/><span style={{ left: `${score}%` }}/></div>
  </div>;
}
