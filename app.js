// ══════════════════════════════════════════════════════════════
// GOLOSINASSSS — Archivo Vivo — Lógica Principal (Actualizada)
// ══════════════════════════════════════════════════════════════

// ── Inyección del patrón del borde derecho ───────────────────
(function setupRightBorderPattern() {
    const patternUnit = [
        " ........",
        "*........",
        "*..*****",
        "*..",
        "*........",
        "*........",
        "*..****..",
        "*..   *..",
        "*........",
        "*........",
        "*******..",
        "      *.."
    ].join('\n');

    const tailUnit = [
        " ........",
        "*........",
        "********"
    ].join('\n');

    const fullBlockText = Array(40).fill(patternUnit).join('\n') + '\n' + tailUnit;

    function inject() {
        const container = document.getElementById('right-marquee');
        if (!container) return;
        container.innerHTML = '';

        const block1 = document.createElement('div');
        block1.className = 'ticker-logo-v';
        block1.textContent = fullBlockText;

        const block2 = document.createElement('div');
        block2.className = 'ticker-logo-v';
        block2.textContent = fullBlockText;

        container.appendChild(block1);
        container.appendChild(block2);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();



// ── Estado Global No-Reactivo ─────────────────────────────────
let ytPlayer        = null;
let portafolioCards = [];
let catalogoCards   = [];
let ytApiReady      = false;
let pendingVideoId  = null;
let allData         = [];

// ── Store Observable (Lógica Reactiva Centralizada) ───────────
class ObservableStore {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        const oldValue = this.state[key];
        if (oldValue === value) return;
        this.state[key] = value;
        this.notify(key, value, oldValue);
    }

    setMultiple(updates) {
        const changes = [];
        for (const key in updates) {
            const oldValue = this.state[key];
            const newValue = updates[key];
            if (oldValue !== newValue) {
                this.state[key] = newValue;
                changes.push({ key, newValue, oldValue });
            }
        }
        if (changes.length > 0) {
            this.listeners.forEach(listener => {
                changes.forEach(change => {
                    listener(change.key, change.newValue, change.oldValue);
                });
            });
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify(key, newValue, oldValue) {
        this.listeners.forEach(listener => listener(key, newValue, oldValue));
    }
}

const store = new ObservableStore({
    currentVideoIndex: -1,
    currentPortafolioFilter: 'recientes',
    currentMainFilter: 'todas',
    currentCatalogoTag: 'todos',
    playlist: [],
    playlistPlaying: false,
    currentPlaylistIndex: -1,
    isShuffle: false
});

// Proxy para mutaciones del array en-sitio (como push, splice, reordenar)
function createReactiveArray(arr, onChange) {
    return new Proxy(arr, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'function') {
                const mutators = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
                if (mutators.includes(prop)) {
                    return function(...args) {
                        const result = value.apply(target, args);
                        onChange(target);
                        return result;
                    };
                }
            }
            return value;
        },
        set(target, prop, value, receiver) {
            const result = Reflect.set(target, prop, value, receiver);
            if (prop !== 'length') {
                onChange(target);
            }
            return result;
        }
    });
}

// Redireccionar variables globales a getters/setters del store para compatibilidad absoluta
Object.defineProperties(window, {
    currentVideoIndex: {
        get() { return store.get('currentVideoIndex'); },
        set(val) { store.set('currentVideoIndex', val); }
    },
    currentPortafolioFilter: {
        get() { return store.get('currentPortafolioFilter'); },
        set(val) { store.set('currentPortafolioFilter', val); }
    },
    currentMainFilter: {
        get() { return store.get('currentMainFilter'); },
        set(val) { store.set('currentMainFilter', val); }
    },
    currentCatalogoTag: {
        get() { return store.get('currentCatalogoTag'); },
        set(val) { store.set('currentCatalogoTag', val); }
    },
    playlist: {
        get() { 
            return createReactiveArray(store.get('playlist'), (newArr) => {
                store.notify('playlist', [...newArr], store.state.playlist);
            }); 
        },
        set(val) { store.set('playlist', val); }
    },
    playlistPlaying: {
        get() { return store.get('playlistPlaying'); },
        set(val) { store.set('playlistPlaying', val); }
    },
    currentPlaylistIndex: {
        get() { return store.get('currentPlaylistIndex'); },
        set(val) { store.set('currentPlaylistIndex', val); }
    },
    isShuffle: {
        get() { return store.get('isShuffle'); },
        set(val) { store.set('isShuffle', val); }
    }
});

// Sincronización del DOM para los botones de Playlist
function syncAllAddButtons() {
    const currentPlaylist = store.get('playlist');
    document.querySelectorAll('[data-url]').forEach(wrapper => {
        const url = wrapper.getAttribute('data-url');
        const isAdded = currentPlaylist.some(p => p.url_video === url);
        const btn1 = wrapper.querySelector('.card-add-btn');
        const btn2 = wrapper.querySelector('.card-compact-add-btn');
        [btn1, btn2].forEach(btn => {
            if (btn) {
                btn.classList.toggle('added', isAdded);
                btn.textContent = isAdded ? '✓' : '+';
                btn.title = isAdded ? 'Quitar de Playlist' : 'Agregar a Playlist';
            }
        });
    });

    // Sincronizar modal móvil
    const modal = document.getElementById('mobile-card-modal');
    if (modal && modal.classList.contains('is-open')) {
        const cardWrapper = modal.querySelector('[data-url]');
        if (cardWrapper) {
            const url = cardWrapper.getAttribute('data-url');
            const isAdded = currentPlaylist.some(p => p.url_video === url);
            const modalBtn = modal.querySelector('.card-add-btn');
            if (modalBtn) {
                modalBtn.classList.toggle('added', isAdded);
                modalBtn.textContent = isAdded ? '✓' : '+';
            }
        }
    }
}

// Suscriptor reactivo de la UI
store.subscribe((key, newValue, oldValue) => {
    switch (key) {
        case 'currentPortafolioFilter':
            ['recientes', 'destacados', 'random'].forEach(f => {
                const el = document.getElementById('f-' + f);
                if (el) el.classList.toggle('active', f === newValue);
            });
            renderPortafolio();
            break;

        case 'currentMainFilter':
            document.querySelectorAll('#catalogo-main-filters .main-cat-btn').forEach(btn => {
                const btnCat = btn.getAttribute('data-cat');
                const isCurrent = btnCat === newValue;
                btn.classList.toggle('active', isCurrent);
                const c = mainCatColors[btnCat] || '#e0e0e0';
                btn.style.color = isCurrent ? c : '';

                const img = btn.querySelector('.main-cat-icon');
                if (img) {
                    img.style.opacity = isCurrent ? '1' : '0.4';
                }
            });

            const subContainer = document.getElementById('catalogo-sub-filters');
            if (subContainer) {
                const subcats = SUBCAT_MAP[newValue] || [];
                if (subcats.length > 0) {
                    buildInlineSubcategories(subContainer, subcats, newValue);
                    subContainer.style.opacity = '1';
                    subContainer.style.pointerEvents = 'auto';
                } else {
                    subContainer.innerHTML = '';
                    subContainer.style.opacity = '0';
                    subContainer.style.pointerEvents = 'none';
                }
            }
            renderCatalogo();
            break;

        case 'currentCatalogoTag':
            const subContainerTag = document.getElementById('catalogo-sub-filters');
            if (subContainerTag) {
                const mainCat = store.get('currentMainFilter');
                const subcats = SUBCAT_MAP[mainCat] || [];
                buildInlineSubcategories(subContainerTag, subcats, mainCat);
            }
            renderCatalogo();
            break;

        case 'playlist':
            syncAllAddButtons();
            updatePlaylistDrawerUI();
            break;

        case 'isShuffle':
            const shuffleBtn = document.getElementById('playlist-shuffle-btn');
            if (shuffleBtn) shuffleBtn.classList.toggle('active', newValue);
            break;

        case 'playlistPlaying':
        case 'currentPlaylistIndex':
        case 'currentVideoIndex':
            let activeUrl = null;
            if (store.get('playlistPlaying') && store.get('playlist').length > 0) {
                const idx = store.get('currentPlaylistIndex');
                const item = store.get('playlist')[idx];
                if (item) activeUrl = item.url_video;
            } else {
                const idx = store.get('currentVideoIndex');
                const all = getAllCards();
                const card = all[idx];
                if (card) activeUrl = card.getAttribute('data-url');
            }
            if (activeUrl) {
                setActiveCardByUrl(activeUrl);
            }
            break;
    }
});

// ── Iconos SVG ────────────────────────────────────────────────
const SPEAKER_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
</svg>`;

const SPEAKER_MUTED_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
</svg>`;

const PLAY_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="url(#tornasol-grad)" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
</svg>`;

const PAUSE_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="url(#tornasol-grad)" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
</svg>`;

const FULLSCREEN_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
</svg>`;

const FULLSCREEN_EXIT_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/>
</svg>`;

const ARROW_UP_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="18 15 12 9 6 15"/>
</svg>`;

const ARROW_DOWN_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
</svg>`;

const palette = ['#ffb3ba', '#bae1ff', '#baffc9', '#ffffba', '#ffdfba'];



const tagColors = {
    'social':             '#ffb3ba',
    'institucional':      '#bae1ff',
    'comercial':          '#baffc9',
    'cine':               '#ffdfba',
    'videoclips':         '#ffb3ba',
    'sesiones':           '#ffffba',
    'sesiones musicales': '#ffffba',
    'conciertos':         '#baffc9',
    'documental':         '#bae1ff',
    'a mano':             '#ffb3ba',
    'animación 2d':       '#ffb3ba',
    'animación':          '#ffb3ba',
    'motion graphics':    '#bae1ff',
    '3d':                 '#baffc9',
    'coding animation':   '#ffffba',
    'periodismo':         '#ffdfba',
    'música':             '#ffffba',
    'sonido infinito':    '#baffc9',
};

const TAG_ORDER = [
    'social', 'periodismo', 'conciertos', 'cine',
    'música', 'animación', 'sesiones musicales',
    'videoclips', 'institucional', 'sonido infinito',
];

const MAIN_CATEGORIES = ['todas', 'documental', 'música', 'animación'];

// Color de cada categoría principal
const mainCatColors = {
    'todas':      '#e0e0e0',
    'documental': '#ffb3ba',
    'música':     '#bae1ff',
    'animación':  '#baffc9',
};

// Subcategorías por categoría principal (en orden)
const SUBCAT_MAP = {
    'documental': ['social', 'periodismo', 'cine', 'institucional'],
    'música':     ['conciertos', 'sesiones musicales', 'videoclips', 'sonido infinito'],
    'animación':  [],
};

// ── Helpers YouTube ──────────────────────────────────────────
function getYouTubeId(url) {
    if (!url) return null;
    // Soporta youtu.be/ID, watch?v=ID, embed/ID, shorts/ID y parámetros ?si= modernos
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|u\/\w\/|shorts\/))([^#&?\/\s]{11})/;
    const match  = url.match(regExp);
    return match ? match[1] : null;
}

function loadVideoInPlayer(videoId, autoplay) {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
        pendingVideoId = videoId; return;
    }
    if (autoplay) { ytPlayer.loadVideoById(videoId); }
    else          { ytPlayer.cueVideoById(videoId);  }
}

