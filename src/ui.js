// ══════════════════════════════════════════════════════════════
// ui.js — Lógica de UI: Cards, Grids, Filtros, Portafolio, Modal
// ══════════════════════════════════════════════════════════════
import { store } from './store.js';
import { MAIN_CATEGORIES, SUBCAT_MAP, mainCatColors, tagColors, palette } from './constants.js';
import { buildCardHTML, itemMatchesMainFilter, getParsedDesc, ensureThumbnail, getYouTubeId } from './utils.js';
import { GolosinasTelemetry } from './telemetry.js';

// ── Referencias globales a arrays de cards ───────────────────
export let portafolioCards = [];
export let catalogoCards   = [];
export let allData         = [];
export function setAllData(data) { allData = data; }

// ── Tarjeta activa ───────────────────────────────────────────
export function setActiveCardByUrl(url) {
    const targetId = getYouTubeId(url);
    if (!targetId) return;
    document.querySelectorAll('.card-wrapper, .card-compact-wrapper').forEach(wrapper => {
        const cardId = getYouTubeId(wrapper.getAttribute('data-url'));
        const isPlaying = cardId === targetId;
        wrapper.classList.toggle('is-active', isPlaying);
        const inner = wrapper.querySelector('.card');
        if (inner) inner.classList.toggle('active-card', isPlaying);
    });
}

export function syncAllAddButtons() {
    const currentPlaylist = store.get('playlist');
    document.querySelectorAll('[data-url]').forEach(wrapper => {
        const url = wrapper.getAttribute('data-url');
        const isAdded = currentPlaylist.some(p => p.url_video === url);
        [wrapper.querySelector('.card-add-btn'), wrapper.querySelector('.card-compact-add-btn')].forEach(btn => {
            if (btn) { btn.classList.toggle('added', isAdded); btn.textContent = isAdded ? '✓' : '+'; btn.title = isAdded ? 'Quitar de Playlist' : 'Agregar a Playlist'; }
        });
    });
    const modal = document.getElementById('mobile-card-modal');
    if (modal && modal.classList.contains('is-open')) {
        const cardWrapper = modal.querySelector('[data-url]');
        if (cardWrapper) {
            const url = cardWrapper.getAttribute('data-url');
            const isAdded = currentPlaylist.some(p => p.url_video === url);
            const btn = modal.querySelector('.card-add-btn');
            if (btn) { btn.classList.toggle('added', isAdded); btn.textContent = isAdded ? '✓' : '+'; }
        }
    }
}

// ── Builders de Cards ────────────────────────────────────────
export function buildCard(item, animDelay) {
    ensureThumbnail(item);
    const { previewHtml, metaHtml, tagsHtml, mainDesc, credit, color } = buildCardHTML(item);
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'card-wrapper';
    wrapperEl.setAttribute('data-url', item.url_video);
    wrapperEl.setAttribute('aria-label', `Reproducir: ${item.titulo}`);
    wrapperEl.setAttribute('tabindex', '0');
    wrapperEl.style.animationDelay = `${animDelay * 0.05}s`;
    wrapperEl.innerHTML = `
        <div class="card">
            ${metaHtml}
            <div class="card-body">
                <div class="card-left">
                    ${previewHtml}
                    <div class="play-btn" aria-hidden="true">
                        <svg viewBox="0 0 24 24" style="stroke:${color}; fill:none; stroke-width:2;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                </div>
                <div class="card-content">
                    <h3>${item.titulo}</h3>
                    ${mainDesc ? `<p class="card-desc">${mainDesc}</p>` : ''}
                    ${credit  ? `<p class="card-credit">${credit}</p>` : ''}
                </div>
            </div>
            ${tagsHtml}
        </div>`;
    return wrapperEl;
}

