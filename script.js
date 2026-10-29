const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const AI_SEARCH_DEPTH = 4;
const WIN_SCORE = 1000000;

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
  mode: 'friend',
  difficulty: 'hard',
  aiThinking: false,
  scores: {
    black: 0,
    white: 0,
    draw: 0,
  },
};

const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const statusText = document.getElementById('status-text');
const moveCount = document.getElementById('move-count');
const newGameButton = document.getElementById('new-game-btn');
const undoButton = document.getElementById('undo-btn');
const modeSelection = document.getElementById('mode-selection');
const gameShell = document.getElementById('game-shell');
const modeSelectButton = document.getElementById('mode-select-btn');
const gameTitle = document.getElementById('game-title');
const blackScoreEl = document.getElementById('black-score');
const whiteScoreEl = document.getElementById('white-score');
const drawScoreEl = document.getElementById('draw-score');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const modeButtons = document.querySelectorAll('.mode-btn');

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function createSnapshot() {
  return {
    board: cloneBoard(state.board),
    currentPlayer: state.currentPlayer,
    winner: state.winner,
    status: state.status,
    moves: [...state.moves],
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    mode: state.mode,
    difficulty: state.difficulty,
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

function updateScoreBoard() {
  blackScoreEl.textContent = String(state.scores.black);
  whiteScoreEl.textContent = String(state.scores.white);
  drawScoreEl.textContent = String(state.scores.draw);
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

  if (state.mode === 'ai' && state.currentPlayer === WHITE) {
    turnIndicator.textContent = 'AI 생각 중...';
    turnIndicator.className = 'turn-indicator white';
    statusText.textContent = '인공지능이 수를 두고 있습니다.';
    return;
  }

  turnIndicator.textContent = PLAYER_NAMES[state.currentPlayer];
  turnIndicator.className = `turn-indicator ${state.currentPlayer === BLACK ? 'black' : 'white'}`;
  statusText.textContent = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
}

function render() {
  renderBoard();
  updateScoreBoard();
  updateStatus();
}

function countDirection(row, col, deltaRow, deltaCol, player, board = state.board) {
  let count = 0;
  let nextRow = row + deltaRow;
  let nextCol = col + deltaCol;

  while (
    nextRow >= 0 &&
    nextRow < BOARD_SIZE &&
    nextCol >= 0 &&
    nextCol < BOARD_SIZE &&
    board[nextRow][nextCol] === player
  ) {
    count += 1;
    nextRow += deltaRow;
    nextCol += deltaCol;
  }

  return count;
}

function hasFiveInLine(row, col, player, board = state.board) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([deltaRow, deltaCol]) => {
    const forward = countDirection(row, col, deltaRow, deltaCol, player, board);
    const backward = countDirection(row, col, -deltaRow, -deltaCol, player, board);
    return forward + backward + 1 >= 5;
  });
}

function isBoardFull() {
  return state.moves.length >= BOARD_SIZE * BOARD_SIZE;
}

function getAvailableMoves(board = state.board) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] === EMPTY) {
        moves.push({ row, col });
      }
    }
  }

  return moves;
}

function findImmediateWinMove(player, board = state.board) {
  const availableMoves = getAvailableMoves(board);

  for (const move of availableMoves) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = player;

    if (hasFiveInLine(move.row, move.col, player, nextBoard)) {
      return move;
    }
  }

  return null;
}

function evaluateLinePattern(board, row, col, dr, dc, player) {
  let count = 1;
  let r = row + dr;
  let c = col + dc;

  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
    count += 1;
    r += dr;
    c += dc;
  }

  r = row - dr;
  c = col - dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
    count += 1;
    r -= dr;
    c -= dc;
  }

  return count;
}

function getPatternScore(board, row, col, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  let score = 0;

  for (const [dr, dc] of directions) {
    const length = evaluateLinePattern(board, row, col, dr, dc, player);

    if (length >= 5) return WIN_SCORE;
    if (length === 4) score += 5000;
    else if (length === 3) score += 850;
    else if (length === 2) score += 150;
    else if (length === 1) score += 10;
  }

  return score;
}

function evaluateBoard(board, perspective) {
  let score = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = board[row][col];
      if (value === EMPTY) continue;

      const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
      const centerBias = 25 - centerDistance;
      if (centerBias > 0) {
        score += value === perspective ? centerBias : -centerBias * 0.6;
      }

      score += value === perspective
        ? getPatternScore(board, row, col, perspective)
        : -getPatternScore(board, row, col, perspective === WHITE ? BLACK : WHITE) * 0.9;
    }
  }

  return score;
}

function getDifficultyDelay() {
  const map = {
    easy: 300,
    normal: 500,
    hard: 650,
  };
  return map[state.difficulty] || 500;
}

function getCenterDistance(row, col) {
  return Math.abs(row - 7) + Math.abs(col - 7);
}

function orderMoves(moves, board) {
  const sorted = moves.map((move) => {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = WHITE;
    const score = getPatternScore(nextBoard, move.row, move.col, WHITE);
    return { ...move, score };
  });

  return sorted.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return getCenterDistance(a.row, a.col) - getCenterDistance(b.row, b.col);
  });
}