function ensureThumbnail(item) {
    if (!item.preview_url && item.tipo === 'youtube') {
        const videoId = getYouTubeId(item.url_video);
        if (videoId) item.preview_url = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
}

// ── Tarjeta activa ───────────────────────────────────────────
function getAllCards() { return [...catalogoCards, ...portafolioCards]; }

// Aplica el borde gradiente a todas las tarjetas que correspondan al video activo
function setActiveCardByUrl(url) {
    const targetId = getYouTubeId(url);
    if (!targetId) return;

    document.querySelectorAll('.card-wrapper, .card-compact-wrapper').forEach(wrapper => {
        const cardUrl = wrapper.getAttribute('data-url');
        const cardId = getYouTubeId(cardUrl);
        const isPlaying = (cardId === targetId);

        wrapper.classList.toggle('is-active', isPlaying);
        const inner = wrapper.querySelector('.card');
        if (inner) inner.classList.toggle('active-card', isPlaying);
    });
}

// ── Reproducción ─────────────────────────────────────────────
function playVideo(url, element) {
    const videoId = getYouTubeId(url);
    if (!videoId) return;

    // Buscar información del track para la pantalla LCD
    const trackItem = allData.find(item => item.url_video === url);
    if (trackItem) {
        const { mainDesc } = getParsedDesc(trackItem.descripcion);
        const cleanDesc = mainDesc ? mainDesc.toUpperCase() : '';
        const cat = trackItem.categoria ? trackItem.categoria.toUpperCase() : '';
        let htmlContent = `<span class="lcd-title">${trackItem.titulo.toUpperCase()}</span>`;
        if (cleanDesc) {
            htmlContent += ` <span class="lcd-sep">•</span> <span class="lcd-desc">${cleanDesc}</span>`;
        }
        if (cat) {
            htmlContent += ` <span class="lcd-sep">•</span> <span class="lcd-cat">${cat}</span>`;
        }
        htmlContent += ` <span class="lcd-sep">•</span> `;
        updateLcdDisplay(htmlContent);
    } else {
        updateLcdDisplay(`<span class="lcd-title">REPRODUCIENDO...</span> <span class="lcd-sep">•</span> `);
    }

    // Desbloqueo de audio respetando el slider del reproductor
    if (ytPlayer) {
        const volumeSlider = document.getElementById('player-volume');
        const vol = volumeSlider ? parseInt(volumeSlider.value) : 0;
        
        if (vol > 0) {
            if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
            if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(vol);
            const muteBtn = document.getElementById('player-mute-btn');
            if (muteBtn) {
                updateVolumeIcon(false);
                muteBtn.classList.remove('muted');
            }
        } else {
            if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
            if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(0);
            const muteBtn = document.getElementById('player-mute-btn');
            if (muteBtn) {
                updateVolumeIcon(true);
                muteBtn.classList.add('muted');
            }
        }
    }

    if (element === 'playlist') {
        playlistPlaying = true;
        const plIdx = playlist.findIndex(p => p.url_video === url);
        if (plIdx !== -1) currentPlaylistIndex = plIdx;
    } else {
        playlistPlaying = false;
        currentPlaylistIndex = -1;
        if (element) {
            const all = getAllCards();
            const idx = all.indexOf(element);
            if (idx !== -1) currentVideoIndex = idx;
        } else {
            // Intentar buscar el índice en base a la url
            const all = getAllCards();
            const idx = all.findIndex(c => c.getAttribute('data-url') === url);
            if (idx !== -1) currentVideoIndex = idx;
        }
    }

    setActiveCardByUrl(url);
    loadVideoInPlayer(videoId, true);
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });

    // Actualizar drawer para sincronizar elemento activo
    updatePlaylistDrawerUI();
}

