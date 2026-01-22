
/**
 * CLICKZONE - TACTICAL CYBER COMBAT
 * Enhanced Logic for Menu, Popups, and SSL Troubleshooting.
 */

interface Team {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  color: string;
  textClass: string;
  players: string[];
}

const state = {
  currentView: 'menu',
  selectedClan: null as string | null,
  selectedPlayer: null as string | null,
  isExecuting: false,
  ws: null as WebSocket | null,
  httpBackendBase: "https://site-cancellation-disposal-essays.trycloudflare.com", // Changed to HTTPS external URL
  wssBackendBase: "wss://localhost:8443", // Explicitly WSS
  teams: [
    { id: 'alpha', name: 'Alpha Clan', hp: 2000, maxHp: 2000, color: '#4ade80', textClass: 'text-green-400', players: ['Alpha_01', 'Alpha_02', 'Alpha_03', 'Alpha_04'] },
    { id: 'beta', name: 'Beta Empire', hp: 2000, maxHp: 2000, color: '#22d3ee', textClass: 'text-cyan-400', players: ['Beta_01', 'Beta_02', 'Beta_03', 'Beta_04'] },
    { id: 'gamma', name: 'Gamma Rebels', hp: 2000, maxHp: 2000, color: '#f87171', textClass: 'text-red-400', players: ['Gamma_01', 'Gamma_02', 'Gamma_03', 'Gamma_04'] },
    { id: 'delta', name: 'Delta Legion', hp: 2000, maxHp: 2000, color: '#fbbf24', textClass: 'text-yellow-400', players: ['Delta_01', 'Delta_02', 'Delta_03', 'Delta_04'] }
  ] as Team[],
  lastAttackPoint: null as number | null, // Tambahan: Melacak attack_point terakhir dari WS
  isWsIntentionallyDisconnected: false, // Tambahan: Flag untuk disconnect WS yang disengaja
};

// DOM References
const viewMenu = document.getElementById('view-menu')!;
const viewArena = document.getElementById('view-arena')!;
const modalBriefing = document.getElementById('modal-briefing')!;

const btnPlayGame = document.getElementById('btn-play-game')!; // New: Button di menu utama
const btnCloseBriefing = document.getElementById('btn-close-briefing')!;
const btnEnterArena = document.getElementById('btn-enter-arena')!; // Tombol di dalam modal briefing
const btnExitArena = document.getElementById('btn-exit-arena')!;
const btnFixSSL = document.getElementById('btn-fix-ssl')!;

const btnStrike = document.getElementById('btn-strike') as HTMLButtonElement;
const hudHealth = document.getElementById('hud-health-container')!;
const clanGrid = document.getElementById('clan-grid')!;
const playerGrid = document.getElementById('player-grid')!;
const targetLabel = document.getElementById('target-label')!;
const networkLog = document.getElementById('network-log')!;
const combatFeedback = document.getElementById('combat-feedback')!;
const selectionIndicator = document.getElementById('selection-indicator')!;

const connLed = document.getElementById('connection-led')!; // Untuk WSS status
const connText = document.getElementById('connection-status-text')!; // Untuk WSS status
const statusIndicator = document.getElementById('status-indicator')!; // Untuk WSS status

const arenaHttpStatus = document.getElementById('arena-http-status')!; // Untuk HTTP status di arena
const arenaWssStatus = document.getElementById('arena-wss-status')!; // Untuk WSS status di arena

let isWssConnected = false;
let isHttpLive = false; // Status untuk melacak koneksi HTTP/HTTPS backend


// --- REAL WEBSOCKET LOGIC ---

