// ══════════════════════════════════════════════════════════════
// GOLOSINASSSS — Archivo Vivo — Lógica Principal
// ══════════════════════════════════════════════════════════════

// ── Inyección del patrón del borde derecho ───────────────────
// * = color de paleta rotando, . = #aaa brillante, espacios = transparentes
(function setupRightBorderPattern() {
    const starPalette = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff'];
    let paletteIdx = 0;

    // Convierte una línea de texto en HTML con spans de color por carácter
    function renderLine(line) {
        return line.split('').map(ch => {
            if (ch === '*') {
                const color = starPalette[paletteIdx % starPalette.length];
                paletteIdx++;
                return `<span style="color:${color}">${ch}</span>`;
            } else if (ch === '.') {
                return `<span style="color:#aaa">${ch}</span>`;
            } else {
                // espacios y cualquier otro carácter
                return ch;
            }
        }).join('');
    }

    // Patrón exacto del txt (39 líneas = 3 ciclos del motivo + cierre)
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

    const marqueeContainer = document.getElementById('right-marquee');
    if (marqueeContainer) {
        marqueeContainer.innerHTML = '';
        marqueeContainer.appendChild(buildBlock());
        marqueeContainer.appendChild(buildBlock());
    }
})();

// ── Estado Global ────────────────────────────────────────────
let ytPlayer = null;
let portafolioCards = [];
let catalogoCards = [];
let currentVideoIndex = -1;
let ytApiReady = false;
let pendingVideoId = null;

let allData = [];
let currentPortafolioFilter = 'recientes';
let currentCatalogoTag = 'todos';

const palette = ['#ffb3ba', '#bae1ff', '#baffc9', '#ffffba', '#ffdfba'];

// Mapa de colores de tags
const tagColors = {
    'social':              '#ffb3ba',
    'institucional':       '#bae1ff',
    'comercial':           '#baffc9',
    'cine':                '#ffdfba',
    'videoclips':          '#ffb3ba',
    'sesiones':            '#ffffba',
    'sesiones musicales':  '#ffffba',
    'conciertos':          '#baffc9',
    'documental':          '#bae1ff',
    'a mano':              '#ffb3ba',
    'animación 2d':        '#ffb3ba',
    'animación':           '#ffb3ba',
    'motion graphics':     '#bae1ff',
    '3d':                  '#baffc9',
    'coding animation':    '#ffffba',
    'periodismo':          '#ffdfba',
    'música':              '#ffffba',
    'sonido infinito':     '#baffc9',
};

// ── Helpers YouTube ──────────────────────────────────────────
function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadVideoInPlayer(videoId, autoplay) {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
        pendingVideoId = videoId;
        return;
    }
    if (autoplay) { ytPlayer.loadVideoById(videoId); }
    else          { ytPlayer.cueVideoById(videoId); }
}

// ── Auto-Thumbnail ───────────────────────────────────────────
function ensureThumbnail(item) {
    if (!item.preview_url && item.tipo === 'youtube') {
        const videoId = getYouTubeId(item.url_video);
        if (videoId) {
            item.preview_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
    }
}

// ── Tarjeta activa ───────────────────────────────────────────
function getAllCards() {
    return [...catalogoCards, ...portafolioCards];
}

function setActiveCard(index) {
    const all = getAllCards();
    all.forEach((wrapper, i) => {
        const innerCard = wrapper.querySelector('.card');
        if (innerCard) innerCard.classList.toggle('active-card', i === index);
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
    // Buscar el primer destacado como video inicial
    const firstFeatured = allData.find(i => i.destacado) || allData[0];
    const initialId = firstFeatured ? getYouTubeId(firstFeatured.url_video) : null;

    ytPlayer = new YT.Player('yt-player-container', {
        videoId: initialId || '',
        playerVars: { autoplay: 1, mute: 1, rel: 0, modestbranding: 1 },
        events: {
            onReady: function () {
                ytApiReady = true;
                if (pendingVideoId) {
                    ytPlayer.loadVideoById(pendingVideoId);
                    pendingVideoId = null;
                }
            },
            onStateChange: function (e) {
                if (e.data === 0) playNext();
            }
        }
    });
}

// ── buildCard ────────────────────────────────────────────────
function buildCard(item, animDelay) {
    ensureThumbnail(item);

    const previewHtml = item.preview_url
        ? `<div class="card-preview"><img src="${item.preview_url}" alt="${item.titulo}" loading="lazy"></div>`
        : '';
    const metaHtml = (item.categoria || item.date)
        ? `<div class="card-meta">${item.categoria ? item.categoria.toUpperCase() : ''}${item.categoria && item.date ? ' | ' : ''}${item.date || ''}</div>`
        : '';
    const color = palette[Math.floor(Math.random() * palette.length)];

    let itemTags = [];
    if (Array.isArray(item.tags)) itemTags = item.tags;
    else if (item.formato) itemTags = [item.formato];

    let tagsHtml = '';
    if (itemTags.length > 0) {
        const tagSpans = itemTags.map(tag => {
            const normTag = tag.trim().toLowerCase();
            const c = tagColors[normTag] || '#777777';
            return `<span class="card-tag" style="color:${c}; border-color:${c}33; background:${c}09">${normTag}</span>`;
        }).join('');
        tagsHtml = `<div class="card-tags">${tagSpans}</div>`;
    }

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'card-wrapper';
    wrapperEl.setAttribute('aria-label', `Reproducir: ${item.titulo}`);
    wrapperEl.setAttribute('tabindex', '0');
    wrapperEl.style.animationDelay = `${animDelay * 0.06}s`;

    wrapperEl.innerHTML = `
        <div class="card">
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
                    ${metaHtml}
                    <h3>${item.titulo}</h3>
                    <p>${item.descripcion}</p>
                </div>
            </div>
        </div>
        ${tagsHtml}`;

    wrapperEl.addEventListener('click', () => playVideo(item.url_video, wrapperEl));
    wrapperEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playVideo(item.url_video, wrapperEl);
        }
    });

    return wrapperEl;
}

