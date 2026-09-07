// app.js - Análise Futsal PRO
let currentPeriod = 1;
let periodDurationMinutes = 20;
let totalSeconds = periodDurationMinutes * 60;
let timerInterval = null;
let isRunning = false;

let homeGoals = 0;
let awayGoals = 0;

let actionLogsHistory = {
    1: [],
    2: []
};

let periodPitchHTML = {
    1: null,
    2: null
};

let timeoutsUsed = {
    1: { home: false, away: false },
    2: { home: false, away: false }
};

let statsData = {
    1: {
        home: { livres: 0, cantos: 0, lancamentos: 0, posse: 0, passes_falhados: 0, passes_completos: 0, remates: 0, golos: 0 },
        away: { livres: 0, cantos: 0, lancamentos: 0, posse: 0, passes_falhados: 0, passes_completos: 0, remates: 0, golos: 0 }
    },
    2: {
        home: { livres: 0, cantos: 0, lancamentos: 0, posse: 0, passes_falhados: 0, passes_completos: 0, remates: 0, golos: 0 },
        away: { livres: 0, cantos: 0, lancamentos: 0, posse: 0, passes_falhados: 0, passes_completos: 0, remates: 0, golos: 0 }
    }
};

let players = [];
let pendingPitchAction = null;

let chartMinutesInstance = null;
let chartShotsInstance = null;
let chartSubsInstance = null;

window.initAppAfterLogin = function() {
    renderPlayersList();
    updateTimerDisplay();
    updateTimeoutUI();
    updateFoulsUI();
    updateStatsDisplay();
    initCharts();
};

function switchLeftTab(tabName) {
    document.querySelectorAll('.btn-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    if (tabName === 'plantel') {
        document.querySelector('.btn-tab:nth-child(1)').classList.add('active');
        document.getElementById('tab-plantel').classList.add('active');
    } else if (tabName === 'graficos') {
        document.querySelector('.btn-tab:nth-child(2)').classList.add('active');
        document.getElementById('tab-graficos').classList.add('active');
        updateChartsData();
    }
}

function updateTeamNames() {
    let homeName = document.getElementById('input-home-name').value || 'DINAMO';
    let awayName = document.getElementById('input-away-name').value || 'VISITANTE';

    document.getElementById('home-team-title').innerText = `Plantel / Jogadores (${homeName.toUpperCase()})`;
    document.getElementById('stats-home-title').innerText = homeName.toUpperCase();
    document.getElementById('stats-away-title').innerText = awayName.toUpperCase();
    
    document.getElementById('to-home-label').innerText = `Time-out ${homeName}:`;
    document.getElementById('to-away-label').innerText = `Time-out ${awayName}:`;

    document.getElementById('sb-home-label').innerText = homeName.toUpperCase();
    document.getElementById('sb-away-label').innerText = awayName.toUpperCase();

    document.getElementById('pitch-remate-home-title').innerText = `REMATE ${homeName.toUpperCase()}`;
    document.getElementById('pitch-remate-away-title').innerText = `REMATE ${awayName.toUpperCase()}`;
    document.getElementById('pitch-golo-home-title').innerText = `GOLO ${homeName.toUpperCase()}`;
    document.getElementById('pitch-golo-away-title').innerText = `GOLO ${awayName.toUpperCase()}`;
}

function changeTimerDuration() {
    if (isRunning) return;
    let inputVal = parseInt(document.getElementById('timer-duration').value);
    if (!isNaN(inputVal) && inputVal > 0) {
        periodDurationMinutes = inputVal;
        totalSeconds = periodDurationMinutes * 60;
        updateTimerDisplay();
    }
}