export function buildCompactCard(item, animDelay) {
    ensureThumbnail(item);
    const { previewHtml, metaHtml, tagsHtml, mainDesc, credit, color } = buildCardHTML(item);
    const isYoutubThumb = item.preview_url && item.preview_url.includes('img.youtube.com');
    const thumbClass    = isYoutubThumb ? 'compact-thumb-rect' : 'compact-thumb-sq';
    const thumbSrc      = item.preview_url || '';
    const thumbHtml     = thumbSrc
        ? `<div class="compact-thumb ${thumbClass}"><img src="${thumbSrc}" alt="" loading="lazy"></div>`
        : `<div class="compact-thumb compact-thumb-sq compact-thumb-empty"></div>`;
    const titleNotTooLong = item.titulo && item.titulo.length < 35;
    const descText = titleNotTooLong && mainDesc ? mainDesc : '';

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'card-compact-wrapper';
    wrapperEl.setAttribute('data-url', item.url_video);
    wrapperEl.setAttribute('aria-label', `Reproducir: ${item.titulo}`);
    wrapperEl.setAttribute('tabindex', '0');
    if (animDelay > 0) wrapperEl.style.animationDelay = `${animDelay * 0.05}s`;
    else wrapperEl.style.opacity = '1';
    wrapperEl.innerHTML = `
        <div class="card-compact">
            ${thumbHtml}
            <div class="card-compact-content">
                <p class="card-compact-title">${item.titulo}</p>
                ${descText ? `<p class="card-compact-desc">${descText}</p>` : ''}
            </div>
        </div>
        <div class="card-full-overlay">
            <div class="card">
                ${metaHtml}
                <div class="card-body">
                    <div class="card-left">
                        ${previewHtml}
                        <div class="play-btn" aria-hidden="true">
                            <svg viewBox="0 0 24 24" style="stroke:${color}; fill:none; stroke-width:2;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3>${item.titulo}</h3>
                        ${mainDesc ? `<p class="card-desc">${mainDesc}</p>` : ''}
                        ${credit  ? `<p class="card-credit">${credit}</p>` : ''}
                    </div>
                </div>
                ${tagsHtml}
            </div>
        </div>`;
    return wrapperEl;
}

// ── Filtros del Catálogo ─────────────────────────────────────
export function buildInlineSubcategories(container, tags, category) {
    container.innerHTML = '';
    const prefix = document.createElement('span');
    prefix.className = 'branch-char';
    prefix.textContent = '└─';
    container.appendChild(prefix);
    const list = ['todos', ...tags];
    list.forEach((sub, idx) => {
        const btn = document.createElement('button');
        btn.className = `filter-btn tab-btn${store.get('currentCatalogoTag') === sub ? ' active' : ''}`;
        const branchChar = idx === list.length - 1 ? ' └─ ' : ' ├─ ';
        const catColor = mainCatColors[category] || '#e0e0e0';
        btn.style.setProperty('--active-color', catColor);
        btn.style.color = store.get('currentCatalogoTag') === sub ? catColor : '';
        btn.innerHTML = `<span class="branch-connector">${branchChar}</span><span class="tag-name">${sub}</span>`;
        btn.style.animation = `typewriter 0.4s steps(15, end) forwards`;
        btn.style.animationDelay = `${idx * 0.05}s`;
        btn.addEventListener('click', (e) => { e.stopPropagation(); setCatalogoTag(sub, category); });
        container.appendChild(btn);
    });
}

export function buildCatalogoMainFilters() {
    const container = document.getElementById('catalogo-main-filters');
    if (!container) return;
    container.innerHTML = '';
    MAIN_CATEGORIES.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `filter-btn main-cat-btn${store.get('currentMainFilter') === cat ? ' active' : ''}`;
        btn.setAttribute('data-cat', cat);
        if (cat === 'todas') {
            const img = document.createElement('img');
            img.src = 'ICON_GOLOSINASSSS.png'; img.alt = 'TODAS'; img.className = 'main-cat-icon';
            img.style.opacity = store.get('currentMainFilter') === 'todas' ? '1' : '0.4';
            btn.appendChild(img);
        } else {
            btn.textContent = cat.toUpperCase();
        }
        const catColor = mainCatColors[cat] || '#e0e0e0';
        btn.style.setProperty('--cat-color', catColor);
        if (store.get('currentMainFilter') === cat) btn.style.color = catColor;
        btn.addEventListener('click', () => selectMainCategory(cat));
        container.appendChild(btn);
        if (index < MAIN_CATEGORIES.length - 1) {
            const sep = document.createElement('span'); sep.className = 'filter-separator'; sep.textContent = '/'; container.appendChild(sep);
        }
    });
}

