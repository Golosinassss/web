// ══════════════════════════════════════════════════════════════
// GOLOSINASSSS — Archivo Vivo — Lógica Principal
// ══════════════════════════════════════════════════════════════

// ── Inyección del patrón del borde derecho ───────────────────
(function setupRightBorderPattern() {
    const starPalette = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff'];
    let paletteIdx = 0;

    function renderLine(line) {
        return line.split('').map(ch => {
            if (ch === '*') {
                const color = starPalette[paletteIdx % starPalette.length];
                paletteIdx++;
                return `<span style="color:${color}">${ch}</span>`;
            } else if (ch === '.') {
                return `<span style="color:#aaa">${ch}</span>`;
            }
            return ch === ' ' ? ' ' : ch;
        }).join('');
    }

    const patternLines = [
        " ........", "*........", "*..*****",  "*..",
        "*........", "*........", "*..****.. ", "*..   *..",
        "*........", "*........", "*******.. ", "      *..",
        " ........", "*........", "*..*****",  "*..",
        "*........", "*........", "*..****.. ", "*..   *..",
        "*........", "*........", "*******.. ", "      *..",
        " ........", "*........", "*..*****",  "*..",
        "*........", "*........", "*..****.. ", "*..   *..",
        "*........", "*........", "*******.. ", "      *..",
        " ........", "*........", "********"
    ];

    function buildBlock() {
        const div = document.createElement('div');
        div.className = 'ticker-logo-v';
        div.innerHTML = patternLines.map(line => `<span>${renderLine(line)}</span>`).join('\n');
        return div;
    }

    function inject() {
        const container = document.getElementById('right-marquee');
        if (!container) return;
        container.innerHTML = '';
        container.appendChild(buildBlock());
        container.appendChild(buildBlock());
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
let currentCatalogoTag      = 'todos';

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
        if (videoId) item.preview_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
}

// ── Tarjeta activa ───────────────────────────────────────────
function getAllCards() { return [...catalogoCards, ...portafolioCards]; }

function setActiveCard(index) {
    const all = getAllCards();
    all.forEach((wrapper, i) => {
        wrapper.classList.toggle('is-active', i === index);
        const inner = wrapper.querySelector('.card');
        if (inner) inner.classList.toggle('active-card', i === index);
    });
    if (all[index]) {
        all[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

// ── Reproducción ─────────────────────────────────────────────
function playVideo(url, element) {
    const videoId = getYouTubeId(url);
    if (!videoId) return;
    if (element) {
        const all = getAllCards();
        const idx = all.indexOf(element);
        if (idx !== -1) currentVideoIndex = idx;
    }
    setActiveCard(currentVideoIndex);
    loadVideoInPlayer(videoId, true);
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function playNext() {
    const all = getAllCards();
    if (all.length === 0) return;
    currentVideoIndex = (currentVideoIndex + 1) % all.length;
    all[currentVideoIndex].click();
}

// ── YouTube IFrame API ───────────────────────────────────────
function onYouTubeIframeAPIReady() {
    const first    = allData.find(i => i.destacado) || allData[0];
    const initialId = first ? getYouTubeId(first.url_video) : null;

    ytPlayer = new YT.Player('yt-player-container', {
        videoId: initialId || '',
        playerVars: { autoplay: 1, mute: 1, rel: 0, modestbranding: 1 },
        events: {
            onReady: function () {
                ytApiReady = true;
                if (pendingVideoId) { ytPlayer.loadVideoById(pendingVideoId); pendingVideoId = null; }
            },
            onStateChange: function (e) { if (e.data === 0) playNext(); }
        }
    });
}

// ── buildCard ────────────────────────────────────────────────
// showTags: false en Catálogo (tiene filtros), true en Archivo Vivo
function buildCard(item, animDelay, showTags) {
    ensureThumbnail(item);

    const previewHtml = item.preview_url
        ? `<div class="card-preview"><img src="${item.preview_url}" alt="${item.titulo}" loading="lazy"></div>`
        : `<div class="card-preview" style="background:#111;width:56px;height:56px;border:1px solid #1a1a1a;"></div>`;

    const color = palette[Math.floor(Math.random() * palette.length)];

    // Separar descripción de crédito por guión largo o doble guión
    const parts    = (item.descripcion || '').split(/\s*[-–—]\s*/);
    const mainDesc = parts[0] || '';
    const credit   = parts.slice(1).join(' — ');

    // Tags solo en Archivo Vivo
    let tagsHtml = '';
    if (showTags) {
        const itemTags = Array.isArray(item.tags) ? item.tags : [];
        if (itemTags.length) {
            const spans = itemTags.map(tag => {
                const norm = tag.trim().toLowerCase();
                const c    = tagColors[norm] || '#777';
                return `<span class="card-tag" style="color:${c};border-color:${c}33;background:${c}09">${norm}</span>`;
            }).join('');
            tagsHtml = `<div class="card-tags">${spans}</div>`;
        }
    }

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'card-wrapper';
    wrapperEl.setAttribute('aria-label', `Reproducir: ${item.titulo}`);
    wrapperEl.setAttribute('tabindex', '0');
    wrapperEl.style.animationDelay = `${animDelay * 0.05}s`;

    wrapperEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-category">${item.categoria || ''}</div>
                <div class="card-top-row">
                    <div class="card-left">
                        ${previewHtml}
                        <div class="play-btn" aria-hidden="true">
                            <svg viewBox="0 0 24 24" style="stroke:${color};fill:none;stroke-width:2;">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="card-title-block">
                        <h3>${item.titulo}</h3>
                    </div>
                </div>
            </div>
            <div class="card-detail">
                <p class="card-description">${mainDesc}</p>
                ${credit ? `<p class="card-credit">${credit}</p>` : ''}
            </div>
        </div>
        ${tagsHtml}`;

    wrapperEl.addEventListener('click',   () => playVideo(item.url_video, wrapperEl));
    wrapperEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playVideo(item.url_video, wrapperEl); }
    });

    return wrapperEl;
}

// ══════════════════════════════════════════════════════════════
// GOLOSINASSSS — Tabs en orden definido
// ══════════════════════════════════════════════════════════════
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

function buildCatalogoTabs(tags) {
    const container = document.getElementById('catalogo-tabs');
    container.innerHTML = '';

    const todosBtn = document.createElement('button');
    todosBtn.className = 'tab-btn active';
    todosBtn.textContent = 'TODAS';
    todosBtn.id = 'tag-todos';
    todosBtn.addEventListener('click', () => setCatalogoTag('todos'));
    container.appendChild(todosBtn);

    tags.forEach(tag => {
        const sep = document.createElement('span');
        sep.style.color = '#333'; sep.textContent = '/';
        container.appendChild(sep);

        const btn   = document.createElement('button');
        btn.className   = 'tab-btn';
        btn.textContent = tag.toUpperCase();
        btn.id = `tag-${tag.replace(/\s+/g, '-')}`;
        const c = tagColors[tag] || '#bae1ff';
        btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('active')) btn.style.color = c + '99'; });
        btn.addEventListener('mouseleave', () => { if (!btn.classList.contains('active')) btn.style.color = ''; });
        btn.addEventListener('click', () => setCatalogoTag(tag));
        container.appendChild(btn);
    });
}

function setCatalogoTag(tag) {
    currentCatalogoTag = tag;
    document.getElementById('catalogo-tabs').querySelectorAll('.tab-btn').forEach(btn => {
        const active = (tag === 'todos' && btn.id === 'tag-todos') ||
                       btn.id === `tag-${tag.replace(/\s+/g, '-')}`;
        btn.classList.toggle('active', active);
        btn.style.color = active && tag !== 'todos' ? (tagColors[tag] || '#bae1ff') : '';
    });
    renderCatalogo();
}

function renderCatalogo() {
    const grid = document.getElementById('grid-catalogo');
    catalogoCards = []; grid.innerHTML = '';

    let items = [...allData];
    if (currentCatalogoTag !== 'todos') {
        items = items.filter(item =>
            Array.isArray(item.tags) &&
            item.tags.some(t => t.trim().toLowerCase() === currentCatalogoTag)
        );
    }
    items.forEach((item, i) => {
        const el = buildCard(item, i, false);  // sin tags
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
    }

    // Original
    items.forEach((item, i) => {
        const el = buildCard(item, i, true);  // con tags
        grid.appendChild(el);
        portafolioCards.push(el);
    });
    // Clon para loop sin corte
    items.forEach((item) => {
        const el = buildCard(item, 0, true);
        el.setAttribute('aria-hidden', 'true');
        el.style.animationDelay = '0s';
        el.style.opacity = '1';
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
    .then(data => { allData = data; initApp(); })
    .catch(err => { console.warn('No se pudo cargar datos:', err.message); allData = []; initApp(); });

function initApp() {
    allData.forEach(item => ensureThumbnail(item));
    const tags = extractUniqueTags(allData);
    buildCatalogoTabs(tags);
    renderCatalogo();
    renderPortafolio();
    currentVideoIndex = -1;
}
