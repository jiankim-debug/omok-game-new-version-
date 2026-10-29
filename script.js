(function () {
const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const AI_SEARCH_DEPTH = 4;
const WIN_SCORE = 1_000_000;

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
  ruleMode: 'free',
  aiThinking: false,
  scores: {
    black: 0,
    white: 0,
    draw: 0,
  },
  patternMemory: {
    black: [],
    white: [],
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
const ruleButtons = document.querySelectorAll('.rule-btn');

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
    ruleMode: state.ruleMode,
    patternMemory: {
      black: [...state.patternMemory.black],
      white: [...state.patternMemory.white],
    },
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

function boardIsFull(board = state.board) {
  return getAvailableMoves(board).length === 0;
}

function findLocalWinner(board = state.board) {
  return window.OmokLogic.findWinner(board);
}

function evaluateBoard(board, perspective) {
  let score = 0;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = board[row][col];
      if (value === EMPTY) continue;

      const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
      const centerBias = Math.max(0, 24 - centerDistance);
      score += value === perspective ? centerBias * 2 : -centerBias;

      const patternSummary = window.OmokLogic.getPatternSummary(board, row, col, value);
      score += value === perspective
        ? patternSummary.openFour * 1000 + patternSummary.closedFour * 300 + patternSummary.openThree * 150 + patternSummary.closedThree * 30 + patternSummary.openTwo * 10
        : -(patternSummary.openFour * 1200 + patternSummary.closedFour * 350 + patternSummary.openThree * 180 + patternSummary.closedThree * 40 + patternSummary.openTwo * 12);
    }
  }
  return score;
}

function minimax(board, depth, alpha, beta, maximizing, currentPlayer) {
  const winner = findLocalWinner(board);
  if (winner === WHITE) return WIN_SCORE - (AI_SEARCH_DEPTH - depth);
  if (winner === BLACK) return -WIN_SCORE + (AI_SEARCH_DEPTH - depth);
  if (depth === 0 || boardIsFull(board)) {
    return evaluateBoard(board, WHITE);
  }

  const moves = window.OmokLogic.getAvailableMoves(board).slice(0, 12);

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

function orderMoves(moves, board) {
  return moves
    .map((move) => ({ ...move, score: evaluateBoard(cloneBoard(board).map((row) => [...row])), row: move.row, col: move.col }))
    .sort((a, b) => b.score - a.score);
}

function getDifficultyDelay() {
  const map = {
    easy: 350,
    normal: 550,
    hard: 700,
  };
  return map[state.difficulty] || 550;
}

function recordMoveMemory(player, row, col) {
  const key = player === BLACK ? 'black' : 'white';
  state.patternMemory[key].push({ row, col });
  if (state.patternMemory[key].length > 12) {
    state.patternMemory[key].shift();
  }
}

function isMoveAllowed(row, col, player = state.currentPlayer) {
  return window.OmokLogic.isMoveLegal(state.board, row, col, player, state.ruleMode);
}

function findImmediateWinMove(player, board = state.board) {
  return window.OmokLogic.findImmediateWinMove(board, player);
}

function findBestAIMove() {
  const best = window.OmokLogic.getBestAIMove(state.board, WHITE, state.difficulty, state.ruleMode);
  return best;
}

function makeAIMove() {
  if (!state.aiThinking || state.winner) return;

  const bestMove = findBestAIMove();
  if (!bestMove) return;

  state.history.push(createSnapshot());
  state.board[bestMove.row][bestMove.col] = WHITE;
  state.lastMove = { row: bestMove.row, col: bestMove.col };
  state.moves.push({ row: bestMove.row, col: bestMove.col, player: WHITE });
  recordMoveMemory(WHITE, bestMove.row, bestMove.col);

  if (window.OmokLogic.hasFiveInLine(state.board, bestMove.row, bestMove.col, WHITE)) {
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
  if (state.aiThinking) return;
  if (state.board[row][col] !== EMPTY) return;
  if (boardIsFull()) return;
  if (state.mode === 'ai' && state.currentPlayer === WHITE) return;

  if (!isMoveAllowed(row, col, state.currentPlayer)) {
    state.status = state.ruleMode === 'renju' ? '금수 위치입니다. 다른 곳을 선택해 주세요.' : '이미 사용된 위치입니다.';
    render();
    return;
  }

  state.history.push(createSnapshot());
  state.board[row][col] = state.currentPlayer;
  state.lastMove = { row, col };
  state.moves.push({ row, col, player: state.currentPlayer });
  recordMoveMemory(state.currentPlayer, row, col);

  if (window.OmokLogic.hasFiveInLine(state.board, row, col, state.currentPlayer)) {
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
  state.patternMemory = {
    black: [],
    white: [],
  };
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
  state.ruleMode = previous.ruleMode;
  state.aiThinking = false;
  state.patternMemory = previous.patternMemory;

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

function selectRuleMode(level) {
  state.ruleMode = level;
  ruleButtons.forEach((button) => {
    const isActive = button.dataset.rule === level;
    button.classList.toggle('active', isActive);
  });
  resetGame();
}

function bindEvents() {
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => selectMode(button.dataset.mode));
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
  });

  ruleButtons.forEach((button) => {
    button.addEventListener('click', () => selectRuleMode(button.dataset.rule));
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
})();
