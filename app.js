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

// ── Logo ASCII Art ───────────────────────────────────────────
(function setupAsciiLogo() {
    fetch('logo-ascii.json')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(lines => {
            const container = document.getElementById('logo-ascii-text');
            if (container) {
                container.textContent = lines.join('\n');
            }
        })
        .catch(() => console.warn("No se pudo cargar el logo ASCII geométrico."));
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
    'documental': ['social', 'periodismo', 'conciertos', 'cine', 'institucional', 'sonido infinito'],
    'música':     ['conciertos', 'cine', 'sesiones musicales', 'videoclips', 'sonido infinito'],
    'animación':  ['animación', 'animación 2d', 'motion graphics', '3d'],
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

    wrapperEl.addEventListener('click',   () => playVideo(item.url_video, wrapperEl));
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

    const leftBracket = document.createElement('span');
    leftBracket.style.color = '#333'; leftBracket.textContent = '[';
    container.appendChild(leftBracket);

    const todosBtn = document.createElement('button');
    todosBtn.className = `tab-btn ${currentCatalogoTag === 'todos' ? 'active' : ''}`;
    todosBtn.textContent = 'TODAS';
    todosBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCatalogoTag('todos', category);
    });
    container.appendChild(todosBtn);

    tags.forEach(tag => {
        const sep = document.createElement('span');
        sep.style.color = '#222'; sep.textContent = '|';
        container.appendChild(sep);

        const btn = document.createElement('button');
        btn.className = `tab-btn ${currentCatalogoTag === tag ? 'active' : ''}`;
        btn.textContent = tag.toUpperCase();
        const color = tagColors[tag] || '#bae1ff';
        btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('active')) btn.style.color = color + '99'; });
        btn.addEventListener('mouseleave', () => { if (!btn.classList.contains('active')) btn.style.color = ''; });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCatalogoTag(tag, category);
        });
        container.appendChild(btn);
    });

    const rightBracket = document.createElement('span');
    rightBracket.style.color = '#333'; rightBracket.textContent = ']';
    container.appendChild(rightBracket);
}

// ── Constructor de Categorías Principales ────────────────────
function buildCatalogoMainFilters() {
    const container = document.getElementById('catalogo-main-filters');
    if (!container) return;
    container.innerHTML = '';

    MAIN_CATEGORIES.forEach((cat, index) => {
        const group = document.createElement('div');
        group.className = 'category-group';
        group.id = `group-${cat}`;

        const btn = document.createElement('button');
        btn.className = `filter-btn main-cat-btn${currentMainFilter === cat ? ' active' : ''}`;
        btn.textContent = cat.toUpperCase();
        const catColor = mainCatColors[cat] || '#e0e0e0';
        btn.style.setProperty('--cat-color', catColor);
        if (currentMainFilter === cat) btn.style.color = catColor;
        btn.addEventListener('click', () => selectMainCategory(cat));
        group.appendChild(btn);

        if (cat !== 'todas') {
            const subContainer = document.createElement('div');
            subContainer.className = 'subcategories-inline';
            subContainer.id = `sub-inline-${cat}`;
            group.appendChild(subContainer);
        }

        container.appendChild(group);

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
        const isCurrent = btn.textContent.trim().toLowerCase() === cat;
        btn.classList.toggle('active', isCurrent);
        const c = mainCatColors[btn.textContent.trim().toLowerCase()] || '#e0e0e0';
        btn.style.color = isCurrent ? c : '';
    });

    MAIN_CATEGORIES.forEach(c => {
        const group = document.getElementById(`group-${c}`);
        if (!group) return;
        const subContainer = document.getElementById(`sub-inline-${c}`);

        if (c === cat && cat !== 'todas') {
            group.classList.add('expanded');
            if (subContainer) {
                // Usar subcategorías del mapa fijo, no derivadas dinámicamente
                const subcats = SUBCAT_MAP[c] || [];
                buildInlineSubcategories(subContainer, subcats, c);
            }
        } else {
            group.classList.remove('expanded');
            if (subContainer) subContainer.innerHTML = '';
        }
    });

    renderCatalogo();
}

