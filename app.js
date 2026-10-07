// app.js - Análise Futsal PRO
let loggedInUsername = "Treinador";
let currentPeriod = 1;
let periodDurationMinutes = 20;
let totalSeconds = periodDurationMinutes * 60;
let timerInterval = null;
let isRunning = false;

let homeGoals = 0;
let awayGoals = 0;

let redCardSecondsRemaining = 0;
let redCardActive = false;

let awayYellowCards = 0;
let awayRedCards = 0;

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
        home: { livres: 0, cantos: 0, lancamentos: 0, remates: 0, golos: 0 },
        away: { livres: 0, cantos: 0, lancamentos: 0, remates: 0, golos: 0 }
    },
    2: {
        home: { livres: 0, cantos: 0, lancamentos: 0, remates: 0, golos: 0 },
        away: { livres: 0, cantos: 0, lancamentos: 0, remates: 0, golos: 0 }
    }
};

let players = [];
let pendingPitchAction = null;

let chartMinutesInstance = null;
let chartShotsInstance = null;
let chartSubsInstance = null;

window.initAppAfterLogin = function() {
    let savedData = localStorage.getItem('futsal_session_data');
    if (savedData) {
        try {
            let parsedSession = JSON.parse(savedData);
            if (parsedSession.username) loggedInUsername = parsedSession.username;
            if (parsedSession.homeGoals !== undefined) homeGoals = parsedSession.homeGoals;
            if (parsedSession.awayGoals !== undefined) awayGoals = parsedSession.awayGoals;
            if (parsedSession.statsData) statsData = parsedSession.statsData;
            if (parsedSession.actionLogsHistory) actionLogsHistory = parsedSession.actionLogsHistory;
            if (parsedSession.timeoutsUsed) timeoutsUsed = parsedSession.timeoutsUsed;
            if (parsedSession.awayYellowCards !== undefined) awayYellowCards = parsedSession.awayYellowCards;
            if (parsedSession.awayRedCards !== undefined) awayRedCards = parsedSession.awayRedCards;
            if (parsedSession.players && parsedSession.players.length > 0) {
                players = parsedSession.players;
            }
        } catch(e) {}
    }

    document.getElementById('sb-home-goals').innerText = homeGoals;
    document.getElementById('sb-away-goals').innerText = awayGoals;
    document.getElementById('away-yellow-count').innerText = awayYellowCards;
    document.getElementById('away-red-count').innerText = awayRedCards;

    renderPlayersList();
    updateTimerDisplay();
    updateTimeoutUI();
    updateFoulsUI();
    updateStatsDisplay();
    initCharts();
};

function saveSessionStateToLocalStorage() {
    let sessionData = {
        version: "PRO",
        username: loggedInUsername,
        currentPeriod: currentPeriod,
        periodDurationMinutes: periodDurationMinutes,
        totalSeconds: totalSeconds,
        homeGoals: homeGoals,
        awayGoals: awayGoals,
        homeName: document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO',
        awayName: document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE',
        observations: document.getElementById('match-observations') ? document.getElementById('match-observations').value : '',
        timeoutsUsed: timeoutsUsed,
        statsData: statsData,
        players: players,
        awayYellowCards: awayYellowCards,
        awayRedCards: awayRedCards,
        actionLogsHistory: actionLogsHistory,
        periodPitchHTML: periodPitchHTML
    };
    localStorage.setItem('futsal_session_data', JSON.stringify(sessionData));
}

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
    let homeName = document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO';
    let awayName = document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE';

    if (document.getElementById('home-team-title')) document.getElementById('home-team-title').innerText = `Plantel / Jogadores (${homeName.toUpperCase()})`;
    if (document.getElementById('stats-home-title')) document.getElementById('stats-home-title').innerText = homeName.toUpperCase();
    if (document.getElementById('stats-away-title')) document.getElementById('stats-away-title').innerText = awayName.toUpperCase();
    
    if (document.getElementById('to-home-label')) document.getElementById('to-home-label').innerText = `Time-out ${homeName}:`;
    if (document.getElementById('to-away-label')) document.getElementById('to-away-label').innerText = `Time-out ${awayName}:`;

    if (document.getElementById('sb-home-label')) document.getElementById('sb-home-label').innerText = homeName.toUpperCase();
    if (document.getElementById('sb-away-label')) document.getElementById('sb-away-label').innerText = awayName.toUpperCase();

    if (document.getElementById('pitch-remate-home-title')) document.getElementById('pitch-remate-home-title').innerText = `REMATE ${homeName.toUpperCase()}`;
    if (document.getElementById('pitch-remate-away-title')) document.getElementById('pitch-remate-away-title').innerText = `REMATE ${awayName.toUpperCase()}`;
    if (document.getElementById('pitch-golo-home-title')) document.getElementById('pitch-golo-home-title').innerText = `GOLO ${homeName.toUpperCase()}`;
    if (document.getElementById('pitch-golo-away-title')) document.getElementById('pitch-golo-away-title').innerText = `GOLO ${awayName.toUpperCase()}`;
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