// ══════════════════════════════════════════════════════════════
// CATÁLOGO — Tabs dinámicos basados en tags
// ══════════════════════════════════════════════════════════════

function extractUniqueTags(data) {
    const tagSet = new Set();
    data.forEach(item => {
        if (Array.isArray(item.tags)) {
            item.tags.forEach(t => tagSet.add(t.trim().toLowerCase()));
        }
    });
    // Ordenar alfabéticamente pero con las más frecuentes primero
    const tagCount = {};
    data.forEach(item => {
        if (Array.isArray(item.tags)) {
            item.tags.forEach(t => {
                const norm = t.trim().toLowerCase();
                tagCount[norm] = (tagCount[norm] || 0) + 1;
            });
        }
    });
    return [...tagSet].sort((a, b) => (tagCount[b] || 0) - (tagCount[a] || 0));
}

function buildCatalogoTabs(tags) {
    const container = document.getElementById('catalogo-tabs');
    container.innerHTML = '';

    // Botón TODOS
    const todosBtn = document.createElement('button');
    todosBtn.className = 'tab-btn active';
    todosBtn.textContent = 'TODOS';
    todosBtn.addEventListener('click', () => setCatalogoTag('todos'));
    todosBtn.id = 'tag-todos';
    container.appendChild(todosBtn);

    // Un botón por cada tag
    tags.forEach(tag => {
        const sep = document.createElement('span');
        sep.style.color = '#333';
        sep.textContent = '/';
        container.appendChild(sep);

        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.textContent = tag.toUpperCase();
        btn.id = `tag-${tag.replace(/\s+/g, '-')}`;
        const color = tagColors[tag] || '#bae1ff';
        btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('active')) btn.style.color = color + '99'; });
        btn.addEventListener('mouseleave', () => { if (!btn.classList.contains('active')) btn.style.color = ''; });
        btn.addEventListener('click', () => setCatalogoTag(tag));
        container.appendChild(btn);
    });
}

function setCatalogoTag(tag) {
    currentCatalogoTag = tag;
    // Actualizar estado visual de tabs
    const container = document.getElementById('catalogo-tabs');
    container.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = (tag === 'todos' && btn.id === 'tag-todos') ||
                         btn.id === `tag-${tag.replace(/\s+/g, '-')}`;
        btn.classList.toggle('active', isActive);
        if (isActive) {
            const color = tagColors[tag] || '#bae1ff';
            btn.style.color = tag === 'todos' ? '' : color;
        } else {
            btn.style.color = '';
        }
    });
    renderCatalogo();
}

function renderCatalogo() {
    const grid = document.getElementById('grid-catalogo');
    catalogoCards = [];
    grid.innerHTML = '';

    let items = [...allData];
    if (currentCatalogoTag !== 'todos') {
        items = items.filter(item =>
            Array.isArray(item.tags) &&
            item.tags.some(t => t.trim().toLowerCase() === currentCatalogoTag)
        );
    }

    items.forEach((item, i) => {
        const wrapperEl = buildCard(item, i);
        grid.appendChild(wrapperEl);
        catalogoCards.push(wrapperEl);
    });
}

// ══════════════════════════════════════════════════════════════
// ARCHIVO VIVO — Filtros de portafolio
// ══════════════════════════════════════════════════════════════

function setPortafolioFilter(filter) {
    currentPortafolioFilter = filter;
    ['recientes', 'destacados', 'random'].forEach(f => {
        document.getElementById('f-' + f).classList.toggle('active', f === filter);
    });
    renderPortafolio();
}

function renderPortafolio() {
    const grid = document.getElementById('grid-portafolio');
    portafolioCards = [];
    grid.innerHTML = '';

    let items = [...allData];
    if (currentPortafolioFilter === 'random') {
        items = items.sort(() => Math.random() - 0.5);
    } else if (currentPortafolioFilter === 'destacados') {
        const dest = items.filter(i => i.destacado);
        if (dest.length > 0) items = dest;
    }

    items.forEach((item, i) => {
        const wrapperEl = buildCard(item, i);
        grid.appendChild(wrapperEl);
        portafolioCards.push(wrapperEl);
    });
}

// ── Exponer funciones para los botones inline ────────────────
window.setPortafolioFilter = setPortafolioFilter;

// ══════════════════════════════════════════════════════════════
// CARGA DE DATOS
// ══════════════════════════════════════════════════════════════

fetch('contenidos.json')
    .then(r => { if (!r.ok) throw new Error('contenidos.json'); return r.json(); })
    .then(data => {
        allData = data;
        initApp();
    })
    .catch(err => {
        console.warn('No se pudo cargar contenidos.json:', err.message);
        allData = [];
        initApp();
    });

function initApp() {
    // Generar thumbnails automáticos
    allData.forEach(item => ensureThumbnail(item));

    // Generar tabs dinámicos del catálogo
    const tags = extractUniqueTags(allData);
    buildCatalogoTabs(tags);

    // Render ambas secciones
    renderCatalogo();
    renderPortafolio();
    currentVideoIndex = -1;
}
