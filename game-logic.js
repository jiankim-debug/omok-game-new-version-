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

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function countDirection(board, row, col, player, deltaRow, deltaCol) {
  let count = 0;
  let nextRow = row + deltaRow;
  let nextCol = col + deltaCol;

  while (isInside(nextRow, nextCol) && board[nextRow][nextCol] === player) {
    count += 1;
    nextRow += deltaRow;
    nextCol += deltaCol;
  }

  return count;
}

function hasFiveInLine(board, row, col, player) {
  return DIRECTIONS.some(([deltaRow, deltaCol]) => {
    const forward = countDirection(board, row, col, player, deltaRow, deltaCol);
    const backward = countDirection(board, row, col, player, -deltaRow, -deltaCol);
    return forward + backward + 1 >= 5;
  });
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

function isBoardFull(board) {
  return getAvailableMoves(board).length === 0;
}

function findWinner(board) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = board[row][col];
      if (value === EMPTY) continue;

      if (hasFiveInLine(board, row, col, value)) {
        return value;
      }
    }
  }

  return null;
}

function getLineValues(board, row, col, deltaRow, deltaCol, length = 9) {
  const values = [];

  for (let offset = -Math.floor((length - 1) / 2); offset <= Math.ceil((length - 1) / 2); offset += 1) {
    const nextRow = row + deltaRow * offset;
    const nextCol = col + deltaCol * offset;
    values.push(isInside(nextRow, nextCol) ? board[nextRow][nextCol] : EMPTY);
  }

  return values;
}

function getPatternSummary(board, row, col, player) {
  const summary = {
    openTwo: 0,
    closedThree: 0,
    openThree: 0,
    closedFour: 0,
    openFour: 0,
    five: 0,
  };

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

  const summary = getPatternSummary(nextBoard, row, col, player);
  const opponent = player === BLACK ? WHITE : BLACK;
  const opponentSummary = getPatternSummary(nextBoard, row, col, opponent);

  let score = 0;
  score += summary.openFour * 100_000;
  score += summary.closedFour * 10_000;
  score += summary.openThree * 3_000;
  score += summary.closedThree * 500;
  score += summary.openTwo * 100;

  score -= opponentSummary.openFour * 90_000;
  score -= opponentSummary.closedFour * 12_000;
  score -= opponentSummary.openThree * 2_500;

  const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
  score += Math.max(0, 18 - centerDistance) * 25;

  return score;
}

function findImmediateWinMove(board, player) {
  const moves = getAvailableMoves(board);

  for (const move of moves) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = player;
    if (hasFiveInLine(nextBoard, move.row, move.col, player)) {
      return move;
    }
  }

  return null;
}

function findBestPatternMove(board, player, patternType) {
  const moves = getAvailableMoves(board);
  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = player;
    const summary = getPatternSummary(nextBoard, move.row, move.col, player);

    let score = 0;
    score += summary.openFour * 120_000;
    score += summary.closedFour * 18_000;
    score += summary.openThree * 7_000;
    score += summary.closedThree * 1_200;
    score += summary.openTwo * 200;

    if (patternType === 'open-four' && summary.openFour > 0) {
      score *= 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (bestMove && bestScore > 0) {
    return bestMove;
  }

  return null;
}

function getCandidateMoves(board, player) {
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
        if (!isInside(nextRow, nextCol)) continue;
        if (board[nextRow][nextCol] !== EMPTY) continue;
        const key = `${nextRow}:${nextCol}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ row: nextRow, col: nextCol });
      }
    }
  });

  return candidates.length > 0 ? candidates : getAvailableMoves(board);
}

function isRenjuIllegalMove(board, row, col, player) {
  if (player !== BLACK) {
    return false;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = player;

  const summary = getPatternSummary(nextBoard, row, col, player);
  const overLine = (() => {
    let max = 0;
    DIRECTIONS.forEach(([deltaRow, deltaCol]) => {
      let count = 1;
      let nextRow = row + deltaRow;
      let nextCol = col + deltaCol;
      while (isInside(nextRow, nextCol) && nextBoard[nextRow][nextCol] === player) {
        count += 1;
        nextRow += deltaRow;
        nextCol += deltaCol;
      }
      nextRow = row - deltaRow;
      nextCol = col - deltaCol;
      while (isInside(nextRow, nextCol) && nextBoard[nextRow][nextCol] === player) {
        count += 1;
        nextRow -= deltaRow;
        nextCol -= deltaCol;
      }
      max = Math.max(max, count);
    });
    return max >= 6;
  })();

  if (overLine) {
    return true;
  }

  const threeCount = summary.openThree + summary.closedThree;
  const fourCount = summary.openFour + summary.closedFour;

  if (threeCount >= 2) {
    return true;
  }

  if (fourCount >= 2) {
    return true;
  }

  return false;
}

function isMoveLegal(board, row, col, player, ruleMode = 'free') {
  if (!isInside(row, col)) return false;
  if (board[row][col] !== EMPTY) return false;

  if (ruleMode === 'renju') {
    const nextBoard = cloneBoard(board);
    nextBoard[row][col] = player;
    if (hasFiveInLine(nextBoard, row, col, player)) {
      return true;
    }
    return !isRenjuIllegalMove(board, row, col, player);
  }

  return true;
}

function getBestAIMove(board, player, difficulty = 'hard', ruleMode = 'free') {
  const availableMoves = getCandidateMoves(board, player);
  const legalMoves = availableMoves.filter((move) => isMoveLegal(board, move.row, move.col, player, ruleMode));

  if (legalMoves.length === 0) {
    return null;
  }

  const opponent = player === BLACK ? WHITE : BLACK;
  const immediateWin = findImmediateWinMove(board, player);
  if (immediateWin && isMoveLegal(board, immediateWin.row, immediateWin.col, player, ruleMode)) {
    return immediateWin;
  }

  const enemyWin = findImmediateWinMove(board, opponent);
  if (enemyWin && isMoveLegal(board, enemyWin.row, enemyWin.col, player, ruleMode)) {
    return enemyWin;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  legalMoves.forEach((move) => {
    const score = evaluateMoveScore(board, move.row, move.col, player);
    const urgencyBoost = move.row === 7 && move.col === 7 ? 250 : 0;
    const difficultyBonus = difficulty === 'easy' ? 25 : difficulty === 'normal' ? 80 : 140;

    const total = score + urgencyBoost + difficultyBonus;
    if (total > bestScore) {
      bestScore = total;
      bestMove = move;
    }
  });

  return bestMove || legalMoves[0];
}

const OmokLogic = {
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  cloneBoard,
  createEmptyBoard,
  isInside,
  getAvailableMoves,
  isBoardFull,
  findWinner,
  hasFiveInLine,
  getPatternSummary,
  evaluateMoveScore,
  findImmediateWinMove,
  findBestPatternMove,
  isMoveLegal,
  isRenjuIllegalMove,
  getBestAIMove,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OmokLogic;
}

if (typeof window !== 'undefined') {
  window.OmokLogic = OmokLogic;
}
})();