// -------------------------------------------------------------
// SESSÃO JSON
// -------------------------------------------------------------
function exportSessionJSON() {
    let sessionData = {
        version: "PRO",
        currentPeriod: currentPeriod,
        periodDurationMinutes: periodDurationMinutes,
        totalSeconds: totalSeconds,
        homeGoals: homeGoals,
        awayGoals: awayGoals,
        homeName: document.getElementById('input-home-name').value,
        awayName: document.getElementById('input-away-name').value,
        observations: document.getElementById('match-observations').value,
        timeoutsUsed: timeoutsUsed,
        statsData: statsData,
        players: players,
        actionLogsHistory: actionLogsHistory,
        periodPitchHTML: periodPitchHTML,
        htmlLogs: document.getElementById('action-log').innerHTML,
        pitchMarkers: {
            homeShot: document.getElementById('pitch-shot-home').innerHTML,
            homeGoal: document.getElementById('pitch-goal-home').innerHTML,
            awayShot: document.getElementById('pitch-shot-away').innerHTML,
            awayGoal: document.getElementById('pitch-goal-away').innerHTML
        }
    };

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sessao_futsal_pro_${sessionData.homeName}_vs_${sessionData.awayName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importSessionJSON(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let sessionData = JSON.parse(e.target.result);
            pauseTimer();
            currentPeriod = sessionData.currentPeriod || 1;
            periodDurationMinutes = sessionData.periodDurationMinutes || 20;
            document.getElementById('timer-duration').value = periodDurationMinutes;
            totalSeconds = sessionData.totalSeconds || (periodDurationMinutes * 60);
            homeGoals = sessionData.homeGoals || 0;
            awayGoals = sessionData.awayGoals || 0;

            document.getElementById('input-home-name').value = sessionData.homeName || 'DINAMO';
            document.getElementById('input-away-name').value = sessionData.awayName || 'VISITANTE';
            document.getElementById('match-observations').value = sessionData.observations || '';
            
            timeoutsUsed = sessionData.timeoutsUsed || timeoutsUsed;
            statsData = sessionData.statsData || statsData;
            players = sessionData.players || players;
            actionLogsHistory = sessionData.actionLogsHistory || { 1: [], 2: [] };
            periodPitchHTML = sessionData.periodPitchHTML || { 1: null, 2: null };

            document.getElementById('sb-home-goals').innerText = homeGoals;
            document.getElementById('sb-away-goals').innerText = awayGoals;
            document.getElementById('action-log').innerHTML = sessionData.htmlLogs || '';

            if (sessionData.pitchMarkers) {
                document.getElementById('pitch-shot-home').innerHTML = sessionData.pitchMarkers.homeShot;
                document.getElementById('pitch-goal-home').innerHTML = sessionData.pitchMarkers.homeGoal;
                document.getElementById('pitch-shot-away').innerHTML = sessionData.pitchMarkers.awayShot;
                document.getElementById('pitch-goal-away').innerHTML = sessionData.pitchMarkers.awayGoal;
            }

            document.getElementById('btn-p1').className = currentPeriod === 1 ? 'period-btn active' : 'period-btn';
            document.getElementById('btn-p2').className = currentPeriod === 2 ? 'period-btn active' : 'period-btn';

            updateTeamNames();
            updateTimerDisplay();
            updateTimeoutUI();
            updateFoulsUI();
            updateStatsDisplay();
            renderPlayersList();

            alert("Sessão PRO recuperada com sucesso!");
        } catch (err) {
            alert("Erro ao ler o ficheiro JSON.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// -------------------------------------------------------------
// CRONÓMETRO E PERÍODOS
// -------------------------------------------------------------
function switchPeriod(period) {
    pauseTimer();
    
    periodPitchHTML[currentPeriod] = document.getElementById('capture-pitch-container').innerHTML;

    currentPeriod = period;
    totalSeconds = periodDurationMinutes * 60;
    
    document.getElementById('btn-p1').className = period === 1 ? 'period-btn active' : 'period-btn';
    document.getElementById('btn-p2').className = period === 2 ? 'period-btn active' : 'period-btn';
    
    if (periodPitchHTML[period]) {
        document.getElementById('capture-pitch-container').innerHTML = periodPitchHTML[period];
    } else {
        document.getElementById('pitch-shot-home').innerHTML = '<div class="goal-semicircle-only"></div>';
        document.getElementById('pitch-shot-away').innerHTML = '<div class="goal-semicircle-only top-goal"></div>';
        document.getElementById('pitch-goal-home').innerHTML = '<div class="goal-semicircle-only"></div>';
        document.getElementById('pitch-goal-away').innerHTML = '<div class="goal-semicircle-only top-goal"></div>';
    }

    updateTimerDisplay();
    updateTimeoutUI();
    updateFoulsUI();
    updateStatsDisplay();
    logAction('SISTEMA', `Início do ${period}º Período`, null, null);
}

function updateTimerDisplay() {
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    document.getElementById('timer').innerText = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
    if (!isRunning && totalSeconds > 0) {
        isRunning = true;
        timerInterval = setInterval(() => {
            if (totalSeconds > 0) {
                totalSeconds--;
                updateTimerDisplay();
                players.forEach(player => {
                    if (player.isOnField) {
                        if (currentPeriod === 1) player.secondsPlayedP1++;
                        else player.secondsPlayedP2++;
                    } else {
                        if (currentPeriod === 1) player.secondsRestedP1++;
                        else player.secondsRestedP2++;
                    }
                });
                updateTimesOnly();
            } else {
                pauseTimer();
                alert(`Fim do ${currentPeriod}º Período!`);
            }
        }, 1000);
    }
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
}

function resetTimer() {
    pauseTimer();
    totalSeconds = periodDurationMinutes * 60;
    updateTimerDisplay();
}

function requestTimeout(team) {
    if (!timeoutsUsed[currentPeriod][team]) {
        timeoutsUsed[currentPeriod][team] = true;
        updateTimeoutUI();
        pauseTimer();
        let teamName = team === 'home' ? (document.getElementById('input-home-name').value || 'DINAMO') : (document.getElementById('input-away-name').value || 'VISITANTE');
        logAction(teamName.toUpperCase(), `Time-out pedido no ${currentPeriod}º Período`, null, null);
    } else {
        alert("Esta equipa já utilizou a pausa técnica neste período!");
    }
}

function updateTimeoutUI() {
    let homeUsed = timeoutsUsed[currentPeriod].home;
    document.getElementById('timeout-home-status').innerText = homeUsed ? 'Utilizado' : 'Disponível';
    document.getElementById('timeout-home-status').className = homeUsed ? 'to-used used' : 'to-used';
    document.getElementById('timeout-home-btn').disabled = homeUsed;

    let awayUsed = timeoutsUsed[currentPeriod].away;
    document.getElementById('timeout-away-status').innerText = awayUsed ? 'Utilizado' : 'Disponível';
    document.getElementById('timeout-away-status').className = awayUsed ? 'to-used used' : 'to-used';
    document.getElementById('timeout-away-btn').disabled = awayUsed;
}

function updateFoulsUI() {
    let homeFouls = statsData[currentPeriod].home.livres;
    let awayFouls = statsData[currentPeriod].away.livres;

    let homeFoulsEl = document.getElementById('sb-home-fouls');
    let awayFoulsEl = document.getElementById('sb-away-fouls');

    homeFoulsEl.innerText = `Faltas: ${homeFouls}/5`;
    awayFoulsEl.innerText = `Faltas: ${awayFouls}/5`;

    if (homeFouls >= 5) {
        homeFoulsEl.className = 'sb-team-fouls danger';
        homeFoulsEl.innerText = `⚠️ LIMP/5 FALTAS`;
    } else if (homeFouls === 4) {
        homeFoulsEl.className = 'sb-team-fouls warning';
        homeFoulsEl.innerText = `⚠️ 4ª FALTA (AVISO)`;
    } else {
        homeFoulsEl.className = 'sb-team-fouls';
    }

    if (awayFouls >= 5) {
        awayFoulsEl.className = 'sb-team-fouls danger';
        awayFoulsEl.innerText = `⚠️ LIMP/5 FALTAS`;
    } else if (awayFouls === 4) {
        awayFoulsEl.className = 'sb-team-fouls warning';
        awayFoulsEl.innerText = `⚠️ 4ª FALTA (AVISO)`;
    } else {
        awayFoulsEl.className = 'sb-team-fouls';
    }
}

function updateStatsDisplay() {
    let curStats = statsData[currentPeriod];
    for (let t of ['home', 'away']) {
        for (let k in curStats[t]) {
            let el = document.getElementById(`${t}-${k}`);
            if (el) el.innerText = curStats[t][k];
        }
    }
}

// -------------------------------------------------------------
// ESTATÍSTICAS COM BOTÕES + E -
// -------------------------------------------------------------
function modifyStat(team, actionType, delta) {
    statsData[currentPeriod][team][actionType] += delta;
    if (statsData[currentPeriod][team][actionType] < 0) {
        statsData[currentPeriod][team][actionType] = 0;
        return;
    }
    
    document.getElementById(`${team}-${actionType}`).innerText = statsData[currentPeriod][team][actionType];
    
    if (actionType === 'livres') {
        updateFoulsUI();
    }

    let teamName = team === 'home' ? (document.getElementById('input-home-name').value || 'DINAMO') : (document.getElementById('input-away-name').value || 'VISITANTE');
    let actionNames = {
        livres: 'Falta/Livre',
        cantos: 'Canto',
        lancamentos: 'Lançamento',
        posse: 'Perda de Posse',
        passes_falhados: 'Passe Falhado',
        passes_completos: 'Passe Certo'
    };
    
    let sign = delta > 0 ? 'Registo' : 'Correção (-)';
    logAction(teamName.toUpperCase(), `${actionNames[actionType]} (${sign})`, null, null);
}

// -------------------------------------------------------------
// REGISTOS NOS CAMPOS
// -------------------------------------------------------------
function handlePitchDoubleClick(event, side, type) {
    const pitch = event.currentTarget;
    const rect = pitch.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    let homeName = document.getElementById('input-home-name').value || 'DINAMO';
    let awayName = document.getElementById('input-away-name').value || 'VISITANTE';
    
    let teamKey = side; 
    let teamName = side === 'home' ? homeName : awayName;

    // Se for do lado da casa (Remate ou Golo), abre o modal de atletas
    if (side === 'home') {
        let activePlayers = players.filter(p => p.isOnField);
        if (activePlayers.length > 0) {
            pendingPitchAction = { pitch, type, teamKey, teamName, x, y };
            showPlayerSelectorModal(activePlayers);
            return;
        }
    }

    addMarker(pitch, x, y, type);
    finalizePitchAction(type, teamKey, teamName, x, y, '');
}

function showPlayerSelectorModal(activePlayers) {
    let grid = document.getElementById('modal-players-grid');
    grid.innerHTML = '';
    activePlayers.forEach(p => {
        let btn = document.createElement('button');
        btn.className = 'mini-player-badge';
        btn.innerText = `#${p.number}`;
        btn.title = p.name;
        btn.onclick = function() {
            addMarker(pendingPitchAction.pitch, pendingPitchAction.x, pendingPitchAction.y, pendingPitchAction.type);
            finalizePitchAction(pendingPitchAction.type, pendingPitchAction.teamKey, pendingPitchAction.teamName, pendingPitchAction.x, pendingPitchAction.y, ` (Atleta: #${p.number})`);
            closePlayerModal(true);
        };
        grid.appendChild(btn);
    });
    document.getElementById('player-selector-modal').style.display = 'flex';
}

function closePlayerModal(confirmed = false) {
    if (!confirmed && pendingPitchAction) {
        addMarker(pendingPitchAction.pitch, pendingPitchAction.x, pendingPitchAction.y, pendingPitchAction.type);
        finalizePitchAction(pendingPitchAction.type, pendingPitchAction.teamKey, pendingPitchAction.teamName, pendingPitchAction.x, pendingPitchAction.y, '');
    }
    document.getElementById('player-selector-modal').style.display = 'none';
    pendingPitchAction = null;
}

function finalizePitchAction(type, teamKey, teamName, x, y, playerStr) {
    if (type === 'goal') {
        statsData[currentPeriod][teamKey].golos++;
        if (teamKey === 'home') {
            homeGoals++;
            document.getElementById('sb-home-goals').innerText = homeGoals;
        } else {
            awayGoals++;
            document.getElementById('sb-away-goals').innerText = awayGoals;
        }
        logAction(teamName.toUpperCase(), `GOLO (${currentPeriod}ºP)${playerStr}`, x.toFixed(0), y.toFixed(0));
    } else {
        statsData[currentPeriod][teamKey].remates++;
        logAction(teamName.toUpperCase(), `Remate (${currentPeriod}ºP)${playerStr}`, x.toFixed(0), y.toFixed(0));
    }
}

function addMarker(pitchElement, xPercent, yPercent, type) {
    const marker = document.createElement('div');
    let periodClass = currentPeriod === 1 ? 'marker-p1' : 'marker-p2';
    marker.className = `pitch-marker ${type === 'goal' ? 'marker-goal' : 'marker-shot'} ${periodClass}`;
    marker.style.left = `${xPercent}%`;
    marker.style.top = `${yPercent}%`;
    pitchElement.appendChild(marker);
}

function logAction(teamName, actionDesc, coordX, coordY) {
    let currentClock = document.getElementById('timer').innerText;
    let logBox = document.getElementById('action-log');
    
    let fullDesc = actionDesc;
    if (coordX !== null && coordY !== null) {
        fullDesc += ` [X: ${coordX}%, Y: ${coordY}%]`;
    }

    let logEntry = {
        periodo: `${currentPeriod}ºP`,
        tempo: currentClock,
        equipa: teamName,
        acao: fullDesc,
        x: coordX,
        y: coordY
    };

    actionLogsHistory[currentPeriod].push(logEntry);
    
    let entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `[${currentPeriod}ºP - ${currentClock}] <b>${teamName}</b>: ${fullDesc}`;
    logBox.insertBefore(entry, logBox.firstChild);
}

// -------------------------------------------------------------
// CARTÕES E GESTÃO DE PLANTEL
// -------------------------------------------------------------
function togglePlayerField(index) {
    let player = players[index];
    if (player) {
        player.isOnField = !player.isOnField;
        if (player.isOnField) player.substitutionsCount++;
        renderPlayersList();
    }
}

function updatePlayerNumber(index, newNum) { players[index].number = newNum; }
function updatePlayerName(index, newName) { players[index].name = newName; }

function addCard(event, index, cardType) {
    event.stopPropagation();
    let player = players[index];
    let teamName = document.getElementById('input-home-name').value || 'DINAMO';
    if (cardType === 'yellow') {
        player.yellowCards++;
        logAction(teamName.toUpperCase(), `Cartão Amarelo: #${player.number} ${player.name}`, null, null);
    } else if (cardType === 'red') {
        player.redCards++;
        player.isOnField = false;
        logAction(teamName.toUpperCase(), `Cartão Vermelho: #${player.number} ${player.name}`, null, null);
    }
    renderPlayersList();
}

function formatTime(totalSecs) {
    let mins = Math.floor(totalSecs / 60);
    let secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function renderPlayersList() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    players.forEach((player, index) => {
        let tile = document.createElement('div');
        tile.className = `player-card-tile ${player.isOnField ? 'field' : ''}`;
        tile.onclick = function() { togglePlayerField(index); };
        
        let totalPlayed = player.secondsPlayedP1 + player.secondsPlayedP2;
        let totalRested = player.secondsRestedP1 + player.secondsRestedP2;

        tile.innerHTML = `
            <div class="tile-header">
                <input type="text" class="player-num-input" value="${player.number}" onclick="event.stopPropagation()" onchange="updatePlayerNumber(${index}, this.value)">
                <input type="text" class="player-name-input" value="${player.name}" onclick="event.stopPropagation()" onchange="updatePlayerName(${index}, this.value)">
            </div>
            <div class="tile-timers-box">
                <div class="tile-timer-col">
                    <span class="tile-time-label">Jogo</span>
                    <span class="tile-time-val play" id="tile-play-${index}">${formatTime(totalPlayed)}</span>
                </div>
                <div class="tile-timer-col">
                    <span class="tile-time-label">Banco</span>
                    <span class="tile-time-val rest" id="tile-rest-${index}">${formatTime(totalRested)}</span>
                </div>
            </div>
            <div class="tile-footer">
                <div class="tile-cards" onclick="event.stopPropagation()">
                    <button class="card-square yellow-sq" onclick="addCard(event, ${index}, 'yellow')" title="Amarelo">${player.yellowCards > 0 ? player.yellowCards : '🟨'}</button>
                    <button class="card-square red-sq" onclick="addCard(event, ${index}, 'red')" title="Vermelho">${player.redCards > 0 ? player.redCards : '🟥'}</button>
                </div>
                <span class="tile-status-badge">${player.isOnField ? 'EM CAMPO' : 'BANCO'} (${player.substitutionsCount})</span>
            </div>
        `;
        container.appendChild(tile);
    });
}

function updateTimesOnly() {
    players.forEach((player, index) => {
        const playEl = document.getElementById(`tile-play-${index}`);
        const restEl = document.getElementById(`tile-rest-${index}`);
        if (playEl && restEl) {
            let totalPlayed = player.secondsPlayedP1 + player.secondsPlayedP2;
            let totalRested = player.secondsRestedP1 + player.secondsRestedP2;
            playEl.innerText = formatTime(totalPlayed);
            restEl.innerText = formatTime(totalRested);
        }
    });
}

// -------------------------------------------------------------
// GRÁFICOS DESPORTIVOS (Chart.js)
// -------------------------------------------------------------
function initCharts() {
    let ctxMin = document.getElementById('chartMinutes').getContext('2d');
    chartMinutesInstance = new Chart(ctxMin, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Minutos em Jogo', data: [], backgroundColor: '#00ffcc' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa', font: { size: 10 } } } } }
    });

    let ctxShots = document.getElementById('chartShots').getContext('2d');
    chartShotsInstance = new Chart(ctxShots, {
        type: 'bar',
        data: { labels: ['Dinamo', 'Visitante'], datasets: [{ label: 'Remates', data: [0,0], backgroundColor: '#ffcc00' }, { label: 'Golos', data: [0,0], backgroundColor: '#ff0055' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa' } } } }
    });

    let ctxSubs = document.getElementById('chartSubs').getContext('2d');
    chartSubsInstance = new Chart(ctxSubs, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Entradas (Subs)', data: [], backgroundColor: '#20c997' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa', font: { size: 10 } } } } }
    });
}

function updateChartsData() {
    let labels = players.map(p => `#${p.number} ${p.name.split(' ')[0]}`);
    let minutesData = players.map(p => ((p.secondsPlayedP1 + p.secondsPlayedP2) / 60).toFixed(1));
    let subsData = players.map(p => p.substitutionsCount);

    chartMinutesInstance.data.labels = labels;
    chartMinutesInstance.data.datasets[0].data = minutesData;
    chartMinutesInstance.update();

    let homeName = document.getElementById('input-home-name').value || 'DINAMO';
    let awayName = document.getElementById('input-away-name').value || 'VISITANTE';
    chartShotsInstance.data.labels = [homeName, awayName];

    let totalHomeRemates = statsData[1].home.remates + statsData[2].home.remates;
    let totalAwayRemates = statsData[1].away.remates + statsData[2].away.remates;
    let totalHomeGolos = statsData[1].home.golos + statsData[2].home.golos;
    let totalAwayGolos = statsData[1].away.golos + statsData[2].away.golos;

    chartShotsInstance.data.datasets[0].data = [totalHomeRemates, totalAwayRemates];
    chartShotsInstance.data.datasets[1].data = [totalHomeGolos, totalAwayGolos];
    chartShotsInstance.update();

    chartSubsInstance.data.labels = labels;
    chartSubsInstance.data.datasets[0].data = subsData;
    chartSubsInstance.update();
}

// -------------------------------------------------------------
// RELATÓRIOS (EXCEL E PDF)
// -------------------------------------------------------------
function exportReportExcel() {
    let homeName = document.getElementById('input-home-name').value || 'DINAMO';
    let awayName = document.getElementById('input-away-name').value || 'VISITANTE';
    let observations = document.getElementById('match-observations').value;

    let wb = XLSX.utils.book_new();

    let s1 = statsData[1];
    let s2 = statsData[2];
    let resumoData = [
        ["Relatório Oficial - Análise Futsal PRO"],
        ["Partida", `${homeName} ${homeGoals} - ${awayGoals} ${awayName}`],
        ["Observações", observations],
        [],
        ["Estatísticas Coletivas", "1ª Parte (Dinamo)", "1ª Parte (Visitante)", "2ª Parte (Dinamo)", "2ª Parte (Visitante)", "Total (Dinamo)", "Total (Visitante)"],
        ["Golos", s1.home.golos, s1.away.golos, s2.home.golos, s2.away.golos, s1.home.golos + s2.home.golos, s1.away.golos + s2.away.golos],
        ["Remates", s1.home.remates, s1.away.remates, s2.home.remates, s2.away.remates, s1.home.remates + s2.home.remates, s1.away.remates + s2.away.remates],
        ["Faltas/Livres", s1.home.livres, s1.away.livres, s2.home.livres, s2.away.livres, s1.home.livres + s2.home.livres, s1.away.livres + s2.away.livres],
        ["Cantos", s1.home.cantos, s1.away.cantos, s2.home.cantos, s2.away.cantos, s1.home.cantos + s2.home.cantos, s1.away.cantos + s2.away.cantos],
        ["Lançamentos", s1.home.lancamentos, s1.away.lancamentos, s2.home.lancamentos, s2.away.lancamentos, s1.home.lancamentos + s2.home.lancamentos, s1.away.lancamentos + s2.away.lancamentos],
        ["Perdas de Posse", s1.home.posse, s1.away.posse, s2.home.posse, s2.away.posse, s1.home.posse + s2.home.posse, s1.away.posse + s2.away.posse],
        ["Passes Falhados", s1.home.passes_falhados, s1.away.passes_falhados, s2.home.passes_falhados, s2.away.passes_falhados, s1.home.passes_falhados + s2.home.passes_falhados, s1.away.passes_falhados + s2.away.passes_falhados],
        ["Passes Certos", s1.home.passes_completos, s1.away.passes_completos, s2.home.passes_completos, s2.away.passes_completos, s1.home.passes_completos + s2.home.passes_completos, s1.home.passes_completos + s2.home.passes_completos]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoData), "Resumo");

    let playersData = [[
        "Número", "Nome do Jogador", 
        "Jogo 1ªP", "Banco 1ªP", 
        "Jogo 2ªP", "Banco 2ªP", 
        "Tempo Total Jogo", "Tempo Total Banco", 
        "Entradas", "Amarelos", "Vermelhos"
    ]];
    players.forEach(p => {
        let totJ = p.secondsPlayedP1 + p.secondsPlayedP2;
        let totB = p.secondsRestedP1 + p.secondsRestedP2;
        playersData.push([
            p.number, p.name, 
            formatTime(p.secondsPlayedP1), formatTime(p.secondsRestedP1), 
            formatTime(p.secondsPlayedP2), formatTime(p.secondsRestedP2), 
            formatTime(totJ), formatTime(totB), 
            p.substitutionsCount, p.yellowCards, p.redCards
        ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(playersData), "Plantel");

    let acoes1 = [["Período", "Tempo", "Equipa", "Ação / Evento"]];
    actionLogsHistory[1].forEach(l => acoes1.push([l.periodo, l.tempo, l.equipa, l.acao]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(acoes1), "1ª Parte");

    let acoes2 = [["Período", "Tempo", "Equipa", "Ação / Evento"]];
    actionLogsHistory[2].forEach(l => acoes2.push([l.periodo, l.tempo, l.equipa, l.acao]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(acoes2), "2ª Parte");

    XLSX.writeFile(wb, `Relatorio_PRO_${homeName}_vs_${awayName}.xlsx`);
}

async function exportReportPDF() {
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();

    let homeName = document.getElementById('input-home-name').value || 'DINAMO';
    let awayName = document.getElementById('input-away-name').value || 'VISITANTE';
    let observations = document.getElementById('match-observations').value;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatório Oficial - Análise Futsal PRO", 14, 18);

    doc.setFontSize(11);
    doc.text(`Partida: ${homeName} ${homeGoals} - ${awayGoals} ${awayName}`, 14, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} | andrepe @ 2026`, 14, 32);

    let y = 40;
    if (observations) {
        doc.setFont("helvetica", "bold");
        doc.text("Observações:", 14, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(observations, 14, y, { maxWidth: 180 });
        y += 12;
    }

    let s1 = statsData[1];
    let s2 = statsData[2];

    doc.setFont("helvetica", "bold");
    doc.text("Resumo Coletivo (1ª Parte | 2ª Parte | Total):", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`- Golos: Dinamo (${s1.home.golos}|${s2.home.golos}|${s1.home.golos+s2.home.golos}) x Visitante (${s1.away.golos}|${s2.away.golos}|${s1.away.golos+s2.away.golos})`, 14, y); y += 5;
    doc.text(`- Faltas/Livres: Dinamo (${s1.home.livres}|${s2.home.livres}|${s1.home.livres+s2.home.livres}) x Visitante (${s1.away.livres}|${s2.away.livres}|${s1.away.livres+s2.away.livres})`, 14, y); y += 5;
    doc.text(`- Cantos: Dinamo (${s1.home.cantos}|${s2.home.cantos}|${s1.home.cantos+s2.home.cantos}) x Visitante (${s1.away.cantos}|${s2.away.cantos}|${s1.away.cantos+s2.away.cantos})`, 14, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Estatísticas de Atletas (1ªP / 2ªP / Total / Cartões):", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    players.forEach(p => {
        if (y > 280) { doc.addPage(); y = 20; }
        let totJ = formatTime(p.secondsPlayedP1 + p.secondsPlayedP2);
        doc.text(`Nº ${p.number} - ${p.name}: 1ªP[${formatTime(p.secondsPlayedP1)}] 2ªP[${formatTime(p.secondsPlayedP2)}] Tot[${totJ}] | Entradas[${p.substitutionsCount}] | 🟨${p.yellowCards} 🟥${p.redCards}`, 14, y);
        y += 5;
    });

    y += 10;

    let tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '600px';
    tempContainer.style.background = '#1e1e1e';
    tempContainer.style.padding = '10px';
    document.body.appendChild(tempContainer);

    let currentContainerHTML = document.getElementById('capture-pitch-container').innerHTML;
    periodPitchHTML[currentPeriod] = currentContainerHTML;

    if (periodPitchHTML[1]) {
        let div1 = document.createElement('div');
        div1.innerHTML = `<h4 style="color:#00ffcc; margin:5px 0; font-size:12px;">Mapas de Lances - 1ª Parte</h4>` + periodPitchHTML[1];
        tempContainer.appendChild(div1);
    }
    if (periodPitchHTML[2]) {
        let div2 = document.createElement('div');
        div2.style.marginTop = '15px';
        div2.innerHTML = `<h4 style="color:#00ffcc; margin:5px 0; font-size:12px;">Mapas de Lances - 2ª Parte</h4>` + periodPitchHTML[2];
        tempContainer.appendChild(div2);
    }

    try {
        let canvas = await html2canvas(tempContainer, { backgroundColor: '#1e1e1e', scale: 2, logging: false });
        document.body.removeChild(tempContainer);

        let imgData = canvas.toDataURL('image/png');
        let imgWidth = 180;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (y + imgHeight > 280) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Mapa de Lances / Remates e Golos (1ª e 2ª Parte):", 14, y);
        y += 6;
        doc.addImage(imgData, 'PNG', 14, y, imgWidth, imgHeight);
        y += imgHeight + 10;
    } catch (err) {
        console.error("Erro ao capturar os campos para o PDF", err);
        if (document.body.contains(tempContainer)) document.body.removeChild(tempContainer);
    }

    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("Ocorrências - 1ª Parte:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    if (actionLogsHistory[1].length === 0) {
        doc.text("Sem registos na 1ª parte.", 14, y);
        y += 6;
    } else {
        actionLogsHistory[1].forEach(log => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(`[${log.tempo}] ${log.equipa}: ${log.acao}`, 14, y);
            y += 5;
        });
    }

    y += 5;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("Ocorrências - 2ª Parte:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    if (actionLogsHistory[2].length === 0) {
        doc.text("Sem registos na 2ª parte.", 14, y);
        y += 6;
    } else {
        actionLogsHistory[2].forEach(log => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(`[${log.tempo}] ${log.equipa}: ${log.acao}`, 14, y);
            y += 5;
        });
    }

    doc.save(`Relatorio_PRO_${homeName}_vs_${awayName}.pdf`);
}