// Admin dashboard script
(function(){
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
    { q: "Exam is in 5 days. What should you do first?", options: ["Start cramming all night","Make a clear study timetable","Only study the hardest topic","Wait until the last day to start"] , correct: "Make a clear study timetable"},
    { q: "Best place to study?", options: ["In a crowded cafe with loud music","Quiet place with minimal distractions","Only when you're watching videos","On your bed while lying down"], correct: "Quiet place with minimal distractions"},
    { q: "Best way to remember lessons?", options: ["Only re-reading notes","Active recall + practice questions","Highlight everything in textbooks","Memorize by hearing music"], correct: "Active recall + practice questions"},
    { q: "Study session timing?", options: ["25–50 minutes with short breaks","Study for 6 hours straight","Study 1 minute each topic","All-night sessions only"], correct: "25–50 minutes with short breaks"},
    { q: "Phone usage while studying?", options: ["Keep it away or turn it off","Check every notification","Use social media for breaks every 2 minutes","Never charge your phone while studying"], correct: "Keep it away or turn it off"},
    { q: "Before exam day?", options: ["Memorize new chapters last minute","Revise important notes","Try new study methods the same day","Skip sleep for full revision"], correct: "Revise important notes"},
    { q: "Night before exam?", options: ["Pull an all-nighter","Practice only new topics","Revise lightly and sleep well","Skip breakfast and rush to exam"], correct: "Revise lightly and sleep well"},
    { q: "Don’t understand a lesson?", options: ["Ignore it and hope for the best","Ask teacher/friends + practice","Only watch videos without practicing","Avoid the topic permanently"], correct: "Ask teacher/friends + practice"},
    { q: "Time management method?", options: ["Rely completely on luck","Make a clear study timetable","Study randomly without plan","Study when you feel like it only"], correct: "Make a clear study timetable"},
    { q: "During exam?", options: ["Guess all answers quickly","Read carefully + manage time properly","Spend all time on first question","Panic and skip questions"], correct: "Read carefully + manage time properly"}
  ];

  let app, db;

  function initFirebase(){
    try{ app = firebase.initializeApp(firebaseConfig); db = firebase.database(); }catch(e){ console.warn('Firebase init', e); alert('Firebase init failed - set config in admin.js'); }
  }

  function $(s){ return document.querySelector(s); }

  function showLogin(){ $('#login-screen').classList.remove('hidden'); $('#dashboard').classList.add('hidden'); }
  function showDashboard(){ $('#login-screen').classList.add('hidden'); $('#dashboard').classList.remove('hidden'); }

  function checkAuth(){ const token = sessionStorage.getItem('sm-admin-auth'); return token === '1'; }

  function renderQuestions(){ const container = $('#questions-list'); container.innerHTML = ''; QUESTIONS.forEach((q,i)=>{
    const div = document.createElement('div'); div.className='question';
    div.innerHTML = `<h3>Q${i+1}. ${q.q}</h3><div class="options">${q.options.map(o=>`<div class="opt">${o}</div>`).join('')}</div><div class="correct"><strong>Answer:</strong> ${q.correct}</div>`;
    container.appendChild(div);
  }); }

  function attachListeners(){
    $('#adm-login').addEventListener('click', ()=>{
      const u = $('#adm-user').value.trim(); const p = $('#adm-pass').value;
      if(u==='admin' && p==='harshi'){ sessionStorage.setItem('sm-admin-auth','1'); // set flag
        // set admin id in meta
        db.ref('games/default-game/meta').transaction(curr=>{ if(!curr) return { status: 'lobby', adminId: 'admin' }; curr.adminId = 'admin'; return curr; });
        showDashboard(); renderQuestions(); attachDBListeners();
      } else { alert('Invalid credentials'); }
    });

    $('#adm-cancel').addEventListener('click', ()=>{ window.location = 'index.html'; });
    $('#adm-logout').addEventListener('click', ()=>{ sessionStorage.removeItem('sm-admin-auth'); // remove adminId from meta
      db.ref('games/default-game/meta/adminId').remove(); showLogin(); });

    $('#create-room').addEventListener('click', ()=>{ db.ref('games/default-game/meta').set({ status: 'lobby', adminId: 'admin', resetId: Date.now() }); alert('Room created'); });
    $('#start-game').addEventListener('click', ()=>{ db.ref('games/default-game/meta').update({ status: 'playing', startTime: Date.now(), adminId: 'admin' }); });
    $('#restart-game').addEventListener('click', ()=>{ 
      if(confirm('Restart game? This will clear all player progress.')){
        db.ref('games/default-game/meta').set({ status: 'lobby', adminId: 'admin', resetId: Date.now() }); 
        db.ref('games/default-game/players').remove(); 
      }
    });
    $('#clear-scores').addEventListener('click', ()=>{ 
      if(confirm('Clear all scores?')){
        db.ref('games/default-game/meta').update({ resetId: Date.now() });
        db.ref('games/default-game/players').once('value').then(s=>{ 
          const val=s.val()||{}; 
          Object.keys(val).forEach(pid=> db.ref(`games/default-game/players/${pid}`).update({ score:0, totalTime:0, finished: false })); 
        }); 
      }
    });
    $('#adm-clear-all').addEventListener('click', ()=>{ 
      if(confirm('Are you sure you want to clear ALL game data?')){ 
        db.ref('games/default-game').remove().then(() => {
          db.ref('games/default-game/meta').set({ status: 'lobby', adminId: 'admin', resetId: Date.now() });
          alert('All data cleared'); 
          location.reload(); 
        });
      } 
    });
  }

  function attachDBListeners(){ const playersRef = db.ref('games/default-game/players'); const metaRef = db.ref('games/default-game/meta');
    playersRef.on('value', snap=>{ const val = snap.val() || {}; const list = $('#players-list'); list.innerHTML = ''; Object.entries(val).forEach(([id,p])=>{ const li = document.createElement('li'); li.innerHTML = `<span>${p.name||id}</span><span>${p.score||0} pts</span><button class="btn" data-kick="${id}">Remove</button>`; list.appendChild(li); }); list.querySelectorAll('button[data-kick]').forEach(b=> b.addEventListener('click', e=>{ const id = e.currentTarget.dataset.kick; db.ref(`games/default-game/players/${id}`).remove(); })); });
    metaRef.on('value', snap=>{ const m = snap.val() || {}; $('#room-meta').textContent = JSON.stringify(m, null, 2); }); }

  // init
  window.addEventListener('load', ()=>{ initFirebase(); if(!checkAuth()){ showLogin(); } else { showDashboard(); renderQuestions(); attachDBListeners(); }
    attachListeners(); });
})();