function playNext() {
    if (playlistPlaying && playlist.length > 0) {
        if (isShuffle) {
            currentPlaylistIndex = Math.floor(Math.random() * playlist.length);
        } else {
            currentPlaylistIndex = (currentPlaylistIndex + 1) % playlist.length;
        }
        const item = playlist[currentPlaylistIndex];
        if (item) playVideo(item.url_video, 'playlist');
    } else {
        const all = getAllCards();
        if (all.length === 0) return;
        if (isShuffle) {
            currentVideoIndex = Math.floor(Math.random() * all.length);
        } else {
            currentVideoIndex = (currentVideoIndex + 1) % all.length;
        }
        const nextCard = all[currentVideoIndex];
        if (nextCard) {
            const url = nextCard.getAttribute('data-url');
            if (url) playVideo(url, nextCard);
        }
    }
}

function playPrev() {
    if (playlistPlaying && playlist.length > 0) {
        if (isShuffle) {
            currentPlaylistIndex = Math.floor(Math.random() * playlist.length);
        } else {
            currentPlaylistIndex = (currentPlaylistIndex - 1 + playlist.length) % playlist.length;
        }
        const item = playlist[currentPlaylistIndex];
        if (item) playVideo(item.url_video, 'playlist');
    } else {
        const all = getAllCards();
        if (all.length === 0) return;
        if (isShuffle) {
            currentVideoIndex = Math.floor(Math.random() * all.length);
        } else {
            currentVideoIndex = (currentVideoIndex - 1 + all.length) % all.length;
        }
        const prevCard = all[currentVideoIndex];
        if (prevCard) {
            const url = prevCard.getAttribute('data-url');
            if (url) playVideo(url, prevCard);
        }
    }
}

// ── Helper para separar descripción de créditos ───────────────
function getParsedDesc(desc) {
    if (!desc) return { mainDesc: '', credit: '' };
    const lastHyphenIndex = desc.lastIndexOf(' - ');
    if (lastHyphenIndex !== -1) {
        return {
            mainDesc: desc.substring(0, lastHyphenIndex).trim(),
            credit: desc.substring(lastHyphenIndex + 3).trim()
        };
    }
    return { mainDesc: desc.trim(), credit: '' };
}

// ── YouTube IFrame API ───────────────────────────────────────
function onYouTubeIframeAPIReady() {
    const initialId = 'WpIvp6I7obE';

    ytPlayer = new YT.Player('yt-player-container', {
        videoId: initialId,
        playerVars: { 
            autoplay: 1, 
            mute: 1, 
            rel: 0, 
            modestbranding: 1,
            playsinline: 1,
            controls: 0,            // Ocultar controles nativos de YouTube
            disablekb: 1,           // Desactivar atajos nativos de YT
            iv_load_policy: 3,      // Ocultar anotaciones externas
            fs: 0                   // Desactivar pantalla completa nativa de YT
        },
        events: {
            onReady: function () {
                ytApiReady = true;
                setupCustomPlayerControls();
                if (pendingVideoId) { ytPlayer.loadVideoById(pendingVideoId); pendingVideoId = null; }
            },
            onStateChange: function (e) { 
                if (e.data === 0) playNext(); 
                updateCustomPlayerUI(e.data);
            }
        }
    });
}

// ── Lógica de Controles de Reproducción Personalizados ───────
let customPlayerRafId = null; // rAF handle para el timeline (reemplaza setInterval)

