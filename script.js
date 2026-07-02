const boardElement = document.getElementById('board');
const pairsFoundText = document.getElementById('pairsFound');
const attemptsText = document.getElementById('attempts');
const timerText = document.getElementById('timer');
const scoreValue = document.getElementById('scoreValue');
const comboValueText = document.getElementById('comboValue');
const comboProgressBar = document.getElementById('comboProgress');
const difficultyButtons = document.querySelectorAll('.difficulty');
const timerToggleButton = document.getElementById('timerToggle');
const rankingList = document.getElementById('rankingList');
const viewRankingButton = document.getElementById('viewRankingButton');
const fullRankingModal = document.getElementById('fullRankingModal');
const fullRankingList = document.getElementById('fullRankingList');
const closeFullRankingModalButton = document.getElementById('closeFullRankingModal');
const scoreModal = document.getElementById('scoreModal');
const modalScoreValue = document.getElementById('modalScoreValue');
const playerNameInput = document.getElementById('playerNameInput');
const confirmScoreSaveButton = document.getElementById('confirmScoreSave');
const cancelScoreSaveButton = document.getElementById('cancelScoreSave');

const cardImages = [
  'img/jupiter.png',
  'img/lua.png',
  'img/marte.png',
  'img/mercurio.png',
  'img/netuno.png',
  'img/plutao.png',
  'img/saturno.png',
  'img/sol.png',
  'img/terra.png',
  'img/urano.png',
  'img/venus.png'
];
const rankingStorageKey = 'memory-game-ranking';

const config = {
  easy: {time: 120, multiplier: 1.0, rows: 2, cols: 4, pairs: 4},
  medium: {time: 90, multiplier: 1.3, rows: 3, cols: 4, pairs: 6},
  hard: {time: 60, multiplier: 1.6, rows: 4, cols: 4, pairs: 8}
}

let state = {
  level: 'easy',
  board: [],
  firstCard: null,
  secondCard: null,
  lockBoard: false,
  matchedPairs: 0,
  attempts: 0,
  score: 0,
  timeLeft: config.easy.time,
  timerId: null,
  timerEnabled: true,
  combo: 0,
  startedAt: Date.now()
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, '0');
  const sec = String(seconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return formatTime(safeSeconds);
}

function createBoard() {
  const levelConfig = config[state.level];
  const selected = Array.from({ length: levelConfig.pairs }, (_, index) => cardImages[index % cardImages.length]);
  const pairs = [...selected, ...selected];
  state.board = shuffle(pairs).map((value, index) => ({ id: index, value, matched: false }));
  boardElement.innerHTML = '';
  boardElement.style.gridTemplateColumns = `repeat(${levelConfig.cols}, minmax(0, 1fr))`;
  boardElement.style.gridTemplateRows = `repeat(${levelConfig.rows}, minmax(0, 1fr))`;

  state.board.forEach(card => {
    const cardElement = document.createElement('button');
    cardElement.className = 'card';
    cardElement.dataset.id = card.id;
    cardElement.innerHTML = `
      <div class="card-face card-front"><img src="${card.value}" alt="Carta" class="card-image"></div>
      <div class="card-face card-back"></div>
    `;
    cardElement.addEventListener('click', () => flipCard(card, cardElement));
    boardElement.appendChild(cardElement);
  });

}

function updateStats() {
  pairsFoundText.textContent = `${state.matchedPairs} / ${config[state.level].pairs}`;
  attemptsText.textContent = state.attempts;
  scoreValue.textContent = state.score;
  timerText.textContent = state.timerEnabled ? formatTime(state.timeLeft) : '00:00';

  const maxCombo = 5;
  const comboPercent = Math.min(state.combo / maxCombo, 1) * 100;
  comboValueText.textContent = `${state.combo}`;
  comboProgressBar.style.width = `${comboPercent}%`;
}

