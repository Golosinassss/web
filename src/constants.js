// ══════════════════════════════════════════════════════════════
// constants.js — Configuración de Datos Estáticos (Colores, Categorías, SVGs)
// ══════════════════════════════════════════════════════════════

export const palette = ['#ffb3ba', '#bae1ff', '#baffc9', '#ffffba', '#ffdfba'];

export const tagColors = {
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

export const TAG_ORDER = [
    'social', 'periodismo', 'conciertos', 'cine',
    'música', 'animación', 'sesiones musicales',
    'videoclips', 'institucional', 'sonido infinito',
];

export const MAIN_CATEGORIES = ['todas', 'documental', 'música', 'animación', 'deportes'];

export const mainCatColors = {
    'todas':      '#e0e0e0',
    'documental': '#ffb3ba',
    'música':     '#bae1ff',
    'animación':  '#baffc9',
    'deportes':   '#ffffba',
};

export const SUBCAT_MAP = {
    'documental': ['social', 'periodismo', 'cine', 'institucional'],
    'música':     ['conciertos', 'sesiones musicales', 'videoclips', 'sonido infinito', 'amplificado.tv', 'dub de gaita'],
    'animación':  [],
    'deportes':   ['fútbol', 'deportes'],
};

// ── Iconos SVG ───────────────────────────────────────────────
export const SPEAKER_SVG = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

export const SPEAKER_MUTED_SVG = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

export const PLAY_SVG = `<svg class="svg-icon" viewBox="0 0 24 24" fill="url(#tornasol-grad)" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

export const PAUSE_SVG = `<svg class="svg-icon" viewBox="0 0 24 24" fill="url(#tornasol-grad)" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

export const FULLSCREEN_SVG = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;

export const FULLSCREEN_EXIT_SVG = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="url(#tornasol-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/></svg>`;

export const ARROW_UP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

export const ARROW_DOWN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

// ── viewsMap (simulación de vistas para "destacados") ────────
export const viewsMap = {
    "1": 45000, "2": 15000, "5": 38000, "6": 8200,
    "7": 24000, "8": 11500, "9": 19000, "10": 9800,
    "11": 12500, "12": 31000, "13": 29000
};

// ── Google Sheets CMS ────────────────────────────────────────
export const SHEET_ID = '1-NpQprddYp2vYyl4kRxLO-i_LJbF06MYEf9zaC1s880';
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1`;
export const SHEET_URL_EPISODES = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=amplificado.tv`;