function minimax(board, depth, alpha, beta, maximizing, currentPlayer) {
  const winner = findWinner(board);
  if (winner === WHITE) return WIN_SCORE - (AI_SEARCH_DEPTH - depth);
  if (winner === BLACK) return -WIN_SCORE + (AI_SEARCH_DEPTH - depth);
  if (depth === 0 || getAvailableMoves(board).length === 0) {
    return evaluateBoard(board, WHITE);
  }

  const moves = orderMoves(getAvailableMoves(board), board).slice(0, 12);

  if (maximizing) {
    let bestScore = -Infinity;
    for (const move of moves) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.row][move.col] = currentPlayer;
      const score = minimax(nextBoard, depth - 1, alpha, beta, false, currentPlayer === WHITE ? BLACK : WHITE);
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const move of moves) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = currentPlayer;
    const score = minimax(nextBoard, depth - 1, alpha, beta, true, currentPlayer === WHITE ? BLACK : WHITE);
    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }
  return bestScore;
}

function findWinner(board = state.board) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = board[row][col];
      if (value === EMPTY) continue;

      const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1],
      ];

      for (const [dr, dc] of directions) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;

        while (
          r >= 0 && r < BOARD_SIZE &&
          c >= 0 && c < BOARD_SIZE &&
          board[r][c] === value
        ) {
          count += 1;
          r += dr;
          c += dc;
        }

        if (count >= 5) {
          return value;
        }
      }
    }
  }

  return null;
}

function getBestAIMove() {
  const availableMoves = getAvailableMoves();
  if (availableMoves.length === 0) return null;

  const currentDepth = Math.min(AI_SEARCH_DEPTH, 6);

  let bestMove = null;
  let bestScore = -Infinity;

  const immediateWin = findImmediateWinMove(WHITE);
  if (immediateWin) return immediateWin;

  const blockMove = findImmediateWinMove(BLACK);
  if (blockMove) return blockMove;

  const orderedMoves = orderMoves(availableMoves, state.board).slice(0, 12);

  for (const move of orderedMoves) {
    const nextBoard = cloneBoard(state.board);
    nextBoard[move.row][move.col] = WHITE;

    const winImmediate = hasFiveInLine(move.row, move.col, WHITE, nextBoard);
    if (winImmediate) {
      return move;
    }

    const score = minimax(nextBoard, currentDepth - 1, -Infinity, Infinity, false, BLACK);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (bestMove) {
    return bestMove;
  }

  return orderedMoves[0];
}

function makeAIMove() {
  if (!state.aiThinking || state.winner) return;

  const bestMove = getBestAIMove();
  if (!bestMove) return;

  state.history.push(createSnapshot());
  state.board[bestMove.row][bestMove.col] = WHITE;
  state.lastMove = { row: bestMove.row, col: bestMove.col };
  state.moves.push({ row: bestMove.row, col: bestMove.col, player: WHITE });

  if (hasFiveInLine(bestMove.row, bestMove.col, WHITE)) {
    state.winner = WHITE;
    state.status = 'AI 승리';
  } else if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    state.status = '무승부';
  } else {
    state.currentPlayer = BLACK;
    state.status = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
  }

  state.aiThinking = false;
  render();
}

function handleMove(row, col) {
  if (state.winner) return;
  if (state.board[row][col] !== EMPTY) return;
  if (state.aiThinking) return;
  if (isBoardFull()) return;

  if (state.mode === 'ai' && state.currentPlayer === WHITE) {
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

  if (state.mode === 'ai' && state.currentPlayer === WHITE && !state.winner) {
    state.aiThinking = true;
    setTimeout(() => {
      makeAIMove();
    }, getDifficultyDelay());
  }
}

function incrementScore(winner) {
  if (winner === BLACK) {
    state.scores.black += 1;
  } else if (winner === WHITE) {
    state.scores.white += 1;
  } else {
    state.scores.draw += 1;
  }
}

function updateRoundResult(winner) {
  if (winner === BLACK) {
    incrementScore(BLACK);
  } else if (winner === WHITE) {
    incrementScore(WHITE);
  } else {
    incrementScore('draw');
  }
}

function resetGame() {
  state.board = createEmptyBoard();
  state.currentPlayer = BLACK;
  state.winner = null;
  state.status = '게임 시작';
  state.moves = [];
  state.lastMove = null;
  state.history = [];
  state.aiThinking = false;
  render();
}

function undoMove() {
  if (state.history.length === 0) return;

  const previous = state.history.pop();
  state.board = previous.board;
  state.currentPlayer = previous.currentPlayer;
  state.winner = previous.winner;
  state.status = previous.status;
  state.moves = previous.moves;
  state.lastMove = previous.lastMove;
  state.aiThinking = false;

  render();
}

function showModeSelection() {
  modeSelection.classList.remove('hidden');
  gameShell.classList.add('hidden');
  state.mode = 'friend';
  resetGame();
}

function selectMode(mode) {
  state.mode = mode;
  modeSelection.classList.add('hidden');
  gameShell.classList.remove('hidden');

  if (mode === 'friend') {
    gameTitle.textContent = '친구 대전';
  } else {
    gameTitle.textContent = '인공지능 대전';
  }

  resetGame();
}

function selectDifficulty(level) {
  state.difficulty = level;
  difficultyButtons.forEach((button) => {
    const isActive = button.dataset.difficulty === level;
    button.classList.toggle('active', isActive);
  });
}

function bindEvents() {
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => selectMode(button.dataset.mode));
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
  });

  modeSelectButton.addEventListener('click', () => {
    showModeSelection();
  });

  newGameButton.addEventListener('click', resetGame);
  undoButton.addEventListener('click', undoMove);
}

function init() {
  modeSelection.classList.remove('hidden');
  gameShell.classList.add('hidden');
  bindEvents();
  buildBoard();
  render();
}

init();
