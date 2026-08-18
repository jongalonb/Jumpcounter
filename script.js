const dict = {
    en: {
        placeholder: "Name, surname or nickname", add: "Add", finishStage: "Finish stage", export: "Export to Excel", 
        summary: "Summary", stageWord: "Stage", tableName: "Name", tableCurrent: "Current", tableTotal: "Total", 
        alertNoData: "No data to export!", profileWord: "Profile:", newProfileBtn: "+ New",
        promptNewProfile: "Enter profile name:", limitsTitle: "📊 Jump Limits",
        deletePlayerBtn: "Remove Player", cancelDelete: "Cancel", cancelAdd: "Cancel",
        newTrainingBtn: "🔄 New Training (Reset)", navMenuBtn: "Menu", navAddBtn: "Add", modalAddTitle: "Add Player",
        confirmNewTraining: "Are you sure you want to start a new training session? This will reset the timer and all jump counts to zero. Players and limits will be saved.",
        confirmDeletePlayer: "Are you sure you want to completely remove this player?",
        confirmDeleteProfile: "Are you sure you want to delete this profile?",
        cantDeleteLast: "You cannot delete the last profile. Create a new one first.",
        pos_S: "Setter (S)", pos_OH: "Outside Hitter (OH)", pos_MB: "Middle Blocker (MB)", pos_OPP: "Opposite (OPP)", pos_L: "Libero (L)",
        helpTitle: 'Instructions',
        helpHTML: `
            <h3>1. Menus & Settings</h3>
            <p>Click <b>☰ Menu</b> to change profiles, export to Excel, set jump limits, or start a new training session.</p>
            <h3>2. Add & Bind Keys</h3>
            <p>Click <b>➕ Add</b> to add a player. To assign a keyboard hotkey, click the top-right button on their tile. When it pulses red, press a key.</p>
            <h3>3. Count Jumps</h3>
            <p>Tap the tile OR press the assigned key to count a jump.</p>
            <h3>4. Undo & Delete</h3>
            <p><b>Undo:</b> Tap the red <code>[ - ]</code> on the tile.<br>
            <b>Delete Player:</b> Tap "Remove Player", then tap the tile.</p>
            <h3>5. Finish Stage</h3>
            <p>Tap <b>Finish Stage</b> to save counts to the summary table and reset tiles to 0.</p>
        `
    },
    es: {
        placeholder: "Nombre, apellido o apodo", add: "Añadir", finishStage: "Terminar etapa", export: "Exportar a Excel", 
        summary: "Resumen", stageWord: "Etapa", tableName: "Nombre", tableCurrent: "Actual", tableTotal: "Total", 
        alertNoData: "¡No hay datos para exportar!", profileWord: "Perfil:", newProfileBtn: "+ Nuevo",
        promptNewProfile: "Ingrese el nombre del perfil:", limitsTitle: "📊 Límites de saltos",
        deletePlayerBtn: "Eliminar Jugador", cancelDelete: "Cancelar", cancelAdd: "Cancelar",
        newTrainingBtn: "🔄 Nuevo Entrenamiento (Reset)", navMenuBtn: "Menú", navAddBtn: "Añadir", modalAddTitle: "Añadir Jugador",
        confirmNewTraining: "¿Estás seguro de comenzar un nuevo entrenamiento? Se reiniciarán el tiempo y los saltos. Los jugadores se mantendrán.",
        confirmDeletePlayer: "¿Estás seguro de que quieres eliminar a este jugador?",
        confirmDeleteProfile: "¿Estás seguro de que quieres eliminar este perfil?",
        cantDeleteLast: "No puedes eliminar el último perfil. Crea uno nuevo primero.",
        pos_S: "Armador (S)", pos_OH: "Punta (OH)", pos_MB: "Central (MB)", pos_OPP: "Opuesto (OPP)", pos_L: "Líbero (L)",
        helpTitle: 'Instrucciones',
        helpHTML: `
            <h3>1. Menú y Ajustes</h3>
            <p>Haz clic en <b>☰ Menú</b> para cambiar perfiles, exportar, ajustar límites o iniciar un nuevo entrenamiento.</p>
            <h3>2. Añadir y Asignar</h3>
            <p>Clic en <b>➕ Añadir</b> para agregar jugador. Para asignar tecla, clic en el botón superior derecho de la tarjeta.</p>
            <h3>3. Contar Saltos</h3>
            <p>Toca la tarjeta O presiona la tecla asignada.</p>
            <h3>4. Deshacer y Eliminar</h3>
            <p><b>Deshacer:</b> Toca el <code>[ - ]</code> rojo.<br>
            <b>Eliminar:</b> Toca "Eliminar Jugador", luego la tarjeta.</p>
            <h3>5. Terminar Etapa</h3>
            <p>Guarda el conteo en la tabla y reinicia las tarjetas a 0.</p>
        `
    }
};

