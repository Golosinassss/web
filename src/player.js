// ══════════════════════════════════════════════════════════════
// player.js — Reproductor YouTube, Controles y Playback Queue
// ══════════════════════════════════════════════════════════════
import { store } from './store.js';
import { GolosinasTelemetry } from './telemetry.js';
import { PLAY_SVG, PAUSE_SVG, SPEAKER_SVG, SPEAKER_MUTED_SVG, FULLSCREEN_SVG, FULLSCREEN_EXIT_SVG } from './constants.js';
import { getYouTubeId, formatTime, getParsedDesc, itemMatchesMainFilter } from './utils.js';
import { updateLcdDisplay, setActiveCardByUrl, catalogoCards, portafolioCards, selectMainCategory, buildCatalogoMainFilters, buildInlineSubcategories, allData } from './ui.js';
import { SUBCAT_MAP } from './constants.js';

export let ytPlayer = null;
let ytApiReady      = false;
let pendingVideoId  = null;
let firstPlayInteraction = false;
let playbackQueue = [];
let playedIndices = [];
let customPlayerRafId = null;

export function getAllCards() { return [...catalogoCards, ...portafolioCards]; }

function loadVideoInPlayer(videoId, autoplay) {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') { pendingVideoId = videoId; return; }
    if (autoplay) ytPlayer.loadVideoById(videoId);
    else          ytPlayer.cueVideoById(videoId);
}

export function rebuildPlaybackQueue(startIndex = -1) {
    const all = getAllCards();
    if (all.length === 0) { playbackQueue = []; playedIndices = []; return; }
    const isShuffle = store.get('isShuffle');
    if (isShuffle) {
        let indices = Array.from({ length: all.length }, (_, i) => i);
        if (startIndex !== -1 && startIndex < all.length) {
            indices = indices.filter(idx => idx !== startIndex);
            for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
            playbackQueue = [startIndex, ...indices];
        } else {
            for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
            const currentVideoIndex = store.get('currentVideoIndex');
            if (currentVideoIndex !== -1 && indices[0] === currentVideoIndex && indices.length > 1) {
                [indices[0], indices[indices.length - 1]] = [indices[indices.length - 1], indices[0]];
            }
            playbackQueue = indices;
        }
        playedIndices = [];
    } else {
        let indices = [];
        if (startIndex !== -1 && startIndex < all.length) {
            for (let i = 0; i < all.length; i++) indices.push((startIndex + i) % all.length);
        } else {
            indices = Array.from({ length: all.length }, (_, i) => i);
        }
        playbackQueue = indices; playedIndices = [];
    }
}

export function playNext() {
    const all = getAllCards();
    if (all.length === 0) return;
    const currentVideoIndex = store.get('currentVideoIndex');
    if (currentVideoIndex !== -1) playedIndices.push(currentVideoIndex);
    if (playbackQueue.length === 0 || (playbackQueue.length === 1 && playbackQueue[0] === currentVideoIndex)) rebuildPlaybackQueue();
    let nextIdx = playbackQueue.shift();
    if (nextIdx === currentVideoIndex && playbackQueue.length > 0) nextIdx = playbackQueue.shift();
    if (nextIdx !== undefined) {
        store.set('currentVideoIndex', nextIdx);
        const card = all[nextIdx];
        if (card) { const url = card.getAttribute('data-url'); if (url) playVideo(url, card); }
    }
}

export function playPrev() {
    const all = getAllCards();
    if (all.length === 0) return;
    const isShuffle = store.get('isShuffle');
    let currentVideoIndex = store.get('currentVideoIndex');
    if (!isShuffle) {
        currentVideoIndex = (currentVideoIndex - 1 + all.length) % all.length;
        store.set('currentVideoIndex', currentVideoIndex);
        rebuildPlaybackQueue(currentVideoIndex);
        const card = all[currentVideoIndex];
        if (card) { const url = card.getAttribute('data-url'); if (url) playVideo(url, card); }
    } else {
        if (playedIndices.length > 0) {
            if (currentVideoIndex !== -1) playbackQueue.unshift(currentVideoIndex);
            currentVideoIndex = playedIndices.pop();
            store.set('currentVideoIndex', currentVideoIndex);
            const card = all[currentVideoIndex];
            if (card) { const url = card.getAttribute('data-url'); if (url) playVideo(url, card); }
        } else { playNext(); }
    }
}

