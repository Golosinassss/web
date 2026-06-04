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



// ── Estado Global ────────────────────────────────────────────
let ytPlayer        = null;
let portafolioCards = [];
let catalogoCards   = [];
let currentVideoIndex = -1;
let ytApiReady      = false;
let pendingVideoId  = null;
let allData         = [];
let currentPortafolioFilter = 'recientes';
let currentMainFilter       = 'todas'; // 'todas', 'documental', 'música', 'animación'
let currentCatalogoTag      = 'todos'; // subcategoría (tag) activa
let playlist            = [];
let playlistPlaying     = false;
let currentPlaylistIndex = -1;
let isShuffle           = false;

// ── Iconos SVG ────────────────────────────────────────────────
const SPEAKER_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; display:block;">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
</svg>`;

const SPEAKER_MUTED_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; display:block;">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
</svg>`;

const FULLSCREEN_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; display:block;">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
</svg>`;

const FULLSCREEN_EXIT_SVG = `
<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; display:block;">
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
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match  = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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
        updateLcdDisplay(trackItem.titulo.toUpperCase());
    } else {
        updateLcdDisplay("REPRODUCIENDO...");
    }

    // Desbloqueo forzado de audio para políticas móviles ante interacción
    if (ytPlayer) {
        if (typeof ytPlayer.unMute === 'function') {
            ytPlayer.unMute();
            const muteBtn = document.getElementById('player-mute-btn');
            if (muteBtn) {
                updateVolumeIcon(false);
                muteBtn.classList.remove('active');
            }
            const volumeSlider = document.getElementById('player-volume');
            if (volumeSlider) volumeSlider.value = ytPlayer.getVolume() || 100;
        }
        if (typeof ytPlayer.setVolume === 'function') {
            ytPlayer.setVolume(100);
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
let customPlayerUpdateInterval = null;

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
            playlistBtn.classList.toggle('active', !isOpen);
            if (!isOpen) {
                updatePlaylistDrawerUI();
            }
        });
    }

    if (closeDrawerBtn && playlistDrawer && playlistBtn) {
        closeDrawerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playlistDrawer.style.display = 'none';
            playlistBtn.classList.remove('active');
        });
    }

    // Cerrar playlist al hacer clic fuera del panel
    document.addEventListener('click', (e) => {
        if (playlistDrawer && playlistDrawer.style.display !== 'none') {
            if (!playlistDrawer.contains(e.target) && !playlistBtn.contains(e.target)) {
                playlistDrawer.style.display = 'none';
                playlistBtn.classList.remove('active');
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

    // 6. Barra de volumen
    volumeSlider.addEventListener('input', (e) => {
        if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
        ytPlayer.setVolume(e.target.value);
        if (e.target.value > 0) {
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
            volumeSlider.value = ytPlayer.getVolume() || 100;
        } else {
            ytPlayer.mute();
            updateVolumeIcon(true);
            muteBtn.classList.add('muted');
            volumeSlider.value = 0;
        }
    });

    // 8. Pantalla Completa de la Página (Fullscreen)
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.getElementById('player-fullscreen-svg-container');
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        fullscreenBtn.classList.add('active');
                        if (container) container.innerHTML = FULLSCREEN_EXIT_SVG;
                    })
                    .catch(err => console.warn('Error al iniciar Fullscreen:', err));
            } else {
                document.exitFullscreen()
                    .then(() => {
                        fullscreenBtn.classList.remove('active');
                        if (container) container.innerHTML = FULLSCREEN_SVG;
                    })
                    .catch(err => console.warn('Error al salir de Fullscreen:', err));
            }
        });
    }

    // Escuchar cambios de fullscreen (por si usan Esc)
    document.addEventListener('fullscreenchange', () => {
        if (fullscreenBtn) {
            const container = document.getElementById('player-fullscreen-svg-container');
            if (document.fullscreenElement) {
                fullscreenBtn.classList.add('active');
                if (container) container.innerHTML = FULLSCREEN_EXIT_SVG;
            } else {
                fullscreenBtn.classList.remove('active');
                if (container) container.innerHTML = FULLSCREEN_SVG;
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

function updateLcdDisplay(title) {
    const lcdText = document.getElementById('lcd-text');
    if (!lcdText) return;
    
    lcdText.textContent = title;
    lcdText.classList.remove('marquee-anim');
    lcdText.style.animation = '';

    // Esperar un frame
    requestAnimationFrame(() => {
        const container = lcdText.parentElement;
        if (container && lcdText.scrollWidth > container.clientWidth) {
            lcdText.classList.add('marquee-anim');
            // Velocidad constante de scroll basada en la longitud del texto
            const duration = Math.max(8, Math.floor(lcdText.scrollWidth / 30));
            lcdText.style.animation = `lcdScroll ${duration}s linear infinite`;
        }
    });
}

function startCustomTimelineUpdate() {
    const timeline = document.getElementById('player-timeline');
    const lcdTime = document.getElementById('lcd-time');

    clearInterval(customPlayerUpdateInterval);
    customPlayerUpdateInterval = setInterval(() => {
        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getDuration === 'function') {
            const current = ytPlayer.getCurrentTime();
            const duration = ytPlayer.getDuration();
            
            if (duration > 0) {
                const pct = (current / duration) * 100;
                timeline.value = pct;
                // Pintar el progreso completado con el gradiente tornasol y el resto con el color base #222
                timeline.style.background = `linear-gradient(to right, #ffb3ba 0%, #bae1ff ${pct * 0.25}%, #baffc9 ${pct * 0.5}%, #ffffba ${pct * 0.75}%, #ffdfba ${pct}%, #222 ${pct}%, #222 100%)`;
            }
            if (lcdTime) {
                lcdTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
            }
        }
    }, 250); // Menor intervalo para mayor suavidad
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

    const icon = playBtn.querySelector('.btn-icon');

    if (state === YT.PlayerState.PLAYING) {
        if (icon) icon.textContent = '||';
        startCustomTimelineUpdate();
    } else {
        if (icon) icon.textContent = '▶';
        if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            clearInterval(customPlayerUpdateInterval);
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
               tags.includes('institucional') ||
               tags.includes('sonido infinito') ||
               tags.includes('conciertos');
    }
    if (filter === 'música' || filter === 'musica') {
        return category.includes('conciertos') ||
               category.includes('sesiones') ||
               tags.includes('música') ||
               tags.includes('musica') ||
               tags.includes('conciertos') ||
               tags.includes('sonido infinito') ||
               tags.includes('videoclips') ||
               tags.includes('sesiones musicales') ||
               tags.includes('cine');
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

    wrapperEl.addEventListener('click', (e) => {
        if (e.target.closest('.card-add-btn')) return; // Evitar reproducir al agregar a playlist
        playVideo(item.url_video, wrapperEl);
    });

    wrapperEl.addEventListener('keydown', (e) => {
        if (e.target.closest('.card-add-btn')) return;
        if (e.key === 'Enter' || e.key === ' ') { 
            e.preventDefault(); 
            playVideo(item.url_video, wrapperEl); 
        }
    });

    const addBtn = wrapperEl.querySelector('.card-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlaylistItem(item);
        });
    }

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
    const compactAddBtnHtml = `<button class="card-compact-add-btn${isAdded ? ' added' : ''}" title="${isAdded ? 'Quitar de Playlist' : 'Agregar a Playlist'}">${isAdded ? '✓' : '+'}</button>`;
    const overlayAddBtnHtml = `<button class="card-add-btn${isAdded ? ' added' : ''}" title="${isAdded ? 'Quitar de Playlist' : 'Agregar a Playlist'}">${isAdded ? '✓' : '+'}</button>`;

    wrapperEl.innerHTML = `
        <!-- COMPACT CARD (normal view) -->
        <div class="card-compact">
            ${compactAddBtnHtml}
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

    wrapperEl.addEventListener('click', (e) => {
        if (e.target.closest('.card-compact-add-btn') || e.target.closest('.card-add-btn')) return; // Evitar reproducir al agregar a playlist
        if (window.matchMedia('(hover: none)').matches) {
            openMobileModal(item, wrapperEl);
        } else {
            playVideo(item.url_video, wrapperEl);
        }
    });

    wrapperEl.addEventListener('keydown', (e) => {
        if (e.target.closest('.card-compact-add-btn') || e.target.closest('.card-add-btn')) return;
        if (e.key === 'Enter' || e.key === ' ') { 
            e.preventDefault(); 
            playVideo(item.url_video, wrapperEl); 
        }
    });

    const addBtnNormal = wrapperEl.querySelector('.card-compact-add-btn');
    const addBtnOverlay = wrapperEl.querySelector('.card-full-overlay .card-add-btn');

    if (addBtnNormal) {
        addBtnNormal.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlaylistItem(item);
        });
    }

    if (addBtnOverlay) {
        addBtnOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlaylistItem(item);
        });
    }

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
// CARGA DE DATOS
// ══════════════════════════════════════════════════════════════
fetch('contenidos.json')
    .then(r  => { if (!r.ok) throw new Error('contenidos.json'); return r.json(); })
    .then(data => {
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
        allData = data.map(item => {
            item.vistas = viewsMap[item.id] || Math.floor(Math.random() * 5000) + 1000;
            return item;
        });
        initApp();
    })
    .catch(err => { console.warn('No se pudo cargar datos:', err.message); allData = []; initApp(); });

function initApp() {
    allData.forEach(item => ensureThumbnail(item));
    buildCatalogoMainFilters();
    renderCatalogo();
    renderPortafolio();
    currentVideoIndex = -1;
    setupDragScroll();
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


