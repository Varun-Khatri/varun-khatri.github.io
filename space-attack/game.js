(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const screenContent = document.getElementById('screenContent');
  const scoreEl = document.getElementById('score');
  const waveEl = document.getElementById('wave');
  const livesEl = document.getElementById('lives');
  const weaponHud = document.getElementById('weaponHud');
  const weaponNameEl = document.getElementById('weaponName');
  const weaponMeter = document.getElementById('weaponMeter');
  const callout = document.getElementById('waveCallout');
  const soundToggle = document.getElementById('soundToggle');
  const pauseToggle = document.getElementById('pauseToggle');
  const W = 960, H = 540;
  let scale = 1, dpr = 1, lastTime = 0, state = 'start', score = 0, wave = 1, lives = 3;
  let transitionTimer = 0, fireCooldown = 0, enemyShotTimer = 1, shake = 0, muted = false, audio = null, waveProfile, gameOverTimer = null, resumeState = 'playing';
  const keys = new Set();
  let player, enemies = [], playerShots = [], enemyShots = [], pickups = [], particles = [], stars = [];
  let nextEnemyId = 0;
  const weapons = {
    pulse:{name:'PULSE',cooldown:.19,speed:570,color:'#68fff2',duration:0},
    spread:{name:'SPREAD',cooldown:.28,speed:530,color:'#64f5c2',duration:17},
    orbit:{name:'ORBIT',cooldown:.36,speed:450,color:'#d684ff',duration:15},
    lance:{name:'LANCE',cooldown:.42,speed:760,color:'#ff766e',duration:13}
  };
  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width*dpr); canvas.height = Math.round(rect.height*dpr);
    scale = canvas.width/W; ctx.setTransform(scale,0,0,scale,0,0);
  }
  window.addEventListener('resize', resize); resize();

  function sound(freq, duration=.07, type='sine', volume=.035, slide=0) {
    if (muted) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc=audio.createOscillator(), gain=audio.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,audio.currentTime);
      if(slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),audio.currentTime+duration);
      gain.gain.setValueAtTime(volume,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime+duration);
    } catch (_) { /* Audio is an optional enhancement. */ }
  }
  soundToggle.addEventListener('click',()=>{muted=!muted;soundToggle.innerHTML=muted?'♫ <span>SOUND OFF</span>':'♫ <span>SOUND ON</span>';if(!muted)sound(520,.06);});
  pauseToggle.addEventListener('click',()=>state==='paused'?resumeGame():pauseGame());

  function initStars(){ stars=Array.from({length:115},()=>({x:rand(0,W),y:rand(0,H),z:rand(.25,1),r:rand(.45,1.7),phase:rand(0,6)})); }
  initStars();
  function resetGame(){
    if(gameOverTimer!==null){clearTimeout(gameOverTimer);gameOverTimer=null;}
    score=0;wave=1;lives=3;transitionTimer=0;fireCooldown=0;enemyShotTimer=1;shake=0;
    player={x:W/2,y:H-66,w:34,h:35,speed:390,invuln:0,weapon:weapons.pulse,weaponTimer:0,weaponDuration:0};
    enemies=[];playerShots=[];enemyShots=[];pickups=[];particles=[];nextEnemyId=0; updateHud(); startWave(1,false);
  }
  function updateHud(){scoreEl.textContent=String(score).padStart(6,'0');waveEl.textContent=String(wave).padStart(2,'0');livesEl.innerHTML='';for(let i=0;i<3;i++){const p=document.createElement('i');p.className='life-pip'+(i>=lives?' off':'');livesEl.appendChild(p);}const gun=player?.weapon||weapons.pulse;weaponNameEl.textContent=gun.name;weaponHud.className=`weapon-hud ${gun.name.toLowerCase()}`;weaponMeter.style.transform=`scaleX(${gun===weapons.pulse?1:clamp(player.weaponTimer/player.weaponDuration,0,1)})`;}
  function updatePauseButton(){pauseToggle.hidden=!['playing','transition','paused'].includes(state);pauseToggle.textContent=state==='paused'?'▶ RESUME':'Ⅱ PAUSE';pauseToggle.setAttribute('aria-label',state==='paused'?'Resume game':'Pause game');}
  function pauseGame(){if(state!=='playing'&&state!=='transition')return;resumeState=state;state='paused';keys.clear();overlay.classList.remove('hidden');screenContent.innerHTML=`<div class="eyebrow">✦ &nbsp; SYSTEMS ON HOLD &nbsp; ✦</div><h1 class="title">GAME<br><em>PAUSED</em></h1><p class="subtitle">Take a breath, pilot.</p><div class="menu-actions"><button class="primary-btn" id="resumeBtn">RESUME &nbsp; ▶</button><button class="secondary-btn" id="pauseRestartBtn">RESTART &nbsp; ↻</button><button class="secondary-btn" id="pauseMenuBtn">BACK TO MENU</button></div><div class="key-hint">PRESS P OR ESC TO RESUME</div>`;document.getElementById('resumeBtn').onclick=resumeGame;document.getElementById('pauseRestartBtn').onclick=startGame;document.getElementById('pauseMenuBtn').onclick=returnToMenu;updatePauseButton();}
  function resumeGame(){if(state!=='paused')return;state=resumeState;overlay.classList.add('hidden');updatePauseButton();}
  function showStart(){state='start';updatePauseButton();overlay.classList.remove('hidden');screenContent.innerHTML=`<div class="eyebrow">✦ &nbsp; INCOMING TRANSMISSION &nbsp; ✦</div><h1 class="title">SPACE<br><em>ATTACK</em></h1><p class="subtitle">Defend the galaxy. Survive the waves.</p><div class="controls-card"><div><strong>MOVE</strong><span>A / D &nbsp; or &nbsp; ← / →</span></div><div><strong>FIRE</strong><span>SPACEBAR</span></div><div><strong>PAUSE / RESUME</strong><span>P / ESC or <b class="pause-chip">Ⅱ PAUSE</b></span></div></div><button class="primary-btn" id="startBtn">START GAME &nbsp; ▶</button><div class="key-hint">PRESS ENTER OR SPACE TO LAUNCH</div>`;document.getElementById('startBtn').onclick=startGame;}
  function showGameOver(){gameOverTimer=null;if(state!=='over')return;updatePauseButton();overlay.classList.remove('hidden');screenContent.innerHTML=`<div class="eyebrow">✦ &nbsp; FLIGHT RECORDER &nbsp; ✦</div><h1 class="title gameover-title">GAME<br>OVER</h1><div class="results"><div>FINAL SCORE<strong>${String(score).padStart(6,'0')}</strong></div><div>WAVE REACHED<strong>${String(wave).padStart(2,'0')}</strong></div></div><div class="menu-actions"><button class="primary-btn" id="restartBtn">RESTART &nbsp; ↻</button><button class="secondary-btn" id="gameOverMenuBtn">BACK TO MENU</button></div><div class="key-hint">PRESS ENTER OR CLICK RESTART</div>`;document.getElementById('restartBtn').onclick=startGame;document.getElementById('gameOverMenuBtn').onclick=returnToMenu;sound(180,.38,'sawtooth',.06,-120);}
  function returnToMenu(){if(gameOverTimer!==null){clearTimeout(gameOverTimer);gameOverTimer=null;}score=0;wave=1;lives=3;transitionTimer=0;fireCooldown=0;enemyShotTimer=1;shake=0;player={x:W/2,y:H-66,w:34,h:35,speed:390,invuln:0,weapon:weapons.pulse,weaponTimer:0,weaponDuration:0};enemies=[];playerShots=[];enemyShots=[];pickups=[];particles=[];state='start';updateHud();showStart();}
  function startGame(){if(gameOverTimer!==null){clearTimeout(gameOverTimer);gameOverTimer=null;}resetGame();state='playing';updatePauseButton();overlay.classList.add('hidden');sound(440,.09,'triangle',.04,220);showCallout('WAVE 1','INCOMING');}
  function showCallout(title,sub=''){callout.innerHTML=`<small>${sub}</small>${title}`;callout.classList.remove('show');void callout.offsetWidth;callout.classList.add('show');}
  function progression(n){
    // Six-wave rise and fall, with a gentle campaign lift each cycle.
    const phase=(n-1)%6, cycle=Math.floor((n-1)/6);
    const curve=[.16,.34,.62,.92,.70,.38][phase];
    return {phase,cycle,intensity:Math.min(1,curve+cycle*.045),count:Math.round(7+curve*10+Math.min(cycle,4)),duration:Math.round(19-curve*6)};
  }
  function chooseEnemyType(profile){
    const pool=['drone'];
    if(wave>=2)pool.push('weaver');
    if(wave>=3&&profile.intensity>.45)pool.push('dart');
    if(wave>=4&&profile.intensity>.6)pool.push('ace');
    if(wave>=7&&profile.intensity>.45)pool.push('bulwark');
    if(wave>=10&&profile.intensity>.7)pool.push('prism');
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function startWave(n,announce=true){
    wave=n;waveProfile=progression(n);enemyShotTimer=1.35-waveProfile.intensity*.35;
    const count=waveProfile.count, cols=Math.min(5+Math.floor(waveProfile.intensity*3),8),gapX=75,gapY=52,startX=(W-(cols-1)*gapX)/2;
    for(let i=0;i<count;i++){
      const r=Math.floor(i/cols),c=i%cols,type=chooseEnemyType(waveProfile),
        hard=['ace','bulwark','prism'].includes(type),fast=['weaver','dart','prism'].includes(type),
        gun=type==='weaver'?'fan':type==='dart'?'spiral':type==='bulwark'?'ring':type==='prism'?'cross':type==='ace'?'burst':'aimed';
      const baseX=startX+c*gapX+(r%2?gapX*.5:0);
      enemies.push({id:nextEnemyId++,x:baseX+rand(-6,6),y:62+r*gapY,w:hard?36:30,h:28,type,hp:hard?2:1,phase:rand(0,6),baseX:clamp(baseX,35,W-35),amp:fast?rand(27,61):rand(8,24),speed:(24+waveProfile.intensity*30+(fast?18:0)+waveProfile.cycle*2),gun,shotPhase:rand(0,6)});
    }
    if(announce){showCallout(`WAVE ${String(n).padStart(2,'0')}`,'SECTOR CLEARED');sound(600,.22,'triangle',.05,380);}updateHud();
  }

  function burst(x,y,color,count=14,power=1){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(35,190)*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.75),max:.75,size:rand(1,3.5),color});}}
  function fire(){
    if(fireCooldown>0)return;const gun=player.weapon||weapons.pulse;fireCooldown=gun.cooldown;
    const add=(angle,extra={})=>playerShots.push({x:player.x,y:player.y-21,vx:Math.sin(angle)*gun.speed,vy:-Math.cos(angle)*gun.speed,r:gun===weapons.lance?5:4,color:gun.color,hitIds:[],...extra});
    if(gun===weapons.spread){[-.24,0,.24].forEach(a=>add(a));}
    else if(gun===weapons.orbit){[-.35,-.17,0,.17,.35].forEach(a=>add(a));}
    else add(0,{pierce:gun===weapons.lance,maxHits:3});
    particles.push({x:player.x,y:player.y-22,vx:rand(-16,16),vy:-65,life:.13,max:.13,size:3,color:gun.color});sound(720,.045,'square',.018,-330);
  }
  function fireEnemy(e){
    const dx=player.x-e.x,dy=player.y-e.y,base=Math.atan2(dx,dy),speed=142+waveProfile.intensity*58;
    const add=(angle,velocity=speed)=>enemyShots.push({x:e.x,y:e.y+12,vx:Math.sin(angle)*velocity,vy:Math.cos(angle)*velocity,r:4,kind:e.gun,spin:0});
    if(e.gun==='fan'){[-.34,0,.34].forEach(a=>add(base+a));}
    else if(e.gun==='burst'){[-.2,-.1,0,.1,.2].forEach(a=>add(base+a,speed*.9));}
    else if(e.gun==='ring'){for(let i=0;i<7;i++)add((Math.PI*2*i/7)+e.shotPhase,speed*.73);}
    else if(e.gun==='cross'){[-.22,0,.22].forEach(a=>add(base+a));add(base+Math.PI/2,speed*.8);}
    else if(e.gun==='spiral'){add(e.shotPhase,speed*.88);e.shotPhase+=.8;}
    else add(base);
  }
  function maybeDrop(e){
    let kind;
    if(lives<3&&Math.random()<.11+waveProfile.intensity*.06)kind='heart';
    else {const chance=.09+waveProfile.intensity*.12+(e.type==='prism'?.16:0);if(Math.random()>chance)return;const list=wave>=8?['spread','orbit','lance']:wave>=4?['spread','orbit']:['spread'];kind=list[Math.floor(Math.random()*list.length)];}
    pickups.push({x:e.x,y:e.y,vy:78+waveProfile.intensity*28,kind,phase:rand(0,6)});
  }
  function hitPlayer(){if(player.invuln>0)return;lives--;player.invuln=1.5;shake=9;burst(player.x,player.y,'#ff587f',23,1.15);sound(130,.24,'sawtooth',.07,-85);updateHud();if(lives<=0){state='over';updatePauseButton();if(gameOverTimer!==null)clearTimeout(gameOverTimer);gameOverTimer=setTimeout(showGameOver,450);}}
  function circleRect(cx,cy,r,rect){const x=clamp(cx,rect.x-rect.w/2,rect.x+rect.w/2),y=clamp(cy,rect.y-rect.h/2,rect.y+rect.h/2);return (cx-x)**2+(cy-y)**2<r*r;}
  function update(dt){
    if(state==='paused')return;
    for(const s of stars){s.y+=(18+s.z*44)*dt;if(s.y>H){s.y=0;s.x=rand(0,W);}}
    if(state==='transition'){
      transitionTimer-=dt;
      if(transitionTimer<=0){state='playing';startWave(wave,false);}
      return;
    }
    if(state!=='playing')return;
    if(player.invuln>0)player.invuln-=dt;fireCooldown=Math.max(0,fireCooldown-dt);
    let dir=(keys.has('ArrowRight')||keys.has('d')||keys.has('D')?1:0)-(keys.has('ArrowLeft')||keys.has('a')||keys.has('A')?1:0);player.x=clamp(player.x+dir*player.speed*dt,25,W-25);
    if(keys.has(' ')||keys.has('Space'))fire();
    if(player.weapon!==weapons.pulse){player.weaponTimer-=dt;if(player.weaponTimer<=0){player.weapon=weapons.pulse;player.weaponTimer=0;player.weaponDuration=0;showCallout('PULSE RESTORED','WEAPON EXPIRED');}}
    for(let i=playerShots.length-1;i>=0;i--){const b=playerShots[i];b.x+=(b.vx||0)*dt;b.y+=b.vy*dt;if(b.y<-10||b.x<-10||b.x>W+10){playerShots.splice(i,1);continue;}for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if((!b.hitIds||!b.hitIds.includes(e.id))&&circleRect(b.x,b.y,b.r,e)){if(b.hitIds)b.hitIds.push(e.id);e.hp--;if(e.hp<=0){score+=e.type==='prism'?300:e.type==='bulwark'||e.type==='ace'?250:e.type==='dart'?175:e.type==='weaver'?125:100;burst(e.x,e.y,e.type==='prism'?'#ff87e8':e.type==='bulwark'?'#ffb45b':e.type==='weaver'?'#d684ff':'#ff628c',e.type==='prism'?26:15,1);maybeDrop(e);enemies.splice(j,1);sound(340,.11,'triangle',.035,260);shake=Math.max(shake,2);}else burst(b.x,b.y,'#ffcd76',5,.45);if(!b.pierce||b.hitIds.length>=b.maxHits){playerShots.splice(i,1);break;}}}}
    for(const e of enemies){e.phase+=dt*(1.2+waveProfile.intensity*.7);e.y+=e.speed*dt;e.x=e.baseX+Math.sin(e.phase)*e.amp;if(e.y>H-90&&Math.abs(e.x-player.x)<32&&e.y<player.y+30)hitPlayer();}
    for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.y+=p.vy*dt;p.phase+=dt*4;p.x+=Math.sin(p.phase)*24*dt;if(p.y>H+15){pickups.splice(i,1);continue;}if(circleRect(p.x,p.y,11,player)){pickups.splice(i,1);if(p.kind==='heart'){lives=Math.min(3,lives+1);showCallout('HULL RESTORED','+1 INTEGRITY');sound(920,.16,'sine',.05,260);}else{player.weapon=weapons[p.kind];player.weaponDuration=waveProfile.duration;player.weaponTimer=player.weaponDuration;showCallout(`${player.weapon.name} ACQUIRED`,'TEMPORARY WEAPON');sound(760,.18,'triangle',.05,380);}updateHud();}}
    enemyShotTimer-=dt;if(enemyShotTimer<=0&&enemies.length){const eligible=enemies.filter(e=>e.y>30&&e.y<H*.73);if(eligible.length)fireEnemy(eligible[Math.floor(Math.random()*eligible.length)]);enemyShotTimer=rand(1.9-waveProfile.intensity*.7,2.8-waveProfile.intensity*.75);}
    for(let i=enemyShots.length-1;i>=0;i--){const b=enemyShots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y>H+12||b.x<-12||b.x>W+12){enemyShots.splice(i,1);continue;}if(player.invuln<=0&&circleRect(b.x,b.y,b.r,player)){enemyShots.splice(i,1);hitPlayer();}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.18,dt);p.vy*=Math.pow(.18,dt);p.life-=dt;if(p.life<=0)particles.splice(i,1);}
    if(enemies.some(e=>e.y>H-28)){hitPlayer();for(let i=enemies.length-1;i>=0;i--)if(enemies[i].y>H-28)enemies.splice(i,1);}
    if(state==='playing'&&!enemies.length){
      // A wave boundary is a clean slate for every projectile and temporary weapon.
      state='transition';playerShots.length=0;enemyShots.length=0;pickups.length=0;
      player.weapon=weapons.pulse;player.weaponTimer=0;player.weaponDuration=0;fireCooldown=0;
      transitionTimer=1.7;wave++;updateHud();showCallout(`WAVE ${String(wave).padStart(2,'0')}`,'SECTOR CLEARED');sound(530,.28,'triangle',.05,500);
    }
    shake=Math.max(0,shake-dt*24);updateHud();
  }

  function drawShip(x,y,playerShip,type='drone',flash=false){ctx.save();ctx.translate(x,y);if(playerShip){ctx.shadowBlur=20;ctx.shadowColor='#58f8ff';ctx.fillStyle=flash?'#fff':'#b5fdff';ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(18,14);ctx.lineTo(6,10);ctx.lineTo(0,16);ctx.lineTo(-6,10);ctx.lineTo(-18,14);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#18768e';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(5,7);ctx.lineTo(-5,7);ctx.closePath();ctx.fill();ctx.fillStyle='#ffb85c';ctx.globalAlpha=.8+Math.random()*.2;ctx.beginPath();ctx.moveTo(-5,13);ctx.lineTo(0,24+rand(0,7));ctx.lineTo(5,13);ctx.fill();}else{let color=type==='ace'?'#ffb45b':type==='scout'?'#d684ff':'#ff648e';ctx.shadowBlur=14;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();if(type==='ace'){ctx.moveTo(0,18);ctx.lineTo(-20,2);ctx.lineTo(-12,-11);ctx.lineTo(0,-6);ctx.lineTo(12,-11);ctx.lineTo(20,2);}else{ctx.moveTo(0,17);ctx.lineTo(-17,5);ctx.lineTo(-12,-8);ctx.lineTo(-5,-4);ctx.lineTo(0,-15);ctx.lineTo(5,-4);ctx.lineTo(12,-8);ctx.lineTo(17,5);}ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#1a233a';ctx.fillRect(-4,-3,8,4);ctx.fillStyle='#fff0c8';ctx.fillRect(-2,-3,4,2);}ctx.restore();}
  function render(){ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(shake>0&&state==='playing')ctx.translate(rand(-shake,shake),rand(-shake,shake));
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#080d1c');bg.addColorStop(.62,'#0b1022');bg.addColorStop(1,'#10152a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    for(const s of stars){ctx.globalAlpha=.35+s.z*.6;ctx.fillStyle=s.z>.8?'#aafcff':'#849bc5';ctx.fillRect(s.x,s.y,s.r,s.r*(1+s.z));}ctx.globalAlpha=1;
    ctx.strokeStyle='#52e9ee0d';ctx.lineWidth=1;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(const e of enemies){drawShip(e.x,e.y,false,e.type);if(e.hp>1){ctx.fillStyle='#ffb45b';ctx.fillRect(e.x-11,e.y-21,22,2);}}
    for(const b of playerShots){ctx.shadowBlur=12;ctx.shadowColor=b.color||'#67fff2';ctx.fillStyle=b.color||'#bdfff8';if(b.pierce){ctx.fillRect(b.x-2,b.y-12,4,23);}else{ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vx||0,-b.vy));ctx.fillRect(-2,-8,4,16);ctx.restore();}}ctx.shadowBlur=0;
    for(const b of enemyShots){const color=b.kind==='ring'?'#ffd166':b.kind==='spiral'?'#c586ff':b.kind==='cross'?'#6cf7c9':'#ff4d91';ctx.shadowBlur=12;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff8';ctx.beginPath();ctx.moveTo(b.x,b.y-6);ctx.lineTo(b.x,b.y+6);ctx.stroke();}ctx.shadowBlur=0;
    for(const p of pickups){const color=p.kind==='heart'?'#ff668c':weapons[p.kind].color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.kind==='heart'?Math.sin(p.phase)*.12:p.phase*.35);ctx.shadowBlur=17;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;if(p.kind==='heart'){ctx.beginPath();ctx.moveTo(0,10);ctx.bezierCurveTo(-17,0,-11,-10,-4,-8);ctx.bezierCurveTo(0,-7,0,-3,0,-3);ctx.bezierCurveTo(0,-3,2,-8,7,-8);ctx.bezierCurveTo(17,-8,15,2,0,10);ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(10,0);ctx.lineTo(0,12);ctx.lineTo(-10,0);ctx.closePath();ctx.stroke();ctx.fillRect(-2,-2,4,4);}ctx.restore();}ctx.shadowBlur=0;
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.shadowBlur=7;ctx.shadowColor=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(player&&state!=='start'&&state!=='over'&&!(player.invuln>0&&Math.floor(performance.now()/80)%2===0))drawShip(player.x,player.y,true,'',false);
    ctx.restore();
  }
  function loop(t){const dt=Math.min((t-lastTime)/1000||0,.033);lastTime=t;update(dt);render();requestAnimationFrame(loop);}
  function onKey(e){if(['ArrowLeft','ArrowRight',' ','Space','ArrowUp','ArrowDown','Escape'].includes(e.key))e.preventDefault();keys.add(e.key);if((e.key==='p'||e.key==='P'||e.key==='Escape')&&state==='paused'){resumeGame();return;}if((e.key==='p'||e.key==='P'||e.key==='Escape')&&(state==='playing'||state==='transition')){pauseGame();return;}if(e.key==='Enter'&&(state==='start'||state==='over'))startGame();if((e.key===' '||e.key==='Space')&&state==='start')startGame();}
  function offKey(e){keys.delete(e.key);}
  window.addEventListener('keydown',onKey);window.addEventListener('keyup',offKey);
  resetGame();showStart();requestAnimationFrame(loop);
})();
