import { fetchText } from '../../utils/cache';
import { parseNdbcText } from '../../utils/ndbcParser';

export { parseNdbcText } from '../../utils/ndbcParser';

export async function fetchBuoy(stationId: string, signal?: AbortSignal) {
  const text = await fetchText(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`, signal);
  return parseNdbcText(text, stationId);
}
