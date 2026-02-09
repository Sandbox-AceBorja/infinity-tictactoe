# Tic Tac Toe — Twist Edition

A modern twist on the classic Tic Tac Toe game built with **React (Vite)**.  
In this version, each player can only have **three active moves** on the board at any time. When a player makes a fourth move, their **oldest move is automatically removed**, creating a dynamic and strategic gameplay experience.

---

## 🎮 Game Rules (Twist)

- Two players: **X** and **O**
- Players take turns placing their mark on a 3×3 board
- Each player can only have **3 active moves**
- On the **4th move**, the **oldest move disappears**
- The board is constantly changing, encouraging strategy and foresight

---

## 🛠 Tech Stack

- **React** (with Vite)
- **JavaScript (ES6+)**
- **CSS**
- Deployed via **Netlify / Vercel**

---

## 📁 Project Structure

```bash
src/
├─ App.jsx # Main game logic and UI
├─ App.css # Component-level styles
├─ main.jsx # React entry point
└─ index.css # Global styles
```

The project intentionally keeps a simple structure to focus on **game logic, state management, and clarity**.

---

## 🧠 Key Concepts Demonstrated

- React state management using `useState`
- Immutable state updates
- Custom game rules implementation
- Queue-based logic to remove the oldest move
- UI updates driven entirely by state

---

## 🚀 Getting Started (Local Setup)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd tictactoe-twist
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```

The app will be available at:
```bash
http://localhost:5173
```
---

## 🌍 Deployment

The project can be deployed for free using:

Netlify (drag-and-drop dist/ folder)

Vercel (vercel CLI)

Build command:
```bash
npm run build
```

---

## 🔐 Demo Credentials

No authentication is required for this demo project.
The game runs entirely on the client for simplicity.

---

## 📌 Notes

This project was created as a time-boxed technical exercise to demonstrate:
- Problem-solving
- Frontend fundamentals
- Clean and readable React code

It is intended for evaluation and learning purposes only.

---

## 👤 Author

Ace Borja