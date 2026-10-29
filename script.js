(function () {
  const BOARD_SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function cloneBoard(board) {
    return board.map((row) => [...row]);
  }

  function isInside(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function getAvailableMoves(board) {
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

  function getCandidateMoves(board) {
    const occupied = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] !== EMPTY) {
          occupied.push({ row, col });
        }
      }
    }

    if (occupied.length === 0) {
      return [{ row: 7, col: 7 }];
    }

    const seen = new Set();
    const candidates = [];

    occupied.forEach(({ row, col }) => {
      for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
        for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
          const nextRow = row + rowOffset;
          const nextCol = col + colOffset;
          if (!isInside(nextRow, nextCol) || board[nextRow][nextCol] !== EMPTY) {
            continue;
          }
          const key = `${nextRow}:${nextCol}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ row: nextRow, col: nextCol });
          }
        }
      }
    });

    return candidates.length > 0 ? candidates : getAvailableMoves(board);
  }

  function countAligned(board, row, col, player, deltaRow, deltaCol) {
    let count = 0;
    let r = row + deltaRow;
    let c = col + deltaCol;
    while (isInside(r, c) && board[r][c] === player) {
      count += 1;
      r += deltaRow;
      c += deltaCol;
    }
    return count;
  }

  function hasFiveInLine(board, row, col, player) {
    return DIRECTIONS.some(([deltaRow, deltaCol]) => {
      const forward = countAligned(board, row, col, player, deltaRow, deltaCol);
      const backward = countAligned(board, row, col, player, -deltaRow, -deltaCol);
      return forward + backward + 1 >= 5;
    });
  }

  function findWinner(board) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const value = board[row][col];
        if (value !== EMPTY && hasFiveInLine(board, row, col, value)) {
          return value;
        }
      }
    }
    return null;
  }

  function getLineValues(board, row, col, deltaRow, deltaCol, length = 9) {
    const values = [];
    const half = Math.floor((length - 1) / 2);
    for (let offset = -half; offset <= half; offset += 1) {
      const nextRow = row + deltaRow * offset;
      const nextCol = col + deltaCol * offset;
      values.push(isInside(nextRow, nextCol) ? board[nextRow][nextCol] : EMPTY);
    }
    return values;
  }

  function summarizePatterns(board, row, col, player) {
    const summary = { openTwo: 0, closedThree: 0, openThree: 0, closedFour: 0, openFour: 0, five: 0 };

    DIRECTIONS.forEach(([deltaRow, deltaCol]) => {
      const line = getLineValues(board, row, col, deltaRow, deltaCol, 9);
      for (let start = 0; start <= line.length - 5; start += 1) {
        const window = line.slice(start, start + 5);
        const playerCount = window.filter((value) => value === player).length;
        const emptyCount = window.filter((value) => value === EMPTY).length;

        if (playerCount === 5) {
          summary.five += 1;
          continue;
        }

        if (playerCount === 4 && emptyCount === 1) {
          const left = start === 0 ? EMPTY : line[start - 1];
          const right = start + 5 >= line.length ? EMPTY : line[start + 5];
          if (left === EMPTY && right === EMPTY) {
            summary.openFour += 1;
          } else {
            summary.closedFour += 1;
          }
          continue;
        }

        if (playerCount === 3 && emptyCount === 2) {
          const left = start === 0 ? EMPTY : line[start - 1];
          const right = start + 5 >= line.length ? EMPTY : line[start + 5];
          if (left === EMPTY && right === EMPTY) {
            summary.openThree += 1;
          } else {
            summary.closedThree += 1;
          }
          continue;
        }

        if (playerCount === 2 && emptyCount === 3) {
          const left = start === 0 ? EMPTY : line[start - 1];
          const right = start + 5 >= line.length ? EMPTY : line[start + 5];
          if (left === EMPTY && right === EMPTY) {
            summary.openTwo += 1;
          }
        }
      }
    });

    return summary;
  }

  function evaluateMoveScore(board, row, col, player) {
    const nextBoard = cloneBoard(board);
    nextBoard[row][col] = player;

    if (hasFiveInLine(nextBoard, row, col, player)) {
      return 1_000_000;
    }

    const summary = summarizePatterns(nextBoard, row, col, player);
    const opponent = player === BLACK ? WHITE : BLACK;
    const opponentSummary = summarizePatterns(nextBoard, row, col, opponent);

    let score = 0;
    score += summary.openFour * 220_000;
    score += summary.closedFour * 35_000;
    score += summary.openThree * 12_000;
    score += summary.closedThree * 4_500;
    score += summary.openTwo * 600;

    score -= opponentSummary.openFour * 180_000;
    score -= opponentSummary.closedFour * 30_000;
    score -= opponentSummary.openThree * 9_000;

    const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
    score += Math.max(0, 18 - centerDistance) * 35;

    return score;
  }

  function isMoveLegal(board, row, col, player, ruleMode = 'free') {
    if (!isInside(row, col)) {
      return false;
    }
    if (board[row][col] !== EMPTY) {
      return false;
    }

    if (ruleMode === 'renju' && player === BLACK) {
      const nextBoard = cloneBoard(board);
      nextBoard[row][col] = player;
      if (hasFiveInLine(nextBoard, row, col, player)) {
        return true;
      }

      const summary = summarizePatterns(nextBoard, row, col, player);
      const fourCount = summary.openFour + summary.closedFour;
      const threeCount = summary.openThree + summary.closedThree;
      const overLine = DIRECTIONS.some(([deltaRow, deltaCol]) => {
        let total = 1;
        let r = row + deltaRow;
        let c = col + deltaCol;
        while (isInside(r, c) && nextBoard[r][c] === player) {
          total += 1;
          r += deltaRow;
          c += deltaCol;
        }
        r = row - deltaRow;
        c = col - deltaCol;
        while (isInside(r, c) && nextBoard[r][c] === player) {
          total += 1;
          r -= deltaRow;
          c -= deltaCol;
        }
        return total >= 6;
      });

      if (overLine) {
        return false;
      }

      if (threeCount >= 2 || fourCount >= 2) {
        return false;
      }
    }

    return true;
  }

  function findImmediateWinMove(board, player, ruleMode = 'free') {
    const legalMoves = getCandidateMoves(board).filter((move) => isMoveLegal(board, move.row, move.col, player, ruleMode));

    for (const move of legalMoves) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.row][move.col] = player;
      if (hasFiveInLine(nextBoard, move.row, move.col, player)) {
        return move;
      }
    }

    return null;
  }

  function evaluateBoardScore(board, player) {
    let score = 0;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const value = board[row][col];
        if (value === EMPTY) {
          continue;
        }

        const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
        const centerBias = Math.max(0, 20 - centerDistance);
        score += value === player ? centerBias * 10 : -centerBias * 10;

        const summary = summarizePatterns(board, row, col, value);
        if (value === player) {
          score += summary.openFour * 35_000;
          score += summary.closedFour * 12_000;
          score += summary.openThree * 3_200;
          score += summary.closedThree * 1_100;
          score += summary.openTwo * 180;
        } else {
          score -= summary.openFour * 40_000;
          score -= summary.closedFour * 14_000;
          score -= summary.openThree * 3_800;
          score -= summary.closedThree * 1_300;
          score -= summary.openTwo * 220;
        }
      }
    }

    return score;
  }

  function orderMoves(board, player, ruleMode, limit = 8) {
    const legalMoves = getCandidateMoves(board)
      .filter((move) => isMoveLegal(board, move.row, move.col, player, ruleMode))
      .map((move) => ({
        ...move,
        score: evaluateMoveScore(board, move.row, move.col, player),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return legalMoves;
  }

  function minimax(board, player, opponent, depth, alpha, beta, maximizingPlayer) {
    const winner = findWinner(board);
    if (winner === player) {
      return 10_000_000 + depth;
    }
    if (winner === opponent) {
      return -10_000_000 + depth;
    }
    if (depth === 0 || getAvailableMoves(board).length === 0) {
      return evaluateBoardScore(board, player) - evaluateBoardScore(board, opponent) * 0.8;
    }

    const moves = orderMoves(board, maximizingPlayer, 'free', 8);
    if (moves.length === 0) {
      return evaluateBoardScore(board, player) - evaluateBoardScore(board, opponent) * 0.8;
    }

    let bestScore = maximizingPlayer === player ? -Infinity : Infinity;

    for (const move of moves) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.row][move.col] = maximizingPlayer;
      const score = minimax(nextBoard, player, opponent, depth - 1, alpha, beta, maximizingPlayer === player ? opponent : player);

      if (maximizingPlayer === player) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, bestScore);
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  function getBestAIMove(board, player, difficulty = 'hard', ruleMode = 'free') {
    const legalMoves = getCandidateMoves(board).filter((move) => isMoveLegal(board, move.row, move.col, player, ruleMode));
    if (legalMoves.length === 0) {
      return null;
    }

    const immediateWin = findImmediateWinMove(board, player, ruleMode);
    if (immediateWin) {
      return immediateWin;
    }

    const opponent = player === BLACK ? WHITE : BLACK;
    const enemyWin = findImmediateWinMove(board, opponent, ruleMode);
    if (enemyWin && isMoveLegal(board, enemyWin.row, enemyWin.col, player, ruleMode)) {
      return enemyWin;
    }

    const ordered = orderMoves(board, player, ruleMode, 10);
    const depthMap = { easy: 1, normal: 2, hard: 2 };
    const depth = depthMap[difficulty] ?? 2;

    let bestMove = ordered[0]?.move ?? legalMoves[0];
    let bestScore = -Infinity;

    for (const candidate of ordered) {
      const nextBoard = cloneBoard(board);
      nextBoard[candidate.row][candidate.col] = player;
      const replyScore = minimax(nextBoard, player, opponent, depth - 1, -Infinity, Infinity, opponent);
      const localScore = evaluateMoveScore(board, candidate.row, candidate.col, player) - replyScore * 0.35;

      if (localScore > bestScore) {
        bestScore = localScore;
        bestMove = { row: candidate.row, col: candidate.col };
      }
    }

    return bestMove;
  }

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
    scores: { black: 0, white: 0, draw: 0 },
    patternMemory: { black: [], white: [] },
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

  let aiTimerId = null;

  function recordMoveMemory(player, row, col) {
    const key = player === BLACK ? 'black' : 'white';
    state.patternMemory[key].push({ row, col });
    if (state.patternMemory[key].length > 12) {
      state.patternMemory[key].shift();
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

  function resetGame() {
    clearAiTimer();
    state.board = createEmptyBoard();
    state.currentPlayer = BLACK;
    state.winner = null;
    state.status = '게임 시작';
    state.moves = [];
    state.lastMove = null;
    state.history = [];
    state.aiThinking = false;
    state.patternMemory = { black: [], white: [] };
    render();
  }

  function clearAiTimer() {
    if (aiTimerId) {
      clearTimeout(aiTimerId);
      aiTimerId = null;
    }
  }

  function isMoveAllowed(row, col, player = state.currentPlayer) {
    if (!window.OmokLogic || typeof window.OmokLogic.isMoveLegal !== 'function') {
      return false;
    }
    return window.OmokLogic.isMoveLegal(state.board, row, col, player, state.ruleMode);
  }

  function makeAIMove() {
    if (!state.aiThinking || state.winner) {
      return;
    }

    const move = getBestAIMove(state.board, WHITE, state.difficulty, state.ruleMode);
    if (!move) {
      state.aiThinking = false;
      render();
      return;
    }

    state.history.push({
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
    });

    state.board[move.row][move.col] = WHITE;
    state.lastMove = { row: move.row, col: move.col };
    state.moves.push({ row: move.row, col: move.col, player: WHITE });
    recordMoveMemory(WHITE, move.row, move.col);

    if (hasFiveInLine(state.board, move.row, move.col, WHITE)) {
      state.winner = WHITE;
      state.status = 'AI 승리';
    } else if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
      state.status = '무승부';
    } else {
      state.currentPlayer = BLACK;
      state.status = `${PLAYER_NAMES[state.currentPlayer]} 차례`;
    }

    state.aiThinking = false;
    clearAiTimer();
    render();
  }

  function handleMove(row, col) {
    if (state.winner) {
      return;
    }
    if (state.aiThinking) {
      return;
    }
    if (state.board[row][col] !== EMPTY) {
      return;
    }
    if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
      return;
    }
    if (state.mode === 'ai' && state.currentPlayer === WHITE) {
      return;
    }

    if (!isMoveAllowed(row, col, state.currentPlayer)) {
      state.status = state.ruleMode === 'renju' ? '금수 위치입니다. 다른 곳을 선택해 주세요.' : '이미 사용된 위치입니다.';
      render();
      return;
    }

    state.history.push({
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
    });

    state.board[row][col] = state.currentPlayer;
    state.lastMove = { row, col };
    state.moves.push({ row, col, player: state.currentPlayer });
    recordMoveMemory(state.currentPlayer, row, col);

    if (hasFiveInLine(state.board, row, col, state.currentPlayer)) {
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
      clearAiTimer();
      aiTimerId = setTimeout(() => {
        makeAIMove();
      }, state.difficulty === 'easy' ? 350 : state.difficulty === 'normal' ? 550 : 900);
    }
  }

  function undoMove() {
    clearAiTimer();
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
    state.ruleMode = previous.ruleMode;
    state.aiThinking = false;
    state.patternMemory = previous.patternMemory;
    render();
  }

  function showModeSelection() {
    clearAiTimer();
    modeSelection.classList.remove('hidden');
    gameShell.classList.add('hidden');
    state.mode = 'friend';
    resetGame();
  }

  function selectMode(mode) {
    clearAiTimer();
    state.mode = mode;
    modeSelection.classList.add('hidden');
    gameShell.classList.remove('hidden');
    gameTitle.textContent = mode === 'friend' ? '친구 대전' : '인공지능 대전';
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

  function runSelfTests() {
    const board = createEmptyBoard();

    // immediate 5 in a row
    for (let col = 0; col < 5; col += 1) {
      board[7][7 + col] = BLACK;
    }
    if (!hasFiveInLine(board, 7, 9, BLACK)) {
      throw new Error('5-line detection failed');
    }

    const board2 = createEmptyBoard();
    board2[7][7] = BLACK;
    board2[7][8] = BLACK;
    board2[7][9] = BLACK;
    board2[7][10] = BLACK;
    if (!isMoveLegal(board2, 7, 11, BLACK, 'free')) {
      throw new Error('legal move detection failed');
    }

    const board3 = createEmptyBoard();
    for (let i = 0; i < 4; i += 1) {
      board3[7][7 + i] = BLACK;
    }
    const winMove = findImmediateWinMove(board3, BLACK, 'free');
    if (!winMove || winMove.row !== 7 || winMove.col !== 11) {
      throw new Error('immediate win detection failed');
    }
  }

  function init() {
    modeSelection.classList.remove('hidden');
    gameShell.classList.add('hidden');
    bindEvents();
    buildBoard();
    runSelfTests();
    render();
  }

  init();
})();
