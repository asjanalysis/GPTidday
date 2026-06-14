import { describe, expect, it } from 'vitest';
import { curatedVideos } from '../data/curatedVideos';
import { filterAllowedVideos, moderateVideo } from '../utils/moderation';
describe('moderation', () => {
  it('allows the reviewed seed catalog', () => expect(filterAllowedVideos(curatedVideos)).toHaveLength(curatedVideos.length));
  it('blocks prohibited signals', () => {
    expect(moderateVideo({ ...curatedVideos[0], title: 'Graphic gore compilation' }).allowed).toBe(false);
    expect(moderateVideo({ ...curatedVideos[0], moderationFlags: ['hate-extremism'] }).allowed).toBe(false);
  });
});
