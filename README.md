# Study Master Challenge (Frontend)

Study Master Challenge is a polished multiplayer quiz game built for hosting on GitHub Pages (frontend). It uses Firebase Realtime Database for real-time updates and persistence across refreshes. No traditional server required.

Features
- Join lobby with name
- Real-time players list & live leaderboard
- Admin/Host controls (hidden admin login)
  - Username: `Admin`
  - Password: `harshi`
- Host can start the game for everyone
- 10 scenario-based MCQs, 20s per question
- Scoring: +10 correct, -5 wrong, -5 timeout
- Deterministic per-player option order (avoids cheating by seeing others)
- Persistence across refresh via localStorage and Realtime DB
- Animated UI, progress bar, stages, and result badges
- Deploy-ready for GitHub Pages (static files)

## Setup (Firebase)

1. Create a Firebase project at https://console.firebase.google.com/.
2. In Project settings, get your Web app config and paste into `script.js` → `firebaseConfig`.
3. In Build → Realtime Database, create a database and set rules for testing:
   ```
   {
     "rules": {
       "games": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
   For production, tighten rules.
4. Host files on GitHub Pages: push this repo and enable GitHub Pages from main branch.

## Files
- index.html — main UI
- style.css — styles
- script.js — game logic & Firebase integration
- assets/ — (optional images/sfx you add)

## Notes & Limitations
- This implementation uses client-side scoring and Firebase DB as the orchestrator. It's suitable for classroom demos and small groups (~35 players). For secure competitive environments, implement server-side validation.
- Replace Firebase config values before use.

Enjoy! Deploy to GitHub Pages and share the URL with students.
