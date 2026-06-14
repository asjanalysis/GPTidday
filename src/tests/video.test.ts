import { describe, expect, it } from 'vitest';
import { curatedVideos } from '../data/curatedVideos';
import { searchVideos, sortVideos } from '../utils/video';
describe('video discovery', () => {
  it('searches all useful metadata', () => {
    expect(searchVideos(curatedVideos, 'pigeon')).toHaveLength(1);
    expect(searchVideos(curatedVideos, 'animation').length).toBeGreaterThan(0);
    expect(searchVideos(curatedVideos, 'signal leak')).toHaveLength(1);
  });
  it('sorts by curation dimensions', () => {
    expect(sortVideos(curatedVideos, 'Most WTF')[0].wtfScore).toBe(97);
    expect(sortVideos(curatedVideos, 'Weirdest')[0].absurdScore).toBe(98);
  });
});