const positionsList = ['S', 'OH', 'MB', 'OPP', 'L'];
const availableKeys = ['1','2','3','4','5','6','q','w','e','r','t','y','a','s','d','f','g','h','z','x','c','v','b','n'];

let currentLang = localStorage.getItem('volleyJumpsLang') || 'en';
let isDarkMode = localStorage.getItem('volleyJumpsDarkMode') === 'true';
let appData = { profiles: {}, activeProfileId: null };
let activeProfile = null;

let listeningForBindIndex = null; 
let isBackspacePressed = false;
let isDeleteMode = false;
let stageTimerInterval = null;
let stageStartTime = null;

// ================= MODALS & UI =================
function openModal(modalId) {
    closeModals(); // Zamknij inne przed otwarciem
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'addPlayerModal') {
        setTimeout(() => document.getElementById('playerName').focus(), 100);
    }
}
function closeModals(event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// Sprawdza, czy jakiekolwiek okno modalne jest otwarte (blokuje wtedy klawiaturę)
function isAnyModalOpen() {
    return document.querySelector('.modal.active') !== null;
}

// ================= BAZA DANYCH =================
function initData() {
    const stored = localStorage.getItem('volleyJumpsData');
    if (stored) appData = JSON.parse(stored);
    
    if (!appData.activeProfileId || !appData.profiles[appData.activeProfileId]) {
        const defaultId = 'prof_' + Date.now();
        appData.profiles[defaultId] = createEmptyProfile("Team A");
        appData.activeProfileId = defaultId;
    }
    
    updateProfileSelect();
    loadActiveProfile();
}

function createEmptyProfile(name) {
    return { name: name, players: [], stageIndex: 0, time: 0, totalTimeBase: 0, limits: { S: 60, OH: 100, MB: 80, OPP: 100, L: 20 } };
}

function saveData() { localStorage.setItem('volleyJumpsData', JSON.stringify(appData)); }

// ================= PROFILE & RESET =================
function updateProfileSelect() {
    const sel = document.getElementById('profileSelect');
    sel.innerHTML = '';
    Object.keys(appData.profiles).forEach(id => {
        const opt = document.createElement('option');
        opt.value = id; opt.innerText = appData.profiles[id].name;
        if (id === appData.activeProfileId) opt.selected = true;
        sel.appendChild(opt);
    });
}

function changeProfile() {
    appData.activeProfileId = document.getElementById('profileSelect').value;
    saveData(); loadActiveProfile();
}

function createProfile() {
    const name = prompt(dict[currentLang].promptNewProfile);
    if (name) {
        const newId = 'prof_' + Date.now();
        appData.profiles[newId] = createEmptyProfile(name);
        appData.activeProfileId = newId;
        saveData(); updateProfileSelect(); loadActiveProfile();
    }
}

function deleteProfile() {
    if (Object.keys(appData.profiles).length > 1) {
        if (confirm(dict[currentLang].confirmDeleteProfile)) {
            delete appData.profiles[appData.activeProfileId];
            appData.activeProfileId = Object.keys(appData.profiles)[0];
            saveData(); updateProfileSelect(); loadActiveProfile();
        }
    } else alert(dict[currentLang].cantDeleteLast);
}

// === NOWY TRENING (Twardy reset danych, zachowanie zespołu) ===
function startNewTraining() {
    if (confirm(dict[currentLang].confirmNewTraining)) {
        activeProfile.stageIndex = 0;
        activeProfile.time = 0;
        activeProfile.totalTimeBase = 0;
        
        activeProfile.players.forEach(p => {
            p.stages = [];
            p.currentJumps = 0;
        });
        
        if(stageTimerInterval) clearInterval(stageTimerInterval);
        stageTimerInterval = null;
        
        saveData();
        closeModals();
        loadActiveProfile();
    }
}

function loadActiveProfile() {
    activeProfile = appData.profiles[appData.activeProfileId];
    if(activeProfile.totalTimeBase === undefined) activeProfile.totalTimeBase = 0;
    if(stageTimerInterval) clearInterval(stageTimerInterval);
    stageTimerInterval = null;
    
    document.getElementById('stageLabel').innerText = activeProfile.stageIndex + 1;
    document.getElementById('stageBtnLabel').innerText = activeProfile.stageIndex + 1;
    
    isDeleteMode = false;
    updateDeleteModeUI();
    
    updateTimerDisplay(); renderPositionSelect(); renderLimits(); renderGrid(); renderTable();
    
    // Auto-start stopera jeśli czas > 0 (po odświeżeniu strony)
    if (activeProfile.time > 0) startTimer();
}

// ================= JĘZYK =================
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('volleyJumpsLang', lang);
    const t = dict[lang];
    document.getElementById('playerName').placeholder = t.placeholder;
    document.getElementById('confirmAddBtn').innerText = t.add;
    document.getElementById('cancelAddBtn').innerText = t.cancelAdd;
    document.getElementById('stageBtnText').innerText = t.finishStage;
    document.getElementById('exportBtn').innerText = "📥 " + t.export;
    document.getElementById('summaryTitle').innerText = "📊 " + t.summary;
    document.getElementById('stageWord').innerText = t.stageWord;
    document.getElementById('profileWord').innerText = t.profileWord;
    document.getElementById('newProfileBtn').innerText = t.newProfileBtn;
    document.getElementById('limitsTitle').innerText = "📊 " + t.limitsTitle;
    document.getElementById('newTrainingBtn').innerText = t.newTrainingBtn;
    document.getElementById('navMenuBtn').innerText = t.navMenuBtn;
    document.getElementById('navAddBtn').innerText = t.navAddBtn;
    document.getElementById('modalAddTitle').innerText = t.modalAddTitle;
    document.getElementById('helpTitle').innerText = t.helpTitle;
    document.getElementById('helpContent').innerHTML = t.helpHTML;
    
    updateDeleteModeUI();
    
    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-es').classList.toggle('active', lang === 'es');
    applyTheme();
    
    renderPositionSelect(); renderLimits(); renderTable(); 
}