function initWebSocket() {
  if (state.ws) state.ws.close();
  state.isWsIntentionallyDisconnected = false; // Reset pada setiap upaya koneksi baru
  state.lastAttackPoint = null; // Reset lastAttackPoint pada setiap upaya koneksi baru
  
  const wsUrl = `${state.wssBackendBase}/ws?playerID=2`;
  
  addFeedback("INITIATING UPLINK TO NODE 8443 (WSS)...");
  
  try {
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      addFeedback("UPLINK ESTABLISHED: CONNECTED (WSS).");
      addLog('WS', 'OPEN', 'SUCCESS', { status: "connected", node: "8443", protocol: "WSS" }, wsUrl);
      updateWssConnectionStatus(true);
      state.isWsIntentionallyDisconnected = false; // Pastikan false saat koneksi berhasil
    };

    state.ws.onmessage = (event) => {
      console.log('WS: onmessage triggered. Raw data:', event.data); // DEBUG LOG 1
      try {
        const data = JSON.parse(event.data);
        console.log('WS: Parsed data:', data); // DEBUG LOG 2
        addLog('WS', 'RECEIVE', 'DATA', data);

        // Tambahan: Logika untuk mendeteksi attack_point yang berulang
        if (state.lastAttackPoint !== null && data.attack_point === state.lastAttackPoint) {
          console.warn(`WS: Detected repeated attack_point (${data.attack_point}). Disconnecting WebSocket intentionally.`);
          addFeedback(`WARNING: Repeated attack_point detected (${data.attack_point}). Uplink intentionally severed. Strike to reconnect.`, true);
          state.isWsIntentionallyDisconnected = true; // Tandai sebagai sengaja diputus
          state.ws?.close(); // Putuskan koneksi WebSocket
          // Jangan memproses pengurangan HP atau rendering jika sengaja diputus
          return; 
        }

        // Jika attack_point unik atau pesan pertama
        state.lastAttackPoint = data.attack_point; // Simpan attack_point unik yang baru
        state.isWsIntentionallyDisconnected = false; // Hapus flag jika ada attack_point unik

        const targetTeamIndex = state.teams.findIndex(t => t.id === data.clan_colour);
        
        if (targetTeamIndex !== -1) {
          const targetTeam = state.teams[targetTeamIndex];
          console.log(`WS: Target team found: ${targetTeam.name}. HP before: ${targetTeam.hp}`); // DEBUG LOG 3
          
          const newHp = Math.max(0, targetTeam.hp - data.attack_point);
          console.log(`WS: HP after reduction: ${newHp}. Attack point: ${data.attack_point}`); // DEBUG LOG 4

          // --- IMMUTABLE STATE UPDATE ---
          state.teams = state.teams.map((team, index) => 
            index === targetTeamIndex 
              ? { ...team, hp: newHp } 
              : team
          );
          // --- END IMMUTABLE STATE UPDATE ---

          addFeedback(`SYNC: ${data.player_id} hit ${targetTeam.name} for ${data.attack_point} damage!`);
          updateHealthBarsDisplay(); // Panggil fungsi update khusus untuk health bar
        } else {
          console.warn(`WS: Target team with clan_colour "${data.clan_colour}" not found in frontend state.`); // DEBUG LOG 5
          addFeedback(`WARNING: WS data received for unknown clan "${data.clan_colour}".`, true);
        }
      } catch (e) {
        console.error("Gagal memproses data broadcast WebSocket:", e, "Raw data was:", event.data); // DEBUG LOG 6
        addFeedback("ERROR: Failed to process WS broadcast data. Check console.", true);
      }
    };

    state.ws.onclose = () => {
      addFeedback("UPLINK CLOSED (WSS).");
      updateWssConnectionStatus(false);
      // Hanya mencoba auto-reconnect jika TIDAK sengaja diputus
      if (!state.isWsIntentionallyDisconnected) {
        addFeedback("UPLINK RETRYING IN 5S...");
        setTimeout(() => {
          if (state.currentView === 'arena') initWebSocket();
        }, 5000);
      } else {
        // Jika sengaja diputus, berikan feedback spesifik dan jangan auto-reconnect
        addFeedback("UPLINK REMAINS SEVERED due to repeated attack_point. Strike to reconnect.", false);
      }
    };

    state.ws.onerror = (err) => {
      updateWssConnectionStatus(false);
      state.isWsIntentionallyDisconnected = false; // Error bukan disconnect yang disengaja
      addLog('WS', 'ERROR', 'CONNECTION_REFUSED', { 
        hint: "SSL Error pada Chrome. Klik tombol 'FIX CHROME CONNECTION' di menu utama untuk memberikan izin manual ke https://localhost:8443." 
      }, wsUrl);
      addFeedback("CRITICAL: WSS CONNECTION REFUSED. CHECK SSL PERMISSION.", true);
      console.error("WebSocket Error:", err); // DEBUG LOG 7
    };
  } catch (e) {
    console.error("WebSocket Exception during initialization:", e); // DEBUG LOG 8
    addFeedback("ERROR: WebSocket initialization failed. See console.", true);
  }
}

// Hanya untuk status WSS
function updateWssConnectionStatus(connected: boolean) {
  isWssConnected = connected;
  if (connLed) { // Menu utama
    connLed.classList.toggle('bg-red-500', !connected);
    connLed.classList.toggle('bg-green-500', connected);
    connLed.classList.toggle('animate-pulse', !connected);
  }
  if (connText) connText.innerText = connected ? "Network: Synchronized" : "Network: Disconnected";
  if (statusIndicator) statusIndicator.innerText = connected ? "CONNECTED" : "DISCONNECTED";
  if (arenaWssStatus) arenaWssStatus.innerHTML = connected 
    ? `<div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div><span class="text-[8px] text-green-400 font-bold uppercase tracking-widest">WSS: 8443 OK</span>`
    : `<div class="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]"></div><span class="text-[8px] text-red-400 font-bold uppercase tracking-widest">WSS: 8443 REFUSED</span>`;
}

