(function(){
  const GAME_ID = 'default-game';
  const QUESTION_TIME = 20;
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
    { q: "Exam is in 5 days. What should you do first?", correct: "Make a clear study timetable", options: ["Start studying random subjects","Make a clear study timetable","Read only your favorite subject","Watch study videos without planning"] },
    { q: "Best place to study?", correct: "Quiet place with minimal distractions", options: ["Quiet place with minimal distractions","Slightly noisy place with music","Bed with comfort","Anywhere with phone nearby"] },
    { q: "Best way to remember lessons?", correct: "Active recall + practice questions", options: ["Read notes multiple times","Highlight everything","Active recall + practice questions","Watch explanation videos only"] },
    { q: "Study session timing?", correct: "25-50 minutes with short breaks", options: ["20 minutes then break","25-50 minutes with short breaks","2 hours nonstop","Study only when you feel like"] },
    { q: "Phone usage while studying?", correct: "Keep it away or turn it off", options: ["Keep it silent near you","Use only for study apps","Keep it away or turn it off","Check it during breaks only"] },
    { q: "Before exam day?", correct: "Revise important notes", options: ["Revise important notes","Study everything again quickly","Focus on weak areas only","Learn new lessons"] },
    { q: "Night before exam?", correct: "Revise lightly and sleep well", options: ["Revise lightly and sleep well","Study till very late night","Wake up early and study more","Stay awake whole night"] },
    { q: "Don't understand a lesson?", correct: "Ask teacher/friends + practice", options: ["Re-read notes again","Watch videos again","Ask teacher/friends + practice","Skip and come back later"] },
    { q: "Time management method?", correct: "Make a clear study timetable", options: ["Make a flexible plan","Make a clear study timetable","Study based on mood","Do easiest subjects first always"] },
    { q: "During exam?", correct: "Read carefully + manage time properly", options: ["Answer easy questions first","Read carefully + manage time properly","Spend more time on hard questions","Rush to finish early"] }
  ];

  let app, db, playerId, playerName;
  let myLocal = { score: 0, currentQ: 0, qStartTime: 0, finished: false, joined: false };
  let players = {};
  let gameStatus = 'lobby';
  let tickInterval = null;

  const $ = s => document.querySelector(s);
  const show = sel => { document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active')); $(sel).classList.add('active'); };

  function init(){
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    
    playerId = localStorage.getItem('sm-playerId') || 'p' + Math.random().toString(36).slice(2,8);
    localStorage.setItem('sm-playerId', playerId);
    playerName = localStorage.getItem('sm-playerName') || "";
    if(playerName) $('#name-input').value = playerName;

    $('#join-btn').onclick = () => {
      const n = $('#name-input').value.trim();
      if(!n) return alert("Enter Name");
      playerName = n;
      localStorage.setItem('sm-playerName', n);
      join();
    };

    $('#leave-btn').onclick = () => location.reload();
    $('#leave-game-btn').onclick = () => location.reload();
    $('#back-lobby-btn').onclick = () => location.reload();

    db.ref(`games/${GAME_ID}/meta`).on('value', s => {
      const meta = s.val() || {};
      gameStatus = meta.status || 'lobby';
      if(myLocal.joined) handleStatusChange();
    });

    db.ref(`games/${GAME_ID}/players`).on('value', s => {
      players = s.val() || {};
      renderLobby();
      if(myLocal.finished) renderFinalLeaderboard();
    });
  }

  function join(){
    myLocal.joined = true;
    db.ref(`games/${GAME_ID}/players/${playerId}`).set({ name: playerName, score: 0, finished: false });
    db.ref(`games/${GAME_ID}/players/${playerId}`).onDisconnect().remove();
    handleStatusChange();
  }

  function handleStatusChange(){
    if(gameStatus === 'playing') {
      if(!myLocal.finished && !$('#game-screen').classList.contains('active')) { show('#game-screen'); startQuiz(); }
    } else {
      if(!myLocal.finished) show('#lobby-screen');
    }
  }

  function startQuiz(){
    myLocal.currentQ = 0;
    myLocal.score = 0;
    myLocal.finished = false;
    nextQuestion();
    if(!tickInterval) tickInterval = setInterval(updateTimer, 500);
  }

  function nextQuestion(){
    if(myLocal.currentQ >= QUESTIONS.length){
      finish();
      return;
    }
    myLocal.qStartTime = Date.now();
    const q = QUESTIONS[myLocal.currentQ];
    $('#question-stage').textContent = `Q ${myLocal.currentQ + 1} / ${QUESTIONS.length}`;
    $('#question-text').textContent = q.q;
    const opts = $('#options');
    opts.innerHTML = '';
    q.options.forEach(opt => {
      const b = document.createElement('div');
      b.className = 'option';
      b.textContent = opt;
      b.onclick = () => submit(opt);
      opts.appendChild(b);
    });
  }

  function submit(ans){
    if(myLocal.finished) return;
    const q = QUESTIONS[myLocal.currentQ];
    if(ans === q.correct) myLocal.score += 10; else if(ans !== null) myLocal.score -= 5;
    
    db.ref(`games/${GAME_ID}/players/${playerId}`).update({ score: myLocal.score });
    myLocal.currentQ++;
    nextQuestion();
  }

  function updateTimer(){
    if(gameStatus !== 'playing' || myLocal.finished) return;
    const elapsed = Math.floor((Date.now() - myLocal.qStartTime) / 1000);
    const remain = Math.max(0, QUESTION_TIME - elapsed);
    $('#timer').textContent = `⏱️ ${remain}s`;
    $('#progress-bar').style.width = (remain / QUESTION_TIME * 100) + "%";
    if(remain <= 0) submit(null);
  }

  function finish(){
    myLocal.finished = true;
    db.ref(`games/${GAME_ID}/players/${playerId}`).update({ finished: true });
    show('#result-screen');
    renderFinalLeaderboard();
  }

  function renderLobby(){
    const list = $('#players-list');
    if(!list) return;
    list.innerHTML = '';
    const arr = Object.values(players);
    arr.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} - ${p.score} pts`;
      list.appendChild(li);
    });
    $('#players-count').textContent = `${arr.length} joined`;
  }

  function renderFinalLeaderboard(){
    const tbody = $('#final-leaderboard tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const sorted = Object.values(players).sort((a,b) => b.score - a.score).slice(0, 3);
    sorted.forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${p.name}</td><td>${p.score}</td>`;
      tbody.appendChild(tr);
    });
    $('#result-summary').innerHTML = `<h2>Your Score: ${myLocal.score}</h2>`;
  }

  window.onload = init;
})();
