// ══════════════════════════════════════════════════════════════
// main.js — Punto de entrada principal (orchestration + init)
// ══════════════════════════════════════════════════════════════
import { store } from './store.js';
import { GolosinasTelemetry } from './telemetry.js';
import { SHEET_URL, SHEET_URL_EPISODES, viewsMap, SUBCAT_MAP, mainCatColors, ARROW_UP_SVG, ARROW_DOWN_SVG } from './constants.js';
import { ensureThumbnail, getYouTubeId } from './utils.js';
import {
    renderCatalogo, renderPortafolio, buildCatalogoMainFilters,
    updateLcdDisplay, setActiveCardByUrl, syncAllAddButtons,
    catalogoCards, portafolioCards, allData, setAllData,
    openMobileModal, closeMobileModal, buildInlineSubcategories
} from './ui.js';
import { playVideo, playNext, playPrev, getAllCards, rebuildPlaybackQueue, setupCustomPlayerControls } from './player.js';

// ── Borde Derecho ASCII ──────────────────────────────────────
(function setupRightBorderPattern() {
    const patternUnit = [" ........","*........","*..*****","*..", "*........","*........","*..****..", "*..   *..",
        "*........","*........","*******..","      *.."].join('\n');
    const tailUnit = [" ........","*........","********"].join('\n');
    const fullBlockText = Array(40).fill(patternUnit).join('\n') + '\n' + tailUnit;
    function inject() {
        const container = document.getElementById('right-marquee');
        if (!container) return;
        container.innerHTML = '';
        ['ticker-logo-v', 'ticker-logo-v'].forEach(cls => {
            const block = document.createElement('div');
            block.className = cls; block.textContent = fullBlockText;
            container.appendChild(block);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
})();

// ── Store: Suscriptor Reactivo de la UI ──────────────────────
store.subscribe((key, newValue) => {
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
                if (img) img.style.opacity = isCurrent ? '1' : '0.4';
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
                const item = store.get('playlist')[store.get('currentPlaylistIndex')];
                if (item) activeUrl = item.url_video;
            } else {
                const all = getAllCards();
                const card = all[store.get('currentVideoIndex')];
                if (card) activeUrl = card.getAttribute('data-url');
            }
            if (activeUrl) setActiveCardByUrl(activeUrl);
            break;
    }
});

// ── Playlist ─────────────────────────────────────────────────
function togglePlaylistItem(item) {
    const pl = store.get('playlist');
    const index = pl.findIndex(p => p.url_video === item.url_video);
    let isNowAdded = false;
    if (index === -1) { pl.push(item); isNowAdded = true; }
    else {
        pl.splice(index, 1); isNowAdded = false;
        if (store.get('playlistPlaying')) {
            if (store.get('currentPlaylistIndex') === index) {
                if (pl.length === 0) { store.set('playlistPlaying', false); store.set('currentPlaylistIndex', -1); }
                else { store.set('currentPlaylistIndex', store.get('currentPlaylistIndex') % pl.length); playPlaylistItem(store.get('currentPlaylistIndex')); }
            } else if (store.get('currentPlaylistIndex') > index) {
                store.set('currentPlaylistIndex', store.get('currentPlaylistIndex') - 1);
            }
        }
    }
    document.querySelectorAll(`[data-url="${item.url_video}"]`).forEach(wrapper => {
        ['.card-add-btn', '.card-compact-add-btn'].forEach(sel => {
            const btn = wrapper.querySelector(sel);
            if (btn) { btn.classList.toggle('added', isNowAdded); btn.textContent = isNowAdded ? '✓' : '+'; btn.title = isNowAdded ? 'Quitar de Playlist' : 'Agregar a Playlist'; }
        });
    });
    updatePlaylistDrawerUI();
}

function updatePlaylistDrawerUI() {
    const container = document.getElementById('playlist-drawer-items');
    if (!container) return;
    const pl = store.get('playlist');
    container.innerHTML = '';
    if (pl.length === 0) { container.innerHTML = '<div class="playlist-empty-state">LISTA VACÍA</div>'; return; }
    pl.forEach((item, index) => {
        const isActive = store.get('playlistPlaying') && store.get('currentPlaylistIndex') === index;
        const itemEl = document.createElement('div');
        itemEl.className = `playlist-item${isActive ? ' active-track' : ''}`;
        itemEl.setAttribute('draggable', 'true');
        const isFirst = index === 0, isLast = index === pl.length - 1;
        itemEl.innerHTML = `
            <span class="playlist-item-title">${item.titulo}</span>
            <div class="playlist-item-controls">
                <button class="playlist-item-reorder-btn up${isFirst ? ' disabled' : ''}" title="Subir">${ARROW_UP_SVG}</button>
                <button class="playlist-item-reorder-btn down${isLast ? ' disabled' : ''}" title="Bajar">${ARROW_DOWN_SVG}</button>
                <button class="playlist-item-remove" title="Quitar de la lista">✕</button>
            </div>`;
        itemEl.addEventListener('click', (e) => { if (!e.target.closest('.playlist-item-remove, .playlist-item-reorder-btn')) playPlaylistItem(index); });
        const upBtn = itemEl.querySelector('.playlist-item-reorder-btn.up');
        if (upBtn && !isFirst) upBtn.addEventListener('click', (e) => { e.stopPropagation(); movePlaylistItem(index, -1); });
        const downBtn = itemEl.querySelector('.playlist-item-reorder-btn.down');
        if (downBtn && !isLast) downBtn.addEventListener('click', (e) => { e.stopPropagation(); movePlaylistItem(index, 1); });
        const removeBtn = itemEl.querySelector('.playlist-item-remove');
        if (removeBtn) removeBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlaylistItem(item); });
        // Drag & Drop
        itemEl.addEventListener('dragstart', (e) => { itemEl.classList.add('dragging'); e.dataTransfer.setData('text/plain', index); });
        itemEl.addEventListener('dragend', () => itemEl.classList.remove('dragging'));
        itemEl.addEventListener('dragover', (e) => e.preventDefault());
        itemEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            if (fromIndex !== index && !isNaN(fromIndex)) {
                const [movedItem] = pl.splice(fromIndex, 1);
                pl.splice(index, 0, movedItem);
                if (store.get('playlistPlaying')) {
                    const ci = store.get('currentPlaylistIndex');
                    if (ci === fromIndex) store.set('currentPlaylistIndex', index);
                    else if (ci > fromIndex && ci <= index) store.set('currentPlaylistIndex', ci - 1);
                    else if (ci < fromIndex && ci >= index) store.set('currentPlaylistIndex', ci + 1);
                }
                updatePlaylistDrawerUI();
            }
        });
        container.appendChild(itemEl);
    });
}