function exportSessionJSON() {
    saveSessionStateToLocalStorage();
    let saved = localStorage.getItem('futsal_session_data');
    let sessionData = JSON.parse(saved);

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sessao_futsal_pro_${sessionData.homeName}_vs_${sessionData.awayName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importPreviousSessionJSON(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedData = JSON.parse(e.target.result);
            localStorage.setItem('futsal_session_data', JSON.stringify(importedData));
            
            if (importedData.homeGoals !== undefined) homeGoals = importedData.homeGoals;
            if (importedData.awayGoals !== undefined) awayGoals = importedData.awayGoals;
            if (importedData.statsData) statsData = importedData.statsData;
            if (importedData.actionLogsHistory) actionLogsHistory = importedData.actionLogsHistory;
            if (importedData.timeoutsUsed) timeoutsUsed = importedData.timeoutsUsed;
            if (importedData.awayYellowCards !== undefined) awayYellowCards = importedData.awayYellowCards;
            if (importedData.awayRedCards !== undefined) awayRedCards = importedData.awayRedCards;
            if (importedData.players) players = importedData.players;

            if (document.getElementById('sb-home-goals')) document.getElementById('sb-home-goals').innerText = homeGoals;
            if (document.getElementById('sb-away-goals')) document.getElementById('sb-away-goals').innerText = awayGoals;
            if (document.getElementById('away-yellow-count')) document.getElementById('away-yellow-count').innerText = awayYellowCards;
            if (document.getElementById('away-red-count')) document.getElementById('away-red-count').innerText = awayRedCards;

            renderPlayersList();
            updateTimeoutUI();
            updateFoulsUI();
            updateStatsDisplay();

            exportReportExcel();
            alert("Sessão importada com sucesso e relatório Excel recuperado/descarregado!");
        } catch (err) {
            alert("Erro ao ler o ficheiro JSON. Certifique-se de que é um formato válido.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function exportSessionJSONAuto(suffix) {
    saveSessionStateToLocalStorage();
    let saved = localStorage.getItem('futsal_session_data');
    let sessionData = JSON.parse(saved);

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_Automatico_Geral_${sessionData.homeName}_${suffix}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// TRANSIÇÃO DE PERÍODO COM DOWNLOAD AUTOMÁTICO DE SEGURANÇA DA 1ª PARTE
function switchPeriod(period) {
    pauseTimer();
    
    if (period === 2 && currentPeriod === 1) {
        exportSessionJSONAuto("Fim_1P");
    }

    if (document.getElementById('capture-pitch-container')) {
        periodPitchHTML[currentPeriod] = document.getElementById('capture-pitch-container').innerHTML;
    }

    currentPeriod = period;
    totalSeconds = periodDurationMinutes * 60;
    
    if (document.getElementById('btn-p1')) document.getElementById('btn-p1').className = period === 1 ? 'period-btn active' : 'period-btn';
    if (document.getElementById('btn-p2')) document.getElementById('btn-p2').className = period === 2 ? 'period-btn active' : 'period-btn';
    
    if (periodPitchHTML[period] && document.getElementById('capture-pitch-container')) {
        document.getElementById('capture-pitch-container').innerHTML = periodPitchHTML[period];
    } else if (document.getElementById('pitch-shot-home')) {
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
    saveSessionStateToLocalStorage();
}

function updateTimerDisplay() {
    if (!document.getElementById('timer')) return;
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

                if (redCardActive && redCardSecondsRemaining > 0) {
                    redCardSecondsRemaining--;
                    updateRedCardTimerDisplay();
                    if (redCardSecondsRemaining <= 0) {
                        redCardActive = false;
                        if (document.getElementById('red-card-timer-box')) document.getElementById('red-card-timer-box').style.display = 'none';
                        logAction('SISTEMA', 'Terminou o tempo de exclusão de 2 min.', null, null);
                    }
                }

                players.forEach(player => {
                    if (player.isOnField) {
                        player.secondsOnFieldActive = (player.secondsOnFieldActive || 0) + 1;
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
                if (currentPeriod === 1) {
                    switchPeriod(2);
                } else if (currentPeriod === 2) {
                    exportReportExcel();
                    exportSessionJSON();
                    alert("Fim do Jogo! Os relatórios Excel e JSON foram descarregados automaticamente.");
                }
            }
        }, 1000);
    }
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    saveSessionStateToLocalStorage();
}

function adjustTimerSeconds(delta) {
    if (isRunning) {
        alert("O ajuste fino do cronómetro só funciona com o relógio parado!");
        return;
    }
    totalSeconds += delta;
    if (totalSeconds < 0) totalSeconds = 0;
    let maxSeconds = periodDurationMinutes * 60;
    if (totalSeconds > maxSeconds) totalSeconds = maxSeconds;
    updateTimerDisplay();
    logAction('SISTEMA', `Ajuste fino de cronómetro (${delta > 0 ? '+' + delta + 's' : delta + 's'})`, null, null);
}

function triggerRedCardExclusion() {
    redCardSecondsRemaining = 120;
    redCardActive = true;
    if (document.getElementById('red-card-timer-box')) document.getElementById('red-card-timer-box').style.display = 'block';
    updateRedCardTimerDisplay();
}

function updateRedCardTimerDisplay() {
    if (!document.getElementById('red-card-timer-text')) return;
    let mins = Math.floor(redCardSecondsRemaining / 60);
    let secs = redCardSecondsRemaining % 60;
    document.getElementById('red-card-timer-text').innerText = 
        `🟥 EXCLUSÃO: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function requestTimeout(team) {
    if (!timeoutsUsed[currentPeriod][team]) {
        timeoutsUsed[currentPeriod][team] = true;
        updateTimeoutUI();
        pauseTimer();
        let teamName = team === 'home' 
            ? (document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO') 
            : (document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE');
        logAction(teamName.toUpperCase(), `Time-out pedido no ${currentPeriod}º Período`, null, null);
    } else {
        alert("Esta equipa já utilizou a pausa técnica neste período!");
    }
}

function updateTimeoutUI() {
    let homeUsed = timeoutsUsed[currentPeriod].home;
    if (document.getElementById('timeout-home-status')) {
        document.getElementById('timeout-home-status').innerText = homeUsed ? 'Utilizado' : 'Disponível';
        document.getElementById('timeout-home-status').className = homeUsed ? 'to-used used' : 'to-used';
        document.getElementById('timeout-home-btn').disabled = homeUsed;
    }

    let awayUsed = timeoutsUsed[currentPeriod].away;
    if (document.getElementById('timeout-away-status')) {
        document.getElementById('timeout-away-status').innerText = awayUsed ? 'Utilizado' : 'Disponível';
        document.getElementById('timeout-away-status').className = awayUsed ? 'to-used used' : 'to-used';
        document.getElementById('timeout-away-btn').disabled = awayUsed;
    }
}

function updateFoulsUI() {
    let homeFouls = statsData[currentPeriod].home.livres;
    let awayFouls = statsData[currentPeriod].away.livres;

    let homeFoulsEl = document.getElementById('sb-home-fouls');
    let awayFoulsEl = document.getElementById('sb-away-fouls');

    if (homeFoulsEl) {
        homeFoulsEl.innerText = `Faltas: ${homeFouls}/5`;
        if (homeFouls >= 5) {
            homeFoulsEl.className = 'sb-team-fouls danger';
            homeFoulsEl.innerText = `⚠️ LIMP/5 FALTAS`;
        } else if (homeFouls === 4) {
            homeFoulsEl.className = 'sb-team-fouls warning';
            homeFoulsEl.innerText = `⚠ 4ª FALTA (AVISO)`;
        } else {
            homeFoulsEl.className = 'sb-team-fouls';
        }
    }

    if (awayFoulsEl) {
        awayFoulsEl.innerText = `Faltas: ${awayFouls}/5`;
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

function togglePlayerField(index) {
    let player = players[index];
    if (player.redCards > 0 && !player.isOnField) {
        alert("Este jogador foi expulso e não pode voltar a entrar!");
        return;
    }

    let currentFieldCount = players.filter(p => p.isOnField).length;
    if (!player.isOnField) {
        if (redCardActive && currentFieldCount >= 4) {
            alert("Aguarde o fim da penalização de 2 minutos ou golo sofrido para colocar outro atleta.");
            return;
        }
        if (currentFieldCount >= 5) {
            alert("Máximo de 5 jogadores em campo.");
            return;
        }
        player.isOnField = true;
        player.secondsOnFieldActive = 0;
        player.substitutionsCount++;
    } else {
        if (currentFieldCount <= 3) {
            alert("Mínimo obrigatório de 3 jogadores em campo.");
            return;
        }
        player.isOnField = false;
        player.secondsOnFieldActive = 0;
    }
    renderPlayersList();
    saveSessionStateToLocalStorage();
}

function updatePlayerNumber(index, newNum) { players[index].number = newNum; saveSessionStateToLocalStorage(); }
function updatePlayerName(index, newName) { players[index].name = newName; saveSessionStateToLocalStorage(); }

function addCard(event, index, cardType) {
    event.stopPropagation();
    let player = players[index];
    let teamName = document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO';
    
    if (cardType === 'yellow') {
        player.yellowCards = (player.yellowCards || 0) + 1;
        logAction(teamName.toUpperCase(), `Cartão Amarelo: #${player.number} ${player.name}`, null, null);
        if (player.yellowCards >= 2) {
            player.redCards = (player.redCards || 0) + 1;
            if (player.isOnField) {
                player.isOnField = false;
                player.secondsOnFieldActive = 0;
            }
            triggerRedCardExclusion();
            logAction(teamName.toUpperCase(), `🟥 2º Amarelo (Exclusão 2 min): #${player.number} ${player.name}`, null, null);
        }
    } else if (cardType === 'red') {
        player.redCards = (player.redCards || 0) + 1;
        if (player.isOnField) {
            player.isOnField = false;
            player.secondsOnFieldActive = 0;
        }
        triggerRedCardExclusion();
        logAction(teamName.toUpperCase(), `Cartão Vermelho Direto (Exclusão 2 min): #${player.number} ${player.name}`, null, null);
    }
    renderPlayersList();
    saveSessionStateToLocalStorage();
}

function addAwayCard(cardType) {
    let awayName = document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE';
    if (cardType === 'yellow') {
        awayYellowCards++;
        if (document.getElementById('away-yellow-count')) document.getElementById('away-yellow-count').innerText = awayYellowCards;
        logAction(awayName.toUpperCase(), `🟨 Cartão Amarelo (Adversário)`, null, null);
    } else if (cardType === 'red') {
        awayRedCards++;
        if (document.getElementById('away-red-count')) document.getElementById('away-red-count').innerText = awayRedCards;
        logAction(awayName.toUpperCase(), `🟥 Cartão Vermelho (Adversário)`, null, null);
    }
    saveSessionStateToLocalStorage();
}

function correctCardValue(event, index, cardType, delta) {
    event.stopPropagation();
    let player = players[index];

    if (cardType === 'yellow') {
        player.yellowCards = (player.yellowCards || 0) + delta;
        if (player.yellowCards < 0) player.yellowCards = 0;
    } else if (cardType === 'red') {
        player.redCards = (player.redCards || 0) + delta;
        if (player.redCards < 0) player.redCards = 0;
        if (player.redCards === 0) {
            redCardActive = false;
            let tb = document.getElementById('red-card-timer-box');
            if (tb) tb.style.display = 'none';
        }
    }
    renderPlayersList();
    saveSessionStateToLocalStorage();
}

function correctStatValue(category, delta) {
    let teamKey = category.includes('home') ? 'home' : 'away';
    if (category.includes('goals')) {
        let pitchId = teamKey === 'home' ? 'pitch-goal-home' : 'pitch-goal-away';
        if (teamKey === 'home') {
            homeGoals += delta;
            if (homeGoals < 0) homeGoals = 0;
            if (document.getElementById('sb-home-goals')) document.getElementById('sb-home-goals').innerText = homeGoals;
            statsData[currentPeriod].home.golos = homeGoals;
        } else {
            awayGoals += delta;
            if (awayGoals < 0) awayGoals = 0;
            if (document.getElementById('sb-away-goals')) document.getElementById('sb-away-goals').innerText = awayGoals;
            statsData[currentPeriod].away.golos = awayGoals;
        }

        if (delta < 0) {
            let pitchEl = document.getElementById(pitchId);
            if (pitchEl) {
                let markers = pitchEl.querySelectorAll('.pitch-marker');
                if (markers.length > 0) markers[markers.length - 1].remove();
            }
        }
    }
    updateStatsDisplay();
    saveSessionStateToLocalStorage();
}

function modifyPitchStat(teamKey, statType, delta) {
    let pitchId = '';
    if (statType === 'goal') {
        pitchId = teamKey === 'home' ? 'pitch-goal-home' : 'pitch-goal-away';
        statsData[currentPeriod][teamKey].golos += delta;
        if (statsData[currentPeriod][teamKey].golos < 0) statsData[currentPeriod][teamKey].golos = 0;
        
        if (teamKey === 'home') {
            homeGoals += delta;
            if (homeGoals < 0) homeGoals = 0;
            if (document.getElementById('sb-home-goals')) document.getElementById('sb-home-goals').innerText = homeGoals;
        } else {
            awayGoals += delta;
            if (awayGoals < 0) awayGoals = 0;
            if (document.getElementById('sb-away-goals')) document.getElementById('sb-away-goals').innerText = awayGoals;
        }
    } else if (statType === 'shot') {
        pitchId = teamKey === 'home' ? 'pitch-shot-home' : 'pitch-shot-away';
        statsData[currentPeriod][teamKey].remates += delta;
        if (statsData[currentPeriod][teamKey].remates < 0) statsData[currentPeriod][teamKey].remates = 0;
    }

    if (delta < 0 && pitchId) {
        let pitchEl = document.getElementById(pitchId);
        if (pitchEl) {
            let markers = pitchEl.querySelectorAll('.pitch-marker');
            if (markers.length > 0) markers[markers.length - 1].remove();
        }
    }
    updateStatsDisplay();
    saveSessionStateToLocalStorage();
}

function modifyStat(team, actionType, delta) {
    statsData[currentPeriod][team][actionType] += delta;
    if (statsData[currentPeriod][team][actionType] < 0) {
        statsData[currentPeriod][team][actionType] = 0;
        return;
    }
    if (document.getElementById(`${team}-${actionType}`)) document.getElementById(`${team}-${actionType}`).innerText = statsData[currentPeriod][team][actionType];
    if (actionType === 'livres') updateFoulsUI();
    saveSessionStateToLocalStorage();
}

function handlePitchDoubleClick(event, side, type) {
    const pitch = event.currentTarget;
    const rect = pitch.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    let homeName = document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO';
    let awayName = document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE';
    let teamKey = side; 
    let teamName = side === 'home' ? homeName : awayName;

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
    if (!grid) return;
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
    if (document.getElementById('player-selector-modal')) document.getElementById('player-selector-modal').style.display = 'none';
    pendingPitchAction = null;
}

function finalizePitchAction(type, teamKey, teamName, x, y, playerStr) {
    if (type === 'goal') {
        statsData[currentPeriod][teamKey].golos++;
        if (teamKey === 'home') {
            homeGoals++;
            if (document.getElementById('sb-home-goals')) document.getElementById('sb-home-goals').innerText = homeGoals;
        } else {
            awayGoals++;
            if (document.getElementById('sb-away-goals')) document.getElementById('sb-away-goals').innerText = awayGoals;
        }
        
        if (redCardActive && teamKey === 'home') {
            redCardActive = false;
            if (document.getElementById('red-card-timer-box')) document.getElementById('red-card-timer-box').style.display = 'none';
        }
        logAction(teamName.toUpperCase(), `GOLO (${currentPeriod}ºP)${playerStr}`, x.toFixed(0), y.toFixed(0));
    } else {
        statsData[currentPeriod][teamKey].remates++;
        logAction(teamName.toUpperCase(), `Remate (${currentPeriod}ºP)${playerStr}`, x.toFixed(0), y.toFixed(0));
    }
    saveSessionStateToLocalStorage();
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
    let currentClockEl = document.getElementById('timer');
    let currentClock = currentClockEl ? currentClockEl.innerText : "00:00";
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
    
    if (logBox) {
        let entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `[${currentPeriod}ºP - ${currentClock}] <b>${teamName}</b>: ${fullDesc}`;
        logBox.insertBefore(entry, logBox.firstChild);
    }
    saveSessionStateToLocalStorage();
}

function formatTime(totalSecs) {
    let mins = Math.floor(totalSecs / 60);
    let secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function renderPlayersList() {
    const container = document.getElementById('players-container');
    if (!container) return;
    container.innerHTML = '';

    players.forEach((player, index) => {
        let isYellowWarning = player.isOnField && ((player.secondsOnFieldActive || 0) >= 180);
        let tile = document.createElement('div');
        tile.className = `player-card-tile ${player.isOnField ? 'field' : ''} ${isYellowWarning ? 'sub-warning-yellow' : ''}`;
        tile.style.borderColor = isYellowWarning ? '#ffcc00' : '';
        tile.onclick = function() { togglePlayerField(index); };
        
        let totalPlayed = (player.secondsPlayedP1 || 0) + (player.secondsPlayedP2 || 0);
        let totalRested = (player.secondsRestedP1 || 0) + (player.secondsRestedP2 || 0);
        let activeFieldTime = player.isOnField ? formatTime(player.secondsOnFieldActive || 0) : "00:00";

        let yCount = player.yellowCards || 0;
        let rCount = player.redCards || 0;

        tile.innerHTML = `
            <div class="tile-header">
                <input type="text" class="player-num-input" value="${player.number}" onclick="event.stopPropagation()" onchange="updatePlayerNumber(${index}, this.value)">
                <input type="text" class="player-name-input" value="${player.name}" onclick="event.stopPropagation()" onchange="updatePlayerName(${index}, this.value)">
            </div>
            <div class="tile-timers-box">
                <div class="tile-timer-row">
                    <span class="tile-time-label">⏱️ Ativo (Campo):</span>
                    <span class="tile-time-val" id="tile-active-${index}" style="${isYellowWarning ? 'color: #ffcc00; font-weight: bold;' : 'color: #00ffcc;'}">${activeFieldTime}</span>
                </div>
                <div class="tile-timer-row">
                    <span class="tile-time-label">Jogo:</span>
                    <span class="tile-time-val play" id="tile-play-${index}">${formatTime(totalPlayed)}</span>
                </div>
                <div class="tile-timer-row">
                    <span class="tile-time-label">Banco:</span>
                    <span class="tile-time-val rest" id="tile-rest-${index}">${formatTime(totalRested)}</span>
                </div>
            </div>
            <div class="tile-footer">
                <div class="tile-cards" onclick="event.stopPropagation()" style="display: flex; align-items: center; gap: 4px;">
                    <button class="card-square yellow-sq big-card" onclick="addCard(event, ${index}, 'yellow')" title="Amarelo">${yCount > 0 ? yCount : '🟨'}</button>
                    ${yCount > 0 ? `<button class="btn-corr" onclick="correctCardValue(event, ${index}, 'yellow', -1)">-</button>` : ''}
                    
                    <button class="card-square red-sq big-card" onclick="addCard(event, ${index}, 'red')" title="Vermelho">${rCount > 0 ? rCount : '🟥'}</button>
                    ${rCount > 0 ? `<button class="btn-corr" onclick="correctCardValue(event, ${index}, 'red', -1)">-</button>` : ''}
                </div>
                <span class="tile-status-badge">${player.isOnField ? (isYellowWarning ? '⚠️ SUBSTITUIR' : 'EM CAMPO') : 'BANCO'} (${player.substitutionsCount || 0})</span>
            </div>
        `;
        container.appendChild(tile);
    });
}

function updateTimesOnly() {
    players.forEach((player, index) => {
        const playEl = document.getElementById(`tile-play-${index}`);
        const restEl = document.getElementById(`tile-rest-${index}`);
        const activeEl = document.getElementById(`tile-active-${index}`);
        
        let totalPlayed = (player.secondsPlayedP1 || 0) + (player.secondsPlayedP2 || 0);
        let totalRested = (player.secondsRestedP1 || 0) + (player.secondsRestedP2 || 0);
        
        if (playEl) playEl.innerText = formatTime(totalPlayed);
        if (restEl) restEl.innerText = formatTime(totalRested);
        
        if (player.isOnField) {
            if (activeEl) activeEl.innerText = formatTime(player.secondsOnFieldActive || 0);
            if ((player.secondsOnFieldActive || 0) >= 180) {
                renderPlayersList();
            }
        }
    });
}

function initCharts() {
    let ctxMin = document.getElementById('chartMinutes');
    if (!ctxMin) return;
    chartMinutesInstance = new Chart(ctxMin.getContext('2d'), {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ label: 'Minutos em Jogo', data: [], borderColor: '#00ffcc', backgroundColor: 'rgba(0, 255, 204, 0.15)', fill: true, tension: 0.3 }] 
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa', font: { size: 10 } } } } }
    });

    let ctxShotsEl = document.getElementById('chartShots');
    if (ctxShotsEl) {
        chartShotsInstance = new Chart(ctxShotsEl.getContext('2d'), {
            type: 'bar',
            data: { labels: ['Dinamo', 'Visitante'], datasets: [{ label: 'Remates', data: [0,0], backgroundColor: '#ffcc00' }, { label: 'Golos', data: [0,0], backgroundColor: '#ff0055' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa' } } } }
        });
    }

    let ctxSubsEl = document.getElementById('chartSubs');
    if (ctxSubsEl) {
        chartSubsInstance = new Chart(ctxSubsEl.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Entradas (Subs)', data: [], backgroundColor: '#20c997' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa', font: { size: 10 } } } } }
        });
    }
}

function updateChartsData() {
    if (!chartMinutesInstance) return;
    let labels = players.map(p => `#${p.number} ${p.name.split(' ')[0]}`);
    let minutesData = players.map(p => (((p.secondsPlayedP1 || 0) + (p.secondsPlayedP2 || 0)) / 60).toFixed(1));
    let subsData = players.map(p => p.substitutionsCount || 0);

    chartMinutesInstance.data.labels = labels;
    chartMinutesInstance.data.datasets[0].data = minutesData;
    chartMinutesInstance.update();

    let homeName = document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO';
    let awayName = document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE';
    
    if (chartShotsInstance) {
        chartShotsInstance.data.labels = [homeName, awayName];
        let totalHomeRemates = statsData[1].home.remates + statsData[2].home.remates;
        let totalAwayRemates = statsData[1].away.remates + statsData[2].away.remates;
        let totalHomeGolos = statsData[1].home.golos + statsData[2].home.golos;
        let totalAwayGolos = statsData[1].away.golos + statsData[2].away.golos;
        chartShotsInstance.data.datasets[0].data = [totalHomeRemates, totalAwayRemates];
        chartShotsInstance.data.datasets[1].data = [totalHomeGolos, totalAwayGolos];
        chartShotsInstance.update();
    }

    if (chartSubsInstance) {
        chartSubsInstance.data.labels = labels;
        chartSubsInstance.data.datasets[0].data = subsData;
        chartSubsInstance.update();
    }
}

function exportReportExcel() {
    let homeName = document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO';
    let awayName = document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE';
    let obsEl = document.getElementById('match-observations');
    let observations = obsEl ? obsEl.value : '';

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
        ["Faltas", s1.home.livres, s1.away.livres, s2.home.livres, s2.away.livres, s1.home.livres + s2.home.livres, s1.away.livres + s2.away.livres],
        [],
        ["Tempos de Jogo e Estatísticas Individuais (DINAMO)"],
        ["Nº", "Nome", "Tempo Jogado (1ª P)", "Tempo Jogado (2ª P)", "Tempo Total Jogado", "Tempo Banco (1ª P)", "Tempo Banco (2ª P)", "Tempo Total Banco", "Substituições (Entradas)", "Amarelos", "Vermelhos"]
    ];

    players.forEach(p => {
        let t1 = formatTime(p.secondsPlayedP1 || 0);
        let t2 = formatTime(p.secondsPlayedP2 || 0);
        let tTotal = formatTime((p.secondsPlayedP1 || 0) + (p.secondsPlayedP2 || 0));
        
        let r1 = formatTime(p.secondsRestedP1 || 0);
        let r2 = formatTime(p.secondsRestedP2 || 0);
        let rTotal = formatTime((p.secondsRestedP1 || 0) + (p.secondsRestedP2 || 0));
        
        resumoData.push([p.number, p.name, t1, t2, tTotal, r1, r2, rTotal, p.substitutionsCount || 0, p.yellowCards || 0, p.redCards || 0]);
    });

    resumoData.push([]);
    resumoData.push(["Registo de Ações - 1ª Parte"]);
    resumoData.push(["Tempo", "Equipa", "Ação", "X", "Y"]);

    if (actionLogsHistory[1]) {
        actionLogsHistory[1].forEach(l => {
            resumoData.push([l.tempo, l.equipa, l.acao, l.x, l.y]);
        });
    }

    resumoData.push([]);
    resumoData.push(["Registo de Ações - 2ª Parte"]);
    resumoData.push(["Tempo", "Equipa", "Ação", "X", "Y"]);

    if (actionLogsHistory[2]) {
        actionLogsHistory[2].forEach(l => {
            resumoData.push([l.tempo, l.equipa, l.acao, l.x, l.y]);
        });
    }

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoData), "Resumo e Ações");
    XLSX.writeFile(wb, `Relatorio_PRO_${homeName}_vs_${awayName}.xlsx`);
}

async function exportReportPDF() {
    if (typeof html2canvas === 'undefined') {
        alert("Erro: A biblioteca html2canvas não foi carregada.");
        return;
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF('p', 'mm', 'a4');
    let pageWidth = doc.internal.pageSize.getWidth();
    let pageHeight = doc.internal.pageSize.getHeight();
    let margin = 14;
    let yPos = 20;

    let homeName = document.getElementById('input-home-name') ? document.getElementById('input-home-name').value : 'DINAMO';
    let awayName = document.getElementById('input-away-name') ? document.getElementById('input-away-name').value : 'VISITANTE';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatório Oficial - Análise Futsal PRO", margin, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Partida: ${homeName} ${homeGoals} - ${awayGoals} ${awayName}`, margin, yPos);
    yPos += 15;

    let pitchContainer = document.getElementById('capture-pitch-container');
    if (pitchContainer) {
        doc.setFontSize(14);
        doc.text("Mapeamento de Campo (Eventos):", margin, yPos);
        yPos += 5;
        
        let canvasPitch = await html2canvas(pitchContainer, { scale: 2 });
        let imgDataPitch = canvasPitch.toDataURL('image/jpeg', 1.0);
        
        let imgWidth = pageWidth - (margin * 2);
        let imgHeight = (canvasPitch.height * imgWidth) / canvasPitch.width;
        
        if (yPos + imgHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin + 10;
        }
        
        doc.addImage(imgDataPitch, 'JPEG', margin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 15;
    }

    let charts = [
        { id: 'chartShots', title: 'Gráfico: Remates vs Golos' },
        { id: 'chartMinutes', title: 'Gráfico: Minutos Jogados' },
        { id: 'chartSubs', title: 'Gráfico: Número de Substituições' }
    ];

    for (let chartInfo of charts) {
        let chartEl = document.getElementById(chartInfo.id);
        if (chartEl && chartEl.toDataURL) {
            if (yPos + 80 > pageHeight - margin) {
                doc.addPage();
                yPos = margin + 10;
            }
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(chartInfo.title, margin, yPos);
            yPos += 7;
            
            let imgDataChart = chartEl.toDataURL('image/png');
            let imgWidth = pageWidth - (margin * 2);
            let imgHeight = (chartEl.height * imgWidth) / chartEl.width;
            
            if (imgHeight > 75) {
                imgHeight = 75;
                imgWidth = (chartEl.width * imgHeight) / chartEl.height;
            }

            doc.addImage(imgDataChart, 'PNG', margin, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
        }
    }

    doc.addPage();
    yPos = margin + 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Registo Completo de Ações (Logs)", margin, yPos);
    yPos += 12;

    for (let period of [1, 2]) {
        if (actionLogsHistory[period] && actionLogsHistory[period].length > 0) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`${period}ª Parte`, margin, yPos);
            yPos += 7;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            
            let cronoLogs = [...actionLogsHistory[period]].reverse();

            cronoLogs.forEach(log => {
                let logText = `[${log.tempo}] ${log.equipa}: ${log.acao}`;
                let lines = doc.splitTextToSize(logText, pageWidth - (margin * 2));
                
                if (yPos + (lines.length * 5) > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin + 10;
                }
                
                doc.text(lines, margin, yPos);
                yPos += (lines.length * 5) + 2;
            });
            yPos += 10;
        }
    }

    doc.save(`Relatorio_Grafico_PRO_${homeName}_vs_${awayName}.pdf`);
}