function selectCategoryAndTagForVideo(trackItem) {
    let targetMainFilter = 'todas';
    let targetTagFilter = 'todos';
    for (const cat of ['documental', 'música', 'animación']) {
        if (itemMatchesMainFilter(trackItem, cat)) { targetMainFilter = cat; break; }
    }
    if (targetMainFilter !== 'todas') {
        const allowedSubcats = SUBCAT_MAP[targetMainFilter] || [];
        if (Array.isArray(trackItem.tags)) {
            for (const tag of trackItem.tags) {
                const cleanTag = tag.trim().toLowerCase();
                if (allowedSubcats.includes(cleanTag)) { targetTagFilter = cleanTag; break; }
            }
        }
    }
    const changed = store.get('currentMainFilter') !== targetMainFilter || store.get('currentCatalogoTag') !== targetTagFilter;
    if (changed) {
        store.set('currentMainFilter', targetMainFilter);
        store.set('currentCatalogoTag', targetTagFilter);
    }
    const terminalPath = document.getElementById('terminal-path');
    if (terminalPath) {
        terminalPath.style.display = 'block';
        const vidId = getYouTubeId(trackItem.url_video);
        terminalPath.innerHTML = `golosinas@web:~/${targetMainFilter}/${targetTagFilter}$ ./play ${vidId}`;
    }
}

export function playVideo(url, element) {
    const videoId = getYouTubeId(url);
    if (!videoId) return;
    const trackItem = allData.find(item => item.url_video === url);
    if (trackItem) {
        const { mainDesc } = getParsedDesc(trackItem.descripcion);
        const cleanDesc = mainDesc ? mainDesc.toUpperCase() : '';
        const cat = trackItem.categoria ? trackItem.categoria.toUpperCase() : '';
        let html = `<span class="lcd-title">${trackItem.titulo.toUpperCase()}</span>`;
        if (cleanDesc) html += ` <span class="lcd-sep">•</span> <span class="lcd-desc">${cleanDesc}</span>`;
        if (cat) html += ` <span class="lcd-sep">•</span> <span class="lcd-cat">${cat}</span>`;
        html += ` <span class="lcd-sep">•</span> `;
        updateLcdDisplay(html);
        selectCategoryAndTagForVideo(trackItem);
        GolosinasTelemetry.trackVideoStart(videoId, trackItem.titulo, trackItem.categoria);
    } else {
        updateLcdDisplay(`<span class="lcd-title">REPRODUCIENDO...</span> <span class="lcd-sep">•</span> `);
        GolosinasTelemetry.trackVideoStart(videoId, 'Video Desconocido', 'Desconocida');
    }

    if (ytPlayer) {
        const volumeSlider = document.getElementById('player-volume');
        let vol = volumeSlider ? parseInt(volumeSlider.value) : 0;
        if (!firstPlayInteraction) { firstPlayInteraction = true; vol = 100; if (volumeSlider) volumeSlider.value = 100; }
        if (vol > 0) {
            if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
            if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(vol);
            const muteBtn = document.getElementById('player-mute-btn');
            if (muteBtn) { updateVolumeIcon(false); muteBtn.classList.remove('muted'); }
        } else {
            if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
            if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(0);
            const muteBtn = document.getElementById('player-mute-btn');
            if (muteBtn) { updateVolumeIcon(true); muteBtn.classList.add('muted'); }
        }
    }

    store.set('playlistPlaying', false);
    store.set('currentPlaylistIndex', -1);
    if (element && element !== 'playlist') {
        const all = getAllCards();
        let idx = all.indexOf(element);
        if (idx === -1) idx = all.findIndex(c => c.getAttribute('data-url') === element.getAttribute('data-url'));
        if (idx !== -1) { store.set('currentVideoIndex', idx); rebuildPlaybackQueue(idx); }
    } else {
        const all = getAllCards();
        const idx = all.findIndex(c => c.getAttribute('data-url') === url);
        if (idx !== -1) { store.set('currentVideoIndex', idx); rebuildPlaybackQueue(idx); }
    }
    setActiveCardByUrl(url);
    loadVideoInPlayer(videoId, true);
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        scrollActiveCardIntoView();
        scrollActiveFiltersIntoView();
    }, 100);
}

function scrollActiveCardIntoView() {
    const activeCard = document.querySelector('#grid-catalogo .card-wrapper.is-active');
    if (activeCard) {
        const grid = document.getElementById('grid-catalogo');
        if (grid) {
            grid.scrollTo({ left: activeCard.offsetLeft - (grid.clientWidth / 2) + (activeCard.clientWidth / 2), behavior: 'auto' });
        }
    }
}

