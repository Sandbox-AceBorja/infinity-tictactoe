import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');

type SquareValue = 'X' | 'O' | null;

function App() {
  // --- STATE ---
  // Load initial state from storage
  const savedRoom = localStorage.getItem('tictactoe_room');
  const savedRole = localStorage.getItem('tictactoe_role');

  const [inRoom, setInRoom] = useState(!!savedRoom);
  const [roomId, setRoomId] = useState(savedRoom || '');
  const [myRole, setMyRole] = useState(savedRole || '');
  const [passcode, setPasscode] = useState('');

  // NEW: Added missing state for opponent tracking
  const [opponentStatus, setOpponentStatus] = useState({ xConnected: false, oConnected: false });
  
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [xMoves, setXMoves] = useState<number[]>([]);
  const [oMoves, setOMoves] = useState<number[]>([]);
  const [isXNext, setIsXNext] = useState<boolean>(true);

  const winner = calculateWinner(board);

  // Audio Refs
  // Using public folder paths (/name.mp3)
  const moveSound = useRef(new Audio('/move.mp3'));
  const startSound = useRef(new Audio('/start.mp3'));
  const winSound = useRef(new Audio('/win.mp3'));


  // Play win sound when winner changes
  useEffect(() => {
    if (winner) {
      winSound.current.play().catch(err => console.log("Audio play blocked until user interaction"));
    }
  }, [winner]);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    if (savedRoom) {
      socket.emit('join_room', { roomId: savedRoom });
    }
  }, []);

  // Function to leave the room and clear storage
  const leaveRoom = () => {
    localStorage.removeItem('tictactoe_room');
    localStorage.removeItem('tictactoe_role');
    setInRoom(false);
    setRoomId('');
    setMyRole('');
    window.location.reload(); 
  };

  // --- SOCKET LISTENERS ---

  useEffect(() => {
    socket.on('opponent_status', (status) => {
      setOpponentStatus(status);
    });

    socket.on('assign_role', ({ role, roomId: joinedRoomId, initialState }) => {
      setMyRole(role);
      setRoomId(joinedRoomId);
      setInRoom(true);
      localStorage.setItem('tictactoe_room', joinedRoomId);
      localStorage.setItem('tictactoe_role', role);

      if (initialState) {
        setBoard(initialState.board);
        setXMoves(initialState.xMoves);
        setOMoves(initialState.oMoves);
        setIsXNext(initialState.isXNext);
      }
      startSound.current.play().catch(() => {}); // catch blocks browser "autoplay" errors
    });

    socket.on('receive_move', (data: { index: number }) => {
      handleMove(data.index, false);
      moveSound.current.play().catch(() => {}); // Play sound on opponent move
    });

    socket.on('reset_game', () => {
      setBoard(Array(9).fill(null));
      setXMoves([]);
      setOMoves([]);
      setIsXNext(true);
      startSound.current.play().catch(() => {});
    });

    socket.on('error_message', (msg) => {
      alert(msg);
      // If there's an error re-joining (like room full), clear storage
      localStorage.removeItem('tictactoe_room');
      setInRoom(false);
    });

    return () => {
      socket.off('opponent_status');
      socket.off('assign_role');
      socket.off('receive_move');
      socket.off('reset_game');
      socket.off('error_message');
    };
  }, [board, xMoves, oMoves, isXNext]);

  // Win Sound Logic
  useEffect(() => {
    if (winner) {
      winSound.current.play().catch(() => {});
    }
  }, [winner]);

  // --- GAMEPLAY ACTIONS ---

  const quickMatch = () => {
    // Clear old data first so the app is ready for a fresh assignment
    localStorage.removeItem('tictactoe_room');
    localStorage.removeItem('tictactoe_role');
    setRoomId('');
    setMyRole('');
    socket.emit('find_public_room');
  };

  const joinRoom = (id: string, pass?: string) => {
    if (!id) return alert("Enter a Room Name");
    socket.emit('join_room', { roomId: id, passcode: pass });
  };

  const resetGame = () => {
    socket.emit('request_reset', roomId);
  };

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    const currentTurnRole = isXNext ? 'X' : 'O';
    if (myRole !== currentTurnRole) return;

    moveSound.current.play().catch(() => {}); // Local move sound
    handleMove(i, true);
  };

  const handleMove = (i: number, isLocal: boolean) => {
    const newBoard = [...board];
    const newXMoves = [...xMoves];
    const newOMoves = [...oMoves];

    if (isXNext) {
      newXMoves.push(i);
      newBoard[i] = 'X';
      if (newXMoves.length > 3) {
        const oldest = newXMoves.shift();
        if (oldest !== undefined) newBoard[oldest] = null;
      }
      setXMoves(newXMoves);
    } else {
      newOMoves.push(i);
      newBoard[i] = 'O';
      if (newOMoves.length > 3) {
        const oldest = newOMoves.shift();
        if (oldest !== undefined) newBoard[oldest] = null;
      }
      setOMoves(newOMoves);
    }

    setBoard(newBoard);
    setIsXNext(!isXNext);

    if (isLocal) {
      socket.emit('send_move', { roomId, index: i });
    }
  };

  // --- RENDER STATUS INDICATOR ---
  const isOpponentHere = myRole === 'X' ? opponentStatus.oConnected : opponentStatus.xConnected;

  // --- RENDER ---
  return (
    <div className="app-container">
      {/* Background Shapes stay visible for both Lobby and Game */}
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>
      <div className="shape shape-3"></div>

      {!inRoom ? (
        <div className="lobby">
          <h1 className="title-amazing">Infinity</h1>
          <h1 className="title-stunning">Tic-Tac-Toe</h1>
          
          <div className="lobby-controls">
            <input 
              className="tech-input"
              placeholder="Room Name" 
              value={roomId} 
              maxLength={10}
              onChange={e => setRoomId(e.target.value)} 
            />
            <input 
              className="tech-input"
              type="password"
              placeholder="Passcode (Optional)" 
              value={passcode} 
              maxLength={10}
              onChange={e => setPasscode(e.target.value)} 
            />
            <button className="reset-button" onClick={() => joinRoom(roomId, passcode)}>
              Create / Join Room
            </button>
            
            <div className="separator">
              <span>OR</span>
            </div>

            <button 
              className="leave-button" 
              style={{background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6', color: '#3b82f6'}} 
              onClick={quickMatch} // Make sure this is calling quickMatch, not joinRoom directly
            >
              Quick Random Match
            </button>

          </div>
        </div>
      ) : (
        <div className="game">
          <div className="presence-indicator">
            <span className={`dot ${isOpponentHere ? 'online' : 'offline'}`}></span>
            {isOpponentHere ? "Opponent Connected" : "Waiting for opponent..."}
          </div>
          <div className="game-header">
            <h1 className="room-id">Room: {roomId}</h1>
          </div>
          
          <h3 className={`role ${myRole === 'X' ? 'square-x' : myRole === 'O' ? 'square-o' : ''}`}>
            You are: {myRole}
          </h3>
          <div className="status">
            {winner ? (
              <span className={winner === 'X' ? 'square-x' : 'square-o'}>Winner: {winner}</span>
            ) : (
              <>
                Next Player: 
                <span className={isXNext ? 'square-x' : 'square-o'}> {isXNext ? 'X' : 'O'}</span>
              </>
            )}
          </div>

          <div className="board">
            {board.map((square, i) => {
              // Calculate if this square is the one about to disappear
              const isOldest = (isXNext && xMoves[0] === i && xMoves.length === 3) || 
                               (!isXNext && oMoves[0] === i && oMoves.length === 3);
              
              // Apply neon glow classes based on the symbol
              const symbolClass = square === 'X' ? 'square-x' : square === 'O' ? 'square-o' : '';
              
              return (
                <button 
                  key={i} 
                  className={`square ${isOldest ? 'fading' : ''} ${symbolClass}`} 
                  onClick={() => handleClick(i)}
                >
                  {square}
                </button>
              );
            })}
          </div>

          <div className='game-footer'>
            {winner && myRole !== 'Spectator' && (
              <button className="reset-button" onClick={resetGame}>New Game</button>
            )}
            <button className="leave-button" onClick={leaveRoom}>← Leave Room</button>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateWinner(squares: SquareValue[]): SquareValue {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
}

export default App;