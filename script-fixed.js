/* Study Master Challenge - fixed script (script-fixed.js)
   Replaces script.js for stable admin login, student join, and robust behavior.
   Update firebaseConfig values as needed.
*/
(function(){
  // CONFIG
  const GAME_ID = 'default-game';
  const QUESTION_TIME = 20;
  const TOTAL_QUESTIONS = 10;
  const firebaseConfig = {
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME",
    databaseURL: "https://hashii-caf12-default-rtdb.firebaseio.com/",
    projectId: "REPLACE_ME",
    storageBucket: "REPLACE_ME",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME"
  };

  // QUESTIONS (same as before)
  const QUESTIONS = [
    { q: "Exam is in 5 days. What should you do first?", correct: "Make a clear study timetable", options: ["Start cramming all night","Make a clear study timetable","Only study the hardest topic","Wait until the last day to start"], stage: "Time Management" },
    { q: "Best place to study?", correct: "Quiet place with minimal distractions", options: ["In a crowded cafe with loud music","Quiet place with minimal distractions","Only when you're watching videos","On your bed while lying down"], stage: "Avoid Distractions" },
    { q: "Best way to remember lessons?", correct: "Active recall + practice questions", options: ["Only re-reading notes","Active recall + practice questions","Highlight everything in textbooks","Memorize by hearing music"], stage: "Smart Study Methods" },
    { q: "Study session timing?", correct: "25–50 minutes with short breaks", options: ["25–50 minutes with short breaks","Study for 6 hours straight","Study 1 minute each topic","All-night sessions only"], stage: "Time Management" },
    { q: "Phone usage while studying?", correct: "Keep it away or turn it off", options: ["Keep it away or turn it off","Check every notification","Use social media for breaks every 2 minutes","Never charge your phone while studying"], stage: "Avoid Distractions" },
    { q: "Before exam day?", correct: "Revise important notes", options: ["Memorize new chapters last minute","Revise important notes","Try new study methods the same day","Skip sleep for full revision"], stage: "Revision" },
    { q: "Night before exam?", correct: "Revise lightly and sleep well", options: ["Pull an all-nighter","Practice only new topics","Revise lightly and sleep well","Skip breakfast and rush to exam"], stage: "Exam Day Tips" },
    { q: "Don’t understand a lesson?", correct: "Ask teacher/friends + practice", options: ["Ignore it and hope for the best","Ask teacher/friends + practice","Only watch videos without practicing","Avoid the topic permanently"], stage: "Smart Study Methods" },
    { q: "Time management method?", correct: "Make a clear study timetable", options: ["Rely completely on luck","Make a clear study timetable","Study randomly without plan","Study when you feel like it only"], stage: "Time Management" },
    { q: "During exam?", correct: "Read carefully + manage time properly", options: ["Guess all answers quickly","Read carefully + manage time properly","Spend all time on first question","Panic and skip questions"], stage: "Exam Day Tips" }
  ];

  // STATE
  let appFirebase, db;
  let playerId = localStorage.getItem('sm-playerId') || null;
  let playerName = localStorage.getItem('sm-playerName') || null;
  let myLocal = { score: 0, totalTime: 0, answers: {} };
  let players = {};
  let gameMeta = null;
  let tickInterval = null;

  // DOM helpers
  const $ = s => document.querySelector(s);
  const show = sel => { document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active')); document.querySelector(sel).classList.add('active'); };
  const toast = (t, ms=2500) => { const el=$('#toast'); el.textContent=t; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), ms); };

  // Seeded shuffle for per-player option order
  function seededShuffle(arr, seed) {
    const a = arr.slice(); let h = 2166136261 >>> 0;
    for (let i=0;i<seed.length;i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
    for (let i=a.length-1;i>0;i--) {
      h = Math.imul(h ^ (i+1), 16777619) >>> 0;
      const r = (h & 0xffffffff) / 0xFFFFFFFF;
      const j = Math.floor(r * (i+1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Audio
  const AudioMgr = (()=>{ try{ const C=new (window.AudioContext||window.webkitAudioContext)(); return { correct:()=>{const o=C.createOscillator(); const g=C.createGain(); o.type='sine'; o.frequency.value=880; g.gain.value=0.06; o.connect(g); g.connect(C.destination); o.start(); o.stop(C.currentTime+0.12); }, wrong:()=>{const o=C.createOscillator(); const g=C.createGain(); o.type='sawtooth'; o.frequency.value=220; g.gain.value=0.06; o.connect(g); g.connect(C.destination); o.start(); o.stop(C.currentTime+0.18); } }; }catch(e){ return { correct:()=>{}, wrong:()=>{} }; } })();

  // Firebase init
  function initFirebase(){
    try{ appFirebase = firebase.initializeApp(firebaseConfig); db = firebase.database(); }
    catch(e){ console.warn('Firebase init failed', e); toast('Firebase init failed - check config'); }
  }

  // Realtime refs
  const playersRef = () => db.ref(`games/${GAME_ID}/players`);
  const metaRef = () => db.ref(`games/${GAME_ID}/meta`);

  function uid(){ return 'p_' + Math.random().toString(36).slice(2,10); }
  function now(){ return Date.now(); }

  // Presence helper
  function setPresence(payload){ if(!db || !playerId) return; const ref = db.ref(`games/${GAME_ID}/players/${playerId}`); ref.set(payload); try{ ref.onDisconnect().update({ connected:false, lastSeen: now() }); }catch(e){} }

  // Write local state to DB
  function writeMyState(){ if(!playerId || !db) return; const p={ id:playerId, name:playerName, score: myLocal.score||0, totalTime: myLocal.totalTime||0, lastSeen: now(), connected:true }; db.ref(`games/${GAME_ID}/players/${playerId}`).update(p); }

  // Render players & leaderboard
  function renderPlayers(){ const list = $('#players-list'); list.innerHTML=''; const arr = Object.values(players).sort((a,b)=> (b.score||0)-(a.score||0) || (a.totalTime||0)-(b.totalTime||0)); arr.forEach(p=>{ const li=document.createElement('li'); li.innerHTML=`<span>${p.name||'—'}</span><small class="muted">${p.connected? 'Online':'Offline'}</small>`; list.appendChild(li); }); $('#players-count').textContent = `${arr.length} player${arr.length===1? '':'s'}`; renderLeaderboard(arr,'#leaderboard tbody'); renderLeaderboard(arr,'#final-leaderboard tbody'); }
  function renderLeaderboard(arr, selector){ const tbody = document.querySelector(selector); if(!tbody) return; tbody.innerHTML=''; arr.forEach((p,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${i+1}</td><td>${p.name}</td><td>${p.score||0}</td><td>${Math.round(p.totalTime||0)}</td>`; tbody.appendChild(tr); }); }

  // Attach DB listeners
  function attachListeners(){ if(!db) return; playersRef().on('value', snap=>{ players = snap.val() || {}; // normalize to object list
    // convert nested to map
    const normalized = {};
    Object.entries(players).forEach(([k,v])=> normalized[k]=Object.assign({id:k}, v)); players = normalized;
    renderPlayers(); updateMyRank(); });
    metaRef().on('value', snap=>{ gameMeta = snap.val(); if(!gameMeta){ metaRef().set({ status: 'lobby' }); return; } if(gameMeta.status==='playing'){ if(document.querySelector('.screen.active').id!=='game-screen') show('#game-screen'); startLoop(); } else if(gameMeta.status==='ended'){ stopLoop(); show('#result-screen'); computeResults(); } else { stopLoop(); show('#lobby-screen'); } }); }

  // Game loop
  function startLoop(){ stopLoop(); tickInterval = setInterval(tick, 250); tick(); }
  function stopLoop(){ if(tickInterval) { clearInterval(tickInterval); tickInterval=null; } }

  function currentIndex(){ if(!gameMeta||!gameMeta.startTime) return -1; const elapsed = Math.floor((Date.now()-gameMeta.startTime)/1000); return Math.min(TOTAL_QUESTIONS-1, Math.floor(elapsed/QUESTION_TIME)); }
  function timeLeft(){ if(!gameMeta||!gameMeta.startTime) return QUESTION_TIME; const elapsed = Math.floor((Date.now()-gameMeta.startTime)/1000); return Math.max(0, QUESTION_TIME - (elapsed % QUESTION_TIME)); }

  function tick(){ if(!gameMeta || gameMeta.status!=='playing') return; const idx = currentIndex(); const q = QUESTIONS[idx]; if(!q){ metaRef().update({ status: 'ended', endTime: now() }); return; }
    $('#question-stage').textContent = `${q.stage} • Q ${idx+1}/${TOTAL_QUESTIONS}`;
    $('#question-text').textContent = q.q;
    const seed = (playerId||'') + '|' + idx;
    const options = seededShuffle(q.options, seed);
    renderOptions(options, q.correct, idx);
    $('#timer').textContent = timeLeft(); const pct = ((QUESTION_TIME - timeLeft())/QUESTION_TIME)*100; $('#progress-bar').style.width = `${pct}%`;
  }

  function renderOptions(options, correct, qIndex){ const el = $('#options'); el.innerHTML=''; const answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); const myAns = answers[qIndex]; options.forEach(opt=>{ const d=document.createElement('div'); d.className='option'; d.textContent = opt; if(myAns){ if(opt===correct) d.classList.add('correct'); if(myAns.answer===opt && opt!==correct) d.classList.add('wrong'); } else { d.addEventListener('click', ()=> submitAnswer(qIndex,opt,correct)); } el.appendChild(d); }); }

  function submitAnswer(qIndex, selected, correct){ const start = gameMeta.startTime + qIndex*QUESTION_TIME*1000; const t = Math.max(0, Math.round((Date.now()-start)/1000)); const correctAns = selected===correct; myLocal.score = (myLocal.score||0) + (correctAns?10:-5); myLocal.totalTime = (myLocal.totalTime||0) + Math.min(t, QUESTION_TIME); const answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); answers[qIndex] = { answer:selected, time:t, correct: correctAns }; localStorage.setItem('sm-answers', JSON.stringify(answers)); writeMyState(); if(correctAns) { AudioMgr.correct(); $('#feedback').textContent='Correct! +10'; } else { AudioMgr.wrong(); $('#feedback').textContent=`Wrong -5. Correct: ${QUESTIONS[qIndex].correct}`; }
  }

  function writeMyState(){ if(!playerId || !db) return; const payload = { id:playerId, name:playerName, score: myLocal.score||0, totalTime: myLocal.totalTime||0, lastSeen: now(), connected: true }; db.ref(`games/${GAME_ID}/players/${playerId}`).update(payload); localStorage.setItem('sm-score', String(myLocal.score||0)); localStorage.setItem('sm-totalTime', String(myLocal.totalTime||0)); }

  function updateMyRank(){ const arr = Object.values(players).sort((a,b)=> (b.score||0)-(a.score||0) || (a.totalTime||0)-(b.totalTime||0)); const idx = arr.findIndex(p=>p.id===playerId); $('#rank').textContent = idx>=0? `#${idx+1}`:'# -'; $('#my-score').textContent = `Score: ${myLocal.score||0}`; }

  // Timeout handling when user refreshes - apply penalties for unanswered questions between last handled and current index
  function applyTimeouts(){ const last = parseInt(localStorage.getItem('sm-lastHandled')||'-1',10); const idx = currentIndex(); const answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); for(let s=last+1;s<idx;s++){ if(!answers[s]){ myLocal.score = (myLocal.score||0)-5; myLocal.totalTime = (myLocal.totalTime||0)+QUESTION_TIME; answers[s]={ answer:null, timedOut:true, time:QUESTION_TIME, correct:false }; } } localStorage.setItem('sm-answers', JSON.stringify(answers)); localStorage.setItem('sm-lastHandled', String(Math.max(-1, idx-1))); writeMyState(); }

  // Admin functions
  function openAdmin(){ $('#admin-modal').classList.remove('hidden'); $('#admin-user').value=''; $('#admin-pass').value=''; $('#admin-user').focus(); }
  function closeAdmin(){ $('#admin-modal').classList.add('hidden'); }
  function performAdminLogin(){ const u = $('#admin-user').value.trim(); const p = $('#admin-pass').value; if(u==='Admin' && p==='harshi'){ localStorage.setItem('sm-admin','1'); $('#admin-panel').classList.remove('hidden'); $('#admin-user').classList.add('hidden'); $('#admin-pass').classList.add('hidden'); $('#admin-login-btn').classList.add('hidden'); $('#admin-cancel-btn').classList.add('hidden'); toast('Admin logged in'); attachAdminButtons(); } else { toast('Invalid admin credentials'); } }
  function attachAdminButtons(){ $('#admin-start').addEventListener('click', ()=> metaRef().set({ status: 'playing', startTime: now() })); $('#admin-restart').addEventListener('click', ()=>{ metaRef().set({ status: 'lobby' }); playersRef().once('value').then(s=>{ const val=s.val()||{}; Object.keys(val).forEach(pid=> db.ref(`games/${GAME_ID}/players/${pid}`).update({ score:0, totalTime:0 })); }); localStorage.removeItem('sm-answers'); localStorage.removeItem('sm-lastHandled'); toast('Game restarted'); }); $('#admin-reset-scores').addEventListener('click', ()=>{ playersRef().once('value').then(s=>{ const val=s.val()||{}; Object.keys(val).forEach(pid=> db.ref(`games/${GAME_ID}/players/${pid}`).update({ score:0, totalTime:0 })); }); toast('Scores cleared'); }); $('#admin-logout').addEventListener('click', ()=>{ localStorage.removeItem('sm-admin'); closeAdmin(); }); }

  // Compute final results view
  function computeResults(){ const arr = Object.values(players).sort((a,b)=> (b.score||0)-(a.score||0) || (a.totalTime||0)-(b.totalTime||0)); renderLeaderboard(arr,'#final-leaderboard tbody'); const me = arr.find(p=>p.id===playerId) || {}; const percent = Math.max(0, Math.min(100, Math.round((me.score||0)/(TOTAL_QUESTIONS*10) * 100))); let msg=''; if(percent>=90) msg='A+ Student 🔥'; else if(percent>=70) msg='Almost There 💪'; else msg='Need Better Habits 😅'; $('#result-summary').innerHTML = `<h3>${me.name||'You'} — ${me.score||0} pts</h3><p>${msg}</p>`; }

  // Join game
  function joinGame(name){ if(!db){ toast('Firebase not initialized'); return; } if(!playerId){ playerId = uid(); localStorage.setItem('sm-playerId', playerId); } playerName = name || ('Player-'+playerId.slice(-4)); localStorage.setItem('sm-playerName', playerName); // restore local
    myLocal.score = parseInt(localStorage.getItem('sm-score')||'0',10) || 0; myLocal.totalTime = parseInt(localStorage.getItem('sm-totalTime')||'0',10) || 0; myLocal.answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); setPresence({ id: playerId, name: playerName, score: myLocal.score, totalTime: myLocal.totalTime, connected: true, lastSeen: now() }); show('#lobby-screen'); attachListeners(); }

  // UI bindings
  function bindUI(){ $('#join-btn').addEventListener('click', ()=>{ const n=$('#name-input').value.trim(); if(!n){ toast('Enter your name'); return; } joinGame(n); }); $('#spectate-btn').addEventListener('click', ()=> joinGame('Spectator-'+Math.random().toString(36).slice(2,5))); $('#leave-btn').addEventListener('click', ()=>{ if(playerId) db.ref(`games/${GAME_ID}/players/${playerId}`).update({ connected:false, lastSeen: now() }); show('#join-screen'); }); $('#leave-game-btn').addEventListener('click', ()=>{ if(playerId) db.ref(`games/${GAME_ID}/players/${playerId}`).update({ connected:false, lastSeen: now() }); show('#join-screen'); }); $('#back-lobby-btn').addEventListener('click', ()=>{ metaRef().set({ status: 'lobby' }); show('#lobby-screen'); }); $('#reset-local-btn').addEventListener('click', ()=>{ localStorage.clear(); toast('Local data reset'); location.reload(); }); // admin modal
    window.addEventListener('keydown', (e)=>{ if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='a'){ openAdmin(); } }); $('#admin-cancel-btn').addEventListener('click', closeAdmin); $('#admin-login-btn').addEventListener('click', performAdminLogin);
    // small host buttons in lobby
    $('#start-game-btn').addEventListener('click', ()=> metaRef().set({ status: 'playing', startTime: now() })); $('#restart-btn').addEventListener('click', ()=> metaRef().set({ status: 'lobby' })); $('#clear-scores-btn').addEventListener('click', ()=>{ playersRef().once('value').then(s=>{ const val=s.val()||{}; Object.keys(val).forEach(pid=> db.ref(`games/${GAME_ID}/players/${pid}`).update({ score:0, totalTime:0 })); }); }); }

  // Init
  function init(){ initFirebase(); bindUI(); if(localStorage.getItem('sm-admin')){ $('#admin-panel').classList.remove('hidden'); $('#admin-user').classList.add('hidden'); $('#admin-pass').classList.add('hidden'); $('#admin-login-btn').classList.add('hidden'); $('#admin-cancel-btn').classList.add('hidden'); attachAdminButtons(); }
    if(playerId && playerName){ // auto join
      try{ attachListeners(); setPresence({ id: playerId, name: playerName, score: myLocal.score, totalTime: myLocal.totalTime, connected:true, lastSeen: now() }); show('#lobby-screen'); }
      catch(e){ console.warn(e); show('#join-screen'); }
    } else show('#join-screen'); // ensure meta exists
    try{ metaRef().once('value').then(s=>{ if(!s.exists()) metaRef().set({ status: 'lobby' }); }); }catch(e){}
  }

  // Expose for debugging
  window.SMC = { init, joinGame, playersRef };
  window.addEventListener('load', init);
})();
