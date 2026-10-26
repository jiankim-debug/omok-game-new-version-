const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const PLAYER_NAMES = {
  [BLACK]: '검은돌',
  [WHITE]: '흰돌',
};

const state = {
  board: createEmptyBoard(),
  currentPlayer: BLACK,
  winner: null,
  status: '게임 시작',
  moves: [],
  lastMove: null,
  history: [],
};

const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const statusText = document.getElementById('status-text');
const moveCount = document.getElementById('move-count');
const newGameButton = document.getElementById('new-game-btn');
const undoButton = document.getElementById('undo-btn');

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function createSnapshot() {
  return {
    board: state.board.map((row) => [...row]),
    currentPlayer: state.currentPlayer,
    winner: state.winner,
    status: state.status,
    moves: [...state.moves],
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  };
}

function buildBoard() {
  boardElement.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'board-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('aria-label', `${row + 1}행, ${col + 1}열`);
      cell.addEventListener('click', () => handleMove(row, col));
      boardElement.appendChild(cell);
    }
  }
}

function renderBoard() {
  const cells = boardElement.children;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = cells[row * BOARD_SIZE + col];
      const value = state.board[row][col];
      cell.classList.remove('last-move');
      cell.innerHTML = '';

      if (value !== EMPTY) {
        const stone = document.createElement('span');
        stone.className = `stone ${value === BLACK ? 'black' : 'white'}`;
        cell.appendChild(stone);
      }

      if (state.lastMove && state.lastMove.row === row && state.lastMove.col === col) {
        cell.classList.add('last-move');
      }
    }
  }
}

function updateStatus() {
  moveCount.textContent = String(state.moves.length);

  if (state.winner) {
    turnIndicator.textContent = `${PLAYER_NAMES[state.winner]} 승리`;
    turnIndicator.className = `turn-indicator ${state.winner === BLACK ? 'black' : 'white'}`;
    statusText.textContent = `${PLAYER_NAMES[state.winner]}이(가) 승리했습니다!`;
    return;
  }

  if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    turnIndicator.textContent = '무승부';
    turnIndicator.className = 'turn-indicator black';
    statusText.textContent = '무승부입니다. 다시 시작해 보세요.';
    return;
  }

  turnIndicator.textContent = PLAYER_NAMES[state.currentPlayer];
  turnIndicator.className = `turn-indicator ${state.currentPlayer === BLACK ? 'black' : 'white'}`;
  statusText.textContent = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
}

function render() {
  renderBoard();
  updateStatus();
}

function countDirection(row, col, deltaRow, deltaCol, player) {
  let count = 0;
  let nextRow = row + deltaRow;
  let nextCol = col + deltaCol;

  while (
    nextRow >= 0 &&
    nextRow < BOARD_SIZE &&
    nextCol >= 0 &&
    nextCol < BOARD_SIZE &&
    state.board[nextRow][nextCol] === player
  ) {
    count += 1;
    nextRow += deltaRow;
    nextCol += deltaCol;
  }

  return count;
}

function hasFiveInLine(row, col, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([deltaRow, deltaCol]) => {
    const forward = countDirection(row, col, deltaRow, deltaCol, player);
    const backward = countDirection(row, col, -deltaRow, -deltaCol, player);
    return forward + backward + 1 >= 5;
  });
}

function handleMove(row, col) {
  if (state.winner) {
    return;
  }

  if (state.board[row][col] !== EMPTY) {
    return;
  }

  if (state.moves.length >= BOARD_SIZE * BOARD_SIZE) {
    return;
  }

  state.history.push(createSnapshot());
  state.board[row][col] = state.currentPlayer;
  state.lastMove = { row, col };
  state.moves.push({ row, col, player: state.currentPlayer });

  if (hasFiveInLine(row, col, state.currentPlayer)) {
    state.winner = state.currentPlayer;
    state.status = `${PLAYER_NAMES[state.currentPlayer]} 승리`;
  } else if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    state.status = '무승부';
  } else {
    state.currentPlayer = state.currentPlayer === BLACK ? WHITE : BLACK;
    state.status = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
  }

  render();
}

function resetGame() {
  if (state.moves.length > 0 && !window.confirm('현재 게임을 초기화할까요?')) {
    return;
  }

  state.board = createEmptyBoard();
  state.currentPlayer = BLACK;
  state.winner = null;
  state.status = '게임 시작';
  state.moves = [];
  state.lastMove = null;
  state.history = [];
  render();
}

function undoMove() {
  if (state.history.length === 0) {
    return;
  }

  const previous = state.history.pop();
  state.board = previous.board;
  state.currentPlayer = previous.currentPlayer;
  state.winner = previous.winner;
  state.status = previous.status;
  state.moves = previous.moves;
  state.lastMove = previous.lastMove;

  render();
}

newGameButton.addEventListener('click', resetGame);
undoButton.addEventListener('click', undoMove);

buildBoard();
render();
