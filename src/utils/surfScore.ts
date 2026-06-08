import type { ScoreResult } from '../types';

export type ScoreInputs = { waveHeightFt?: number; periodSec?: number; waveDirectionDeg?: number; windSpeedMph?: number; windDirectionDeg?: number; tideTrend?: 'rising' | 'falling' | 'unknown'; tideHeightFt?: number; hazards?: number; confidence?: 'high' | 'medium' | 'low'; stale?: boolean };

export function calculateSurfScore(input: ScoreInputs): ScoreResult {
  let score = 50;
  const reasons: string[] = [];
  if (input.waveHeightFt != null) {
    if (input.waveHeightFt >= 1.5 && input.waveHeightFt <= 5) { score += 12; reasons.push('+ Useful small-to-moderate swell'); }
    else if (input.waveHeightFt < 1) { score -= 12; reasons.push('− Very small surf'); }
    else if (input.waveHeightFt > 8) { score -= 18; reasons.push('− Oversized surf for Capitola'); }
  } else { score -= 8; reasons.push('− Wave height unavailable'); }
  if ((input.periodSec ?? 0) >= 10) { score += 10; reasons.push('+ Groundswell period'); }
  else if (input.periodSec != null) { score -= 8; reasons.push('− Short-period swell'); }
  if (input.windSpeedMph != null) {
    if (input.windSpeedMph <= 6) { score += 14; reasons.push('+ Light wind'); }
    else if (input.windSpeedMph >= 15) { score -= 18; reasons.push('− Strong wind'); }
    else if (input.windSpeedMph >= 10) { score -= 8; reasons.push('− Moderate wind'); }
  }
  if (input.windDirectionDeg != null && input.windSpeedMph != null && input.windSpeedMph > 4) {
    if (input.windDirectionDeg >= 225 && input.windDirectionDeg <= 330) { score -= 8; reasons.push('− Onshore west wind'); }
    else if (input.windDirectionDeg >= 15 && input.windDirectionDeg <= 120) { score += 5; reasons.push('+ Offshore/easterly wind'); }
  }
  if (input.tideTrend === 'rising') { score += 8; reasons.push('+ Rising tide'); }
  if (input.tideHeightFt != null && input.tideHeightFt >= 1.5 && input.tideHeightFt <= 4.5) { score += 6; reasons.push('+ Mid-tide window'); }
  else if (input.tideHeightFt != null && (input.tideHeightFt < 0 || input.tideHeightFt > 5.8)) { score -= 8; reasons.push('− Extreme tide'); }
  if ((input.hazards ?? 0) > 0) { score -= 40; reasons.unshift('− Active coastal hazard'); }
  if (input.stale) { score -= 12; reasons.push('− Buoy data older than 2 hours'); }
  if (input.confidence === 'low') { score -= 8; reasons.push('− Sources disagree'); }
  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  const label = bounded >= 85 ? 'Excellent' : bounded >= 70 ? 'Good' : bounded >= 50 ? 'Fair' : bounded >= 30 ? 'Poor' : 'Hazardous';
  return { score: bounded, label, reasons };
}
