import { AlertTriangle, CloudSun, Droplets, Navigation, RefreshCw, Thermometer, Waves, Wind } from 'lucide-react';
import type { ScoreResult, WaveObservation, WeatherSnapshot } from '../types';
import { degreesToCardinal } from '../utils/units';
import { formatDateTime } from '../utils/time';
import { Metric } from './Common';

type Props = { weather?: WeatherSnapshot; buoy?: WaveObservation; tideLabel: string; score: ScoreResult; refreshedAt?: string; loading: boolean; onRefresh: () => void };
export function Hero({ weather, buoy, tideLabel, score, refreshedAt, loading, onRefresh }: Props) {
  const hazards = weather?.alerts ?? [];
  const recommendation = hazards.length ? 'Active official alerts are in effect. Check the details below before approaching the water.' : score.score >= 70 ? 'Promising Capitola conditions. Light winds and the tide window are working in your favor.' : score.score >= 50 ? 'Rideable but mixed conditions. Check the live camera and wind trend before heading out.' : 'Marginal conditions right now. Consider waiting for a better tide or lighter wind window.';
  return <section className="hero">
    <nav><div className="brand"><div className="brand-mark"><Waves size={22}/></div><div><strong>CAPITOLA</strong><span>CONDITIONS</span></div></div><div className="nav-status"><span className="live-dot"/> Live public data</div></nav>
    {hazards.length > 0 && <div className="hazard-banner"><AlertTriangle/><div><strong>{hazards[0].event}</strong><span>{hazards[0].headline}</span></div></div>}
    <div className="hero-main">
      <div className="hero-copy"><div className="eyebrow light">CURRENT SNAPSHOT · CAPITOLA BEACH</div><div className="score-row"><div className={`score-badge score-${score.label.toLowerCase()}`}><strong>{score.score}</strong><span>{score.label}</span></div><div><h1>{weather?.condition ?? 'Reading the coast…'}</h1><p>{recommendation}</p></div></div></div>
      <div className="update-box"><span>Last refreshed</span><strong>{formatDateTime(refreshedAt)}</strong><button onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? 'spinning' : ''}/>{loading ? 'Updating' : 'Refresh data'}</button></div>
    </div>
    <div className="hero-metrics">
      <Metric label="Air" value={<><Thermometer size={18}/>{weather?.airTempF != null ? `${Math.round(weather.airTempF)}°` : '—'}</>} detail="Fahrenheit"/>
      <Metric label="Wind" value={<><Wind size={18}/>{weather?.windSpeedMph != null ? `${Math.round(weather.windSpeedMph)} mph` : '—'}</>} detail={weather?.windDirectionCardinal ?? degreesToCardinal(weather?.windDirectionDeg)}/>
      <Metric label="Tide" value={<><Droplets size={18}/>{tideLabel.split(' · ')[0]}</>} detail={tideLabel.split(' · ')[1]}/>
      <Metric label="Waves" value={<><Waves size={18}/>{buoy?.waveHeightFt != null ? `${buoy.waveHeightFt} ft` : '—'}</>} detail={buoy?.dominantPeriodSec ? `${buoy.dominantPeriodSec}s dominant` : undefined}/>
      <Metric label="Direction" value={<><Navigation size={18}/>{degreesToCardinal(buoy?.meanWaveDirectionDeg) ?? '—'}</>} detail={buoy?.meanWaveDirectionDeg ? `${buoy.meanWaveDirectionDeg}°` : undefined}/>
      <Metric label="Water" value={<><CloudSun size={18}/>{buoy?.seaTempF != null ? `${buoy.seaTempF}°` : '—'}</>} detail="Nearest buoy"/>
    </div>
  </section>;
}
