const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BOARD_SIZE,
  BLACK,
  WHITE,
  createEmptyBoard,
  findWinner,
  getPatternSummary,
  getBestAIMove,
  isMoveLegal,
} = require('./game-logic.js');

test('가로 5목 승리를 찾는다', () => {
  const board = createEmptyBoard();
  for (let i = 0; i < 5; i += 1) {
    board[7][i] = BLACK;
  }
  assert.equal(findWinner(board), BLACK);
});

test('세로 5목 승리를 찾는다', () => {
  const board = createEmptyBoard();
  for (let i = 0; i < 5; i += 1) {
    board[i][7] = BLACK;
  }
  assert.equal(findWinner(board), BLACK);
});

test('대각선 5목 승리를 찾는다', () => {
  const board = createEmptyBoard();
  for (let i = 0; i < 5; i += 1) {
    board[i][i] = BLACK;
  }
  assert.equal(findWinner(board), BLACK);
});

test('점유된 위치에는 착수할 수 없다', () => {
  const board = createEmptyBoard();
  board[5][5] = WHITE;
  assert.equal(isMoveLegal(board, 5, 5, BLACK, 'free'), false);
});

test('열린 3 패턴을 인식한다', () => {
  const board = createEmptyBoard();
  board[7][4] = BLACK;
  board[7][5] = BLACK;
  board[7][6] = BLACK;
  assert.ok(getPatternSummary(board, 7, 5, BLACK).openThree >= 1);
});

test('AI는 즉시 승리를 선택한다', () => {
  const board = createEmptyBoard();
  for (let i = 0; i < 4; i += 1) {
    board[7][i] = BLACK;
  }

  const move = getBestAIMove(board, WHITE, 'hard', 'free');
  assert.ok(move && move.row === 7 && move.col === 4);
});

test('게임판 크기는 15x15다', () => {
  const board = createEmptyBoard();
  assert.equal(board.length, BOARD_SIZE);
  assert.equal(board[0].length, BOARD_SIZE);
});
