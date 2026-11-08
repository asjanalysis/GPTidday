/* Run with node tests/browser.cjs. Uses Playwright and a system Chromium. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
    const data = await fs.readFile(file);res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}).end(data);
  } catch {res.writeHead(404).end();}
});
const widgetStub = `
window.__widgets=[];
const events={READY:'ready',PLAY:'play',PAUSE:'pause',PLAY_PROGRESS:'progress',FINISH:'finish',ERROR:'error'};
function Widget(frame){
 const handlers={};const url=new URL(frame.src).searchParams.get('url');
 const sounds=url.includes('/sets/')?[{title:'First track',duration:120000,permalink_url:'https://soundcloud.com/test/first',user:{username:'Test artist'}},{title:'Second track',duration:90000,permalink_url:'https://soundcloud.com/test/second',user:{username:'Test artist'}}]:[{title:url.includes('second')?'Second track':url.includes('first')?'First track':'Test track',duration:120000,permalink_url:url,user:{username:'Test artist'}}];
 const calls=[];
 const widget={handlers,calls,url,emit(name,data){handlers[name]?.(data)},bind(name,cb){handlers[name]=cb},unbind(name){delete handlers[name]},setVolume(n){calls.push(['volume',n])},play(){calls.push(['play']);handlers.play?.()},pause(){calls.push(['pause']);handlers.pause?.()},seekTo(n){calls.push(['seek',n]);handlers.progress?.({currentPosition:n})},getCurrentSound(cb){cb(sounds[0])},getSounds(cb){cb(sounds)},getDuration(cb){cb(sounds[0].duration)}};
 widget.sounds=sounds;window.__widgets.push(widget);
 if(url.includes('error'))setTimeout(()=>widget.emit('error'),30);
 else if(!url.includes('timeout'))setTimeout(()=>widget.emit('ready'),30);
 return widget;
}
Widget.Events=events;window.SC={Widget};
`;
let browser;
let passed = 0;
async function check(name, fn) {await fn();passed++;console.log('PASS', name);}
async function waitText(page, selector, text) {await page.waitForFunction(({s,t})=>document.querySelector(s)?.textContent.includes(t),{s:selector,t:text});}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await check('renderer runs without the old negative-radius exception',async()=>{
    await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frames)>24);
    assert.equal(await page.locator('#signalLabel').textContent(),'AMBIENT / NO AUDIO');
    const colors=await page.locator('canvas').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<data.length;i+=200)colors.add(data[i]+','+data[i+1]+','+data[i+2]);return colors.size;});
    assert.ok(colors>30,`Canvas should contain rendered geometry, got ${colors} colors`);
  });
  await check('invalid and deceptive URLs do not start a SoundCloud connection',async()=>{
    await page.fill('#soundcloudUrl','https://soundcloud.com.evil.test/artist/track');await page.click('#loadButton');await waitText(page,'#formStatus','Enter a SoundCloud');assert.equal(await page.locator('#queueCount').textContent(),'00');
  });
  await check('real synthesized audio plays through Web Audio and drives the analyzer',async()=>{
    await page.click('#demoButton');await waitText(page,'#signalLabel','LIVE / AUDIO ANALYSIS');
    await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.energy)>.05);
    await waitText(page,'#duration','0:32');assert.equal(await page.locator('#trackTitle').textContent(),'Afterglow');
    await page.waitForFunction(()=>document.querySelector('#currentTime').textContent!=='0:00');
  });
  await check('all visual presets render while real audio is playing',async()=>{
    for(const preset of ['spectrum','tunnel','scope','photon']){await page.click('[data-preset='+preset+']');assert.equal(await page.locator('[data-preset='+preset+']').getAttribute('aria-pressed'),'true');await page.waitForTimeout(250);}
    assert.deepEqual(errors,[]);
  });
  await check('seek, pause, resume, repeat, mute, and volume controls work',async()=>{
    await page.locator('#seek').fill('500');await page.locator('#seek').dispatchEvent('change');await waitText(page,'#currentTime','0:16');
    await page.click('#playButton');await waitText(page,'#signalLabel','PAUSED');
    await page.click('#playButton');await waitText(page,'#signalLabel','LIVE / AUDIO');
    await page.click('#repeatButton');assert.equal(await page.locator('#repeatButton').getAttribute('aria-pressed'),'true');
    await page.locator('#volume').fill('40');assert.equal(await page.locator('#volumeValue').textContent(),'40%');
    await page.click('#muteButton');assert.equal(await page.locator('#volumeValue').textContent(),'0%');
    await page.click('#muteButton');assert.equal(await page.locator('#volumeValue').textContent(),'40%');
    await page.locator('#seek').fill('990');await page.locator('#seek').dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelector('#currentTime').textContent==='0:00' && document.querySelector('#playButton').getAttribute('aria-label')==='Pause');
  });
  await check('local audio errors are visible, and filenames are rendered as text',async()=>{
    await page.setInputFiles('#fileInput',{name:'<img src=x onerror=alert(1)>.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('invalid audio')});
    await waitText(page,'#formStatus','could not be decoded');assert.equal(await page.locator('#queue img').count(),0);
    await page.getByRole('button',{name:'Remove <img src=x onerror=alert(1)>'}).click();
    await waitText(page,'#trackTitle','Afterglow');
  });
  await page.fill('#soundcloudUrl','');
  await page.screenshot({path:'/tmp/prism-desktop.png',fullPage:true});
  await check('settings persist and reset restores defaults',async()=>{
    await page.click('[data-palette=ember]');await page.locator('#intensity').fill('90');await page.reload();
    assert.equal(await page.locator('#paletteName').textContent(),'Ember');assert.equal(await page.locator('#intensityValue').textContent(),'90%');
    await page.click('#resetSettings');assert.equal(await page.locator('#paletteName').textContent(),'Aurora');assert.equal(await page.locator('#intensityValue').textContent(),'70%');
  });
  await check('mobile layout has no horizontal overflow and help is accessible',async()=>{
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.click('#helpButton');assert.equal(await page.locator('#helpDialog').evaluate(d=>d.open),true);await page.keyboard.press('Escape');
    await page.screenshot({path:'/tmp/prism-mobile.png',fullPage:true});
  });
  await page.setViewportSize({width:1440,height:1100});
  await check('blocked SoundCloud SDK gives a recoverable connection error',async()=>{
    await page.route('https://w.soundcloud.com/**',route=>route.abort());
    await page.fill('#soundcloudUrl','https://soundcloud.com/test/track');await page.click('#loadButton');await waitText(page,'#formStatus','could not connect');
    assert.equal(await page.locator('#playButton').isEnabled(),true);
    await page.unroute('https://w.soundcloud.com/**');
  });
  // Contract tests use a controlled substitute, not live SoundCloud playback.
  await page.route('https://w.soundcloud.com/player/api.js',route=>route.fulfill({contentType:'text/javascript',body:widgetStub}));
  await page.route('https://w.soundcloud.com/player/?*',route=>route.fulfill({contentType:'text/html',body:'<p>Test widget</p>'}));
  await check('official-widget contract: load, metadata, play, progress, seek and volume',async()=>{
    await page.click('#playButton');await waitText(page,'#trackTitle','Test track');await waitText(page,'#signalLabel','AMBIENT / SOUNDCLOUD');
    await page.evaluate(()=>window.__widgets.at(-1).emit('progress',{currentPosition:34000}));await waitText(page,'#currentTime','0:34');
    await page.locator('#seek').fill('500');await page.locator('#seek').dispatchEvent('change');
    assert.ok(await page.evaluate(()=>window.__widgets.at(-1).calls.some(c=>c[0]==='seek'&&c[1]===60000)));
    await page.locator('#volume').fill('23');assert.ok(await page.evaluate(()=>window.__widgets.at(-1).calls.some(c=>c[0]==='volume'&&c[1]===23)));
    assert.equal(await page.locator('#embedDetails').isVisible(),true);
  });
  await check('playlist expands into selectable tracks and next loads the second track',async()=>{
    await page.click('#clearQueue');await page.fill('#soundcloudUrl','https://soundcloud.com/test/sets/collection');await page.click('#loadButton');await waitText(page,'#queueCount','02');
    assert.equal(await page.locator('#trackTitle').textContent(),'First track');await page.click('#nextButton');await waitText(page,'#trackTitle','Second track');
    await page.evaluate(()=>window.__widgets.at(-1).emit('finish'));await waitText(page,'#formStatus','That’s a wrap');
  });
  await check('native SoundCloud playlist controls keep the app metadata and queue in sync',async()=>{
    await page.click('#clearQueue');await page.fill('#soundcloudUrl','https://soundcloud.com/test/sets/collection');await page.click('#loadButton');await waitText(page,'#queueCount','02');
    await page.evaluate(()=>{const w=window.__widgets.at(-1);w.sounds[0]=w.sounds[1];w.emit('play');});
    await waitText(page,'#trackTitle','Second track');
    assert.equal(await page.locator('.queue-track[aria-current=true] strong').textContent(),'Second track');
    // Restart the first track so the following stale-event check has two fresh widgets.
    await page.locator('#seek').fill('0');await page.locator('#seek').dispatchEvent('change');
    await page.click('#previousButton');await waitText(page,'#trackTitle','First track');
    await page.click('#nextButton');await waitText(page,'#trackTitle','Second track');
  });
  await check('stale callbacks from replaced widgets cannot overwrite a new selection',async()=>{
    await page.locator('#seek').fill('0');await page.locator('#seek').dispatchEvent('change');
    await page.click('#previousButton');await waitText(page,'#trackTitle','First track');
    await page.evaluate(()=>{window.__stale=window.__widgets.at(-1).handlers.error;});
    await page.click('#nextButton');await waitText(page,'#trackTitle','Second track');
    await page.evaluate(()=>window.__stale?.());assert.notEqual(await page.locator('#formStatus').getAttribute('data-state'),'error');
  });
  await check('widget errors stop playback and allow retries',async()=>{
    await page.fill('#soundcloudUrl','https://soundcloud.com/test/error');await page.click('#loadButton');await waitText(page,'#formStatus','cannot play');
    assert.equal(await page.locator('#playButton').getAttribute('aria-label'),'Retry playback');assert.equal(await page.locator('#seek').isDisabled(),true);
  });
  await check('canceling the browser audio picker leaves a recoverable ambient state',async()=>{
    await page.evaluate(()=>{navigator.mediaDevices.getDisplayMedia=async()=>{throw new DOMException('Canceled','NotAllowedError')};});
    await page.click('#captureButton');await waitText(page,'#formStatus','canceled or denied');
    assert.equal(await page.locator('#captureButton').isEnabled(),true);
    assert.ok((await page.locator('#signalLabel').textContent()).startsWith('AMBIENT'));
  });
  await check('tab capture without an audio track is rejected and all tracks stop',async()=>{
    await page.evaluate(()=>{
      window.__stopped=0;
      navigator.mediaDevices.getDisplayMedia=async()=>({getAudioTracks:()=>[],getTracks:()=>[{stop(){window.__stopped++}}]});
    });
    await page.click('#captureButton');await waitText(page,'#formStatus','No tab audio was shared');assert.equal(await page.evaluate(()=>window.__stopped),1);
  });
  await check('tab capture uses a real MediaStream analyzer and cleans up on disconnect',async()=>{
    await page.evaluate(()=>{
      window.__captureContext=new AudioContext();const osc=window.__captureContext.createOscillator();osc.frequency.value=140;
      const dest=window.__captureContext.createMediaStreamDestination();osc.connect(dest);osc.start();
      window.__captureStream=dest.stream;navigator.mediaDevices.getDisplayMedia=async()=>dest.stream;
    });
    await page.click('#captureButton');await waitText(page,'#signalLabel','LIVE / TAB AUDIO');
    await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.energy)>.1);
    await page.click('#captureButton');await waitText(page,'#signalLabel','AMBIENT');
    assert.equal(await page.evaluate(()=>window.__captureStream.getAudioTracks()[0].readyState),'ended');
    await page.evaluate(()=>window.__captureContext.close());
  });
  await check('browser stop-sharing events tear down the captured stream',async()=>{
    await page.evaluate(()=>{
      window.__captureContext=new AudioContext();const osc=window.__captureContext.createOscillator();
      const dest=window.__captureContext.createMediaStreamDestination();osc.connect(dest);osc.start();
      window.__captureStream=dest.stream;navigator.mediaDevices.getDisplayMedia=async()=>dest.stream;
    });
    await page.click('#captureButton');await waitText(page,'#signalLabel','LIVE / TAB AUDIO');
    await page.evaluate(()=>window.__captureStream.getAudioTracks()[0].dispatchEvent(new Event('ended')));
    await waitText(page,'#signalLabel','AMBIENT');
    assert.equal(await page.evaluate(()=>window.__captureStream.getAudioTracks()[0].readyState),'ended');
    await page.evaluate(()=>window.__captureContext.close());
  });
  await check('queue clear stops playback and leaves a clean idle state',async()=>{
    await page.click('#clearQueue');assert.equal(await page.locator('#queueCount').textContent(),'00');assert.equal(await page.locator('#playButton').isDisabled(),true);assert.equal(await page.locator('#embedHost iframe').count(),0);
    assert.deepEqual(errors,[]);
  });
  console.log(`${passed} browser checks passed. Live SoundCloud playback is not covered by the widget substitute.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
