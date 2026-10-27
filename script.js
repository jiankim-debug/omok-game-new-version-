const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const PLAYER_NAMES = {
  [BLACK]: "검은돌",
  [WHITE]: "흰돌",
};

const state = {
  board: createEmptyBoard(),
  currentPlayer: BLACK,
  winner: null,
  status: "게임 시작",
  moves: [],
  lastMove: null,
  history: [],
  mode: "friend",
  difficulty: "easy",
  aiThinking: false,
  scores: {
    black: 0,
    white: 0,
    draw: 0,
  },
};

const boardElement = document.getElementById("board");
const turnIndicator = document.getElementById("turn-indicator");
const statusText = document.getElementById("status-text");
const moveCount = document.getElementById("move-count");
const newGameButton = document.getElementById("new-game-btn");
const undoButton = document.getElementById("undo-btn");
const modeSelection = document.getElementById("mode-selection");
const gameShell = document.getElementById("game-shell");
const modeSelectButton = document.getElementById("mode-select-btn");
const gameTitle = document.getElementById("game-title");

const blackScoreEl = document.getElementById("black-score");
const whiteScoreEl = document.getElementById("white-score");
const drawScoreEl = document.getElementById("draw-score");

const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const modeButtons = document.querySelectorAll(".mode-btn");

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
    mode: state.mode,
    difficulty: state.difficulty,
  };
}

function buildBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "board-cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("aria-label", `${row + 1}행, ${col + 1}열`);
      cell.addEventListener("click", () => handleMove(row, col));
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
      cell.classList.remove("last-move");
      cell.innerHTML = "";

      if (value !== EMPTY) {
        const stone = document.createElement("span");
        stone.className = `stone ${value === BLACK ? "black" : "white"}`;
        cell.appendChild(stone);
      }

      if (state.lastMove && state.lastMove.row === row && state.lastMove.col === col) {
        cell.classList.add("last-move");
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
    turnIndicator.className = `turn-indicator ${state.winner === BLACK ? "black" : "white"}`;
    statusText.textContent = `${PLAYER_NAMES[state.winner]}이(가) 승리했습니다!`;
    return;
  }

  if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    turnIndicator.textContent = "무승부";
    turnIndicator.className = "turn-indicator black";
    statusText.textContent = "무승부입니다. 다시 시작해 보세요.";
    return;
  }

  if (state.mode === "ai" && state.currentPlayer === WHITE) {
    turnIndicator.textContent = "AI 생각 중...";
    turnIndicator.className = "turn-indicator white";
    statusText.textContent = "인공지능이 수를 두고 있습니다.";
    return;
  }

  turnIndicator.textContent = PLAYER_NAMES[state.currentPlayer];
  turnIndicator.className = `turn-indicator ${state.currentPlayer === BLACK ? "black" : "white"}`;
  statusText.textContent = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
}

function render() {
  renderBoard();
  updateScoreBoard();
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

function isBoardFull() {
  return state.moves.length >= BOARD_SIZE * BOARD_SIZE;
}

function getAvailableMoves() {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (state.board[row][col] === EMPTY) {
        moves.push({ row, col });
      }
    }
  }

  return moves;
}

function hasFiveInLineForBoard(board, row, col, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([deltaRow, deltaCol]) => {
    let count = 1;
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

    let backwardRow = row - deltaRow;
    let backwardCol = col - deltaCol;

    while (
      backwardRow >= 0 &&
      backwardRow < BOARD_SIZE &&
      backwardCol >= 0 &&
      backwardCol < BOARD_SIZE &&
      board[backwardRow][backwardCol] === player
    ) {
      count += 1;
      backwardRow -= deltaRow;
      backwardCol -= deltaCol;
    }

    return count >= 5;
  });
}

function findImmediateWinMove(player) {
  const availableMoves = getAvailableMoves();

  for (const move of availableMoves) {
    const nextBoard = state.board.map((row) => [...row]);
    nextBoard[move.row][move.col] = player;

    if (hasFiveInLineForBoard(nextBoard, move.row, move.col, player)) {
      return move;
    }
  }

  return null;
}