function applyTheme() {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', isDarkMode ? '#0f172a' : '#43A1D5');
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.innerText = isDarkMode ? '☀️' : '🌙';
        themeBtn.title = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('volleyJumpsDarkMode', String(isDarkMode));
    applyTheme();
}

function renderPositionSelect() {
    const sel = document.getElementById('playerPosition');
    sel.innerHTML = '';
    positionsList.forEach(pos => {
        const opt = document.createElement('option');
        opt.value = pos; opt.innerText = dict[currentLang]['pos_' + pos];
        sel.appendChild(opt);
    });
}

// ================= TIMER =================
function startTimer() {
    if (stageTimerInterval) return;
    stageStartTime = Date.now() - (activeProfile.time * 1000);
    stageTimerInterval = setInterval(() => {
        activeProfile.time = Math.floor((Date.now() - stageStartTime) / 1000);
        updateTimerDisplay();
        saveData();
    }, 1000);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateTimerDisplay() {
    document.getElementById('timeStage').innerText = formatTime(activeProfile?.time || 0);
    document.getElementById('timeTotal').innerText = "(" + formatTime((activeProfile?.totalTimeBase || 0) + (activeProfile?.time || 0)) + ")";
}

// ================= KLAWIATURA =================
document.addEventListener('keydown', (event) => {
    // Blokada klawiatury jeśli JAKIEKOLWIEK okno (Modal) jest otwarte
    if (isAnyModalOpen()) return;
    if (event.target.tagName.toLowerCase() === 'input' || isDeleteMode) return;
    
    if (event.key === 'Backspace') { event.preventDefault(); isBackspacePressed = true; return; }

    const pressedKey = event.key.toLowerCase();

    if (listeningForBindIndex !== null) {
        if (pressedKey === 'escape') { listeningForBindIndex = null; renderGrid(); return; }
        activeProfile.players.forEach(p => { if (p.keyBind === pressedKey) p.keyBind = ''; });
        activeProfile.players[listeningForBindIndex].keyBind = pressedKey;
        listeningForBindIndex = null;
        saveData(); renderGrid(); return; 
    }

    const playerIndex = activeProfile.players.findIndex(p => p.keyBind === pressedKey);
    if (playerIndex !== -1) {
        if (isBackspacePressed) decrementJump(event, playerIndex);
        else incrementJump(playerIndex);
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Backspace') isBackspacePressed = false;
});

function handleEnter(event) { 
    if (event.key === 'Enter') addPlayer(); 
}

// ================= AKCJE ZAWODNIKÓW =================
function addPlayer() {
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    const pos = document.getElementById('playerPosition').value;
    
    if (name !== "" && pos !== "") {
        const keyBind = activeProfile.players.length < availableKeys.length ? availableKeys[activeProfile.players.length] : '';
        activeProfile.players.push({ name: name, position: pos, keyBind: keyBind, currentJumps: 0, stages: [] });
        input.value = '';  
        saveData(); renderGrid(); renderTable();
        closeModals(); // Zamykamy modal po dodaniu
    }
}

function incrementJump(index) {
    if (listeningForBindIndex !== null) return; 
    startTimer();
    activeProfile.players[index].currentJumps++;
    saveData(); renderGrid(); renderTable();
}

function decrementJump(event, index) {
    if (event) event.stopPropagation();
    if (activeProfile.players[index].currentJumps > 0) {
        activeProfile.players[index].currentJumps--;
        saveData(); renderGrid(); renderTable();
    }
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    updateDeleteModeUI();
}

function updateDeleteModeUI() {
    const btn = document.getElementById('delPlayerBtn');
    const grid = document.getElementById('grid');
    if (isDeleteMode) {
        btn.innerText = dict[currentLang].cancelDelete;
        btn.classList.add('active-mode');
        grid.classList.add('delete-mode');
    } else {
        btn.innerText = dict[currentLang].deletePlayerBtn;
        btn.classList.remove('active-mode');
        grid.classList.remove('delete-mode');
    }
}

function executeDeletePlayer(index) {
    const pName = activeProfile.players[index].name;
    if (confirm(`${dict[currentLang].confirmDeletePlayer}\n(${pName})`)) {
        activeProfile.players.splice(index, 1);
        saveData(); toggleDeleteMode(); renderGrid(); renderTable();
    } else {
        toggleDeleteMode(); 
    }
}

function startListening(event, index) {
    if (event) event.stopPropagation(); 
    listeningForBindIndex = listeningForBindIndex === index ? null : index;
    renderGrid();
}

// ================= ETAPY I LIMITY =================
function nextStage() {
    if (!activeProfile || activeProfile.players.length === 0) return;
    
    clearInterval(stageTimerInterval); stageTimerInterval = null;
    activeProfile.totalTimeBase += activeProfile.time;
    activeProfile.time = 0;
    updateTimerDisplay();

    activeProfile.players.forEach(p => { p.stages.push(p.currentJumps); p.currentJumps = 0; });
    activeProfile.stageIndex++;
    document.getElementById('stageLabel').innerText = activeProfile.stageIndex + 1;
    document.getElementById('stageBtnLabel').innerText = activeProfile.stageIndex + 1;
    saveData(); renderGrid(); renderTable();
}

function renderLimits() {
    const container = document.getElementById('limitsContainer');
    container.innerHTML = '';
    positionsList.forEach(pos => {
        const div = document.createElement('div');
        div.className = 'limit-item';
        div.innerHTML = `<label>${pos}</label><input type="number" value="${activeProfile.limits[pos]}" onchange="updateLimit('${pos}', this.value)">`;
        container.appendChild(div);
    });
}

function updateLimit(pos, value) {
    let val = parseInt(value);
    if (isNaN(val) || val < 1) val = 100;
    activeProfile.limits[pos] = val;
    saveData(); renderGrid();
}

// ================= WIDOKI (Grid & Table) =================
function renderGrid() {
    const grid = document.getElementById('grid');
    if (!activeProfile || !activeProfile.players) return;
    grid.innerHTML = ''; 
    
    activeProfile.players.forEach((player, index) => {
        const tile = document.createElement('div');
        
        const limit = activeProfile.limits[player.position] || 100;
        const totalPastStages = player.stages.reduce((sum, val) => sum + val, 0);
        const totalJumps = totalPastStages + player.currentJumps;
        
        let pct = totalJumps / limit;
        if (pct > 1) pct = 1; 
        
        const hue = Math.floor(120 * (1 - pct));
        const tileColor = `hsl(${hue}, 85%, 45%)`; 
        const tileBgColor = `hsl(${hue}, 85%, 96%)`; 

        tile.className = 'tile';
        tile.style.setProperty('--tile-color', tileColor);
        tile.style.setProperty('--tile-bg-color', tileBgColor);
        
        tile.onclick = () => {
            if (isDeleteMode) executeDeletePlayer(index);
            else incrementJump(index);
        };
        
        const isListening = listeningForBindIndex === index;
        const keyText = isListening ? '[ ? ]' : (player.keyBind ? `[ ${player.keyBind} ]` : '[ + ]');
        const listeningClass = isListening ? 'listening' : '';

        tile.innerHTML = `
            <div class="undo-btn" onclick="decrementJump(event, ${index})">-</div>
            <div class="key-hint ${listeningClass}" onclick="startListening(event, ${index})">${keyText}</div>
            <div class="name">${player.name}</div>
            <div class="pos-label">${player.position}</div>
            <div class="count">${player.currentJumps}</div>
        `;
        grid.appendChild(tile);
    });
}

function renderTable() {
    const table = document.getElementById('summaryTable');
    if (!activeProfile || !activeProfile.players || activeProfile.players.length === 0) { table.innerHTML = ''; return; }

    const t = dict[currentLang];
    let html = `<thead><tr><th>${t.tableName}</th>`;
    for (let i = 0; i < activeProfile.stageIndex; i++) html += `<th>${t.stageWord} ${i + 1}</th>`;
    html += `<th>${t.tableCurrent}</th><th class="total-col">${t.tableTotal}</th></tr></thead><tbody>`;

    activeProfile.players.forEach(p => {
        const totalPastStages = p.stages.reduce((sum, val) => sum + val, 0);
        const grandTotal = totalPastStages + p.currentJumps;
        
        html += `<tr><td><strong>${p.name}</strong> <small style="color:gray">(${p.position})</small></td>`;
        p.stages.forEach(s => { html += `<td>${s}</td>`; });
        html += `<td>${p.currentJumps}</td><td class="total-col">${grandTotal}</td></tr>`;
    });
    
    html += '</tbody>'; table.innerHTML = html;
}

// ================= EKSPORT (EXCEL BULLETPROOF) =================
function buildExportPayload() {
    return {
        exportedAt: new Date().toISOString(),
        profileName: activeProfile.name,
        stageIndex: activeProfile.stageIndex,
        totalTime: activeProfile.totalTimeBase + activeProfile.time,
        players: activeProfile.players.map(p => {
            const totalPastStages = p.stages.reduce((sum, val) => sum + val, 0);
            const total = totalPastStages + p.currentJumps;
            return {
                name: p.name,
                position: p.position,
                keyBind: p.keyBind || null,
                stages: p.stages,
                currentJumps: p.currentJumps,
                total
            };
        })
    };
}

function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportCurrentData(format) {
    if (!activeProfile || !activeProfile.players || activeProfile.players.length === 0) { alert(dict[currentLang].alertNoData); return; }

    const payload = buildExportPayload();
    const stageNumber = activeProfile.stageIndex + 1;

    if (format === 'csv') {
        let csv = 'name;position;';
        for (let i = 0; i < activeProfile.stageIndex; i++) csv += `stage ${i + 1};`;
        csv += 'current;total\n';
        activeProfile.players.forEach(p => {
            const totalPastStages = p.stages.reduce((sum, val) => sum + val, 0);
            const total = totalPastStages + p.currentJumps;
            csv += `${p.name};${p.position};`;
            p.stages.forEach(s => csv += `${s};`);
            csv += `${p.currentJumps};${total}\n`;
        });
        downloadTextFile(`jumps_${stageNumber}.csv`, csv, 'text/csv;charset=utf-8;');
    }

    if (format === 'json') {
        const json = JSON.stringify(payload, null, 2);
        downloadTextFile(`jumps_${stageNumber}.json`, json, 'application/json;charset=utf-8;');
    }

    if (format === 'txt') {
        let text = `Jump Counter Pro\nProfile: ${payload.profileName}\nExported: ${payload.exportedAt}\n\n`;
        payload.players.forEach(player => {
            text += `${player.name} (${player.position})\n`;
            if (player.stages.length) {
                text += `  stages: ${player.stages.join(' | ')}\n`;
            }
            text += `  current: ${player.currentJumps}\n  total: ${player.total}\n\n`;
        });
        downloadTextFile(`jumps_${stageNumber}.txt`, text, 'text/plain;charset=utf-8;');
    }

    closeModals();
}

function exportToCSV() {
    exportCurrentData('csv');
}

async function copyExportData() {
    if (!activeProfile || !activeProfile.players || activeProfile.players.length === 0) { alert(dict[currentLang].alertNoData); return; }
    const content = JSON.stringify(buildExportPayload(), null, 2);
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(content);
        } else {
            prompt('Copy the export data below:', content);
        }
        closeModals();
    } catch (error) {
        prompt('Copy the export data below:', content);
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

window.addEventListener('load', () => { initData(); setLanguage(currentLang || 'en'); applyTheme(); });