export function selectMainCategory(cat) {
    GolosinasTelemetry.trackCategoryFilter(cat);
    store.set('currentMainFilter', cat);
    store.set('currentCatalogoTag', 'todos');
    renderCatalogo();
}

export function setCatalogoTag(tag, category) {
    GolosinasTelemetry.trackTagFilter(tag, category);
    store.set('currentCatalogoTag', tag);
    const subContainer = document.getElementById('catalogo-sub-filters');
    if (subContainer) buildInlineSubcategories(subContainer, SUBCAT_MAP[category] || [], category);
    renderCatalogo();
}

// ── Render de Grids ──────────────────────────────────────────
export function renderCatalogo() {
    const grid = document.getElementById('grid-catalogo');
    catalogoCards = []; grid.innerHTML = '';
    let items = allData.filter(item => itemMatchesMainFilter(item, store.get('currentMainFilter')));
    if (store.get('currentCatalogoTag') !== 'todos') {
        items = items.filter(item => Array.isArray(item.tags) && item.tags.some(t => t.trim().toLowerCase() === store.get('currentCatalogoTag')));
    }
    items.forEach((item, i) => { const el = buildCard(item, i); grid.appendChild(el); catalogoCards.push(el); });
}

export function renderPortafolio() {
    const grid = document.getElementById('grid-portafolio');
    portafolioCards = []; grid.innerHTML = ''; grid.style.animation = 'none';
    let items = [...allData];
    if (store.get('currentPortafolioFilter') === 'random') {
        items.sort(() => Math.random() - 0.5);
    } else if (store.get('currentPortafolioFilter') === 'destacados') {
        const dest = items.filter(i => i.destacado);
        if (dest.length > 0) items = dest;
        items.sort((a, b) => (b.vistas || 0) - (a.vistas || 0));
    }
    let displayItems = [...items];
    while (displayItems.length < 12) displayItems = displayItems.concat(items);
    displayItems.forEach((item, i) => { const el = buildCompactCard(item, i); grid.appendChild(el); portafolioCards.push(el); });
    displayItems.forEach(item => { const el = buildCompactCard(item, 0); el.setAttribute('aria-hidden', 'true'); grid.appendChild(el); });
    requestAnimationFrame(() => { grid.style.animation = ''; });
}

window.setPortafolioFilter = function(filter) {
    store.set('currentPortafolioFilter', filter);
    renderPortafolio();
};

// ── Modal Móvil ──────────────────────────────────────────────
export function closeMobileModal() {
    const modal = document.getElementById('mobile-card-modal');
    if (modal) modal.classList.remove('is-open');
}

export function openMobileModal(item, sourceEl, playVideo) {
    let modal = document.getElementById('mobile-card-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mobile-card-modal';
        modal.innerHTML = '<div id="mcm-backdrop"></div><div id="mcm-card"></div>';
        document.body.appendChild(modal);
        document.getElementById('mcm-backdrop').addEventListener('click', closeMobileModal);
    }
    const slot = document.getElementById('mcm-card');
    slot.innerHTML = '';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'mcm-close'; closeBtn.textContent = '\u2715 cerrar';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeMobileModal(); });
    slot.appendChild(closeBtn);
    const card = buildCard(item, 0);
    card.style.opacity = '1'; card.style.animationDelay = '0s';
    card.addEventListener('click', (e) => {
        if (e.target.closest('.card-add-btn')) return;
        e.stopPropagation(); closeMobileModal(); playVideo(item.url_video, sourceEl);
    });
    slot.appendChild(card);
    modal.classList.add('is-open');
}

// ── LCD Display ──────────────────────────────────────────────
export function updateLcdDisplay(htmlContent) {
    const span1   = document.getElementById('lcd-text-1');
    const span2   = document.getElementById('lcd-text-2');
    const marquee = document.querySelector('.lcd-text-marquee');
    if (!span1 || !span2 || !marquee) return;
    marquee.classList.remove('lcd-marquee-anim');
    marquee.style.animation = 'none';
    const repeated = htmlContent + htmlContent + htmlContent;
    span1.innerHTML = repeated; span2.innerHTML = repeated;
    void marquee.offsetWidth;
    const duration = Math.max(25, span1.scrollWidth / 20);
    marquee.classList.add('lcd-marquee-anim');
    marquee.style.animation = `lcdScrollInfinite ${duration}s linear infinite`;
}