function setupCustomPlayerControls() {
    const playBtn = document.getElementById('player-play-btn');
    const prevBtn = document.getElementById('player-prev-btn');
    const nextBtn = document.getElementById('player-next-btn');
    const shuffleBtn = document.getElementById('playlist-shuffle-btn');
    const playlistBtn = document.getElementById('player-playlist-btn');
    const muteBtn = document.getElementById('player-mute-btn');
    const fullscreenBtn = document.getElementById('player-fullscreen-btn');
    const timeline = document.getElementById('player-timeline');
    const volumeSlider = document.getElementById('player-volume');
    const playlistDrawer = document.getElementById('playlist-drawer');
    const closeDrawerBtn = document.getElementById('playlist-drawer-close');

    if (!playBtn) return;

    // 1. Play / Pause
    playBtn.addEventListener('click', () => {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    });

    // 2. Navegación Siguiente / Anterior
    prevBtn.addEventListener('click', () => {
        playPrev();
    });
    nextBtn.addEventListener('click', () => {
        playNext();
    });

    // 3. Modo Aleatorio (Shuffle) — Ahora está en la cabecera de la lista
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
        });
    }

    // 4. Panel de Playlist
    if (playlistBtn && playlistDrawer) {
        playlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = playlistDrawer.style.display !== 'none';
            playlistDrawer.style.display = isOpen ? 'none' : 'flex';
            if (!isOpen) {
                updatePlaylistDrawerUI();
            }
        });
    }

    if (closeDrawerBtn && playlistDrawer) {
        closeDrawerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playlistDrawer.style.display = 'none';
        });
    }

    // Cerrar playlist al hacer clic fuera del panel
    document.addEventListener('click', (e) => {
        if (playlistDrawer && playlistDrawer.style.display !== 'none') {
            if (!playlistDrawer.contains(e.target) && !playlistBtn.contains(e.target)) {
                playlistDrawer.style.display = 'none';
            }
        }
    });

    // 5. Barra de navegación temporal (Timeline)
    timeline.addEventListener('input', (e) => {
        if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
        const duration = ytPlayer.getDuration();
        const targetSeconds = (e.target.value / 100) * duration;
        ytPlayer.seekTo(targetSeconds, true);
    });

    // Inicializar volumen en silencio total (mute)
    if (volumeSlider) {
        volumeSlider.value = 0;
        updateVolumeSliderBackground(0);
    }
    if (muteBtn) {
        muteBtn.classList.add('muted');
        updateVolumeIcon(true);
    }

    // 6. Barra de volumen
    volumeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        updateVolumeSliderBackground(val);
        if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
        ytPlayer.setVolume(val);
        if (val > 0) {
            if (ytPlayer.isMuted()) {
                ytPlayer.unMute();
            }
            updateVolumeIcon(false);
            muteBtn.classList.remove('muted');
        } else {
            if (!ytPlayer.isMuted()) {
                ytPlayer.mute();
            }
            updateVolumeIcon(true);
            muteBtn.classList.add('muted');
        }
    });

    // 7. Silenciar / Activar audio (Mute)
    muteBtn.addEventListener('click', () => {
        if (!ytPlayer || typeof ytPlayer.isMuted !== 'function') return;
        if (ytPlayer.isMuted()) {
            ytPlayer.unMute();
            updateVolumeIcon(false);
            muteBtn.classList.remove('muted');
            const vol = ytPlayer.getVolume() || 100;
            volumeSlider.value = vol;
            updateVolumeSliderBackground(vol);
        } else {
            ytPlayer.mute();
            updateVolumeIcon(true);
            muteBtn.classList.add('muted');
            volumeSlider.value = 0;
            updateVolumeSliderBackground(0);
        }
    });

    // 8. Pantalla Completa de la Página (Fullscreen) - Entra en pantalla completa de navegador manteniendo bordes y reproductor
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.getElementById('player-fullscreen-svg-container');
            const body = document.body;
            const isFullscreenCSS = body.classList.contains('fullscreen-mode');

            if (!isFullscreenCSS) {
                body.classList.add('fullscreen-mode');
                if (container) container.innerHTML = FULLSCREEN_EXIT_SVG;
                
                // Activar pantalla completa nativa en el documento
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen();
                }
            } else {
                body.classList.remove('fullscreen-mode');
                if (container) container.innerHTML = FULLSCREEN_SVG;
                
                // Salir de pantalla completa nativa
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        });
    }

    // Escuchar el evento de cambio de pantalla completa nativa (por ejemplo, al presionar Esc)
    document.addEventListener('fullscreenchange', () => {
        const isNative = !!document.fullscreenElement;
        document.body.classList.toggle('fullscreen-mode', isNative);
        if (fullscreenBtn) {
            const container = document.getElementById('player-fullscreen-svg-container');
            if (container) {
                container.innerHTML = isNative ? FULLSCREEN_EXIT_SVG : FULLSCREEN_SVG;
            }
        }
    });
}

function updateVolumeIcon(isMutedState) {
    const container = document.getElementById('player-mute-svg-container');
    if (container) {
        container.innerHTML = isMutedState ? SPEAKER_MUTED_SVG : SPEAKER_SVG;
    }
}

function updateVolumeSliderBackground(value) {
    const volumeSlider = document.getElementById('player-volume');
    if (volumeSlider) {
        volumeSlider.style.background = `linear-gradient(to right, #00e5ff 0%, #00e5ff ${value}%, #222 ${value}%, #222 100%)`;
    }
}

function updateLcdDisplay(htmlContent) {
    const span1 = document.getElementById('lcd-text-1');
    const span2 = document.getElementById('lcd-text-2');
    const marquee = document.querySelector('.lcd-text-marquee');
    if (!span1 || !span2 || !marquee) return;

    // Detener animación temporalmente
    marquee.classList.remove('lcd-marquee-anim');
    marquee.style.animation = 'none';

    // Repetir el contenido 3 veces para asegurar que sea más ancho que el contenedor y el scroll sea fluido e infinito
    const repeatedContent = htmlContent + htmlContent + htmlContent;
    span1.innerHTML = repeatedContent;
    span2.innerHTML = repeatedContent;

    // Forzar reflujo/reflow
    void marquee.offsetWidth;

    // Calcular duración de la animación basada en el tamaño del texto de un solo span
    const textWidth = span1.scrollWidth;
    const duration = Math.max(25, textWidth / 20); // Ajustar velocidad para el texto repetido para hacerlo más lento
    
    // Iniciar animación
    marquee.classList.add('lcd-marquee-anim');
    marquee.style.animation = `lcdScrollInfinite ${duration}s linear infinite`;
}

// ── Timeline con requestAnimationFrame (60fps, 0% CPU en background) ─────────
function startCustomTimelineUpdate() {
    const timeline = document.getElementById('player-timeline');
    const lcdTime  = document.getElementById('lcd-time');

    stopCustomTimelineUpdate(); // cancela rAF previo si existe

    function tick() {
        // Pestaña oculta: reagendar sin hacer trabajo (CPU 0%)
        if (!document.hidden &&
            ytPlayer &&
            typeof ytPlayer.getCurrentTime === 'function' &&
            typeof ytPlayer.getDuration === 'function') {

            const current  = ytPlayer.getCurrentTime();
            const duration = ytPlayer.getDuration();

            if (duration > 0) {
                const pct = (current / duration) * 100;
                if (timeline) {
                    timeline.value = pct;
                    timeline.style.background =
                        `linear-gradient(90deg, #7c3aed, #c084fc, #f43f5e, #e11d48, #c084fc, #7c3aed) 0% 0% / ${pct}% 100% no-repeat, var(--grad-tornasol)`;
                }
                if (lcdTime) lcdTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
            }
        }
        customPlayerRafId = requestAnimationFrame(tick);
    }

    customPlayerRafId = requestAnimationFrame(tick);
}

