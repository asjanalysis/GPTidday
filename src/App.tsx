import { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ChevronDown, Dices, Menu, Search, Shuffle, Sparkles, X } from 'lucide-react';
import { Logo } from './components/Logo';
import { VideoCard } from './components/VideoCard';
import { VideoModal } from './components/VideoModal';
import { curatedVideos } from './data/curatedVideos';
import { loadManualVideos } from './sources/manualSource';
import type { SortOption, VideoItem } from './types';
import { filterAllowedVideos } from './utils/moderation';
import { categories, searchVideos, sortVideos } from './utils/video';

const allVideos = filterAllowedVideos(loadManualVideos(curatedVideos));
const randomize = () => [...allVideos].sort(() => Math.random() - .5).map((video) => video.id);

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<SortOption>('Weirdest');
  const [randomOrder, setRandomOrder] = useState(randomize);
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const videos = useMemo(() => {
    const filtered = category === 'All' ? allVideos : allVideos.filter((video) => video.categories.includes(category));
    return sortVideos(searchVideos(filtered, query), sort, randomOrder);
  }, [category, query, sort, randomOrder]);

  const enterWormhole = useCallback(() => {
    const pool = videos.length ? videos : allVideos;
    setSelected(pool[Math.floor(Math.random() * pool.length)]);
  }, [videos]);

  const changeSort = (next: SortOption) => {
    if (next === 'Random') setRandomOrder(randomize());
    setSort(next);
  };

  return <div id="top">
    <header className="site-header">
      <Logo/>
      <nav className={menuOpen ? 'nav-open' : ''} aria-label="Primary navigation">
        <a href="#feed">Feed</a><a href="#manifesto">What is this?</a><a href="#submit">Submit a find</a>
      </nav>
      <button className="menu-button" type="button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
      <button className="mini-portal" type="button" onClick={enterWormhole}><Shuffle size={14}/> Random portal</button>
    </header>

    <main>
      <section className="hero">
        <div className="hero-orbit orbit-one">WTF</div><div className="hero-orbit orbit-two">LOL</div><div className="hero-orbit orbit-three">???</div>
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={13}/> The internet's strangest video signal</span>
          <h1>YOUR BRAIN<br/>NEEDS <em>LESS</em><br/>CONTEXT.</h1>
          <p>Hand-picked funny, surreal, cringe, and deeply unnecessary videos from the stranger corners of the internet.</p>
          <button className="portal-button" type="button" onClick={enterWormhole}><span><Dices/>Enter the wormhole</span><small>Show me something stupid</small></button>
          <div className="trust-line"><i/><span>Curated by humans</span><i/><span>No autoplay. No brain rot algorithms.</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="tv">
            <div className="antenna"/><div className="screen"><div className="eye"><i/></div><div className="static"/></div>
            <div className="tv-controls"><i/><i/></div>
          </div>
          <div className="burst">TONIGHT<br/><strong>FOREVER</strong></div>
          <div className="hero-caption">LIVE FROM SOMEWHERE<br/>YOU SHOULDN'T BE</div>
        </div>
        <a className="scroll-cue" href="#feed">Descend into nonsense <ArrowDown size={14}/></a>
      </section>

      <section className="feed" id="feed">
        <div className="feed-heading"><div><span className="eyebrow">Today's transmissions</span><h2>THE WEIRD FEED</h2></div><p><strong>{allVideos.length}</strong> curator-approved anomalies. Updated whenever we recover.</p></div>
        <div className="controls">
          <label className="search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the void..." aria-label="Search videos"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button>}</label>
          <label className="sort">Sort signal<select value={sort} onChange={(event) => changeSort(event.target.value as SortOption)}>{(['Newest', 'Weirdest', 'Most Funny', 'Most WTF', 'Random'] as SortOption[]).map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15}/></label>
        </div>
        <div className="categories" aria-label="Video categories">{categories.map((item) => <button className={category === item ? 'active' : ''} type="button" key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>

        {videos.length > 0 ? <div className="video-grid">{videos.map((video, index) => <VideoCard key={video.id} video={video} onWatch={setSelected} feature={index === 0}/>)}</div> : <div className="empty-state">
          <div>∅</div><h3>No weirdness found.</h3><p>The void has standards. Try a different phrase or category.</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); }}>Reset the signal</button>
        </div>}
      </section>

      <section className="manifesto" id="manifesto">
        <span className="tape">A small note from the control room</span>
        <div><span className="eyebrow">Our highly scientific process</span><h2>HUMANS PICK.<br/><em>ROBOTS ORGANIZE.</em></h2></div>
        <p>ABSURD.TV is a curated index, not a rehosting service. Every clip keeps its source attribution and opens back to the original platform. Mature humor is welcome; explicit sexual content, gore, hate, harassment, dangerous challenges, and exploitation are not.</p>
      </section>
    </main>

    <footer id="submit"><Logo/><p>Curated absurdity for consenting grown-ups.<br/>Nothing here is owned by us unless explicitly stated.</p><div><a href="mailto:submit@absurd.tv">Submit a find</a><a href="mailto:moderation@absurd.tv">Report content</a></div><span>© 2026 ABSURD.TV · STAY WEIRD RESPONSIBLY</span></footer>
    <VideoModal video={selected} onClose={() => setSelected(null)}/>
  </div>;
}