function setCatalogoTag(tag, category) {
    currentCatalogoTag = tag;
    const subContainer = document.getElementById(`sub-inline-${category}`);
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

// ══════════════════════════════════════════════════════════════
// ARCHIVO VIVO — scroll infinito automático
// ══════════════════════════════════════════════════════════════
function setPortafolioFilter(filter) {
    currentPortafolioFilter = filter;
    ['recientes', 'destacados', 'random'].forEach(f =>
        document.getElementById('f-' + f).classList.toggle('active', f === filter)
    );
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

// ══════════════════════════════════════════════════════════════
// SIMULADOR LYLI-GO T-DISPLAY S3 & REPRODUCTOR TUCUNARÉ
// ══════════════════════════════════════════════════════════════
(function setupLilyGoSimulator() {
    let currentLogoMode = 'ascii'; // 'ascii' o 'lcd'
    let lcdLoopActive = false;
    let lcdAnimFrameId = null;
    let screenMode = 'tucunare'; // 'tucunare', 'logo', 'off'

    let screenVideo = null;
    let screenCanvas = null;
    let screenCtx = null;
    
    let logoImg = null;
    let logoImgLoaded = false;
    let glitchActive = 0;
    let bootTime = 0;
    
    // Lista de mensajes de código para el fondo del logo
    const debugMessages = [
        "Initializing ESP32-S3...",
        "TFT_eSPI Library v2.5.0",
        "Display width: 320, height: 170",
        "SPI Speed: 40MHz",
        "Loading binary contents...",
        "tucu_frames.bin mounted",
        "VGA Buffer: OK",
        "CPU Temp: 42 C",
        "FPS: 15.4",
        "WiFi Status: Connected",
        "IP: 192.168.1.45"
    ];
    let debugLines = [];

    function init() {
        screenCanvas = document.getElementById('lilygo-screen');
        if (!screenCanvas) return;
        screenCtx = screenCanvas.getContext('2d');

        // 1. Crear elemento de video invisible para Tucunaré
        screenVideo = document.createElement('video');
        screenVideo.src = 'tucu.mp4';
        screenVideo.loop = true;
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        screenVideo.style.display = 'none';
        document.body.appendChild(screenVideo);

        // Pre-cargar video
        screenVideo.load();

        // 2. Cargar imagen del logo
        logoImg = new Image();
        logoImg.src = 'logo-golosinassss.png';
        logoImg.onload = () => {
            logoImgLoaded = true;
        };

        // 3. Vincular eventos de botones de la placa
        const btnTop = document.getElementById('board-btn-top');
        const btnBottom = document.getElementById('board-btn-bottom');

        if (btnTop) {
            btnTop.addEventListener('click', (e) => {
                e.stopPropagation();
                cycleMode();
            });
        }
        if (btnBottom) {
            btnBottom.addEventListener('click', (e) => {
                e.stopPropagation();
                restartMode();
            });
        }

        // Registrar función global para cambiar de vista
        window.setLogoMode = function(mode) {
            currentLogoMode = mode;
            const asciiWrap = document.getElementById('logo-ascii-wrap');
            const boardWrap = document.getElementById('logo-board-wrap');
            const btnAscii = document.getElementById('btn-view-ascii');
            const btnLcd = document.getElementById('btn-view-lcd');

            if (mode === 'ascii') {
                if (asciiWrap) asciiWrap.style.display = 'block';
                if (boardWrap) boardWrap.style.display = 'none';
                if (btnAscii) btnAscii.classList.add('active');
                if (btnLcd) btnLcd.classList.remove('active');
                stopLcdLoop();
            } else {
                if (asciiWrap) asciiWrap.style.display = 'none';
                if (boardWrap) boardWrap.style.display = 'flex';
                if (btnAscii) btnAscii.classList.remove('active');
                if (btnLcd) btnLcd.classList.add('active');
                startLcdLoop();
            }
        };
    }

    function startLcdLoop() {
        if (lcdLoopActive) return;
        lcdLoopActive = true;
        if (screenMode === 'tucunare' && screenVideo) {
            screenVideo.play().catch(() => {});
        }
        bootTime = 0;
        debugLines = [];
        lcdLoop();
    }

    function stopLcdLoop() {
        lcdLoopActive = false;
        if (lcdAnimFrameId) {
            cancelAnimationFrame(lcdAnimFrameId);
            lcdAnimFrameId = null;
        }
        if (screenVideo) {
            screenVideo.pause();
        }
    }

    function cycleMode() {
        if (screenMode === 'tucunare') {
            screenMode = 'logo';
            if (screenVideo) screenVideo.pause();
            bootTime = 0;
            debugLines = [];
        } else if (screenMode === 'logo') {
            screenMode = 'off';
            if (screenVideo) screenVideo.pause();
        } else {
            screenMode = 'tucunare';
            if (lcdLoopActive && screenVideo) {
                screenVideo.play().catch(() => {});
            }
        }
        triggerGlitch();
    }

    function restartMode() {
        triggerGlitch();
        if (screenMode === 'tucunare' && screenVideo) {
            screenVideo.currentTime = 0;
            screenVideo.play().catch(() => {});
        } else if (screenMode === 'logo') {
            bootTime = 0;
            debugLines = [];
        }
    }

    function triggerGlitch() {
        glitchActive = 12; // Número de frames con interferencia
    }

    function drawNoise() {
        const imgData = screenCtx.getImageData(0, 0, 320, 170);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 80;
            data[i] = Math.min(255, data[i] + noise);     // R
            data[i+1] = Math.min(255, data[i+1] + noise); // G
            data[i+2] = Math.min(255, data[i+2] + noise); // B
        }
        screenCtx.putImageData(imgData, 0, 0);
    }

    function lcdLoop() {
        if (!lcdLoopActive) return;

        // Renderizado básico por modo
        if (screenMode === 'off') {
            screenCtx.fillStyle = '#050505';
            screenCtx.fillRect(0, 0, 320, 170);
        } else if (screenMode === 'tucunare') {
            // Verificar si el video está listo
            if (screenVideo && screenVideo.readyState >= 2) {
                screenCtx.drawImage(screenVideo, 0, 0, 320, 170);
            } else {
                // Pantalla de carga estilo terminal
                screenCtx.fillStyle = '#080808';
                screenCtx.fillRect(0, 0, 320, 170);
                screenCtx.fillStyle = '#bae1ff';
                screenCtx.font = '10px "JetBrains Mono", monospace';
                screenCtx.fillText("CARGANDO ANIMACIÓN...", 20, 85);
            }
        } else if (screenMode === 'logo') {
            // Modo Logotipo digital
            screenCtx.fillStyle = '#060a0d';
            screenCtx.fillRect(0, 0, 320, 170);

            bootTime++;

            // Generar código de depuración que corre en el fondo
            if (bootTime % 15 === 0 && debugLines.length < 9) {
                const nextMsg = debugMessages[Math.floor(Math.random() * debugMessages.length)];
                debugLines.push(`> ${nextMsg}`);
            }
            if (debugLines.length > 8) {
                debugLines.shift();
            }

            // Dibujar consola de fondo
            screenCtx.font = '7px "JetBrains Mono", monospace';
            screenCtx.fillStyle = 'rgba(186, 225, 255, 0.2)';
            debugLines.forEach((line, index) => {
                screenCtx.fillText(line, 15, 20 + index * 10);
            });

            // Dibujar el logo centrado
            if (logoImgLoaded) {
                // Dibujar el logo con gradiente animado en canvas
                const wLogo = 220;
                const hLogo = 220 * (logoImg.height / logoImg.width);
                const xLogo = (320 - wLogo) / 2;
                const yLogo = (170 - hLogo) / 2;

                screenCtx.save();
                // Renderizar máscara del logo con color verde/azul neón
                screenCtx.drawImage(logoImg, xLogo, yLogo, wLogo, hLogo);
                screenCtx.globalCompositeOperation = 'source-in';
                
                const grad = screenCtx.createLinearGradient(0, 0, 320, 0);
                const t = Date.now() * 0.002;
                const c1 = `hsl(${(t * 40) % 360}, 100%, 75%)`;
                const c2 = `hsl(${(t * 40 + 60) % 360}, 100%, 70%)`;
                grad.addColorStop(0, c1);
                grad.addColorStop(1, c2);
                screenCtx.fillStyle = grad;
                screenCtx.fillRect(0, 0, 320, 170);
                screenCtx.restore();
            } else {
                screenCtx.fillStyle = '#ffb3ba';
                screenCtx.font = '10px "JetBrains Mono", monospace';
                screenCtx.fillText("GOLOSINASSSS", 100, 85);
            }
        }

        // Aplicar efecto de glitch si está activo
        if (glitchActive > 0) {
            glitchActive--;
            // Desplazamiento horizontal aleatorio de tiras de pantalla
            if (Math.random() > 0.3) {
                const y = Math.random() * 140;
                const h = Math.random() * 30 + 10;
                const offset = (Math.random() - 0.5) * 30;
                screenCtx.drawImage(screenCanvas, 0, y, 320, h, offset, y, 320, h);
            }
            // Líneas horizontales de estática
            if (Math.random() > 0.4) {
                screenCtx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#00e5ff';
                screenCtx.fillRect(0, Math.random() * 170, 320, 1.5);
            }
            drawNoise();
        }

        // sutil estática general
        if (screenMode !== 'off' && Math.random() > 0.95) {
            screenCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            screenCtx.fillRect(0, Math.random() * 170, 320, 1);
        }

        lcdAnimFrameId = requestAnimationFrame(lcdLoop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
