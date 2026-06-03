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

    // Desbloqueo forzado de audio para políticas móviles ante interacción
    if (ytPlayer) {
        if (typeof ytPlayer.unMute === 'function') {
            ytPlayer.unMute();
        }
        if (typeof ytPlayer.setVolume === 'function') {
            ytPlayer.setVolume(100);
        }
    }

    if (element) {
        const all = getAllCards();
        const idx = all.indexOf(element);
        if (idx !== -1) currentVideoIndex = idx;
    }

    setActiveCardByUrl(url);
    loadVideoInPlayer(videoId, true);
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function playNext() {
    const all = getAllCards();
    if (all.length === 0) return;
    currentVideoIndex = (currentVideoIndex + 1) % all.length;
    
    const nextCard = all[currentVideoIndex];
    if (nextCard) {
        const url = nextCard.getAttribute('data-url');
        if (url) playVideo(url, nextCard);
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
            playsinline: 1 /* Impide pantalla completa nativa forzada en móviles */
        },
        events: {
            onReady: function () {
                ytApiReady = true;
                if (pendingVideoId) { ytPlayer.loadVideoById(pendingVideoId); pendingVideoId = null; }
            },
            onStateChange: function (e) { if (e.data === 0) playNext(); }
        }
    });
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

    wrapperEl.innerHTML = `
        <div class="card">
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

    wrapperEl.addEventListener('click',   () => playVideo(item.url_video, wrapperEl));
    wrapperEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playVideo(item.url_video, wrapperEl); }
    });

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

    wrapperEl.addEventListener('click', () => {
        if (window.matchMedia('(hover: none)').matches) {
            openMobileModal(item, wrapperEl);
        } else {
            playVideo(item.url_video, wrapperEl);
        }
    });
    wrapperEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playVideo(item.url_video, wrapperEl); }
    });

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
            subContainer.style.display = 'flex';
            buildInlineSubcategories(subContainer, subcats, cat);
        } else {
            subContainer.style.display = 'none';
            subContainer.innerHTML = '';
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

    // Clonar la tarjeta completa sin listeners nativos
    const rawCard = buildCard(item, 0);
    const card = rawCard.cloneNode(true);
    card.style.opacity = '1';
    card.style.animationDelay = '0s';

    // Tap en la tarjeta = reproducir + cerrar modal
    card.addEventListener('click', (e) => {
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


