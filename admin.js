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

  function init(){
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();

    $('#start-game').onclick = () => {
      db.ref(`games/${GAME_ID}/meta`).set({ status: 'playing', startTime: Date.now() });
    };

    $('#reset-game').onclick = () => {
      if(confirm('Reset game and clear all scores?')) {
        db.ref(`games/${GAME_ID}`).remove();
        db.ref(`games/${GAME_ID}/meta`).set({ status: 'lobby' });
      }
    };

    db.ref(`games/${GAME_ID}/meta`).on('value', s => {
      const status = (s.val() && s.val().status) || 'lobby';
      $('#room-status').textContent = `Status: ${status.toUpperCase()}`;
    });

    db.ref(`games/${GAME_ID}/players`).on('value', s => {
      const players = s.val() || {};
      const list = $('#players-list');
      list.innerHTML = '';
      Object.entries(players).forEach(([id, p]) => {
        const li = document.createElement('li');
        li.textContent = `${p.name} (${p.score} pts)`;
        list.appendChild(li);
      });
    });
  }

  const $ = s => document.querySelector(s);
  window.onload = init;
})();
