export type Alert = {
  id: string;
  event: string;
  severity?: string;
  headline?: string;
  description?: string;
  instruction?: string;
  ends?: string;
  url?: string;
};

export type WeatherHour = {
  time: string;
  tempF?: number;
  precipitationChance?: number;
  windSpeedMph?: number;
  windGustMph?: number;
  windDirectionDeg?: number;
  windDirectionCardinal?: string;
  condition?: string;
};

export type WeatherSnapshot = {
  source: string;
  observedAt: string;
  airTempF?: number;
  windSpeedMph?: number;
  windGustMph?: number;
  windDirectionDeg?: number;
  windDirectionCardinal?: string;
  condition?: string;
  alerts?: Alert[];
  hourly?: WeatherHour[];
  marineSummary?: string;
};

export type TidePoint = { time: string; heightFt: number; type?: 'H' | 'L' };

export type TideData = {
  source: string;
  stationId: string;
  points: TidePoint[];
  extremes: TidePoint[];
  fetchedAt: string;
};

export type WaveObservation = {
  source: string;
  stationId?: string;
  observedAt: string;
  waveHeightFt?: number;
  dominantPeriodSec?: number;
  averagePeriodSec?: number;
  meanWaveDirectionDeg?: number;
  seaTempF?: number;
  windSpeedMph?: number;
  windDirectionDeg?: number;
  raw?: unknown;
};

export type MarineForecastHour = {
  time: string;
  waveHeightFt?: number;
  wavePeriodSec?: number;
  waveDirectionDeg?: number;
  swellHeightFt?: number;
  swellPeriodSec?: number;
  swellDirectionDeg?: number;
  windWaveHeightFt?: number;
};

export type MarineForecast = { source: string; fetchedAt: string; hourly: MarineForecastHour[] };
export type SourceHealth = { source: string; status: 'ok' | 'stale' | 'error' | 'missing'; lastUpdated?: string; message?: string };
export type Webcam = { name: string; location: string; url: string; embedUrl?: string; note: string };
export type ScoreResult = { score: number; label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Hazardous'; reasons: string[] };
export type Agreement = { label: string; status: 'good' | 'minor' | 'poor'; detail: string };