function triggerMatchEffect() {
  const confettiLayer = document.getElementById('confettiLayer');
  const colors = ['#ff6c8a', '#ffd166', '#39d985', '#6c7cff', '#35d8ff'];

  for (let index = 0; index < 16; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 180}px`);
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 1400);
  }

  [state.firstCard, state.secondCard].forEach(entry => {
    if (entry?.element) {
      entry.element.classList.add('matched');
      setTimeout(() => entry.element.classList.remove('matched'), 400);
    }
  });
}

function getDefaultRanking() {
  return [];
}

function clearRankingData() {
  localStorage.removeItem(rankingStorageKey);
  renderRanking();
}

function loadRanking() {
  const storedRanking = localStorage.getItem(rankingStorageKey);
  if (!storedRanking) {
    return getDefaultRanking();
  }

  try {
    const parsed = JSON.parse(storedRanking);
    return Array.isArray(parsed) ? parsed : getDefaultRanking();
  } catch (error) {
    return getDefaultRanking();
  }
}

function renderRankingList(listElement, ranking, limit = null) {
  listElement.innerHTML = '';

  if (!ranking.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-ranking';
    emptyItem.textContent = 'Nenhuma pontuação registrada ainda.';
    listElement.appendChild(emptyItem);
    return;
  }

  const entries = limit ? ranking.slice(0, limit) : ranking;

  entries.forEach((entry, index) => {
    const item = document.createElement('li');
    const timeText = entry.timeTaken != null ? formatDuration(entry.timeTaken) : '00:00';
    item.innerHTML = `
      <span>${index + 1}. ${entry.name}</span>
      <div class="ranking-values">
        <strong>${entry.score}</strong>
        <small>${timeText}</small>
      </div>
    `;
    listElement.appendChild(item);
  });
}

function renderRanking() {
  const ranking = loadRanking();
  renderRankingList(rankingList, ranking, 5);
}

function renderFullRanking() {
  const ranking = loadRanking();
  renderRankingList(fullRankingList, ranking);
}

function saveScoreToRanking() {
  const name = playerNameInput.value.trim();
  if (!name) {
    playerNameInput.focus();
    return;
  }

  const ranking = loadRanking();
  const timeTaken = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
  const updatedRanking = [...ranking, { name, score: state.score, timeTaken }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  localStorage.setItem(rankingStorageKey, JSON.stringify(updatedRanking));
  renderRanking();
  closeScoreModal();
}

function openScoreModal() {
  modalScoreValue.textContent = state.score;
  playerNameInput.value = '';
  scoreModal.classList.remove('hidden');
  setTimeout(() => playerNameInput.focus(), 50);
}

function closeScoreModal() {
  scoreModal.classList.add('hidden');
}

function openFullRankingModal() {
  renderFullRanking();
  fullRankingModal.classList.remove('hidden');
}

function closeFullRankingModal() {
  fullRankingModal.classList.add('hidden');
}

function resetGame() {
  clearInterval(state.timerId);
  state.firstCard = null;
  state.secondCard = null;
  state.lockBoard = false;
  state.matchedPairs = 0;
  state.attempts = 0;
  state.score = 0;
  state.combo = 0;
  state.timeLeft = config[state.level].time;
  state.startedAt = Date.now();
  updateStats();
  createBoard();

  if (state.timerEnabled) {
    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        endGame(false);
      }
      timerText.textContent = formatTime(state.timeLeft);
    }, 1000);
  }
}

function endGame(win) {
  state.lockBoard = true;
  setTimeout(() => openScoreModal(), 120);
}

function flipCard(card, cardElement) {
  if (state.lockBoard || card.matched || cardElement.classList.contains('flipped')) return;
  cardElement.classList.add('flipped');
  if (!state.firstCard) {
    state.firstCard = { card, element: cardElement };
    return;
  }
  state.secondCard = { card, element: cardElement };
  state.attempts += 1;
  state.lockBoard = true;

  if (state.firstCard.card.value === state.secondCard.card.value) {
    state.firstCard.card.matched = true;
    state.secondCard.card.matched = true;
    state.matchedPairs += 1;
    state.combo += 1;
    triggerMatchEffect();

    const comboMultiplier = 1 + Math.min(state.combo - 1, 4) * 0.25;
    const roundPoints = Math.round(100 * config[state.level].multiplier * comboMultiplier);
    state.score += roundPoints;

    state.firstCard = null;
    state.secondCard = null;
    state.lockBoard = false;
    if (state.matchedPairs === config[state.level].pairs) {
      clearInterval(state.timerId);
      state.score += state.timeLeft * 2;
      updateStats();
      endGame(true);
    }
  } else {
    state.combo = 0;
    setTimeout(() => {
      state.firstCard.element.classList.remove('flipped');
      state.secondCard.element.classList.remove('flipped');
      state.firstCard = null;
      state.secondCard = null;
      state.lockBoard = false;
    }, 900);
  }

  updateStats();
}

function setActiveDifficulty(level) {
  difficultyButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.level === level);
  });
  state.level = level;
  resetGame();
}

function toggleTimer() {
  state.timerEnabled = !state.timerEnabled;
  timerToggleButton.classList.toggle('active', state.timerEnabled);
  timerToggleButton.textContent = state.timerEnabled ? 'Ativado' : 'Desativado';

  clearInterval(state.timerId);
  state.timeLeft = config[state.level].time;
  updateStats();

  if (state.timerEnabled) {
    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        endGame(false);
      }
      timerText.textContent = formatTime(state.timeLeft);
    }, 1000);
  }
}

difficultyButtons.forEach(button => {
  button.addEventListener('click', () => setActiveDifficulty(button.dataset.level));
});

timerToggleButton.addEventListener('click', toggleTimer);
viewRankingButton.addEventListener('click', openFullRankingModal);
closeFullRankingModalButton.addEventListener('click', closeFullRankingModal);
confirmScoreSaveButton.addEventListener('click', saveScoreToRanking);
cancelScoreSaveButton.addEventListener('click', closeScoreModal);
playerNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    saveScoreToRanking();
  }
});

fullRankingModal.addEventListener('click', (event) => {
  if (event.target === fullRankingModal) {
    closeFullRankingModal();
  }
});

renderRanking();
resetGame();
