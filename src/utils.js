// ══════════════════════════════════════════════════════════════
// utils.js — Helpers reutilizables (YouTube, tiempo, descripción)
// ══════════════════════════════════════════════════════════════
import { MAIN_CATEGORIES, SUBCAT_MAP, mainCatColors, tagColors, palette } from './constants.js';

// ── YouTube ──────────────────────────────────────────────────
export function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|u\/\w\/|shorts\/))([^#&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

export function ensureThumbnail(item) {
    if (!item.preview_url && (item.tipo || '').toLowerCase() === 'youtube') {
        const videoId = getYouTubeId(item.url_video);
        if (videoId) item.preview_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
}

// ── Tiempo ───────────────────────────────────────────────────
export function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ── Descripción ──────────────────────────────────────────────
export function getParsedDesc(desc) {
    if (!desc) return { mainDesc: '', credit: '' };
    const idx = desc.lastIndexOf(' - ');
    if (idx !== -1) {
        return { mainDesc: desc.substring(0, idx).trim(), credit: desc.substring(idx + 3).trim() };
    }
    return { mainDesc: desc.trim(), credit: '' };
}

// ── Filtros ──────────────────────────────────────────────────
export function itemMatchesMainFilter(item, filter) {
    if (filter === 'todas') return true;
    const category = (item.categoria || '').toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];

    if (filter === 'documental') {
        return category.includes('documental') || category.includes('periodismo') ||
               tags.includes('cine') || tags.includes('periodismo') ||
               tags.includes('documental') || tags.includes('social') || tags.includes('institucional');
    }
    if (filter === 'música' || filter === 'musica') {
        return category.includes('música') || category.includes('musica') ||
               category.includes('conciertos') || category.includes('sesiones') ||
               tags.includes('música') || tags.includes('musica') ||
               tags.includes('conciertos') || tags.includes('sonido infinito') ||
               tags.includes('videoclips') || tags.includes('sesiones musicales') ||
               tags.includes('amplificado.tv') || tags.includes('dub de gaita');
    }
    if (filter === 'animación' || filter === 'animacion') {
        return category.includes('animación') || category.includes('animacion') ||
               tags.some(t => t.includes('animac') || t.includes('graphics') || t.includes('3d') || t.includes('dibujo'));
    }
    if (filter === 'deportes') {
        return category.includes('deportes') || tags.includes('deportes') ||
               tags.includes('fútbol') || tags.includes('futbol');
    }
    return false;
}

// ── Tags únicos ──────────────────────────────────────────────
import { TAG_ORDER } from './constants.js';
export function extractUniqueTags(data) {
    const tagSet = new Set();
    data.forEach(item => { if (Array.isArray(item.tags)) item.tags.forEach(t => tagSet.add(t.trim().toLowerCase())); });
    return [...tagSet].sort((a, b) => {
        const ia = TAG_ORDER.indexOf(a), ib = TAG_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1; if (ib === -1) return -1;
        return ia - ib;
    });
}

// ── Construcción de tarjeta HTML ─────────────────────────────
export function buildCardHTML(item) {
    const { mainDesc, credit } = getParsedDesc(item.descripcion);
    const color = palette[Math.floor(Math.random() * palette.length)];
    const previewHtml = item.preview_url
        ? `<div class="card-preview"><img src="${item.preview_url}" alt="${item.titulo}" class="preview-img" loading="lazy"></div>`
        : `<div class="card-preview"></div>`;
    const metaHtml = (item.categoria || item.date)
        ? `<div class="card-meta">${item.categoria ? item.categoria.toUpperCase() : ''}${item.categoria && item.date ? ' | ' : ''}${item.date || ''}</div>`
        : '';
    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    const tagsHtml = itemTags.length
        ? `<div class="card-tags">${itemTags.map(tag => {
              const norm = tag.trim().toLowerCase();
              const c = tagColors[norm] || '#777777';
              return `<span class="card-tag" style="color:${c};border-color:${c}33;background:${c}09">${norm}</span>`;
          }).join('')}</div>`
        : '';

    return { previewHtml, metaHtml, tagsHtml, mainDesc, credit, color };
}
