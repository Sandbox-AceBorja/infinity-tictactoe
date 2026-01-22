import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// We will talk about changing this URL for deployment later!
const socket = io('http://localhost:3001');

type SquareValue = 'X' | 'O' | null;

function App() {
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [xMoves, setXMoves] = useState<number[]>([]);
  const [oMoves, setOMoves] = useState<number[]>([]);
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [myRole, setMyRole] = useState<string>(''); 

  const winner = calculateWinner(board);

  // RESET LOGIC
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXMoves([]);
    setOMoves([]);
    setIsXNext(true);
    socket.emit('request_reset');
  };

  // SOCKET LISTENERS (Merged into one)
  useEffect(() => {
    socket.on('assign_role', (role: string) => {
      setMyRole(role);
    });

    socket.on('receive_move', (data: { index: number }) => {
      handleMove(data.index, false);
    });

    // ADD THIS: Listen for the reset signal from server
    socket.on('reset_game', () => {
      setBoard(Array(9).fill(null));
      setXMoves([]);
      setOMoves([]);
      setIsXNext(true);
    });

    return () => {
      socket.off('assign_role');
      socket.off('receive_move');
      socket.off('reset_game');
    };
    // Dependencies: We need to listen carefully when these change
  }, [board, xMoves, oMoves, isXNext]);

  // TURN VALIDATION
  const handleClick = (i: number) => {
    if (board[i] || winner) return;

    const currentTurnRole = isXNext ? 'X' : 'O';
    
    if (myRole !== currentTurnRole) {
      alert(`You are Player ${myRole}. Please wait for your turn!`);
      return;
    }
    
    handleMove(i, true);
  };

  // CORE MOVE LOGIC
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
      socket.emit('send_move', { index: i });
    }
  };

  return (
    <div className="game">
      <h1>Infinity Tic-Tac-Toe</h1>
      <h3>You are Player: {myRole}</h3>

      <div className="status">
        {winner ? `Winner: ${winner}` : `Next Player: ${isXNext ? 'X' : 'O'}`}
      </div>

      <div className="board">
        {board.map((square, i) => {
          // Highlight logic
          const isOldest = (isXNext && xMoves[0] === i && xMoves.length === 3) || 
                           (!isXNext && oMoves[0] === i && oMoves.length === 3);
          return (
            <button 
              key={i} 
              className={`square ${isOldest ? 'fading' : ''}`} 
              onClick={() => handleClick(i)} // FIXED: Now uses handleClick
            >
              {square}
            </button>
          );
        })}
      </div>

      {winner && (
        <button className="reset-button" onClick={resetGame}>
          New Game
        </button>
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