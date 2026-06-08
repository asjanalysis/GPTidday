import type { CSSProperties } from 'react';
import { AlertTriangle, ArrowUpRight, Camera, CheckCircle2, CircleAlert, CloudRain, Compass, ExternalLink, ShieldCheck, ThermometerSun, Waves, Wind } from 'lucide-react';
import { BUOY_STATIONS } from './config';
import { webcams } from './data/sources/webcams';
import { useConditions } from './hooks/useConditions';
import type { MarineForecastHour } from './types';
import { waveAgreement, windAgreement } from './utils/agreement';
import { calculateSurfScore } from './utils/surfScore';
import { formatDateTime, formatTime, isStale, tidePhase } from './utils/time';
import { degreesToCardinal } from './utils/units';
import { Card, ErrorState, Metric, Skeleton } from './components/Common';
import { Hero } from './components/Hero';
import { SparkChart } from './components/SparkChart';

function nearestForecast(hours?: MarineForecastHour[]) {
  if (!hours?.length) return undefined;
  return hours.reduce((nearest, hour) => Math.abs(+new Date(hour.time) - Date.now()) < Math.abs(+new Date(nearest.time) - Date.now()) ? hour : nearest);
}

export default function App() {
  const { weather, tides, marine, buoys, health, loading, refreshedAt, refresh } = useConditions();
  const primaryBuoy = buoys.find(buoy => buoy.stationId === '46240') ?? buoys[0];
  const currentMarine = nearestForecast(marine?.hourly);
  const tide = tidePhase(tides?.points ?? []);
  const coastalHazards = weather?.alerts?.filter(alert => /surf|beach|coast|craft|marine|fog/i.test(alert.event)) ?? [];
  const waveCheck = waveAgreement(primaryBuoy, currentMarine);
  const confidence = waveCheck.status === 'good' ? 'high' : waveCheck.status === 'minor' ? 'medium' : 'low';
  const score = calculateSurfScore({ waveHeightFt: primaryBuoy?.waveHeightFt ?? currentMarine?.waveHeightFt, periodSec: primaryBuoy?.dominantPeriodSec ?? currentMarine?.wavePeriodSec, waveDirectionDeg: primaryBuoy?.meanWaveDirectionDeg ?? currentMarine?.waveDirectionDeg, windSpeedMph: weather?.windSpeedMph, windDirectionDeg: weather?.windDirectionDeg, tideTrend: tide.trend, tideHeightFt: tide.currentHeightFt, hazards: coastalHazards.length, confidence, stale: isStale(primaryBuoy?.observedAt) });
  const nextHigh = tides?.extremes.find(point => point.type === 'H' && +new Date(point.time) > Date.now());
  const nextLow = tides?.extremes.find(point => point.type === 'L' && +new Date(point.time) > Date.now());
  const forecastHours = marine?.hourly.filter(hour => +new Date(hour.time) >= Date.now() - 3_600_000).slice(0, 24) ?? [];
  const weatherHours = weather?.hourly?.filter(hour => +new Date(hour.time) >= Date.now() - 3_600_000).slice(0, 12) ?? [];

  return <>
    <main>
      <Hero weather={weather} buoy={primaryBuoy} tideLabel={tide.label} score={score} refreshedAt={refreshedAt} loading={loading} onRefresh={refresh}/>

      <div className="dashboard intro-grid">
        <Card title="Today at a glance" eyebrow="LOCAL READ" className="glance-card">
          <div className="glance-copy"><span className={`quality-pill ${score.label.toLowerCase()}`}>{score.label} · {score.score}/100</span><h3>{score.score >= 70 ? 'Worth a closer look.' : score.score >= 50 ? 'A mixed bag today.' : 'Probably a pass right now.'}</h3><p>{score.reasons.slice(0, 3).join('  ')}</p></div>
          <div className="score-ring" style={{ '--score': score.score } as CSSProperties}><div><strong>{score.score}</strong><span>surf score</span></div></div>
        </Card>
        <Card title="Next tide turns" eyebrow="SANTA CRUZ · 9413745" source="NOAA CO-OPS" updated={tides?.fetchedAt}>
          {loading && !tides ? <Skeleton rows={2}/> : !tides ? <ErrorState message="Tide predictions could not be loaded. Other cards remain live."/> : <div className="turns"><div><span className="tide-icon high">H</span><div><strong>{nextHigh?.heightFt.toFixed(1) ?? '—'} ft</strong><span>High · {formatTime(nextHigh?.time)}</span></div></div><div><span className="tide-icon low">L</span><div><strong>{nextLow?.heightFt.toFixed(1) ?? '—'} ft</strong><span>Low · {formatTime(nextLow?.time)}</span></div></div></div>}
        </Card>
        <Card title="Source confidence" eyebrow="LIVE CROSS-CHECK">
          <div className={`confidence confidence-${confidence}`}><ShieldCheck/><div><strong>{confidence[0].toUpperCase()+confidence.slice(1)} confidence</strong><span>{waveCheck.status === 'good' ? 'Observed and modeled conditions align.' : waveCheck.status === 'minor' ? 'Sources show a manageable difference.' : 'Use the live camera and official forecast.'}</span></div></div>
          <div className="health-dots">{health.map(item => <span key={item.source} className={item.status} title={`${item.source}: ${item.status}`}/>)}</div>
        </Card>
      </div>

      <div className="section-heading"><div><span className="eyebrow">WHAT THE WATER IS DOING</span><h2>Ocean & tide</h2></div><p>Observations and models shown side-by-side—not blended into false precision.</p></div>
      <div className="dashboard ocean-grid">
        <Card title="Tide curve" eyebrow="TODAY + TOMORROW" source="NOAA CO-OPS · Station 9413745" updated={tides?.fetchedAt} className="wide-card">
          {loading && !tides ? <Skeleton rows={4}/> : !tides ? <ErrorState message="NOAA tide predictions are temporarily unavailable."/> : <>
            <div className="panel-stats"><Metric label="Now" value={tide.currentHeightFt != null ? `${tide.currentHeightFt.toFixed(1)} ft` : '—'} detail={tide.trend}/><Metric label="Next high" value={nextHigh ? `${nextHigh.heightFt.toFixed(1)} ft` : '—'} detail={formatTime(nextHigh?.time)}/><Metric label="Next low" value={nextLow ? `${nextLow.heightFt.toFixed(1)} ft` : '—'} detail={formatTime(nextLow?.time)}/></div>
            <SparkChart data={tides.points.slice(0, 72).map(point => ({ x: formatTime(point.time, { hour: 'numeric' }), y: point.heightFt }))} unit=" ft" />
            <div className="legend"><span><i className="legend-line tide-line"/> Predicted tide</span><span className="window-note">Best local read: incoming toward mid tide</span></div>
            <div className="tide-table">{tides.extremes.slice(0, 8).map(point => <div key={point.time}><span className={`tide-icon ${point.type === 'H' ? 'high' : 'low'}`}>{point.type}</span><div><strong>{point.heightFt.toFixed(1)} ft</strong><span>{formatDateTime(point.time)}</span></div></div>)}</div>
          </>}
        </Card>

        <Card title="Buoy observations" eyebrow="MONTEREY BAY NETWORK" source="NOAA NDBC" updated={primaryBuoy?.observedAt}>
          {loading && !buoys.length ? <Skeleton rows={5}/> : !buoys.length ? <ErrorState message="All selected NDBC buoy feeds are unavailable. Model data is still shown separately."/> : <div className="buoy-list">{BUOY_STATIONS.map(station => { const buoy = buoys.find(item => item.stationId === station.id); return <div className={`buoy-row ${!buoy ? 'unavailable' : ''}`} key={station.id}><div className="buoy-name"><span className={`status-dot ${buoy ? isStale(buoy.observedAt) ? 'stale' : 'ok' : 'error'}`}/><div><strong>{station.id}</strong><span>{station.name}</span></div></div>{buoy ? <div className="buoy-read"><strong>{buoy.waveHeightFt ?? '—'} ft <small>@</small> {buoy.dominantPeriodSec ?? '—'}s</strong><span>{degreesToCardinal(buoy.meanWaveDirectionDeg) ?? '—'} · Water {buoy.seaTempF ?? '—'}°F</span></div> : <span className="muted">Unavailable</span>}</div>})}</div>}
          <a className="text-link" href="https://www.ndbc.noaa.gov/station_page.php?station=46240" target="_blank" rel="noreferrer">Open official station page <ArrowUpRight size={14}/></a>
        </Card>

        <Card title="Marine model" eyebrow="HOURLY COMPARISON" source="Open-Meteo Marine" updated={marine?.fetchedAt}>
          {loading && !marine ? <Skeleton rows={4}/> : !marine ? <ErrorState message="Marine model forecast is unavailable."/> : <><div className="marine-now"><Metric label="Combined waves" value={`${currentMarine?.waveHeightFt ?? '—'} ft`} detail={`${currentMarine?.wavePeriodSec ?? '—'}s · ${degreesToCardinal(currentMarine?.waveDirectionDeg) ?? '—'}`}/><Metric label="Primary swell" value={`${currentMarine?.swellHeightFt ?? '—'} ft`} detail={`${currentMarine?.swellPeriodSec ?? '—'}s · ${degreesToCardinal(currentMarine?.swellDirectionDeg) ?? '—'}`}/><Metric label="Wind wave" value={`${currentMarine?.windWaveHeightFt ?? '—'} ft`} detail="modeled"/></div><SparkChart data={forecastHours.map(hour => ({ x: formatTime(hour.time), y: hour.waveHeightFt, secondary: hour.swellHeightFt }))} unit=" ft"/><div className="legend"><span><i className="legend-line wave-line"/> Combined</span><span><i className="legend-line swell-line"/> Primary swell</span></div></>}
        </Card>
      </div>

      <div className="section-heading"><div><span className="eyebrow">SKY & WIND</span><h2>Weather windows</h2></div><p>Official point forecast and active alerts from the National Weather Service.</p></div>
      <div className="dashboard weather-grid">
        <Card title="12-hour weather" eyebrow="CAPITOLA POINT FORECAST" source="National Weather Service" updated={weather?.observedAt} className="wide-card">
          {loading && !weather ? <Skeleton rows={4}/> : !weather ? <ErrorState message="The NWS point forecast is temporarily unavailable."/> : <><div className="hourly-strip">{weatherHours.map((hour, index) => <div className={index === 0 ? 'now' : ''} key={hour.time}><span>{index === 0 ? 'Now' : formatTime(hour.time, { minute: undefined })}</span>{/rain|shower/i.test(hour.condition ?? '') ? <CloudRain/> : <ThermometerSun/>}<strong>{hour.tempF?.toFixed(0)}°</strong><small><Wind size={12}/>{hour.windSpeedMph ?? '—'} mph</small><small>{hour.precipitationChance ?? 0}% rain</small></div>)}</div><div className="forecast-summary"><Compass/><div><strong>Official outlook</strong><p>{weather.marineSummary}</p></div></div></>}
        </Card>
        <Card title="Official alerts" eyebrow={coastalHazards.length ? 'ACTION MAY BE NEEDED' : 'NO ACTIVE COASTAL HAZARDS'} source="NWS Alerts">
          {coastalHazards.length ? <div className="alert-list">{coastalHazards.map(alert => <div key={alert.id}><CircleAlert/><div><strong>{alert.event}</strong><p>{alert.headline ?? alert.description?.slice(0, 150)}</p>{alert.url && <a href={alert.url} target="_blank" rel="noreferrer">Official details <ExternalLink size={12}/></a>}</div></div>)}</div> : <div className="all-clear"><CheckCircle2/><div><strong>No active coastal alerts found</strong><p>Continue to watch posted warnings and changing local conditions.</p></div></div>}
        </Card>
      </div>

      <div className="section-heading"><div><span className="eyebrow">SEE IT FOR YOURSELF</span><h2>Live Capitola cameras</h2></div><p>Official camera pages open in a new tab when providers do not permit embedding.</p></div>
      <div className="dashboard camera-grid">{webcams.map((camera, index) => <article className="camera-card" key={camera.url}><div className={`camera-preview camera-${index+1}`}><div className="camera-overlay"><span><span className="live-dot"/> PUBLIC CAMERA</span><Camera size={42}/><p>Live embed unavailable</p></div></div><div className="camera-body"><div><span className="eyebrow">{camera.location}</span><h3>{camera.name}</h3><p>{camera.note}</p></div><a className="primary-button" href={camera.url} target="_blank" rel="noreferrer">Open live camera <ExternalLink size={15}/></a></div></article>)}</div>

      <div className="section-heading"><div><span className="eyebrow">TRANSPARENT, NOT MAGIC</span><h2>Score & source agreement</h2></div><p>Every recommendation exposes the observations, assumptions, and confidence behind it.</p></div>
      <div className="dashboard trust-grid">
        <Card title="Why this score" eyebrow={`${score.score} / 100 · ${score.label}`}>
          <div className="reason-list">{score.reasons.map(reason => <div key={reason} className={reason.startsWith('+') ? 'positive' : 'negative'}><span>{reason.slice(0,1)}</span>{reason.slice(2)}</div>)}</div>
          <p className="fine-print">This local heuristic favors light/offshore wind, useful swell period, and an incoming mid tide. It penalizes hazards, stale sources, strong onshore wind, and extreme tides.</p>
        </Card>
        <Card title="Source agreement" eyebrow="INDEPENDENT CROSS-CHECK" className="wide-card">
          <div className="agreement-list">{[waveCheck, windAgreement(weather, primaryBuoy), { label: 'Tide phase', status: tides ? 'good' as const : 'poor' as const, detail: tides ? `NOAA predictions indicate a ${tide.trend} tide near ${tide.currentHeightFt?.toFixed(1)} ft.` : 'Tide phase cannot be calculated without NOAA predictions.' }].map(item => <div key={item.label}><span className={`agreement-mark ${item.status}`}/><div><strong>{item.label}</strong><p>{item.detail}</p></div><span className={`agreement-label ${item.status}`}>{item.status === 'good' ? 'Agree' : item.status === 'minor' ? 'Mixed' : 'Check'}</span></div>)}</div>
        </Card>
        <Card title="Data health" eyebrow="SOURCE-BY-SOURCE">
          <div className="source-health">{health.map(item => <div key={item.source}><span className={`status-dot ${item.status}`}/><div><strong>{item.source}</strong><span>{item.message ?? (item.lastUpdated ? formatDateTime(item.lastUpdated) : item.status)}</span></div></div>)}</div>
        </Card>
      </div>

      <div className="section-heading"><div><span className="eyebrow">PLAN THE NEXT 24 HOURS</span><h2>Forecast timeline</h2></div><p>Modeled surf opportunity by hour. Scroll horizontally on mobile.</p></div>
      <div className="timeline-wrap"><div className="timeline">{forecastHours.map(hour => { const matchingWeather = weather?.hourly?.find(item => Math.abs(+new Date(item.time) - +new Date(hour.time)) < 1_800_000); const matchingTide = tides?.points.reduce((nearest, point) => Math.abs(+new Date(point.time)-+new Date(hour.time)) < Math.abs(+new Date(nearest.time)-+new Date(hour.time)) ? point : nearest, tides.points[0]); const hourlyScore = calculateSurfScore({ waveHeightFt: hour.waveHeightFt, periodSec: hour.wavePeriodSec, waveDirectionDeg: hour.waveDirectionDeg, windSpeedMph: matchingWeather?.windSpeedMph, windDirectionDeg: matchingWeather?.windDirectionDeg, tideHeightFt: matchingTide?.heightFt, hazards: coastalHazards.length, confidence }); return <div className={`timeline-hour ${hourlyScore.score >= 70 ? 'best' : ''}`} key={hour.time}><div className="timeline-top"><span>{formatTime(hour.time, { minute: undefined })}</span><strong>{hourlyScore.score}</strong></div><div className="mini-score"><i style={{ width: `${hourlyScore.score}%` }}/></div><dl><div><dt>Wave</dt><dd>{hour.waveHeightFt ?? '—'} ft</dd></div><div><dt>Period</dt><dd>{hour.wavePeriodSec ?? '—'}s</dd></div><div><dt>Wind</dt><dd>{matchingWeather?.windSpeedMph ?? '—'} mph</dd></div><div><dt>Tide</dt><dd>{matchingTide?.heightFt.toFixed(1) ?? '—'} ft</dd></div></dl>{hourlyScore.score >= 70 && <span className="best-label">BEST WINDOW</span>}</div>})}</div></div>

      <section className="safety"><AlertTriangle/><div><strong>Ocean safety comes first</strong><p>This dashboard is informational only. Conditions can change quickly. Check official forecasts, posted beach warnings, lifeguards, and your own skill level before entering the ocean.</p></div><div className="safety-links"><a href="https://www.weather.gov/mtr/" target="_blank" rel="noreferrer">NWS Bay Area</a><a href="https://www.ndbc.noaa.gov/" target="_blank" rel="noreferrer">NOAA Buoys</a></div></section>
    </main>
    <footer className="site-footer"><div className="brand footer-brand"><div className="brand-mark"><Waves size={19}/></div><div><strong>CAPITOLA</strong><span>CONDITIONS</span></div></div><p>Data from NOAA/NWS, NOAA CO-OPS, NOAA/NDBC, Open-Meteo, and public webcam providers. This site is not affiliated with those organizations.</p><span>Built for a better beach check.</span></footer>
  </>;
}
