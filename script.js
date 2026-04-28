/* Study Master Challenge - fixed script (script-fixed.js) */
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

  const QUESTIONS = [
    { q: "Exam is in 5 days. What should you do first?", correct: "Make a clear study timetable", options: ["Start studying random subjects","Make a clear study timetable","Read only your favorite subject","Watch study videos without planning"], stage: "Time Management" },
    { q: "Best place to study?", correct: "Quiet place with minimal distractions", options: ["Quiet place with minimal distractions","Slightly noisy place with music","Bed with comfort","Anywhere with phone nearby"], stage: "Avoid Distractions" },
    { q: "Best way to remember lessons?", correct: "Active recall + practice questions", options: ["Read notes multiple times","Highlight everything","Active recall + practice questions","Watch explanation videos only"], stage: "Smart Study Methods" },
    { q: "Study session timing?", correct: "25–50 minutes with short breaks", options: ["20 minutes then break","25–50 minutes with short breaks","2 hours nonstop","Study only when you feel like"], stage: "Time Management" },
    { q: "Phone usage while studying?", correct: "Keep it away or turn it off", options: ["Keep it silent near you","Use only for study apps","Keep it away or turn it off","Check it during breaks only"], stage: "Avoid Distractions" },
    { q: "Before exam day?", correct: "Revise important notes", options: ["Revise important notes","Study everything again quickly","Focus on weak areas only","Learn new lessons"], stage: "Revision" },
    { q: "Night before exam?", correct: "Revise lightly and sleep well", options: ["Revise lightly and sleep well","Study till very late night","Wake up early and study more","Stay awake whole night"], stage: "Exam Day Tips" },
    { q: "Don’t understand a lesson?", correct: "Ask teacher/friends + practice", options: ["Re-read notes again","Watch videos again","Ask teacher/friends + practice","Skip and come back later"], stage: "Smart Study Methods" },
    { q: "Time management method?", correct: "Make a clear study timetable", options: ["Make a flexible plan","Make a clear study timetable","Study based on mood","Do easiest subjects first always"], stage: "Time Management" },
    { q: "During exam?", correct: "Read carefully + manage time properly", options: ["Answer easy questions first","Read carefully + manage time properly","Spend more time on hard questions","Rush to finish early"], stage: "Exam Day Tips" }
  ];

  let appFirebase, db;
  let playerId = localStorage.getItem('sm-playerId') || null;
  let playerName = localStorage.getItem('sm-playerName') || null;
  let myLocal = { score: 0, totalTime: 0, answers: {}, finished: false, currentQ: 0, qStartTime: 0 };
  let players = {};
  let gameMeta = null;
  let tickInterval = null;
  let hasJoined = false; 

  const $ = s => document.querySelector(s);
  const show = sel => { 
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active')); 
    $(sel).classList.add('active'); 
  };
  const toast = (t, ms=2500) => { const el=$('#toast'); el.textContent=t; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), ms); };

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

  const AudioMgr = (()=>{ try{ const C=new (window.AudioContext||window.webkitAudioContext)(); return { correct:()=>{const o=C.createOscillator(); const g=C.createGain(); o.type='sine'; o.frequency.value=880; g.gain.value=0.06; o.connect(g); g.connect(C.destination); o.start(); o.stop(C.currentTime+0.12); }, wrong:()=>{const o=C.createOscillator(); const g=C.createGain(); o.type='sawtooth'; o.frequency.value=220; g.gain.value=0.06; o.connect(g); g.connect(C.destination); o.start(); o.stop(C.currentTime+0.18); } }; }catch(e){ return { correct:()=>{}, wrong:()=>{} }; } })();

  function initFirebase(){
    try{ appFirebase = firebase.initializeApp(firebaseConfig); db = firebase.database(); }
    catch(e){ console.warn('Firebase init failed', e); }
  }

  const playersRef = () => db.ref(`games/${GAME_ID}/players`);
  const metaRef = () => db.ref(`games/${GAME_ID}/meta`);

  function uid(){ return 'p_' + Math.random().toString(36).slice(2,10); }
  function now(){ return Date.now(); }

  function setPresence(payload){ if(!db || !playerId) return; const ref = db.ref(`games/${GAME_ID}/players/${playerId}`); ref.set(payload); try{ ref.onDisconnect().update({ connected:false, lastSeen: now() }); }catch(e){} }

  function writeMyState(){ 
    if(!playerId || !db) return; 
    const payload = { 
      id: playerId, 
      name: playerName, 
      score: myLocal.score || 0, 
      totalTime: myLocal.totalTime || 0, 
      lastSeen: now(), 
      connected: true,
      finished: !!myLocal.finished
    }; 
    db.ref(`games/${GAME_ID}/players/${playerId}`).update(payload); 
    localStorage.setItem('sm-score', String(myLocal.score||0)); 
    localStorage.setItem('sm-totalTime', String(myLocal.totalTime||0)); 
  }

  function renderPlayers(){ 
    const list = $('#players-list'); 
    if(!list) return;
    list.innerHTML=''; 
    const arr = Object.values(players).sort((a,b)=> (b.score||0)-(a.score||0)); 
    arr.forEach(p=>{ 
      const li=document.createElement('li'); 
      li.innerHTML=`<span>${p.name||'—'}</span><small class="muted">${p.connected? 'Online':'Offline'}${p.finished?' (Done ✅)':' (In Progress)'}</small>`; 
      list.appendChild(li); 
    }); 
    $('#players-count').textContent = `${arr.length} student${arr.length===1? '':'s'} joined`; 
    if($('#result-screen').classList.contains('active')) computeResults();
  }

  function renderLeaderboard(arr, selector){ 
    const tbody = document.querySelector(selector); 
    if(!tbody) return; 
    tbody.innerHTML=''; 
    arr.forEach((p,i)=>{ 
      const tr=document.createElement('tr'); 
      let trophy = i===0 ? '🥇' : (i===1 ? '🥈' : (i===2 ? '🥉' : ''));
      tr.innerHTML=`<td>${i+1} ${trophy}</td><td>${p.name}</td><td>${p.score||0}</td><td>${Math.round(p.totalTime||0)}</td>`; 
      tbody.appendChild(tr); 
    }); 
  }

  function attachListeners(){ if(!db) return; 
    playersRef().on('value', snap=>{
      const raw = snap.val() || {};
      const normalized = {};
      Object.entries(raw).forEach(([k,v])=> normalized[k]=Object.assign({id:k}, v));
      players = normalized;
      renderPlayers(); updateMyRank();
    });

    metaRef().on('value', snap=>{
      gameMeta = snap.val();
      if(!gameMeta){ metaRef().set({ status: 'lobby' }); return; }

      // Handle Reset
      const lastResetId = localStorage.getItem('sm-lastResetId');
      if(gameMeta.resetId && gameMeta.resetId != lastResetId) {
        localStorage.setItem('sm-lastResetId', gameMeta.resetId);
        // Clear local progress
        localStorage.removeItem('sm-score');
        localStorage.removeItem('sm-totalTime');
        localStorage.removeItem('sm-answers');
        myLocal = { score: 0, totalTime: 0, answers: {}, finished: false };
        
        if(hasJoined) {
          toast('🔄 Game has been reset');
          // If we were playing or finished, go back to lobby
          if(gameMeta.status === 'lobby') show('#lobby-screen');
          // Re-register presence in DB with reset values
          setPresence({ id: playerId, name: playerName, score: 0, totalTime: 0, connected: true, lastSeen: now(), finished: false });
        }
      }
      
      // Update screens ONLY if joined
      if(hasJoined) {
          if(gameMeta.status==='playing'){
            if($('#lobby-screen').classList.contains('active') || $('#join-screen').classList.contains('active')){
               show('#game-screen');
               startLoop();
            }
          } else if(gameMeta.status==='ended'){
            stopLoop(); show('#result-screen'); computeResults();
          } else {
            show('#lobby-screen');
          }
      }
    });
  }

  let myShuffledQuestions = [];

  function startLoop(){ 
    stopLoop(); 
    
    // Seeded shuffle of the entire QUESTIONS array based on playerId
    myShuffledQuestions = seededShuffle(QUESTIONS, (playerId || 'default'));
    
    myLocal.currentQ = 0; 
    myLocal.qStartTime = now(); 
    myLocal.finished = false;
    tickInterval = setInterval(tick, 250); 
    tick(); 
  }
  function stopLoop(){ if(tickInterval) { clearInterval(tickInterval); tickInterval=null; } }

  function tick(){ 
    if(!gameMeta || gameMeta.status!=='playing' || myLocal.finished) return; 
    
    const idx = myLocal.currentQ;
    if(idx >= TOTAL_QUESTIONS || idx >= myShuffledQuestions.length) {
       myLocal.finished = true;
       writeMyState();
       stopLoop();
       show('#result-screen');
       computeResults();
       return;
    }

    const elapsed = Math.floor((now() - myLocal.qStartTime)/1000);
    const timeLeft = Math.max(0, QUESTION_TIME - elapsed);
    
    const q = myShuffledQuestions[idx];
    const answers = JSON.parse(localStorage.getItem('sm-answers')||'{}');
    
    // Auto-submit if time runs out
    if(!answers[idx] && timeLeft <= 0) {
       submitAnswer(idx, null, q.correct);
    }

    $('#question-stage').textContent = `📖 Stage ${idx+1}/${TOTAL_QUESTIONS}`;
    $('#question-text').textContent = q.q;
    
    // Shuffle options uniquely for this question and this player
    const optSeed = (playerId||'') + '_q' + idx + '_' + (q.q.slice(0,5));
    const options = seededShuffle(q.options, optSeed);
    renderOptions(options, q.correct, idx);
    
    $('#timer').textContent = `⏱️ ${timeLeft}`; 
    const pct = ((QUESTION_TIME - timeLeft)/QUESTION_TIME)*100; 
    $('#progress-bar').style.width = `${pct}%`;
  }

  function renderOptions(options, correct, qIndex){ 
    const el = $('#options'); 
    el.innerHTML=''; 
    const answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); 
    const myAns = answers[qIndex]; 
    
    options.forEach(opt=>{ 
      const d=document.createElement('div'); 
      d.className='option'; 
      d.textContent = opt; 
      if(myAns){ 
        d.classList.add('disabled');
        if(opt===correct) d.classList.add('correct'); 
        if(myAns.answer===opt && opt!==correct) d.classList.add('wrong'); 
      } else { 
        d.addEventListener('click', ()=> submitAnswer(qIndex,opt,correct)); 
      } 
      el.appendChild(d); 
    }); 
  }

  function submitAnswer(qIndex, selected, correct){ 
    const answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); 
    if(answers[qIndex]) return;

    const t = Math.max(0, Math.round((now() - myLocal.qStartTime)/1000)); 
    
    let isCorrect = (selected === correct);
    let timedOut = (selected === null);

    if(!timedOut) {
      myLocal.score = (myLocal.score||0) + (isCorrect ? 10 : -5);
      myLocal.totalTime = (myLocal.totalTime||0) + Math.min(t, QUESTION_TIME);
    } else {
      myLocal.score = (myLocal.score||0) - 5;
      myLocal.totalTime = (myLocal.totalTime||0) + QUESTION_TIME;
    }

    answers[qIndex] = { answer: selected, time: t, correct: isCorrect, timedOut: timedOut }; 
    localStorage.setItem('sm-answers', JSON.stringify(answers)); 
    
    writeMyState(); 

    if(timedOut) {
      AudioMgr.wrong(); $('#feedback').innerHTML = `⏰ Time's up! Correct: <b>${correct}</b>`;
    } else if(isCorrect) { 
      AudioMgr.correct(); $('#feedback').innerHTML = '✅ Correct! <span style="color:#10b981">+10 pts</span>'; 
    } else { 
      AudioMgr.wrong(); $('#feedback').innerHTML = `❌ Wrong! Correct: <b>${correct}</b>`; 
    }

    // Move to next question after delay
    setTimeout(() => {
        if(myLocal.currentQ === qIndex && gameMeta.status === 'playing') {
            $('#feedback').innerHTML = '';
            if(myLocal.currentQ < TOTAL_QUESTIONS - 1) {
              myLocal.currentQ++;
              myLocal.qStartTime = now();
            } else {
              myLocal.finished = true;
              writeMyState();
              stopLoop();
              show('#result-screen');
              computeResults();
            }
        }
    }, 1500);
  }

  function updateMyRank(){ 
    const arr = Object.values(players).sort((a,b)=> (b.score||0)-(a.score||0)); 
    const idx = arr.findIndex(p=>p.id===playerId); 
    $('#rank').textContent = `🏆 #${idx>=0? idx+1 : '-'}`; 
    $('#my-score').textContent = `✨ ${myLocal.score||0}`; 
  }

  function computeResults(){ 
    const arr = Object.values(players);
    const activeThreshold = now() - 120000;
    const activePlayers = arr.filter(p => p.lastSeen > activeThreshold || p.connected);
    const everyoneFinished = activePlayers.length > 0 && activePlayers.every(p => p.finished);
    const sortedArr = arr.sort((a,b)=> (b.score||0)-(a.score||0) || (a.totalTime||0)-(b.totalTime||0)); 
    
    renderLeaderboard(sortedArr,'#final-leaderboard tbody'); 

    const me = sortedArr.find(p=>p.id===playerId) || {}; 
    const percent = Math.max(0, Math.min(100, Math.round((me.score||0)/(TOTAL_QUESTIONS*10) * 100))); 
    let msg=''; 
    if(percent>=90) msg='A+ Student 🔥'; else if(percent>=70) msg='Almost There 💪'; else msg='Need Better Habits 😅'; 
    
    $('#result-summary').innerHTML = `<h3>${me.name||'You'} — ${me.score||0} pts</h3><p>${msg}</p>`; 

    if(everyoneFinished) {
      $('#waiting-for-others').classList.add('hidden');
      $('#final-leaderboard-container').classList.remove('hidden');
    } else {
      $('#waiting-for-others').classList.remove('hidden');
      $('#final-leaderboard-container').classList.add('hidden');
    }
  }

  function joinGame(name){ 
    if(!db){ toast('Firebase not ready'); return; } 
    hasJoined = true;
    if(!playerId){ playerId = uid(); localStorage.setItem('sm-playerId', playerId); } 
    playerName = name || ('Player-'+playerId.slice(-4)); 
    localStorage.setItem('sm-playerName', playerName);
    myLocal.score = parseInt(localStorage.getItem('sm-score')||'0',10) || 0; 
    myLocal.totalTime = parseInt(localStorage.getItem('sm-totalTime')||'0',10) || 0; 
    myLocal.answers = JSON.parse(localStorage.getItem('sm-answers')||'{}'); 
    myLocal.finished = false;
    setPresence({ id: playerId, name: playerName, score: myLocal.score, totalTime: myLocal.totalTime, connected: true, lastSeen: now(), finished: false });
    
    // Switch screen immediately based on current meta
    if(gameMeta && gameMeta.status === 'playing') {
      show('#game-screen');
      startLoop();
    } else if(gameMeta && gameMeta.status === 'ended') {
      show('#result-screen');
      computeResults();
    } else {
      show('#lobby-screen');
    }
  }

  function leaveGame(isManual = true){
    if(!db || !playerId) return;
    
    // Confirm if leaving during a game
    if(isManual && gameMeta && gameMeta.status === 'playing' && !myLocal.finished) {
      if(!confirm('🏃 Are you sure you want to leave the game? Your progress will be lost.')) return;
    }

    // Remove from Firebase
    db.ref(`games/${GAME_ID}/players/${playerId}`).remove()
      .then(() => {
        if(isManual) toast('🏃 You left the game');
      })
      .catch(e => console.error('Error leaving:', e));

    // Reset State
    hasJoined = false;
    stopLoop();
    
    // Clear some local state but keep name for convenience
    myLocal = { score: 0, totalTime: 0, answers: {}, finished: false, currentQ: 0, qStartTime: 0 };
    localStorage.removeItem('sm-score');
    localStorage.removeItem('sm-totalTime');
    localStorage.removeItem('sm-answers');

    show('#join-screen');
  }

  function bindUI(){ 
    $('#join-btn').addEventListener('click', ()=>{ const n=$('#name-input').value.trim(); if(!n){ toast('✍️ Enter your name'); return; } joinGame(n); }); 
    $('#reset-local-btn').addEventListener('click', ()=>{ if(confirm('Clear all local data?')) { localStorage.clear(); toast('🧹 Data reset'); location.reload(); } });
    $('#leave-btn').addEventListener('click', leaveGame);
    $('#leave-game-btn').addEventListener('click', leaveGame);
    $('#back-lobby-btn').addEventListener('click', ()=>{ show('#lobby-screen'); });
  }

  function init(){ 
    initFirebase(); bindUI(); 
    show('#join-screen');
    if(playerName) $('#name-input').value = playerName;
    attachListeners(); 
  }
  window.addEventListener('load', init);
})();