// Status untuk HTTP/HTTPS, akan diperbarui saat strike dilakukan
function updateHttpStatus(connected: boolean) {
  isHttpLive = connected;
  if (arenaHttpStatus) arenaHttpStatus.innerHTML = connected 
    ? `<div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div><span class="text-[8px] text-green-400 font-bold uppercase tracking-widest">HTTPS: External OK</span>`
    : `<div class="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]"></div><span class="text-[8px] text-red-400 font-bold uppercase tracking-widest">HTTPS: External OFFLINE</span>`;
}


// --- VIEW & MODAL NAVIGATION ---

btnPlayGame.addEventListener('click', () => {
  modalBriefing.classList.remove('hidden');
});

btnCloseBriefing.addEventListener('click', () => {
  modalBriefing.classList.add('hidden');
});

btnEnterArena.addEventListener('click', () => {
  state.currentView = 'arena';
  modalBriefing.classList.add('hidden');
  viewMenu.classList.add('hidden');
  viewArena.classList.remove('hidden');
  
  // Render initial structure
  renderHUDStructure(); // Render struktur HUD
  renderClansStructure(); // Render struktur Clan Grid
  renderPlayers(); // Render Player Grid (akan kosong jika belum ada clan)
  
  // Update dynamic parts with initial data
  updateHealthBarsDisplay(); // Panggil sekali setelah initial UI untuk mengisi data
  updateStrikeBtn();
  initWebSocket();
  // Asumsi HTTP/HTTPS awalnya tidak terhubung, akan diperbarui saat strike
  updateHttpStatus(false); 
});

btnExitArena.addEventListener('click', () => {
  state.currentView = 'menu';
  viewArena.classList.add('hidden');
  viewMenu.classList.remove('hidden');
  if (state.ws) state.ws.close();
  // Reset status saat keluar arena
  updateWssConnectionStatus(false);
  updateHttpStatus(false); 
  // Reset juga flag disconnect dan lastAttackPoint saat keluar arena
  state.isWsIntentionallyDisconnected = false;
  state.lastAttackPoint = null;
});

btnFixSSL.addEventListener('click', () => {
  window.open(`${state.wssBackendBase}/`, "_blank");
  addFeedback("MANUAL SSL OVERRIDE REQUESTED for WSS (Local). PROCEED IN THE NEW TAB. External HTTPS endpoints do not require this step.", true);
});

// --- CORE RENDERING ---

// Fungsi untuk merender struktur HUD awal (dipanggil sekali)
function renderHUDStructure() {
  hudHealth.innerHTML = state.teams.map(t => `
    <div class="flex flex-col items-end w-20 hud-team-status" data-team-id="${t.id}">
      <span class="text-[8px] uppercase tracking-widest ${t.textClass} font-bold">${t.name}</span>
      <div class="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
        <div class="health-bar-fill h-full" style="width: 0%; background-color: ${t.color}"></div>
      </div>
      <span class="text-[7px] text-white/30 mt-1 hud-hp-text">0 HP</span>
    </div>
  `).join('');
}

// Fungsi untuk merender struktur Clan Grid awal dan memasang event delegation (dipanggil sekali)
function renderClansStructure() {
  clanGrid.innerHTML = state.teams.map(t => `
    <button data-id="${t.id}" class="clan-card relative p-6 rounded-[2rem] border-2 border-white/5 bg-black/40 hover:border-white/20 transition-all flex flex-col items-center group ${state.selectedClan === t.id ? 'active' : ''}">
      <div class="absolute top-0 left-0 w-full h-1 bg-black/20">
         <div class="health-bar-fill h-full" style="width: 0%; background-color: ${t.color}"></div>
      </div>
      <div class="mt-2 p-5 rounded-2xl border-2 border-white/5 transition-transform group-hover:scale-110 ${t.textClass}">
         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      </div>
      <h3 class="mt-3 font-black text-[10px] uppercase tracking-widest ${t.textClass}">${t.name}</h3>
      <span class="text-[9px] text-white/20 font-bold clan-card-hp-text">0 / ${t.maxHp} HP</span>
    </button>
  `).join('');

  // Event delegation untuk clan cards (dipasang sekali saat render struktur)
  // Penting: Pastikan ini dipasang HANYA SEKALI setelah struktur `clanGrid` dibuat.
  clanGrid.removeEventListener('click', handleClanCardClick); 
  clanGrid.addEventListener('click', handleClanCardClick);
}