function scrollActiveFiltersIntoView() {
    const scrollToCenter = (container, activeBtn) => {
        if (container && container.scrollWidth > container.clientWidth) {
            container.scrollTo({ left: activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2), behavior: 'smooth' });
        }
    };
    const activeMainBtn = document.querySelector('#catalogo-main-filters .main-cat-btn.active');
    if (activeMainBtn) scrollToCenter(document.getElementById('catalogo-main-filters'), activeMainBtn);
    const activeSubBtn = document.querySelector('#catalogo-sub-filters .tab-btn.active');
    if (activeSubBtn) scrollToCenter(document.getElementById('catalogo-sub-filters'), activeSubBtn);
}

// ── YouTube API ──────────────────────────────────────────────
window.onYouTubeIframeAPIReady = function() {
    const initialId = 'WpIvp6I7obE';
    ytPlayer = new YT.Player('yt-player-container', {
        videoId: initialId,
        playerVars: { autoplay: 1, mute: 1, rel: 0, modestbranding: 1, playsinline: 1, controls: 1, disablekb: 1, iv_load_policy: 3, fs: 1 },
        events: {
            onReady: function() {
                ytApiReady = true;
                setupCustomPlayerControls();
                if (pendingVideoId) { ytPlayer.loadVideoById(pendingVideoId); pendingVideoId = null; }
                const all = getAllCards();
                const idx = all.findIndex(c => (c.getAttribute('data-url') || '').includes(initialId));
                if (idx !== -1) { store.set('currentVideoIndex', idx); setActiveCardByUrl(all[idx].getAttribute('data-url')); }
            },
            onStateChange: function(e) {
                if (e.data === 0) playNext();
                updateCustomPlayerUI(e.data);
                if (e.data === YT.PlayerState.PLAYING && !firstPlayInteraction) {
                    firstPlayInteraction = true;
                    if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
                    if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
                    const vol = document.getElementById('player-volume');
                    if (vol) vol.value = 100;
                    const mb = document.getElementById('player-mute-btn');
                    if (mb) { updateVolumeIcon(false); mb.classList.remove('muted'); }
                }
                if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                    if (e.data === YT.PlayerState.PAUSED)  GolosinasTelemetry.trackVideoPause(ytPlayer.getCurrentTime());
                    else if (e.data === YT.PlayerState.ENDED) GolosinasTelemetry.trackVideoEnd();
                }
            }
        }
    });
};

// ── Controles del Reproductor ────────────────────────────────
function updateVolumeIcon(isMuted) {
    const c = document.getElementById('player-mute-svg-container');
    if (c) c.innerHTML = isMuted ? SPEAKER_MUTED_SVG : SPEAKER_SVG;
}

function updateVolumeSliderBackground(value) {
    const s = document.getElementById('player-volume');
    if (s) s.style.background = `linear-gradient(to right, #00e5ff 0%, #00e5ff ${value}%, #222 ${value}%, #222 100%)`;
}

function startCustomTimelineUpdate() {
    const timeline = document.getElementById('player-timeline');
    const lcdTime  = document.getElementById('lcd-time');
    stopCustomTimelineUpdate();
    function tick() {
        if (!document.hidden && ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getDuration === 'function') {
            const current = ytPlayer.getCurrentTime(), duration = ytPlayer.getDuration();
            if (duration > 0) {
                const pct = (current / duration) * 100;
                if (timeline) {
                    timeline.value = pct;
                    timeline.style.background = `linear-gradient(90deg, #7c3aed, #c084fc, #f43f5e, #e11d48, #c084fc, #7c3aed) 0% 0% / ${pct}% 100% no-repeat, var(--grad-tornasol)`;
                }
                if (lcdTime) lcdTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
                GolosinasTelemetry.trackVideoProgress(current, duration);
            }
        }
        customPlayerRafId = requestAnimationFrame(tick);
    }
    customPlayerRafId = requestAnimationFrame(tick);
}

function stopCustomTimelineUpdate() {
    if (customPlayerRafId) { cancelAnimationFrame(customPlayerRafId); customPlayerRafId = null; }
}

function updateCustomPlayerUI(state) {
    const c = document.getElementById('player-play-svg-container');
    if (state === YT.PlayerState.PLAYING) { if (c) c.innerHTML = PAUSE_SVG; startCustomTimelineUpdate(); }
    else { if (c) c.innerHTML = PLAY_SVG; if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) stopCustomTimelineUpdate(); }
}