function stopCustomTimelineUpdate() {
    if (customPlayerRafId) {
        cancelAnimationFrame(customPlayerRafId);
        customPlayerRafId = null;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateCustomPlayerUI(state) {
    const playBtn = document.getElementById('player-play-btn');
    if (!playBtn) return;

    const container = document.getElementById('player-play-svg-container');

    if (state === YT.PlayerState.PLAYING) {
        if (container) container.innerHTML = PAUSE_SVG;
        startCustomTimelineUpdate();
    } else {
        if (container) container.innerHTML = PLAY_SVG;
        if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            stopCustomTimelineUpdate();
        }
    }
}

// ── Mapeo lógico de Categorías Principales ────────────────────
function itemMatchesMainFilter(item, filter) {
    if (filter === 'todas') return true;
    const category = (item.categoria || '').toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];

    if (filter === 'documental') {
        return category.includes('documental') ||
               category.includes('periodismo') ||
               tags.includes('cine') ||
               tags.includes('periodismo') ||
               tags.includes('documental') ||
               tags.includes('social') ||
               tags.includes('institucional');
    }
    if (filter === 'música' || filter === 'musica') {
        return category.includes('conciertos') ||
               category.includes('sesiones') ||
               tags.includes('música') ||
               tags.includes('musica') ||
               tags.includes('conciertos') ||
               tags.includes('sonido infinito') ||
               tags.includes('videoclips') ||
               tags.includes('sesiones musicales');
    }
    if (filter === 'animación' || filter === 'animacion') {
        return category.includes('animación') ||
               category.includes('animacion') ||
               tags.some(t => t.includes('animac') || t.includes('graphics') || t.includes('3d') || t.includes('dibujo'));
    }
    return false;
}


// ── buildCard — Catálogo Golosinassss (diseño index v15) ─────
function buildCard(item, animDelay) {
    ensureThumbnail(item);

    const previewHtml = item.preview_url
        ? `<div class="card-preview"><img src="${item.preview_url}" alt="${item.titulo}" class="preview-img" loading="lazy"></div>`
        : `<div class="card-preview"></div>`;

    const color = palette[Math.floor(Math.random() * palette.length)];

    const metaHtml = (item.categoria || item.date)
        ? `<div class="card-meta">${item.categoria ? item.categoria.toUpperCase() : ''}${item.categoria && item.date ? ' | ' : ''}${item.date || ''}</div>`
        : '';

    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    let tagsHtml = '';
    if (itemTags.length) {
        const spans = itemTags.map(tag => {
            const norm = tag.trim().toLowerCase();
            const c    = tagColors[norm] || '#777777';
            return `<span class="card-tag" style="color:${c};border-color:${c}33;background:${c}09">${norm}</span>`;
        }).join('');
        tagsHtml = `<div class="card-tags">${spans}</div>`;
    }

    const { mainDesc, credit } = getParsedDesc(item.descripcion);

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'card-wrapper';
    wrapperEl.setAttribute('data-url', item.url_video);
    wrapperEl.setAttribute('aria-label', `Reproducir: ${item.titulo}`);
    wrapperEl.setAttribute('tabindex', '0');
    wrapperEl.style.animationDelay = `${animDelay * 0.05}s`;

    const isAdded = playlist.some(p => p.url_video === item.url_video);
    const addBtnHtml = `<button class="card-add-btn${isAdded ? ' added' : ''}" title="${isAdded ? 'Quitar de Playlist' : 'Agregar a Playlist'}">${isAdded ? '✓' : '+'}</button>`;

    wrapperEl.innerHTML = `
        <div class="card">
            ${addBtnHtml}
            ${metaHtml}
            <div class="card-body">
                <div class="card-left">
                    ${previewHtml}
                    <div class="play-btn" aria-hidden="true">
                        <svg viewBox="0 0 24 24" style="stroke:${color}; fill:none; stroke-width:2;">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </div>
                </div>
                <div class="card-content">
                    <h3>${item.titulo}</h3>
                    ${mainDesc ? `<p class="card-desc">${mainDesc}</p>` : ''}
                    ${credit ? `<p class="card-credit">${credit}</p>` : ''}
                </div>
            </div>
            ${tagsHtml}
        </div>`;

    // Los eventos se manejan via delegación en setupGridDelegation() — sin listeners por tarjeta
    return wrapperEl;
}

// ── buildCompactCard — Archivo Vivo (thumb izq + título der) ─
function buildCompactCard(item, animDelay) {
    ensureThumbnail(item);

    const isYoutubThumb = item.preview_url && item.preview_url.includes('img.youtube.com');
    const thumbClass   = isYoutubThumb ? 'compact-thumb-rect' : 'compact-thumb-sq';
    const thumbSrc     = item.preview_url || '';

    const thumbHtml = thumbSrc
        ? `<div class="compact-thumb ${thumbClass}"><img src="${thumbSrc}" alt="" loading="lazy"></div>`
        : `<div class="compact-thumb compact-thumb-sq compact-thumb-empty"></div>`;

    const titleNotTooLong = item.titulo && item.titulo.length < 35;
    const { mainDesc, credit } = getParsedDesc(item.descripcion);
    const descText = titleNotTooLong && mainDesc ? mainDesc : '';

    const color = palette[Math.floor(Math.random() * palette.length)];
    const previewHtml = item.preview_url
        ? `<div class="card-preview"><img src="${item.preview_url}" alt="${item.titulo}" class="preview-img" loading="lazy"></div>`
        : `<div class="card-preview"></div>`;

    const metaHtml = (item.categoria || item.date)
        ? `<div class="card-meta">${item.categoria ? item.categoria.toUpperCase() : ''}${item.categoria && item.date ? ' | ' : ''}${item.date || ''}</div>`
        : '';

    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    let tagsHtml = '';
    if (itemTags.length) {
        const spans = itemTags.map(tag => {
            const norm = tag.trim().toLowerCase();
            const c    = tagColors[norm] || '#777777';
            return `<span class="card-tag" style="color:${c};border-color:${c}33;background:${c}09">${norm}</span>`;
        }).join('');
        tagsHtml = `<div class="card-tags">${spans}</div>`;
    }

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'card-compact-wrapper';
    wrapperEl.setAttribute('data-url', item.url_video);
    wrapperEl.setAttribute('aria-label', `Reproducir: ${item.titulo}`);
    wrapperEl.setAttribute('tabindex', '0');
    if (animDelay > 0) wrapperEl.style.animationDelay = `${animDelay * 0.05}s`;
    else { wrapperEl.style.opacity = '1'; }

    const isAdded = playlist.some(p => p.url_video === item.url_video);
    const overlayAddBtnHtml = `<button class="card-add-btn${isAdded ? ' added' : ''}" title="${isAdded ? 'Quitar de Playlist' : 'Agregar a Playlist'}">${isAdded ? '✓' : '+'}</button>`;

    wrapperEl.innerHTML = `
        <!-- COMPACT CARD (normal view) -->
        <div class="card-compact">
            ${thumbHtml}
            <div class="card-compact-content">
                <p class="card-compact-title">${item.titulo}</p>
                ${descText ? `<p class="card-compact-desc">${descText}</p>` : ''}
            </div>
        </div>

        <!-- FULL CARD OVERLAY (hover view) -->
        <div class="card-full-overlay">
            <div class="card">
                ${overlayAddBtnHtml}
                ${metaHtml}
                <div class="card-body">
                    <div class="card-left">
                        ${previewHtml}
                        <div class="play-btn" aria-hidden="true">
                            <svg viewBox="0 0 24 24" style="stroke:${color}; fill:none; stroke-width:2;">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3>${item.titulo}</h3>
                        ${mainDesc ? `<p class="card-desc">${mainDesc}</p>` : ''}
                        ${credit ? `<p class="card-credit">${credit}</p>` : ''}
                    </div>
                </div>
                ${tagsHtml}
            </div>
        </div>
    `;

    // Los eventos se manejan via delegación en setupGridDelegation() — sin listeners por tarjeta
    return wrapperEl;
}

