const playerNameKey = 'cosmos-player-name';
const playerName = localStorage.getItem(playerNameKey);
const click = new Audio('audio/click.mp3');
const mouse = new Audio('audio/mouse.mp3');

if (!playerName) {
  window.location.href = 'index.html';
} else {
  initGame();
}

function initGame() {
  const boardElement = document.getElementById('board');
  const pairsFoundText = document.getElementById('pairsFound');
  const attemptsText = document.getElementById('attempts');
  const timerText = document.getElementById('timer');
  const scoreValue = document.getElementById('scoreValue');
  const comboValueText = document.getElementById('comboValue');
  const comboProgressBar = document.getElementById('comboProgress');
  const difficultyButtons = document.querySelectorAll('.difficulty');
  const timerToggleButton = document.getElementById('timerToggle');
  const customSettingsPanel = document.getElementById('customSettings');
  const customPairsInput = document.getElementById('customPairs');
  const customMultiplierInput = document.getElementById('customMultiplier');
  const customTimeInput = document.getElementById('customTime');
  const setupModal = document.getElementById('setupModal');
  const closeSetupModalButton = document.getElementById('closeSetupModal');
  const startMatchButton = document.getElementById('startMatchButton');
  const openSetupButton = document.getElementById('openSetupButton');
  const currentDifficultyLabel = document.getElementById('currentDifficultyLabel');
  const currentTimerLabel = document.getElementById('currentTimerLabel');
  const rankingList = document.getElementById('rankingList');
  const viewRankingButton = document.getElementById('viewRankingButton');
  const fullRankingModal = document.getElementById('fullRankingModal');
  const fullRankingList = document.getElementById('fullRankingList');
  const closeFullRankingModalButton = document.getElementById('closeFullRankingModal');
  const scoreModal = document.getElementById('scoreModal');
  const modalScoreValue = document.getElementById('modalScoreValue');
  const modalPlayerName = document.getElementById('modalPlayerName');
  const playAgainButton = document.getElementById('playAgainButton');
  const playerNameLabel = document.getElementById('playerNameLabel');

  playerNameLabel.textContent = playerName;

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
    'img/venus.png',
    'img/asteroide.png',
    'img/ceres.png',
    'img/haumea.png',
    'img/makemake.png',
    'img/galaxiaEliptica.png',
    'img/galaxiaEspiral.png',
    'img/galaxiaIrregular.png',
    'img/Estrela%20Amarela.png',
    'img/Estrela%20Azul.png',
    'img/Estrela%20Vermelha.png',
    'img/Estrela%20branca.png'
  ];
  const rankingStorageKey = 'memory-game-ranking';

  const config = {
    easy: { time: 120, multiplier: 1.0, rows: 2, cols: 4, pairs: 4 },
    medium: { time: 90, multiplier: 1.3, rows: 3, cols: 4, pairs: 6 },
    hard: {time: 60, multiplier: 1.6, rows: 4, cols: 4, pairs: 8},
    custom: {time: 90, multiplier: 1.5, rows: 4, cols: 4, pairs: 8}
  }

  function computeAutoLayout(totalCards) {
    let rows = 1;
    let cols = totalCards;
    for (let candidate = 1; candidate <= Math.sqrt(totalCards); candidate += 1) {
      if (totalCards % candidate === 0) {
        rows = candidate;
        cols = totalCards / candidate;
      }
    }
    return { rows, cols };
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function applyCustomConfig() {
    const pairs = Math.round(clampNumber(customPairsInput.value, 2, cardImages.length, 8));
    const multiplier = clampNumber(customMultiplierInput.value, 0.5, 3, 1.5);
    const time = Math.round(clampNumber(customTimeInput.value, 10, 3600, 90));
    const { rows, cols } = computeAutoLayout(pairs * 2);

    customPairsInput.value = pairs;
    customMultiplierInput.value = multiplier;
    customTimeInput.value = time;

    config.custom = { time, multiplier, rows, cols, pairs };
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

  let pendingLevel = state.level;
  let hasStartedOnce = false;
  const levelNames = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil', custom: 'Personalizado' };

  function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const min = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
    const sec = String(safeSeconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  const BOARD_GAP = 12;

  function fitBoardSize() {
    const levelConfig = config[state.level];
    const panel = boardElement.parentElement;
    const panelStyles = getComputedStyle(panel);
    const paddingX = parseFloat(panelStyles.paddingLeft) + parseFloat(panelStyles.paddingRight);
    const paddingY = parseFloat(panelStyles.paddingTop) + parseFloat(panelStyles.paddingBottom);
    const availableWidth = panel.clientWidth - paddingX;
    const availableHeight = panel.clientHeight - paddingY;

    const cellByWidth = (availableWidth - BOARD_GAP * (levelConfig.cols - 1)) / levelConfig.cols;
    const cellByHeight = (availableHeight - BOARD_GAP * (levelConfig.rows - 1)) / levelConfig.rows;
    const cellSize = Math.max(40, Math.floor(Math.min(cellByWidth, cellByHeight)));

    boardElement.style.width = `${cellSize * levelConfig.cols + BOARD_GAP * (levelConfig.cols - 1)}px`;
    boardElement.style.height = `${cellSize * levelConfig.rows + BOARD_GAP * (levelConfig.rows - 1)}px`;
  }

  function createBoard() {
    const levelConfig = config[state.level];
    const selected = shuffle([...cardImages]).slice(0, levelConfig.pairs);
    const pairs = [...selected, ...selected];
    state.board = shuffle(pairs).map((value, index) => ({ id: index, value, matched: false }));
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${levelConfig.cols}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${levelConfig.rows}, 1fr)`;
    fitBoardSize();

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

  function loadRanking() {
    const storedRanking = localStorage.getItem(rankingStorageKey);
    if (!storedRanking) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedRanking);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
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
      const timeText = entry.timeTaken != null ? formatTime(entry.timeTaken) : '00:00';
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
    const ranking = loadRanking();
    const timeTaken = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    const updatedRanking = [...ranking, { name: playerName, score: state.score, timeTaken }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    localStorage.setItem(rankingStorageKey, JSON.stringify(updatedRanking));
    renderRanking();
  }

  function openScoreModal() {
    modalPlayerName.textContent = playerName;
    modalScoreValue.textContent = state.score;
    scoreModal.classList.remove('hidden');
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

  function startTimer() {
    clearInterval(state.timerId);
    if (!state.timerEnabled) return;

    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      timerText.textContent = formatTime(state.timeLeft);
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        endGame();
      }
    }, 1000);
  }

  function resetGame() {
    closeScoreModal();
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
    startTimer();
  }

  function endGame() {
    state.lockBoard = true;
    saveScoreToRanking();
    setTimeout(() => openScoreModal(), 120);
  }

  function flipCard(card, cardElement) {
    if (state.lockBoard || card.matched || cardElement.classList.contains('flipped')) return;

    click.currentTime = 0;
    click.play();
    click.volume = 0.03;

    setTimeout(() => {
      click.pause();
    }, 1000);

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
        endGame();
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

  function updateCurrentSettingsLabels() {
    currentDifficultyLabel.textContent = levelNames[state.level];
    currentTimerLabel.textContent = state.timerEnabled ? 'Ativado' : 'Desativado';
  }

  function selectPendingDifficulty(level) {
    pendingLevel = level;

    mouse.play()
    setTimeout(() => {
      click.pause();
    }, 50);

    difficultyButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.level === level);
    });
    customSettingsPanel.classList.toggle('is-hidden', level !== 'custom');
  }

  function openSetupModal() {
    selectPendingDifficulty(state.level);
    timerToggleButton.checked = state.timerEnabled;
    closeSetupModalButton.classList.toggle('is-hidden', !hasStartedOnce);
    clearInterval(state.timerId);
    setupModal.classList.remove('hidden');
  }

  function closeSetupModal() {
    setupModal.classList.add('hidden');
    if (hasStartedOnce && state.timerEnabled && state.timeLeft > 0 && !state.lockBoard) {
      startTimer();
    }
  }

  function confirmSetup() {
    if (pendingLevel === 'custom') {
      applyCustomConfig();
    }
    state.level = pendingLevel;
    state.timerEnabled = timerToggleButton.checked;
    hasStartedOnce = true;
    updateCurrentSettingsLabels();
    setupModal.classList.add('hidden');
    resetGame();
  }

  difficultyButtons.forEach(button => {
    button.addEventListener('click', () => selectPendingDifficulty(button.dataset.level));
  });

  openSetupButton.addEventListener('click', openSetupModal);
  closeSetupModalButton.addEventListener('click', closeSetupModal);
  startMatchButton.addEventListener('click', confirmSetup);
  viewRankingButton.addEventListener('click', openFullRankingModal);
  closeFullRankingModalButton.addEventListener('click', closeFullRankingModal);
  playAgainButton.addEventListener('click', () => {
    closeScoreModal();
    hasStartedOnce = false;
    openSetupModal();
  });

  setupModal.addEventListener('click', (event) => {
    if (event.target === setupModal && hasStartedOnce) {
      closeSetupModal();
    }
  });

  fullRankingModal.addEventListener('click', (event) => {
    if (event.target === fullRankingModal) {
      closeFullRankingModal();
    }
  });

  window.addEventListener('resize', fitBoardSize);

  renderRanking();
  updateCurrentSettingsLabels();
  openSetupModal();
}