export function setupCustomPlayerControls() {
    const playBtn       = document.getElementById('player-play-btn');
    const prevBtn       = document.getElementById('player-prev-btn');
    const nextBtn       = document.getElementById('player-next-btn');
    const shuffleBtn    = document.getElementById('playlist-shuffle-btn');
    const muteBtn       = document.getElementById('player-mute-btn');
    const fullscreenBtn = document.getElementById('player-fullscreen-btn');
    const timeline      = document.getElementById('player-timeline');
    const volumeSlider  = document.getElementById('player-volume');
    const playlistDrawer = document.getElementById('playlist-drawer');
    const closeDrawerBtn = document.getElementById('playlist-drawer-close');
    if (!playBtn) return;

    playBtn.addEventListener('click', () => {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) { ytPlayer.pauseVideo(); }
        else {
            if (!firstPlayInteraction) {
                firstPlayInteraction = true;
                if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
                if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
                const vs = document.getElementById('player-volume'); if (vs) vs.value = 100;
                const mb = document.getElementById('player-mute-btn'); if (mb) { updateVolumeIcon(false); mb.classList.remove('muted'); }
            }
            ytPlayer.playVideo();
        }
    });

    prevBtn.addEventListener('click', () => playPrev());
    nextBtn.addEventListener('click', () => playNext());

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const newShuffle = !store.get('isShuffle');
            store.set('isShuffle', newShuffle);
            shuffleBtn.classList.toggle('active', newShuffle);
            rebuildPlaybackQueue(store.get('currentVideoIndex'));
        });
    }

    if (closeDrawerBtn && playlistDrawer) {
        closeDrawerBtn.addEventListener('click', (e) => { e.stopPropagation(); playlistDrawer.style.display = 'none'; });
    }
    document.addEventListener('click', (e) => {
        if (playlistDrawer && playlistDrawer.style.display !== 'none') {
            if (!playlistDrawer.contains(e.target)) playlistDrawer.style.display = 'none';
        }
    });

    timeline.addEventListener('input', (e) => {
        if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
        ytPlayer.seekTo((e.target.value / 100) * ytPlayer.getDuration(), true);
    });

    if (volumeSlider) { volumeSlider.value = 0; updateVolumeSliderBackground(0); }
    if (muteBtn) { muteBtn.classList.add('muted'); updateVolumeIcon(true); }

    volumeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        updateVolumeSliderBackground(val);
        if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
        ytPlayer.setVolume(val);
        if (val > 0) { if (ytPlayer.isMuted()) ytPlayer.unMute(); updateVolumeIcon(false); muteBtn.classList.remove('muted'); }
        else         { if (!ytPlayer.isMuted()) ytPlayer.mute(); updateVolumeIcon(true); muteBtn.classList.add('muted'); }
    });

    muteBtn.addEventListener('click', () => {
        if (!ytPlayer || typeof ytPlayer.isMuted !== 'function') return;
        if (ytPlayer.isMuted()) {
            ytPlayer.unMute(); ytPlayer.setVolume(100); updateVolumeIcon(false); muteBtn.classList.remove('muted');
            volumeSlider.value = 100; updateVolumeSliderBackground(100);
        } else {
            ytPlayer.mute(); updateVolumeIcon(true); muteBtn.classList.add('muted');
            volumeSlider.value = 0; updateVolumeSliderBackground(0);
        }
    });

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.getElementById('player-fullscreen-svg-container');
            const body = document.body;
            const isFS = body.classList.contains('fullscreen-mode') || !!document.fullscreenElement;
            if (!isFS) {
                body.classList.add('fullscreen-mode');
                if (container) container.innerHTML = FULLSCREEN_EXIT_SVG;
                (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || (() => {})).call(document.documentElement);
            } else {
                body.classList.remove('fullscreen-mode');
                if (container) container.innerHTML = FULLSCREEN_SVG;
                (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        const isNative = !!document.fullscreenElement;
        document.body.classList.toggle('fullscreen-mode', isNative);
        if (fullscreenBtn) {
            const c = document.getElementById('player-fullscreen-svg-container');
            if (c) c.innerHTML = isNative ? FULLSCREEN_EXIT_SVG : FULLSCREEN_SVG;
        }
    });

    const lcdScreen = document.querySelector('.player-lcd');
    if (lcdScreen) {
        lcdScreen.style.cursor = 'pointer';
        lcdScreen.addEventListener('click', () => document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    document.querySelectorAll('.corner-gif').forEach(gif => {
        gif.style.cursor = 'pointer';
        gif.addEventListener('click', (e) => { e.stopPropagation(); if (fullscreenBtn) fullscreenBtn.click(); });
    });
}