function movePlaylistItem(fromIndex, direction) {
    const pl = store.get('playlist');
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= pl.length) return;
    [pl[fromIndex], pl[toIndex]] = [pl[toIndex], pl[fromIndex]];
    if (store.get('playlistPlaying')) {
        const ci = store.get('currentPlaylistIndex');
        if (ci === fromIndex) store.set('currentPlaylistIndex', toIndex);
        else if (ci === toIndex) store.set('currentPlaylistIndex', fromIndex);
    }
    updatePlaylistDrawerUI();
}

function playPlaylistItem(index) {
    const pl = store.get('playlist');
    if (index < 0 || index >= pl.length) return;
    store.set('playlistPlaying', true);
    store.set('currentPlaylistIndex', index);
    playVideo(pl[index].url_video, 'playlist');
}

window.togglePlaylistItem = togglePlaylistItem;
window.updatePlaylistDrawerUI = updatePlaylistDrawerUI;
window.playPlaylistItem = playPlaylistItem;

// ── Delegación de Eventos en Grids ───────────────────────────
function setupGridDelegation(gridEl, isCompact) {
    gridEl.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.card-add-btn, .card-compact-add-btn');
        if (addBtn) {
            e.stopPropagation();
            const wrapper = addBtn.closest('[data-url]');
            if (!wrapper) return;
            const item = allData.find(d => d.url_video === wrapper.dataset.url);
            if (item) togglePlaylistItem(item);
            return;
        }
        const wrapper = e.target.closest('[data-url]');
        if (!wrapper) return;
        if (isCompact && window.matchMedia('(hover: none)').matches) {
            const item = allData.find(d => d.url_video === wrapper.dataset.url);
            if (item) openMobileModal(item, wrapper, playVideo);
        } else {
            playVideo(wrapper.dataset.url, wrapper);
        }
    });
    gridEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('.card-add-btn, .card-compact-add-btn')) return;
        const wrapper = e.target.closest('[data-url]');
        if (!wrapper) return;
        e.preventDefault();
        playVideo(wrapper.dataset.url, wrapper);
    });
}

