const canvas = document.querySelector('#visualizerCanvas');
const ctx = canvas.getContext('2d');
const input = document.querySelector('#soundcloudUrl');
const playButton = document.querySelector('#playButton');
const clock = document.querySelector('#clock');
let widget, playing = false, energy = .36, hue = 270, mode = 'nebula', orbit = .38, intensity = .72, elapsed = 0;

function resize() { const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2); canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
addEventListener('resize', resize); resize();

function draw(time) {
  const w = canvas.clientWidth, h = canvas.clientHeight, t = time * .00045 + elapsed * .002;
  ctx.clearRect(0, 0, w, h);
  const cx = w * (.54 + Math.sin(t * .34) * orbit * .05), cy = h * .51;
  const pulse = energy * intensity + Math.sin(t * 5.4) * .055 + .11;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .57);
  glow.addColorStop(0, `hsla(${hue}, 94%, 62%, ${.25 + pulse * .22})`); glow.addColorStop(.32, `hsla(${hue + 35}, 82%, 39%, .13)`); glow.addColorStop(1, 'rgba(5,3,11,0)'); ctx.fillStyle = glow; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(cx, cy);
  const rings = mode === 'tunnel' ? 46 : mode === 'prism' ? 17 : 30;
  for (let i = rings; i > 0; i--) {
    const z = i / rings, wave = Math.sin(t * 4 + i * .6) * pulse;
    let radius = (mode === 'tunnel' ? z * Math.min(w,h) * .68 : (1-z) * Math.min(w,h) * .54) + wave * 70;
    const alpha = (1-z) * .48;
    ctx.beginPath();
    if (mode === 'prism') { const sides = 6; for(let p=0;p<=sides;p++){ const a=p/sides*Math.PI*2+t*.3; const r=radius*(1+Math.sin(p*3+t)*pulse*.3); p?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r*.62):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.62); } }
    else { ctx.ellipse(Math.cos(t+i)*orbit*60, Math.sin(t*.7+i*.4)*orbit*30, radius, radius*(.35+z*.22), t*.2, 0, Math.PI*2); }
    ctx.strokeStyle = `hsla(${hue + i * 2.2}, 96%, ${58 + z*20}%, ${alpha})`; ctx.lineWidth = 1 + pulse * 2; ctx.stroke();
  }
  const dots = 105;
  for(let i=0;i<dots;i++){const a=i*2.4+t*(.8+i%4*.08), r=95+(i%17)*19+pulse*90; const x=Math.cos(a)*r, y=Math.sin(a)*r*.48; ctx.fillStyle=`hsla(${hue+80+i},100%,75%,${.15+(i%5)*.07})`;ctx.fillRect(x,y,1.5,1.5)}
  ctx.restore(); requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function formatTime(ms) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`; }
function setTrackInfo(data = {}) { document.querySelector('#trackTitle').textContent = data.title || 'Connected SoundCloud track'; document.querySelector('#trackArtist').textContent = data.user?.username || 'SoundCloud powered'; if(data.artwork_url){ const art=document.querySelector('#coverArt'); art.classList.remove('cover-default'); art.style.backgroundImage=`url(${data.artwork_url.replace('-large','-t300x300')})`; } }
function loadTrack(url) {
  const frame = document.querySelector('#soundcloudWidget'); frame.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  widget = SC.Widget(frame); widget.bind(SC.Widget.Events.READY, () => { widget.getCurrentSound(setTrackInfo); widget.play(); });
  widget.bind(SC.Widget.Events.PLAY, () => { playing=true; playButton.textContent='Ⅱ'; }); widget.bind(SC.Widget.Events.PAUSE, () => { playing=false; playButton.textContent='▶'; });
  widget.bind(SC.Widget.Events.PLAY_PROGRESS, e => { elapsed=e.currentPosition; energy=.38+Math.sin(e.currentPosition*.006)*.17+Math.sin(e.currentPosition*.018)*.1; clock.textContent=formatTime(e.currentPosition); });
}
document.querySelector('#trackForm').addEventListener('submit', e => { e.preventDefault(); loadTrack(input.value.trim()); });
playButton.addEventListener('click', () => { if (!widget) { input.focus(); return; } widget.toggle(); });
document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => { document.querySelector('.mode.active').classList.remove('active'); button.classList.add('active'); mode=button.dataset.mode; }));
document.querySelector('#intensity').addEventListener('input', e => { intensity=e.target.value/100; document.querySelector('#intensityValue').textContent=e.target.value; });
document.querySelector('#orbit').addEventListener('input', e => { orbit=e.target.value/100; document.querySelector('#orbitValue').textContent=e.target.value; });
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => { document.querySelector('.swatch.active').classList.remove('active'); button.classList.add('active'); hue=Number(button.dataset.hue); }));
document.querySelector('#fullscreenButton').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.visual-stage').requestFullscreen());
