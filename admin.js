(function(){
  const GAME_ID = 'default-game';
  const firebaseConfig = {
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME",
    databaseURL: "https://hashii-caf12-default-rtdb.firebaseio.com/",
    projectId: "REPLACE_ME",
    storageBucket: "REPLACE_ME",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME"
  };

  let db;
  const $ = s => document.querySelector(s);
  const show = sel => { document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active')); $(sel).classList.add('active'); };

  function init(){
    try {
      const app = firebase.initializeApp(firebaseConfig);
      db = firebase.database();
    } catch(e) {
      console.warn("Firebase config missing or invalid. Please update firebaseConfig in admin.js");
    }

    $('#login-btn').onclick = () => {
      const u = $('#adm-user').value.trim();
      const p = $('#adm-pass').value.trim();
      if(u === 'admin' && p === 'harshi') {
        if(!db) {
          alert('Admin logged in, but Firebase is not connected. Please check your config!');
        }
        show('#admin-panel');
        if(db) attachAdminListeners();
      } else {
        alert('Wrong Username or Password');
      }
    };

    $('#logout-btn').onclick = () => location.reload();
  }

  function attachAdminListeners(){
    $('#start-game').onclick = () => {
      db.ref(`games/${GAME_ID}/meta`).set({ status: 'playing', startTime: Date.now() });
    };

    $('#reset-game').onclick = () => {
      if(confirm('Clear all players and reset to Lobby?')) {
        db.ref(`games/${GAME_ID}`).remove();
        db.ref(`games/${GAME_ID}/meta`).set({ status: 'lobby' });
      }
    };

    db.ref(`games/${GAME_ID}/meta`).on('value', s => {
      const status = (s.val() && s.val().status) || 'lobby';
      $('#room-status').textContent = `Room Status: ${status.toUpperCase()}`;
    });

    db.ref(`games/${GAME_ID}/players`).on('value', s => {
      const players = s.val() || {};
      const list = $('#players-list');
      list.innerHTML = '';
      
      // Sort players by score descending
      const arr = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
      $('#count').textContent = arr.length;
      
      arr.forEach((p, i) => {
        const li = document.createElement('li');
        const status = p.finished ? '✅' : '⏳';
        li.innerHTML = `<span>${i+1}. ${p.name} ${status}</span><span>${p.score || 0} pts</span>`;
        list.appendChild(li);
      });
    });
  }

  window.onload = init;
})();