// ── Extractores de Tags basados en Filtro Activo ─────────────
function extractUniqueTags(data) {
    const tagSet = new Set();
    data.forEach(item => {
        if (Array.isArray(item.tags))
            item.tags.forEach(t => tagSet.add(t.trim().toLowerCase()));
    });
    return [...tagSet].sort((a, b) => {
        const ia = TAG_ORDER.indexOf(a), ib = TAG_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

// ── Constructor de Tabs de Subcategoría (Acordeón Inline) ────
function buildInlineSubcategories(container, tags, category) {
    container.innerHTML = '';

    const prefix = document.createElement('span');
    prefix.className = 'branch-char';
    prefix.textContent = '└─';
    container.appendChild(prefix);

    const list = ['todos', ...tags];

    list.forEach((sub, idx) => {
        const btn = document.createElement('button');
        btn.className = `filter-btn tab-btn${currentCatalogoTag === sub ? ' active' : ''}`;
        
        const branchChar = (idx === list.length - 1) ? ' └─ ' : ' ├─ ';
        const catColor = mainCatColors[category] || '#e0e0e0';
        btn.style.setProperty('--active-color', catColor);
        
        if (currentCatalogoTag === sub) {
            btn.style.color = catColor;
        } else {
            btn.style.color = '';
        }
        
        btn.innerHTML = `<span class="branch-connector">${branchChar}</span><span class="tag-name">${sub}</span>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCatalogoTag(sub, category);
        });
        container.appendChild(btn);
    });
}

// ── Constructor de Categorías Principales ────────────────────
function buildCatalogoMainFilters() {
    const container = document.getElementById('catalogo-main-filters');
    if (!container) return;
    container.innerHTML = '';

    MAIN_CATEGORIES.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `filter-btn main-cat-btn${currentMainFilter === cat ? ' active' : ''}`;
        btn.setAttribute('data-cat', cat);

        if (cat === 'todas') {
            const img = document.createElement('img');
            img.src = 'ICON_GOLOSINASSSS.png';
            img.alt = 'TODAS';
            img.className = 'main-cat-icon';
            img.style.opacity = currentMainFilter === 'todas' ? '1' : '0.4';
            btn.appendChild(img);
        } else {
            btn.textContent = cat.toUpperCase();
        }

        const catColor = mainCatColors[cat] || '#e0e0e0';
        btn.style.setProperty('--cat-color', catColor);
        if (currentMainFilter === cat) btn.style.color = catColor;
        btn.addEventListener('click', () => selectMainCategory(cat));

        container.appendChild(btn);

        if (index < MAIN_CATEGORIES.length - 1) {
            const sep = document.createElement('span');
            sep.className = 'filter-separator';
            sep.textContent = '/';
            container.appendChild(sep);
        }
    });
}

function selectMainCategory(cat) {
    currentMainFilter = cat;
    currentCatalogoTag = 'todos';

    document.querySelectorAll('#catalogo-main-filters .main-cat-btn').forEach(btn => {
        const btnCat = btn.getAttribute('data-cat');
        const isCurrent = btnCat === cat;
        btn.classList.toggle('active', isCurrent);
        const c = mainCatColors[btnCat] || '#e0e0e0';
        btn.style.color = isCurrent ? c : '';

        const img = btn.querySelector('.main-cat-icon');
        if (img) {
            img.style.opacity = isCurrent ? '1' : '0.4';
        }
    });

    const subContainer = document.getElementById('catalogo-sub-filters');
    if (subContainer) {
        const subcats = SUBCAT_MAP[cat] || [];
        if (subcats.length > 0) {
            buildInlineSubcategories(subContainer, subcats, cat);
            subContainer.style.opacity = '1';
            subContainer.style.pointerEvents = 'auto';
        } else {
            subContainer.innerHTML = '';
            subContainer.style.opacity = '0';
            subContainer.style.pointerEvents = 'none';
        }
    }

    renderCatalogo();
}

function setCatalogoTag(tag, category) {
    currentCatalogoTag = tag;
    const subContainer = document.getElementById('catalogo-sub-filters');
    if (subContainer) {
        const subcats = SUBCAT_MAP[category] || [];
        buildInlineSubcategories(subContainer, subcats, category);
    }
    renderCatalogo();
}

function renderCatalogo() {
    const grid = document.getElementById('grid-catalogo');
    catalogoCards = []; grid.innerHTML = '';

    let items = allData.filter(item => itemMatchesMainFilter(item, currentMainFilter));

    if (currentCatalogoTag !== 'todos') {
        items = items.filter(item =>
            Array.isArray(item.tags) &&
            item.tags.some(t => t.trim().toLowerCase() === currentCatalogoTag)
        );
    }
    
    items.forEach((item, i) => {
        const el = buildCard(item, i);
        grid.appendChild(el);
        catalogoCards.push(el);
    });
}

// ════════════════════════════════════════════════════════════
// MODAL MÓVIL — primer tap en cápsula compacta
// ════════════════════════════════════════════════════════════
function closeMobileModal() {
    const modal = document.getElementById('mobile-card-modal');
    if (modal) modal.classList.remove('is-open');
}

function openMobileModal(item, sourceEl) {
    // Crear modal fijo en body la primera vez (fuera del transform del scroll)
    let modal = document.getElementById('mobile-card-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mobile-card-modal';
        modal.innerHTML =
            '<div id="mcm-backdrop"></div>' +
            '<div id="mcm-card"></div>';
        document.body.appendChild(modal);
        document.getElementById('mcm-backdrop')
            .addEventListener('click', closeMobileModal);
    }

    const slot = document.getElementById('mcm-card');
    slot.innerHTML = '';

    // Botón cerrar
    const closeBtn = document.createElement('button');
    closeBtn.id = 'mcm-close';
    closeBtn.textContent = '\u2715 cerrar';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeMobileModal(); });
    slot.appendChild(closeBtn);

    // Usar la tarjeta construida directamente para conservar los event listeners de playlist
    const card = buildCard(item, 0);
    card.style.opacity = '1';
    card.style.animationDelay = '0s';

    // Tap en la tarjeta = reproducir + cerrar modal (ignorando el botón de playlist)
    card.addEventListener('click', (e) => {
        if (e.target.closest('.card-add-btn')) return;
        e.stopPropagation();
        closeMobileModal();
        playVideo(item.url_video, sourceEl);
    });
    slot.appendChild(card);

    modal.classList.add('is-open');
}

// ══════════════════════════════════════════════════════════════
// ARCHIVO VIVO — scroll infinito automático
// ══════════════════════════════════════════════════════════════
function setPortafolioFilter(filter) {
    currentPortafolioFilter = filter;
    ['recientes', 'destacados', 'random'].forEach(f => {
        const el = document.getElementById('f-' + f);
        if (el) el.classList.toggle('active', f === filter);
    });
    renderPortafolio();
}

function renderPortafolio() {
    const grid = document.getElementById('grid-portafolio');
    portafolioCards = []; grid.innerHTML = '';
    grid.style.animation = 'none';

    let items = [...allData];
    if (currentPortafolioFilter === 'random') {
        items.sort(() => Math.random() - 0.5);
    } else if (currentPortafolioFilter === 'destacados') {
        const dest = items.filter(i => i.destacado);
        if (dest.length > 0) items = dest;
        items.sort((a, b) => (b.vistas || 0) - (a.vistas || 0));
    }

    let displayItems = [...items];
    while (displayItems.length < 12) {
        displayItems = displayItems.concat(items);
    }

    displayItems.forEach((item, i) => {
        const el = buildCompactCard(item, i);
        grid.appendChild(el);
        portafolioCards.push(el);
    });
    
    displayItems.forEach((item) => {
        const el = buildCompactCard(item, 0);
        el.setAttribute('aria-hidden', 'true');
        grid.appendChild(el);
    });

    requestAnimationFrame(() => { grid.style.animation = ''; });
}

window.setPortafolioFilter = setPortafolioFilter;

// ── Lista de Agregados (Playlist) Lógica ──────────────────────
function togglePlaylistItem(item) {
    const index = playlist.findIndex(p => p.url_video === item.url_video);
    let isNowAdded = false;

    if (index === -1) {
        playlist.push(item);
        isNowAdded = true;
    } else {
        playlist.splice(index, 1);
        isNowAdded = false;
        // Si el elemento removido era el que se estaba reproduciendo en la playlist, ajustar índices
        if (playlistPlaying) {
            if (currentPlaylistIndex === index) {
                // Si la playlist quedó vacía, apagar el modo playlist
                if (playlist.length === 0) {
                    playlistPlaying = false;
                    currentPlaylistIndex = -1;
                } else {
                    // Reproducir el siguiente disponible
                    currentPlaylistIndex = currentPlaylistIndex % playlist.length;
                    playPlaylistItem(currentPlaylistIndex);
                }
            } else if (currentPlaylistIndex > index) {
                currentPlaylistIndex--;
            }
        }
    }

    // Actualizar todos los botones del DOM que correspondan a este video
    document.querySelectorAll(`[data-url="${item.url_video}"]`).forEach(wrapper => {
        const btn1 = wrapper.querySelector('.card-add-btn');
        const btn2 = wrapper.querySelector('.card-compact-add-btn');
        [btn1, btn2].forEach(btn => {
            if (btn) {
                btn.classList.toggle('added', isNowAdded);
                btn.textContent = isNowAdded ? '✓' : '+';
                btn.title = isNowAdded ? 'Quitar de Playlist' : 'Agregar a Playlist';
            }
        });
    });

    // Si el modal móvil está abierto, actualizarlo también
    const modal = document.getElementById('mobile-card-modal');
    if (modal && modal.classList.contains('is-open')) {
        const modalBtn = modal.querySelector('.card-add-btn');
        if (modalBtn) {
            modalBtn.classList.toggle('added', isNowAdded);
            modalBtn.textContent = isNowAdded ? '✓' : '+';
        }
    }

    updatePlaylistDrawerUI();
}

function updatePlaylistDrawerUI() {
    const container = document.getElementById('playlist-drawer-items');
    if (!container) return;

    container.innerHTML = '';

    if (playlist.length === 0) {
        container.innerHTML = '<div class="playlist-empty-state">LISTA VACÍA</div>';
        return;
    }

    playlist.forEach((item, index) => {
        const isActive = playlistPlaying && (currentPlaylistIndex === index);
        const itemEl = document.createElement('div');
        itemEl.className = `playlist-item${isActive ? ' active-track' : ''}`;
        itemEl.setAttribute('draggable', 'true');
        
        const isFirst = index === 0;
        const isLast = index === playlist.length - 1;

        itemEl.innerHTML = `
            <span class="playlist-item-title">${item.titulo}</span>
            <div class="playlist-item-controls">
                <button class="playlist-item-reorder-btn up${isFirst ? ' disabled' : ''}" title="Subir">
                    ${ARROW_UP_SVG}
                </button>
                <button class="playlist-item-reorder-btn down${isLast ? ' disabled' : ''}" title="Bajar">
                    ${ARROW_DOWN_SVG}
                </button>
                <button class="playlist-item-remove" title="Quitar de la lista">✕</button>
            </div>
        `;

        // Hacer click en el item para reproducirlo (si no se hizo en los botones)
        itemEl.addEventListener('click', (e) => {
            if (e.target.closest('.playlist-item-remove') || e.target.closest('.playlist-item-reorder-btn')) return;
            playPlaylistItem(index);
        });

        // Reordenación con botones
        const upBtn = itemEl.querySelector('.playlist-item-reorder-btn.up');
        if (upBtn && !isFirst) {
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                movePlaylistItem(index, -1);
            });
        }

        const downBtn = itemEl.querySelector('.playlist-item-reorder-btn.down');
        if (downBtn && !isLast) {
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                movePlaylistItem(index, 1);
            });
        }

        // Quitar de la playlist
        const removeBtn = itemEl.querySelector('.playlist-item-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlaylistItem(item);
            });
        }

        // Drag & Drop HTML5
        itemEl.addEventListener('dragstart', (e) => {
            itemEl.classList.add('dragging');
            e.dataTransfer.setData('text/plain', index);
        });
        itemEl.addEventListener('dragend', () => {
            itemEl.classList.remove('dragging');
        });
        itemEl.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        itemEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = index;
            if (fromIndex !== toIndex && !isNaN(fromIndex)) {
                // Mover elemento
                const [movedItem] = playlist.splice(fromIndex, 1);
                playlist.splice(toIndex, 0, movedItem);
                
                // Sincronizar el track de reproducción actual si está en la playlist
                if (playlistPlaying) {
                    if (currentPlaylistIndex === fromIndex) {
                        currentPlaylistIndex = toIndex;
                    } else if (currentPlaylistIndex > fromIndex && currentPlaylistIndex <= toIndex) {
                        currentPlaylistIndex--;
                    } else if (currentPlaylistIndex < fromIndex && currentPlaylistIndex >= toIndex) {
                        currentPlaylistIndex++;
                    }
                }
                updatePlaylistDrawerUI();
            }
        });

        container.appendChild(itemEl);
    });
}

function movePlaylistItem(fromIndex, direction) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= playlist.length) return;
    
    // Intercambiar
    const temp = playlist[fromIndex];
    playlist[fromIndex] = playlist[toIndex];
    playlist[toIndex] = temp;
    
    // Sincronizar el track de reproducción actual si está en la playlist
    if (playlistPlaying) {
        if (currentPlaylistIndex === fromIndex) {
            currentPlaylistIndex = toIndex;
        } else if (currentPlaylistIndex === toIndex) {
            currentPlaylistIndex = fromIndex;
        }
    }
    
    updatePlaylistDrawerUI();
}

function playPlaylistItem(index) {
    if (index < 0 || index >= playlist.length) return;
    playlistPlaying = true;
    currentPlaylistIndex = index;
    const item = playlist[index];
    playVideo(item.url_video, 'playlist');
}

window.togglePlaylistItem = togglePlaylistItem;
window.updatePlaylistDrawerUI = updatePlaylistDrawerUI;
window.playPlaylistItem = playPlaylistItem;

// ══════════════════════════════════════════════════════════════
// CARGA DE DATOS (CMS Google Sheets con Respaldo Local)
// ══════════════════════════════════════════════════════════════
const SHEET_ID = '1-NpQprddYp2vYyl4kRxLO-i_LJbF06MYEf9zaC1s880';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

function parseGoogleSheetJson(text) {
    try {
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const json = JSON.parse(jsonStr);
        const rows = json.table.rows;
        if (!rows || rows.length === 0) return null;

        // El primer elemento de rows contiene las cabeceras/columnas
        const headerRow = rows[0];
        const cols = headerRow.c.map(cell => (cell ? String(cell.v).trim().toLowerCase() : ''));

        // Las filas de datos reales empiezan desde el índice 1
        const dataRows = rows.slice(1);
        return dataRows.map(row => {
            const item = {};
            row.c.forEach((cell, idx) => {
                const colName = cols[idx];
                if (colName) {
                    let val = cell ? cell.v : '';
                    if (colName === 'destacado') {
                        val = (String(val).toUpperCase() === 'SI');
                    } else if (colName === 'tags') {
                        val = val ? String(val).split(',').map(t => t.trim()) : [];
                    }
                    item[colName] = val;
                }
            });
            return item;
        });
    } catch (e) {
        console.error('Error al parsear JSON de Google Sheets:', e);
        return null;
    }
}

const viewsMap = {
    "1": 45000,
    "2": 15000,
    "5": 38000,
    "6": 8200,
    "7": 24000,
    "8": 11500,
    "9": 19000,
    "10": 9800,
    "11": 12500,
    "12": 31000,
    "13": 29000
};

fetch(SHEET_URL)
    .then(r => {
        if (!r.ok) throw new Error('Google Sheets responded with error status');
        return r.text();
    })
    .then(text => {
        const parsedData = parseGoogleSheetJson(text);
        if (!parsedData || parsedData.length === 0) throw new Error('Parsed data is empty or invalid');
        allData = parsedData.map(item => {
            item.vistas = viewsMap[item.id] || Math.floor(Math.random() * 5000) + 1000;
            return item;
        });
        initApp();
    })
    .catch(err => {
        console.warn('Usando contenidos.json de respaldo local:', err.message);
        fetch('contenidos.json')
            .then(r  => { if (!r.ok) throw new Error('contenidos.json'); return r.json(); })
            .then(data => {
                allData = data.map(item => {
                    item.vistas = viewsMap[item.id] || Math.floor(Math.random() * 5000) + 1000;
                    return item;
                });
                initApp();
            })
            .catch(err2 => {
                console.error('Falla total en carga de datos:', err2.message);
                allData = [];
                initApp();
            });
    });

// ── Delegación de Eventos en Grids ───────────────────────────────────────────
// Un solo listener por grid en lugar de uno por cada tarjeta generada.
// Elimina el memory leak de 40 addEventListener sin removeEventListener.
function setupGridDelegation(gridEl, isCompact) {
    gridEl.addEventListener('click', (e) => {
        // 1. Botón de playlist (+/✓)
        const addBtn = e.target.closest('.card-add-btn, .card-compact-add-btn');
        if (addBtn) {
            e.stopPropagation();
            const wrapper = addBtn.closest('[data-url]');
            if (!wrapper) return;
            const item = allData.find(d => d.url_video === wrapper.dataset.url);
            if (item) togglePlaylistItem(item);
            return;
        }
        // 2. Click en tarjeta
        const wrapper = e.target.closest('[data-url]');
        if (!wrapper) return;
        if (isCompact && window.matchMedia('(hover: none)').matches) {
            const item = allData.find(d => d.url_video === wrapper.dataset.url);
            if (item) openMobileModal(item, wrapper);
        } else {
            playVideo(wrapper.dataset.url, wrapper);
        }
    });

    // Accesibilidad: navegación por teclado (Tab + Enter/Espacio)
    gridEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const addBtn = e.target.closest('.card-add-btn, .card-compact-add-btn');
        if (addBtn) return; // el botón maneja su propio evento
        const wrapper = e.target.closest('[data-url]');
        if (!wrapper) return;
        e.preventDefault();
        playVideo(wrapper.dataset.url, wrapper);
    });
}

function initApp() {
    allData.forEach(item => ensureThumbnail(item));
    buildCatalogoMainFilters();
    renderCatalogo();
    renderPortafolio();
    currentVideoIndex = -1;

    // Delegación: 2 listeners totales reemplazan ~40 por cada render del grid
    const gridCatalogo   = document.getElementById('grid-catalogo');
    const gridPortafolio = document.getElementById('grid-portafolio');
    if (gridCatalogo)   setupGridDelegation(gridCatalogo, false);
    if (gridPortafolio) setupGridDelegation(gridPortafolio, true);

    setupDragScroll();
    updateLcdDisplay(`<span class="lcd-title">GOLOSINASSSS</span> • <span class="lcd-desc">Escoge tu próxima golosina</span> • `);
}

function setupDragScroll() {
    const container = document.querySelector('.portafolio-scroll-outer');
    if (!container) return;

    let isDown = false, startX, scrollLeft;

    container.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDown = true;
        container.classList.add('is-dragging');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.classList.remove('is-dragging');
        // Sin reset de scroll — el autoscroll retoma naturalmente
    });
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.classList.remove('is-dragging');
    });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        container.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });

    // ── Touch events (móvil) ──────────────────────────────────
    container.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    }, { passive: true });
    container.addEventListener('touchend', () => {
        isDown = false;
    });
    container.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - container.offsetLeft;
        container.scrollLeft = scrollLeft - (x - startX) * 1.5;
    }, { passive: true });
}