// Fungsi untuk memperbarui hanya health bar dan teks HP (dipanggil setiap kali state HP berubah)
function updateHealthBarsDisplay() {
  state.teams.forEach(t => {
    // Update HUD health bar
    const hudTeamElement = hudHealth.querySelector(`.hud-team-status[data-team-id="${t.id}"]`);
    const hudHealthFill = hudTeamElement?.querySelector('.health-bar-fill') as HTMLElement;
    const hudHpSpan = hudTeamElement?.querySelector('.hud-hp-text');

    if (hudHealthFill) {
      hudHealthFill.style.width = `${(t.hp/t.maxHp)*100}%`;
    }
    if (hudHpSpan) {
        hudHpSpan.textContent = `${t.hp} HP`;
    }

    // Update Clan Card health bar dan HP text
    const clanCard = clanGrid.querySelector(`.clan-card[data-id="${t.id}"]`);
    const clanHealthFill = clanCard?.querySelector('.health-bar-fill') as HTMLElement;
    const clanHpSpan = clanCard?.querySelector('.clan-card-hp-text');
    
    if (clanHealthFill) {
      clanHealthFill.style.width = `${(t.hp/t.maxHp)*100}%`;
    }
    if (clanHpSpan) {
      clanHpSpan.textContent = `${t.hp} / ${t.maxHp} HP`;
    }
  });
  // Pastikan status HTTP dan WSS terpanggil saat update
  updateWssConnectionStatus(isWssConnected); 
  updateHttpStatus(isHttpLive);
}

function handleClanCardClick(event: Event) {
  const target = event.target as HTMLElement;
  const clanCard = target.closest('.clan-card') as HTMLElement;
  if (clanCard) {
    state.selectedClan = clanCard.dataset.id || null;
    state.selectedPlayer = null;
    
    // Perbarui kelas 'active' secara manual pada clan cards
    document.querySelectorAll('.clan-card').forEach(card => card.classList.remove('active'));
    clanCard.classList.add('active');

    renderPlayers();
    updateStrikeBtn();
  }
}

function renderPlayers() {
  const team = state.teams.find(t => t.id === state.selectedClan);
  if (!team) {
    playerGrid.innerHTML = '<div class="col-span-4 py-12 text-center text-white/10 uppercase font-black text-[10px] tracking-[0.5em]">Waiting for Clan Auth</div>';
    selectionIndicator.classList.add('hidden');
    return;
  }

  selectionIndicator.classList.remove('hidden');
  selectionIndicator.innerText = team.name;
  targetLabel.innerText = "Deployment Nodes Detected";

  // Re-render konten playerGrid sepenuhnya karena struktur bisa berubah
  playerGrid.innerHTML = team.players.map(p => `
    <button data-id="${p}" class="player-node p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center gap-2 ${state.selectedPlayer === p ? 'active' : ''}">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span class="text-[9px] font-black uppercase tracking-tighter opacity-60">${p}</span>
    </button>
  `).join('');

  // Event delegation untuk player nodes (dipasang sekali setelah konten playerGrid diperbarui)
  // Penting: `renderPlayers` akan sering dipanggil, jadi pastikan listener tidak berlipat ganda
  playerGrid.removeEventListener('click', handlePlayerNodeClick);
  playerGrid.addEventListener('click', handlePlayerNodeClick);
}

function handlePlayerNodeClick(event: Event) {
  const target = event.target as HTMLElement;
  const playerNode = target.closest('.player-node') as HTMLElement;
  if (playerNode) {
    state.selectedPlayer = playerNode.dataset.id || null;
    document.querySelectorAll('.player-node').forEach(n => n.classList.remove('active'));
    playerNode.classList.add('active');
    updateStrikeBtn();
  }
}

function updateStrikeBtn() {
  if (state.selectedPlayer && !state.isExecuting) {
    btnStrike.disabled = false;
    btnStrike.classList.remove('bg-white/5', 'text-white/10', 'cursor-not-allowed');
    btnStrike.classList.add('bg-red-600', 'text-white', 'hover:bg-red-500', 'shadow-[0_0_30px_rgba(239,68,68,0.3)]', 'active:scale-95');
  } else {
    btnStrike.disabled = true;
    btnStrike.classList.add('bg-white/5', 'text-white/10', 'cursor-not-allowed');
    btnStrike.classList.remove('bg-red-600', 'text-white', 'hover:bg-red-500', 'shadow-[0_0_30px_rgba(239,68,68,0.3)]', 'active:scale-95');
  }
}