function evaluateMove(row, col, player) {
  const board = state.board;
  let score = 0;

  if (!board[row][col]) {
    score += 10;
  }

  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 0;
    let nextRow = row + dr;
    let nextCol = col + dc;

    while (
      nextRow >= 0 &&
      nextRow < BOARD_SIZE &&
      nextCol >= 0 &&
      nextCol < BOARD_SIZE &&
      board[nextRow][nextCol] === player
    ) {
      count += 1;
      nextRow += dr;
      nextCol += dc;
    }

    let behindRow = row - dr;
    let behindCol = col - dc;

    while (
      behindRow >= 0 &&
      behindRow < BOARD_SIZE &&
      behindCol >= 0 &&
      behindCol < BOARD_SIZE &&
      board[behindRow][behindCol] === player
    ) {
      count += 1;
      behindRow -= dr;
      behindCol -= dc;
    }

    score += count * 4;
  }

  return score;
}

function getDifficultyDelay() {
  const map = {
    easy: 350,
    normal: 500,
    hard: 700,
  };

  return map[state.difficulty] || 500;
}

function getBestAIMove() {
  const availableMoves = getAvailableMoves();
  if (availableMoves.length === 0) return null;

  const center = Math.floor(BOARD_SIZE / 2);

  const winMove = findImmediateWinMove(BLACK);
  if (winMove) return winMove;

  const blockMove = findImmediateWinMove(WHITE);
  if (blockMove) return blockMove;

  const ranked = availableMoves
    .map((move) => {
      const offense = evaluateMove(move.row, move.col, BLACK);
      const defense = evaluateMove(move.row, move.col, WHITE);
      const distance = Math.abs(move.row - center) + Math.abs(move.col - center);
      return {
        ...move,
        score: offense + defense + (10 - distance),
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0];
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
    state.status = "AI 승리";
  } else if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    state.status = "무승부";
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

  if (state.mode === "ai" && state.currentPlayer === WHITE) {
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
    state.status = "무승부";
  } else {
    state.currentPlayer = state.currentPlayer === BLACK ? WHITE : BLACK;
    state.status = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
  }

  render();

  if (state.mode === "ai" && state.currentPlayer === WHITE && !state.winner) {
    state.aiThinking = true;
    setTimeout(() => {
      makeAIMove();
    }, getDifficultyDelay());
  }
}

function updateRoundResult(winner) {
  if (winner === BLACK) {
    state.scores.black += 1;
  } else if (winner === WHITE) {
    state.scores.white += 1;
  } else {
    state.scores.draw += 1;
  }
}

function resetGame() {
  state.board = createEmptyBoard();
  state.currentPlayer = BLACK;
  state.winner = null;
  state.status = "게임 시작";
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
  modeSelection.classList.remove("hidden");
  gameShell.classList.add("hidden");
  state.mode = "friend";
  resetGame();
}

function selectMode(mode) {
  state.mode = mode;
  modeSelection.classList.add("hidden");
  gameShell.classList.remove("hidden");

  if (mode === "friend") {
    gameTitle.textContent = "친구 대전";
  } else {
    gameTitle.textContent = "인공지능 대전";
  }

  resetGame();
}

function selectDifficulty(level) {
  state.difficulty = level;
  difficultyButtons.forEach((button) => {
    const isActive = button.dataset.difficulty === level;
    button.classList.toggle("active", isActive);
  });
}

function bindEvents() {
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
  });

  modeSelectButton.addEventListener("click", () => {
    showModeSelection();
  });

  newGameButton.addEventListener("click", resetGame);
  undoButton.addEventListener("click", undoMove);
}

function init() {
  modeSelection.classList.remove("hidden");
  gameShell.classList.add("hidden");
  bindEvents();
  buildBoard();
  render();
}

init();
