// ══════════════════════════════════════════════════════════════
// telemetry.js — Telemetría y Analíticas Internas (GolosinasTelemetry)
// ══════════════════════════════════════════════════════════════

export const GolosinasTelemetry = {
    currentVideo: {
        id: null,
        title: null,
        category: null,
        milestones: { p25: false, p50: false, p75: false }
    },

    logEvent(eventName, eventData = {}) {
        const payload = {
            event: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            referrer: document.referrer || 'direct'
        };

        try {
            const history = JSON.parse(localStorage.getItem('golosinas_telemetry') || '[]');
            history.unshift(payload);
            if (history.length > 100) history.pop();
            localStorage.setItem('golosinas_telemetry', JSON.stringify(history));
        } catch (e) {
            console.warn('Telemetry: local storage is full or disabled', e);
        }

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`%c[Telemetry] ${eventName}`, 'color: #00e5ff; font-weight: bold;', eventData);
        }
    },

    trackVideoStart(videoId, title, category) {
        this.currentVideo = { id: videoId, title, category, milestones: { p25: false, p50: false, p75: false } };
        this.logEvent('video_start', { videoId, title, category });
    },

    trackVideoPause(currentTime) {
        if (!this.currentVideo.id) return;
        this.logEvent('video_pause', {
            videoId: this.currentVideo.id,
            title: this.currentVideo.title,
            currentTime: Math.round(currentTime)
        });
    },

    trackVideoEnd() {
        if (!this.currentVideo.id) return;
        this.logEvent('video_end', { videoId: this.currentVideo.id, title: this.currentVideo.title });
        this.currentVideo.id = null;
    },

    trackVideoProgress(currentTime, duration) {
        if (!this.currentVideo.id || duration <= 0) return;
        const pct = (currentTime / duration) * 100;
        let milestone = null;
        if      (pct >= 25 && !this.currentVideo.milestones.p25) { milestone = '25%'; this.currentVideo.milestones.p25 = true; }
        else if (pct >= 50 && !this.currentVideo.milestones.p50) { milestone = '50%'; this.currentVideo.milestones.p50 = true; }
        else if (pct >= 75 && !this.currentVideo.milestones.p75) { milestone = '75%'; this.currentVideo.milestones.p75 = true; }
        if (milestone) this.logEvent('video_progress', { videoId: this.currentVideo.id, title: this.currentVideo.title, progress: milestone });
    },

    trackCategoryFilter(category) { this.logEvent('filter_main_category', { category }); },
    trackTagFilter(tag, category)  { this.logEvent('filter_tag', { tag, category }); },

    showEvents() {
        try { console.table(JSON.parse(localStorage.getItem('golosinas_telemetry') || '[]')); }
        catch (e) { console.error('Error al leer historial de telemetría', e); }
    }
};

window.GolosinasTelemetry = GolosinasTelemetry;
