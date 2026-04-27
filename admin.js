const db = firebase.database();

const adminLogin = document.getElementById('admin-login');
const adminDashboard = document.getElementById('admin-dashboard');
const adminLoginBtn = document.getElementById('admin-login-btn');

// Login Logic
adminLoginBtn.addEventListener('click', () => {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;

    if (user === 'Admin' && pass === 'harshi') {
        adminLogin.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        initDashboard();
    } else {
        alert("Incorrect credentials!");
    }
});

function initDashboard() {
    // Listen for players
    db.ref('players').on('value', (snapshot) => {
        const players = snapshot.val() || {};
        const playerList = document.getElementById('player-list-items');
        const playerCount = document.getElementById('player-count');
        
        playerList.innerHTML = '';
        const playerArray = [];

        Object.keys(players).forEach(id => {
            const p = players[id];
            playerArray.push(p);
            const div = document.createElement('div');
            div.className = 'player-item';
            div.innerHTML = `<span>${p.name}</span> <span>Q: ${p.currentQuestion || 0}/10 | Score: ${p.score || 0}</span>`;
            playerList.appendChild(div);
        });

        playerCount.innerText = playerArray.length;

        // Update leaderboard
        updateAdminLeaderboard(playerArray);
    });

    // Listen for game status
    db.ref('gameStatus').on('value', (snapshot) => {
        document.getElementById('game-status').innerText = snapshot.val() || 'Waiting';
    });
}

function updateAdminLeaderboard(players) {
    // Sort by score (desc) then time (asc)
    players.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.timeTaken || 0) - (b.timeTaken || 0);
    });

    const tbody = document.getElementById('admin-leaderboard-body');
    tbody.innerHTML = '';
    players.forEach((p, i) => {
        const row = `<tr>
            <td>${i+1}</td>
            <td>${p.name}</td>
            <td>${p.score}</td>
            <td>${p.timeTaken || 0}s</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

// Controls
document.getElementById('start-game-btn').addEventListener('click', () => {
    db.ref('gameStatus').set('started');
});

document.getElementById('reset-game-btn').addEventListener('click', () => {
    if (confirm("Reset game for everyone?")) {
        db.ref('gameStatus').set('waiting');
    }
});

document.getElementById('clear-leaderboard-btn').addEventListener('click', () => {
    if (confirm("Clear all player data?")) {
        db.ref('players').remove();
        db.ref('gameStatus').set('waiting');
    }
});