// ── Drag Scroll (Portafolio) ─────────────────────────────────
function setupDragScroll() {
    const container = document.querySelector('.portafolio-scroll-outer');
    if (!container) return;
    let isDown = false, startX, scrollLeft;
    container.addEventListener('mousedown', (e) => { if (e.button !== 0) return; isDown = true; container.classList.add('is-dragging'); startX = e.pageX - container.offsetLeft; scrollLeft = container.scrollLeft; });
    container.addEventListener('mouseleave', () => { isDown = false; container.classList.remove('is-dragging'); });
    container.addEventListener('mouseup', () => { isDown = false; container.classList.remove('is-dragging'); });
    container.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); container.scrollLeft = scrollLeft - (e.pageX - container.offsetLeft - startX) * 1.5; });
    container.addEventListener('touchstart', (e) => { isDown = true; startX = e.touches[0].pageX - container.offsetLeft; scrollLeft = container.scrollLeft; }, { passive: true });
    container.addEventListener('touchend', () => { isDown = false; });
    container.addEventListener('touchmove', (e) => { if (!isDown) return; container.scrollLeft = scrollLeft - (e.touches[0].pageX - container.offsetLeft - startX) * 1.5; }, { passive: true });
}

// ── Navegación por Teclado (WASD + Flechas) ──────────────────
let keyboardFocusActive = false, activeSection = 0, activeIndex = 0;

function getSectionElements(sectionId) {
    if (sectionId === 0) return ['#player-play-btn','#player-prev-btn','#player-next-btn','#playlist-shuffle-btn','#player-mute-btn','#player-fullscreen-btn'].map(s => document.querySelector(s)).filter(el => el && getComputedStyle(el).display !== 'none');
    if (sectionId === 1) return [...document.querySelectorAll('#catalogo-main-filters .main-cat-btn, #catalogo-sub-filters .tab-btn')].filter(el => el && getComputedStyle(el).display !== 'none');
    if (sectionId === 2) return Array.from(document.querySelectorAll('#grid-catalogo .card-wrapper')).filter(el => el && getComputedStyle(el).display !== 'none');
    if (sectionId === 3) return Array.from(document.querySelectorAll('#grid-portafolio .card-compact-wrapper')).filter(el => el && getComputedStyle(el).display !== 'none');
    return [];
}

function applyKeyboardFocus() {
    document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
    const elements = getSectionElements(activeSection);
    if (!elements.length) return;
    if (activeIndex < 0) activeIndex = elements.length - 1;
    if (activeIndex >= elements.length) activeIndex = 0;
    const targetEl = elements[activeIndex];
    if (targetEl) { targetEl.classList.add('keyboard-focused'); targetEl.focus({ preventScroll: true }); targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }
}