// --- NETWORK & ACTION LOGIC ---

function addLog(type: 'HTTP' | 'WS', method: string, status: string, payload: any, endpoint?: string) {
  const time = new Date().toLocaleTimeString([], { hour12: false });
  const entry = document.createElement('div');
  const isWS = type === 'WS';
  
  entry.className = `p-2 rounded border animate-fade-in ${isWS ? 'bg-purple-500/10 border-purple-500/20' : 'bg-blue-500/10 border-blue-500/20'}`;
  entry.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <span class="font-black uppercase ${isWS ? 'text-purple-400' : 'text-blue-400'}">[${type}] ${method} ${status}</span>
      <span class="text-white/20 text-[7px]">${time}</span>
    </div>
    ${endpoint ? `<div class="text-[7px] text-white/40 mb-1 font-bold truncate">URL: ${endpoint}</div>` : ''}
    <pre class="bg-black/20 p-2 rounded text-[8px] leading-relaxed ${isWS ? 'text-purple-200' : 'text-blue-200'} whitespace-pre-wrap">${JSON.stringify(payload, null, 2)}</pre>
  `;

  networkLog.prepend(entry);
  if (networkLog.children.length > 15) networkLog.removeChild(networkLog.lastChild!);
}

function addFeedback(msg: string, isError = false) {
  const f = document.createElement('div');
  f.className = `border-l-2 ${isError ? 'border-red-500 text-red-400' : 'border-cyan-500'} pl-2 animate-fade-in-right`;
  f.innerHTML = `> ${msg}`;
  combatFeedback.prepend(f);
  if (combatFeedback.children.length > 8) combatFeedback.removeChild(combatFeedback.lastChild!);
}

btnStrike.addEventListener('click', async () => {
  if (state.isExecuting || !state.selectedClan || !state.selectedPlayer) return;

  // Tambahan: Jika WS sengaja diputus, coba sambungkan kembali
  if (state.isWsIntentionallyDisconnected && (state.ws?.readyState === WebSocket.CLOSED || state.ws?.readyState === WebSocket.CLOSING)) {
    addFeedback("WS: Reconnecting uplink via Strike command.", false);
    initWebSocket(); // Ini akan mereset isWsIntentionallyDisconnected dan lastAttackPoint
    // Tambahkan sedikit penundaan untuk memungkinkan koneksi WebSocket dimulai sebelum mengirim permintaan HTTP
    await new Promise(resolve => setTimeout(resolve, 500)); 
  }

  state.isExecuting = true;
  updateStrikeBtn();
  
  const damage = Math.floor(Math.random() * 200) + 150;
  
  const requestPayload = {
    "player_id": "2",
    "attack_point": damage,
    "clan_colour": state.selectedClan
  };

  const httpUrl = `${state.httpBackendBase}/attack?PlayerID=2`; // Menggunakan HTTPS External
  addLog('HTTP', 'POST', 'SENDING', requestPayload, httpUrl);
  addFeedback(`EXECUTING STRIKE ON ${state.selectedClan} via HTTPS External...`);

  try {
    const response = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors', 
        body: JSON.stringify(requestPayload)
    });

    if (response.ok) {
        const httpResponse = await response.json();
        addLog('HTTP', 'RESPONSE', '200 OK', httpResponse);
        addFeedback(`STRIKE VERIFIED. Awaiting WSS broadcast sync for HP update...`); // Updated feedback message
        updateHttpStatus(true); // Berhasil terhubung ke HTTPS backend
    } else {
        throw new Error(`Server Error: ${response.status}`);
    }
  } catch (e: any) {
    let errorMessage = e.message || "Unknown network error or server issue.";
    let troubleshooting = "Periksa koneksi internet Anda atau pastikan server backend (https://site-cancellation-disposal-essays.trycloudflare.com) sedang berjalan dan dapat diakses.";

    if (e instanceof TypeError && e.message === "Failed to fetch") {
        errorMessage = "Network connection issue or server not reachable.";
    }


    addLog('HTTP', 'ERROR', 'FAILED', { 
      error: errorMessage,
      troubleshoot: troubleshooting
    }, httpUrl);
    addFeedback(`REFUSED: STRIKE FAILED. ${errorMessage}.`, true);
    updateHttpStatus(false); // HTTP/HTTPS call failed
  } finally {
    state.isExecuting = false;
    updateStrikeBtn();
  }
});

// --- STARTUP ---
addFeedback("NEURAL LINK INITIALIZED.");
// Inisialisasi status awal
updateWssConnectionStatus(false);
updateHttpStatus(false);
