/*
  Study Master Challenge - frontend-only multiplayer using Firebase Realtime Database.
  Replace firebaseConfig with your project's config below (README explains setup).
*/

(() => {
  // ---------- CONFIG ----------
  const GAME_ID = 'default-game'; // single game room for GitHub Pages demo
  const QUESTION_TIME = 20; // seconds
  const TOTAL_QUESTIONS = 10;
  // Replace with your Firebase config
  const firebaseConfig = {
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME",
    databaseURL: "https://hashii-caf12-default-rtdb.firebaseio.com/",
    projectId: "REPLACE_ME",
    storageBucket: "REPLACE_ME",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME"
  };

  // ---------- QUESTIONS ----------
  const QUESTIONS = [
    {
      q: "Exam is in 5 days. What should you do first?",
      correct: "Make a clear study timetable",
      options: [
        "Start cramming all night",
        "Make a clear study timetable",
        "Only study the hardest topic",
        "Wait until the last day to start"
      ],
      stage: "Time Management"
    },
    {
      q: "Best place to study?",
      correct: "Quiet place with minimal distractions",
      options: [
        "In a crowded cafe with loud music",
        "Quiet place with minimal distractions",
        "Only when you're watching videos",
        "On your bed while lying down"
      ],
      stage: "Avoid Distractions"
    },
    {
      q: "Best way to remember lessons?",
      correct: "Active recall + practice questions",
      options: [
        "Only re-reading notes",
        "Active recall + practice questions",
        "Highlight everything in textbooks",
        "Memorize by hearing music"
      ],
      stage: "Smart Study Methods"
    },
    {
      q: "Study session timing?",
      correct: "25–50 minutes with short breaks",
      options: [
        "25–50 minutes with short breaks",
        "Study for 6 hours straight",
        "Study 1 minute each topic",
        "All-night sessions only"
      ],
      stage: "Time Management"
    },
    {
      q: "Phone usage while studying?",
      correct: "Keep it away or turn it off",
      options: [
        "Keep it away or turn it off",
        "Check every notification",
        "Use social media for breaks every 2 minutes",
        "Never charge your phone while studying"
      ],
      stage: "Avoid Distractions"
    },
    {
      q: "Before exam day?",
      correct: "Revise important notes",
      options: [
        "Memorize new chapters last minute",
        "Revise important notes",
        "Try new study methods the same day",
        "Skip sleep for full revision"
      ],
      stage: "Revision"
    },
    {
      q: "Night before exam?",
      correct: "Revise lightly and sleep well",
      options: [
        "Pull an all-nighter",
        "Practice only new topics",
        "Revise lightly and sleep well",
        "Skip breakfast and rush to exam"
      ],
      stage: "Exam Day Tips"
    },
    {
      q: "Don’t understand a lesson?",
      correct: "Ask teacher/friends + practice",
      options: [
        "Ignore it and hope for the best",
        "Ask teacher/friends + practice",
        "Only watch videos without practicing",
        "Avoid the topic permanently"
      ],
      stage: "Smart Study Methods"
    },
    {
      q: "Time management method?",
      correct: "Make a clear study timetable",
      options: [
        "Rely completely on luck",
        "Make a clear study timetable",
        "Study randomly without plan",
        "Study when you feel like it only"
      ],
      stage: "Time Management"
    },
    {
      q: "During exam?",
      correct: "Read carefully + manage time properly",
      options: [
        "Guess all answers quickly",
        "Read carefully + manage time properly",
        "Spend all time on first question",
        "Panic and skip questions"
      ],
      stage: "Exam Day Tips"
    }
  ];

  // ---------- STATE & Firebase ----------
  let appFirebase, db;
  let playerId = localStorage.getItem('sm-playerId') || null;
  let playerName = localStorage.getItem('sm-playerName') || null;
  let isHost = false;
  let adminLogged = false;
  let myLocal = { score: 0, totalTime: 0, answers: {} };
  let gameMeta = null;
  let players = {}; // cached
  let timers = { tick: null };

  // DOM
  const $ = sel => document.querySelector(sel);
  const show = (sel) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelector(sel).classList.add('active');
  };omain#endregion