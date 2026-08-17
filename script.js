const dict = {
    en: {
        placeholder: "Name, surname or nickname", add: "Add", finishStage: "Finish stage", export: "Export to Excel", 
        summary: "Summary", stageWord: "Stage", tableName: "Name", tableCurrent: "Current", tableTotal: "Total", 
        alertNoData: "No data to export!", profileWord: "Profile:", newProfileBtn: "+ New",
        promptNewProfile: "Enter profile name:", limitsTitle: "Jump Limits by Position",
        stageTimeLabel: "Stage Time:", totalTimeLabel: "Total Time:", helpTitle: "Instructions",
        deletePlayerBtn: "Remove Player", cancelDelete: "Cancel",
        confirmDeletePlayer: "Are you sure you want to completely remove this player?",
        confirmDeleteProfile: "Are you sure you want to delete this profile?",
        cantDeleteLast: "You cannot delete the last profile. Create a new one first.",
        pos_S: "Setter (S)", pos_OH: "Outside Hitter (OH)", pos_MB: "Middle Blocker (MB)", pos_OPP: "Opposite (OPP)", pos_L: "Libero (L)",
        helpHTML: `
            <h3>1. Add & Bind Keys</h3>
            <p>Select a position, type a name and click <b>Add</b>. To change a hotkey, click the orange button <code>[ + ]</code> on the tile. When it pulses red, press any key on your keyboard.</p>
            <h3>2. Count Jumps</h3>
            <p>Click anywhere on the tile OR press the assigned keyboard key.</p>
            <h3>3. Undo & Delete</h3>
            <p><b>Undo a jump:</b> Click the red <code>[ - ]</code> button on the top-left.<br>
            <b>Delete a player:</b> Click "Remove Player" at the top, then click the player's tile.</p>
            <h3>4. Finish Stage</h3>
            <p>Clicking <b>Finish Stage</b> saves the current count to the table and resets the tiles.</p>
        `
    },
    es: {
        placeholder: "Nombre, apellido o apodo", add: "Añadir", finishStage: "Terminar etapa", export: "Exportar a Excel", 
        summary: "Resumen", stageWord: "Etapa", tableName: "Nombre", tableCurrent: "Actual", tableTotal: "Total", 
        alertNoData: "¡No hay datos para exportar!", profileWord: "Perfil:", newProfileBtn: "+ Nuevo",
        promptNewProfile: "Ingrese el nombre del perfil:", limitsTitle: "Límites de saltos",
        stageTimeLabel: "Tiempo Etapa:", totalTimeLabel: "Tiempo Total:", helpTitle: "Instrucciones",
        deletePlayerBtn: "Eliminar Jugador", cancelDelete: "Cancelar",
        confirmDeletePlayer: "¿Estás seguro de que quieres eliminar a este jugador?",
        confirmDeleteProfile: "¿Estás seguro de que quieres eliminar este perfil?",
        cantDeleteLast: "No puedes eliminar el último perfil. Crea uno nuevo primero.",
        pos_S: "Armador (S)", pos_OH: "Punta (OH)", pos_MB: "Central (MB)", pos_OPP: "Opuesto (OPP)", pos_L: "Líbero (L)",
        helpHTML: `
            <h3>1. Añadir y Asignar Teclas</h3>
            <p>Elige posición, escribe el nombre y clic en <b>Añadir</b>. Para cambiar la tecla, haz clic en el botón naranja <code>[ + ]</code>.</p>
            <h3>2. Contar Saltos</h3>
            <p>Haz clic en la tarjeta O presiona la tecla asignada.</p>
            <h3>3. Deshacer y Eliminar</h3>
            <p><b>Deshacer salto:</b> Haz clic en el botón rojo <code>[ - ]</code>.<br>
            <b>Eliminar jugador:</b> Haz clic en "Eliminar Jugador" arriba, luego haz clic en la tarjeta.</p>
            <h3>4. Terminar Etapa</h3>
            <p>Guarda el conteo actual en la tabla y reinicia las tarjetas a 0.</p>
        `
    }
};

const positionsList = ['S', 'OH', 'MB', 'OPP', 'L'];
const availableKeys = ['1','2','3','4','5','6','q','w','e','r','t','y','a','s','d','f','g','h','z','x','c','v','b','n'];

let currentLang = 'en';
let appData = { profiles: {}, activeProfileId: null };
let activeProfile = null;

let listeningForBindIndex = null; 
let isBackspacePressed = false;
let isDeleteMode = false; // Nowy stan dla trybu usuwania
let stageTimerInterval = null;
let stageStartTime = null;

// ================= BAZA DANYCH I PROFILE =================
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

function updateProfileSelect() {
    const sel = document.getElementById('profileSelect');
    sel.innerHTML = '';
    Object.keys(appData.profiles).forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = appData.profiles[id].name;
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
}

