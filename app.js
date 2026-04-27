// State management
let playerName = localStorage.getItem('playerName') || '';
let playerId = localStorage.getItem('playerId') || '';
let currentQuestionIndex = parseInt(localStorage.getItem('currentQuestionIndex')) || 0;
let score = parseInt(localStorage.getItem('score')) || 0;
let totalTimeTaken = parseInt(localStorage.getItem('totalTimeTaken')) || 0;
let timer;
let timeLeft = 20;
let gameActive = false;
let userShuffledQuestions = JSON.parse(localStorage.getItem('shuffledQuestions')) || [];

const db = firebase.database();

// DOM Elements
const loginSection = document.getElementById('login-section');
const waitingSection = document.getElementById('waiting-section');
const quizSection = document.getElementById('quiz-section');
const resultsSection = document.getElementById('results-section');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const playerNameInput = document.getElementById('player-name');

// Initialize
if (playerName && playerId) {
    showSection('waiting-section');
    document.getElementById('display-name').innerText = playerName;
    listenForGameStatus();
}

// Join Game
joinBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) return alert("Please enter your name!");
    
    playerName = name;
    playerId = 'p_' + Math.random().toString(36).substr(2, 9);
    
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('playerId', playerId);
    
    // Register player in Firebase
    const playerRef = db.ref('players/' + playerId);
    playerRef.set({
        name: playerName,
        score: 0,
        status: 'joined',
        lastActive: firebase.database.ServerValue.TIMESTAMP
    });
    playerRef.onDisconnect().remove();

    showSection('waiting-section');
    document.getElementById('display-name').innerText = playerName;
    listenForGameStatus();
});

// Leave Game
leaveBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to leave the game?")) {
        leaveGame();
    }
});

function leaveGame() {
    if (playerId) {
        db.ref('players/' + playerId).remove()
            .then(() => {
                localStorage.clear();
                location.reload();
            })
            .catch(() => {
                localStorage.clear();
                location.reload();
            });
    } else {
        localStorage.clear();
        location.reload();
    }
}

function showSection(id) {
    [loginSection, waitingSection, quizSection, resultsSection].forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function listenForGameStatus() {
    db.ref('gameStatus').on('value', (snapshot) => {
        const status = snapshot.val();
        if (status === 'started' && !gameActive) {
            startGame();
        } else if (status === 'waiting' || !status) {
            // If game was reset by admin
            if (gameActive) resetLocalState();
        }
    });
}

function resetLocalState() {
    gameActive = false;
    currentQuestionIndex = 0;
    score = 0;
    totalTimeTaken = 0;
    localStorage.removeItem('currentQuestionIndex');
    localStorage.removeItem('score');
    localStorage.removeItem('totalTimeTaken');
    localStorage.removeItem('shuffledQuestions');
    showSection('waiting-section');
}

function startGame() {
    gameActive = true;
    if (userShuffledQuestions.length === 0) {
        userShuffledQuestions = getShuffledQuestions();
        localStorage.setItem('shuffledQuestions', JSON.stringify(userShuffledQuestions));
    }
    showSection('quiz-section');
    renderQuestion();
}

function renderQuestion() {
    if (currentQuestionIndex >= 10) {
        endGame();
        return;
    }

    const q = userShuffledQuestions[currentQuestionIndex];
    document.getElementById('question-number').innerText = `Question ${currentQuestionIndex + 1} of 10`;
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('current-score').innerText = score;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    q.shuffledOptions.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, btn);
        optionsContainer.appendChild(btn);
    });

    // Progress bar
    document.getElementById('progress-fill').style.width = ((currentQuestionIndex) / 10 * 100) + '%';

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 20;
    document.getElementById('time-left').innerText = timeLeft;
    
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('time-left').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleAnswer(null, null); // Timeout
        }
    }, 1000);
}

function handleAnswer(selected, element) {
    clearInterval(timer);
    const q = userShuffledQuestions[currentQuestionIndex];
    const options = document.querySelectorAll('.option-btn');
    options.forEach(opt => opt.style.pointerEvents = 'none');

    const timeSpent = 20 - timeLeft;
    totalTimeTaken += timeSpent;

    if (selected === q.answer) {
        score += 10;
        if (element) element.classList.add('correct');
    } else {
        score -= 5;
        if (element) element.classList.add('wrong');
        // Show correct answer
        options.forEach(opt => {
            if (opt.innerText === q.answer) opt.classList.add('correct');
        });
    }

    localStorage.setItem('score', score);
    localStorage.setItem('totalTimeTaken', totalTimeTaken);
    
    // Update Firebase
    db.ref('players/' + playerId).update({
        score: score,
        timeTaken: totalTimeTaken,
        currentQuestion: currentQuestionIndex + 1
    });

    currentQuestionIndex++;
    localStorage.setItem('currentQuestionIndex', currentQuestionIndex);

    setTimeout(renderQuestion, 2000);
}

function endGame() {
    gameActive = false;
    showSection('results-section');
    document.getElementById('final-score').innerText = score;
    
    let msg = "";
    if (score >= 90) msg = "A+ Student 🔥";
    else if (score >= 70) msg = "Almost there 💪";
    else msg = "Need better habits 😅";
    
    document.getElementById('results-msg').innerText = msg;

    // Show Leaderboard
    db.ref('players').orderByChild('score').limitToLast(5).on('value', (snapshot) => {
        const players = [];
        snapshot.forEach(child => {
            players.push(child.val());
        });
        players.reverse(); // highest first

        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = '';
        players.forEach((p, i) => {
            const row = `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.score}</td></tr>`;
            tbody.innerHTML += row;
        });
    });
}

document.getElementById('play-again-btn').addEventListener('click', () => {
    leaveGame();
});
