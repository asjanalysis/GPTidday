export const metersToFeet = (value?: number) => value == null ? undefined : value * 3.28084;
export const msToMph = (value?: number) => value == null ? undefined : value * 2.23694;
export const celsiusToFahrenheit = (value?: number) => value == null ? undefined : value * 9 / 5 + 32;
export const kmhToMph = (value?: number) => value == null ? undefined : value * 0.621371;
export const knotsToMph = (value?: number) => value == null ? undefined : value * 1.15078;
export const round = (value?: number, digits = 0) => value == null ? undefined : Number(value.toFixed(digits));

const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export function degreesToCardinal(degrees?: number) {
  if (degrees == null || Number.isNaN(degrees)) return undefined;
  return directions[Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16];
}

export function cardinalToDegrees(cardinal?: string) {
  if (!cardinal) return undefined;
  const index = directions.indexOf(cardinal.toUpperCase());
  return index < 0 ? undefined : index * 22.5;
}