// ================= JĘZYK I UI =================
function setLanguage(lang) {
    currentLang = lang;
    const t = dict[lang];
    document.getElementById('playerName').placeholder = t.placeholder;
    document.getElementById('addBtn').innerText = t.add;
    document.getElementById('stageBtnText').innerText = t.finishStage;
    document.getElementById('exportBtn').innerText = t.export;
    document.getElementById('summaryTitle').innerText = t.summary;
    document.getElementById('stageWord').innerText = t.stageWord;
    document.getElementById('profileWord').innerText = t.profileWord;
    document.getElementById('newProfileBtn').innerText = t.newProfileBtn;
    document.getElementById('limitsTitle').innerText = t.limitsTitle;
    document.getElementById('stageTimeLabel').innerText = t.stageTimeLabel;
    document.getElementById('totalTimeLabel').innerText = t.totalTimeLabel;
    document.getElementById('helpTitle').innerText = t.helpTitle;
    document.getElementById('helpContent').innerHTML = t.helpHTML;
    
    updateDeleteModeUI();
    
    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-es').classList.toggle('active', lang === 'es');
    
    updateTimerDisplay(); renderPositionSelect(); renderLimits(); renderTable(); 
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

function openHelp() { document.getElementById('helpModal').style.display = 'flex'; }
function closeHelp(event) { if(event) event.stopPropagation(); document.getElementById('helpModal').style.display = 'none'; }

// ================= TIMER =================
function startTimer() {
    if (stageTimerInterval) return;
    stageStartTime = Date.now() - (activeProfile.time * 1000);
    stageTimerInterval = setInterval(() => {
        activeProfile.time = Math.floor((Date.now() - stageStartTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateTimerDisplay() {
    document.getElementById('timeStage').innerText = formatTime(activeProfile?.time || 0);
    document.getElementById('timeTotal').innerText = formatTime((activeProfile?.totalTimeBase || 0) + (activeProfile?.time || 0));
}

// ================= KLAWIATURA I AKCJE =================
document.addEventListener('keydown', (event) => {
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

function addPlayer() {
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    const pos = document.getElementById('playerPosition').value;
    
    if (name !== "" && pos !== "") {
        const keyBind = activeProfile.players.length < availableKeys.length ? availableKeys[activeProfile.players.length] : '';
        activeProfile.players.push({ name: name, position: pos, keyBind: keyBind, currentJumps: 0, stages: [] });
        input.value = ''; input.focus(); 
        saveData(); renderGrid(); renderTable();
    }
}

function handleEnter(event) { if (event.key === 'Enter') addPlayer(); }

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

// ================= TRYB USUWANIA (NOWOŚĆ) =================
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
        saveData();
        toggleDeleteMode(); // Wyłączamy tryb usuwania po udanej akcji
        renderGrid(); 
        renderTable();
    } else {
        toggleDeleteMode(); // Anulowano, więc wyłączamy tryb
    }
}

function startListening(event, index) {
    if (event) event.stopPropagation(); 
    listeningForBindIndex = listeningForBindIndex === index ? null : index;
    renderGrid();
}

// ================= ZARZĄDZANIE ETAPEM I LIMITAMI =================
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

// ================= RENDEROWANIE WIDOKÓW (Z NOWYMI KOLORAMI) =================
function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = ''; 
    
    activeProfile.players.forEach((player, index) => {
        const tile = document.createElement('div');
        
        // Płynna paleta kolorów HSL: od 120 (Zielony) -> 60 (Żółty) -> 0 (Czerwony)
        const limit = activeProfile.limits[player.position] || 100;
        const totalPastStages = player.stages.reduce((sum, val) => sum + val, 0);
        const totalJumps = totalPastStages + player.currentJumps;
        
        let pct = totalJumps / limit;
        if (pct > 1) pct = 1; // Zatrzymujemy obliczenia na 100%, by kolor nie poszedł w fiolet/róż
        
        // Obliczanie odcienia: 0 skoków to zielony (120), 100% to czerwony (0)
        const hue = Math.floor(120 * (1 - pct));
        const tileColor = `hsl(${hue}, 85%, 42%)`; // 42% jasności daje mocny, nasycony i czytelny kolor

        tile.className = 'tile';
        // Przekazanie dynamicznego koloru do CSS (zmienia pasek na dole i licznik)
        tile.style.setProperty('--tile-color', tileColor);
        
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
    if (!activeProfile || activeProfile.players.length === 0) { table.innerHTML = ''; return; }

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

function exportToCSV() {
    if (!activeProfile || activeProfile.players.length === 0) { alert(dict[currentLang].alertNoData); return; }

    const t = dict[currentLang];
    let csvContent = `data:text/csv;charset=utf-8,\uFEFF${t.tableName},Position,`;
    
    for (let i = 0; i < activeProfile.stageIndex; i++) csvContent += `${t.stageWord} ${i + 1},`;
    csvContent += `${t.stageWord} ${activeProfile.stageIndex + 1} (${t.tableCurrent}),${t.tableTotal}\n`;
    
    activeProfile.players.forEach(p => {
        const totalPastStages = p.stages.reduce((sum, val) => sum + val, 0);
        const grandTotal = totalPastStages + p.currentJumps;
        
        csvContent += `${p.name},${p.position},`;
        p.stages.forEach(s => { csvContent += `${s},`; });
        csvContent += `${p.currentJumps},${grandTotal}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = currentLang === 'es' ? `saltos_etapa_${activeProfile.stageIndex + 1}.csv` : `jumps_stage_${activeProfile.stageIndex + 1}.csv`;
    link.setAttribute("download", fileName);
    
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

window.onload = () => { initData(); setLanguage('en'); };