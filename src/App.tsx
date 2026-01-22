import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');

type SquareValue = 'X' | 'O' | null;

function App() {
  // Load initial state from storage
  const savedRoom = localStorage.getItem('tictactoe_room');
  const savedRole = localStorage.getItem('tictactoe_role');

  const [inRoom, setInRoom] = useState(!!savedRoom);
  const [roomId, setRoomId] = useState(savedRoom || '');
  const [myRole, setMyRole] = useState(savedRole || '');
  const [passcode, setPasscode] = useState('');
  
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [xMoves, setXMoves] = useState<number[]>([]);
  const [oMoves, setOMoves] = useState<number[]>([]);
  const [isXNext, setIsXNext] = useState<boolean>(true);

  const winner = calculateWinner(board);

  // --- PERSISTENCE LOGIC ---

  // Effect 1: Auto-rejoin on mount (Only runs ONCE when the app starts)
  useEffect(() => {
    if (savedRoom) {
      socket.emit('join_room', { roomId: savedRoom });
    }
  }, []); // Empty array = run once

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
    socket.on('assign_role', ({ role, roomId: joinedRoomId, initialState }) => {
      setMyRole(role);
      setRoomId(joinedRoomId);
      setInRoom(true);

      // Save to local storage for refresh persistence
      localStorage.setItem('tictactoe_room', joinedRoomId);
      localStorage.setItem('tictactoe_role', role);

      if (initialState) {
        setBoard(initialState.board);
        setXMoves(initialState.xMoves);
        setOMoves(initialState.oMoves);
        setIsXNext(initialState.isXNext);
      }
    });

    socket.on('receive_move', (data: { index: number }) => {
      handleMove(data.index, false);
    });

    socket.on('reset_game', () => {
      setBoard(Array(9).fill(null));
      setXMoves([]);
      setOMoves([]);
      setIsXNext(true);
    });

    socket.on('error_message', (msg) => {
      alert(msg);
      // If there's an error re-joining (like room full), clear storage
      localStorage.removeItem('tictactoe_room');
      setInRoom(false);
    });

    return () => {
      socket.off('assign_role');
      socket.off('receive_move');
      socket.off('reset_game');
      socket.off('error_message');
    };
  }, [board, xMoves, oMoves, isXNext]);

  // --- GAMEPLAY ACTIONS ---

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
              onClick={() => joinRoom(Math.random().toString(36).substring(7))}
            >
              Quick Random Match
            </button>
          </div>
        </div>
      ) : (
        <div className="game">
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