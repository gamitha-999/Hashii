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
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();

    $('#login-btn').onclick = () => {
      const u = $('#adm-user').value;
      const p = $('#adm-pass').value;
      if(u === 'admin' && p === 'harshi') {
        show('#admin-panel');
        attachAdminListeners();
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
      const arr = Object.entries(players);
      $('#count').textContent = arr.length;
      
      arr.forEach(([id, p]) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name}</span><span>${p.score} pts</span>`;
        list.appendChild(li);
      });
    });
  }

  window.onload = init;
})();