document.addEventListener('click', () => { document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused')); keyboardFocusActive = false; });
document.addEventListener('mousemove', () => {
    if (keyboardFocusActive) {
        document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
        keyboardFocusActive = false;
    }
}, { passive: true });

function initKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            if (e.key === 'Escape') { e.target.blur(); document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused')); keyboardFocusActive = false; }
            return;
        }
        const key = e.key.toLowerCase();
        if (key === ' ' || key === 'k') { e.preventDefault(); document.getElementById('player-play-btn')?.click(); return; }
        if (key === 'l') { e.preventDefault(); playNext(); return; }
        if (key === 'j') { e.preventDefault(); playPrev(); return; }
        if (e.key === 'Escape') { e.preventDefault(); const pd = document.getElementById('playlist-drawer'); if (pd) pd.style.display = 'none'; document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused')); keyboardFocusActive = false; return; }
        let action = false;
        if (key === 'w' || e.key === 'ArrowUp')    { e.preventDefault(); keyboardFocusActive = true; activeSection = (activeSection - 1 + 4) % 4; activeIndex = Math.min(activeIndex, getSectionElements(activeSection).length - 1 || 0); action = true; }
        else if (key === 's' || e.key === 'ArrowDown')  { e.preventDefault(); keyboardFocusActive = true; activeSection = (activeSection + 1) % 4; activeIndex = Math.min(activeIndex, getSectionElements(activeSection).length - 1 || 0); action = true; }
        else if (key === 'a' || e.key === 'ArrowLeft')  { e.preventDefault(); keyboardFocusActive = true; activeIndex--; action = true; }
        else if (key === 'd' || e.key === 'ArrowRight') { e.preventDefault(); keyboardFocusActive = true; activeIndex++; action = true; }
        else if (e.key === 'Enter' && keyboardFocusActive) { e.preventDefault(); getSectionElements(activeSection)[activeIndex]?.click(); }
        if (action) applyKeyboardFocus();
    });
}

// ── Carga de Datos ───────────────────────────────────────────
function parseGoogleSheetJson(text) {
    try {
        const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
        const cols = json.table.cols.map(col => (col && col.label) ? String(col.label).trim().toLowerCase() : '');
        const rows = json.table.rows;
        if (!rows || rows.length === 0) return null;
        return rows.map(row => {
            const item = {};
            row.c.forEach((cell, idx) => {
                const colName = cols[idx];
                if (colName) {
                    let val = cell ? cell.v : '';
                    if (colName === 'destacado') val = (String(val).toUpperCase() === 'SI');
                    else if (colName === 'tags') val = val ? String(val).split(',').map(t => t.trim()) : [];
                    item[colName] = val;
                }
            });
            return item;
        });
    } catch (e) { console.error('Error al parsear JSON de Google Sheets:', e); return null; }
}

function initApp(data) {
    setAllData(data);
    allData.forEach(item => ensureThumbnail(item));
    // Mezcla aleatoria inicial para orden no cronológico estable
    for (let i = allData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allData[i], allData[j]] = [allData[j], allData[i]];
    }
    buildCatalogoMainFilters();
    renderCatalogo();
    renderPortafolio();
    store.set('currentVideoIndex', -1);
    const gridCatalogo   = document.getElementById('grid-catalogo');
    const gridPortafolio = document.getElementById('grid-portafolio');
    if (gridCatalogo)   setupGridDelegation(gridCatalogo, false);
    if (gridPortafolio) setupGridDelegation(gridPortafolio, true);
    setupDragScroll();
    updateLcdDisplay(`<span class="lcd-title">GOLOSINASSSS</span> • <span class="lcd-desc">Escoge tu próxima golosina</span> • `);
    initKeyboardNavigation();
}

// ── Bootstrap ────────────────────────────────────────────────
fetch(SHEET_URL).then(r => {
    if (!r.ok) throw new Error('Sheets error');
    return r.text();
}).then(mainText => {
    const parsedMain = parseGoogleSheetJson(mainText);
    if (!parsedMain || parsedMain.length === 0) throw new Error('Empty data');
    
    const finalData = parsedMain.map(item => { 
        item.vistas = viewsMap[String(item.id)] || Math.floor(Math.random() * 5000) + 1000;
        return item; 
    });
    
    initApp(finalData);
}).catch(err => {
    console.warn('Usando contenidos.json de respaldo local:', err.message);
    fetch('contenidos.json')
        .then(r => { if (!r.ok) throw new Error('contenidos.json'); return r.json(); })
        .then(data => initApp(data.map(item => { item.vistas = viewsMap[String(item.id)] || Math.floor(Math.random() * 5000) + 1000; return item; })))
        .catch(err2 => { console.error('Falla total en carga de datos:', err2.message); initApp([]); });
});
