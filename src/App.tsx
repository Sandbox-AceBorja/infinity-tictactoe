import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

type SquareValue = 'X' | 'O' | null;

function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [xMoves, setXMoves] = useState<number[]>([]);
  const [oMoves, setOMoves] = useState<number[]>([]);
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [myRole, setMyRole] = useState<string>(''); 

  const winner = calculateWinner(board);

  // 1. Join Room
  const joinRoom = (id: string, pass?: string) => {
    if (!id) return alert("Enter a Room Name");
    socket.emit('join_room', { roomId: id, passcode: pass });
  };

  // 2. Global Socket Listeners (One single useEffect)
  useEffect(() => {
    socket.on('assign_role', ({ role, roomId: joinedRoomId, initialState }) => {
      setMyRole(role);
      setRoomId(joinedRoomId);
      setInRoom(true);

      // Sync the board with what the server sent
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

    socket.on('error_message', (msg) => alert(msg));

    return () => {
      socket.off('assign_role');
      socket.off('receive_move');
      socket.off('reset_game');
      socket.off('error_message');
    };
    // Note: We leave the dependency array mostly empty or carefully managed
  }, [board, xMoves, oMoves, isXNext]);

  // 3. Game Logic
  const resetGame = () => {
    // Tell the server which room to reset
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
      // IMPORTANT: Send the roomId so the server knows where to broadcast
      socket.emit('send_move', { roomId, index: i });
    }
  };

  // 4. Render Logic
  if (!inRoom) {
    return (
      <div className="lobby">
        <h1>Infinity Tic-Tac-Toe</h1>
        <div className="lobby-controls">
          <input placeholder="Room Name" value={roomId} onChange={e => setRoomId(e.target.value)} />
          <input placeholder="Passcode (Optional)" value={passcode} onChange={e => setPasscode(e.target.value)} />
          <button onClick={() => joinRoom(roomId, passcode)}>Create/Join Room</button>
          <hr />
          <button className="quick-match" onClick={() => joinRoom(Math.random().toString(36).substring(7))}>
            Quick Random Match
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      <h1>Room: {roomId}</h1>
      <h3>You are: {myRole}</h3>
      <div className="status">
        {winner ? `Winner: ${winner}` : `Next Player: ${isXNext ? 'X' : 'O'}`}
      </div>
      <div className="board">
        {board.map((square, i) => {
          const isOldest = (isXNext && xMoves[0] === i && xMoves.length === 3) || 
                           (!isXNext && oMoves[0] === i && oMoves.length === 3);
          return (
            <button key={i} className={`square ${isOldest ? 'fading' : ''}`} onClick={() => handleClick(i)}>
              {square}
            </button>
          );
        })}
      </div>
      {winner && myRole !== 'Spectator' && (
        <button className="reset-button" onClick={resetGame}>New Game</button>
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