// ══════════════════════════════════════════════════════════════
// store.js — Estado Global Reactivo (ObservableStore)
// ══════════════════════════════════════════════════════════════

class ObservableStore {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }
    get(key) { return this.state[key]; }
    set(key, value) {
        if (this.state[key] === value) return;
        const old = this.state[key];
        this.state[key] = value;
        this.notify(key, value, old);
    }
    setMultiple(updates) {
        const changes = [];
        for (const key in updates) {
            const oldValue = this.state[key];
            const newValue = updates[key];
            if (oldValue !== newValue) {
                this.state[key] = newValue;
                changes.push({ key, newValue, oldValue });
            }
        }
        if (changes.length > 0) {
            this.listeners.forEach(l => changes.forEach(c => l(c.key, c.newValue, c.oldValue)));
        }
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }
    notify(key, newValue, oldValue) {
        this.listeners.forEach(l => l(key, newValue, oldValue));
    }
}

export const store = new ObservableStore({
    currentVideoIndex: -1,
    currentPortafolioFilter: 'recientes',
    currentMainFilter: 'todas',
    currentCatalogoTag: 'todos',
    playlist: [],
    playlistPlaying: false,
    currentPlaylistIndex: -1,
    isShuffle: false
});

function createReactiveArray(arr, onChange) {
    return new Proxy(arr, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'function') {
                const mutators = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
                if (mutators.includes(prop)) {
                    return function(...args) {
                        const result = value.apply(target, args);
                        onChange(target);
                        return result;
                    };
                }
            }
            return value;
        },
        set(target, prop, value, receiver) {
            const result = Reflect.set(target, prop, value, receiver);
            if (prop !== 'length') onChange(target);
            return result;
        }
    });
}

// Proxy global de compatibilidad: variables globales → getters/setters del store
Object.defineProperties(window, {
    currentVideoIndex:       { get() { return store.get('currentVideoIndex'); },       set(v) { store.set('currentVideoIndex', v); } },
    currentPortafolioFilter: { get() { return store.get('currentPortafolioFilter'); }, set(v) { store.set('currentPortafolioFilter', v); } },
    currentMainFilter:       { get() { return store.get('currentMainFilter'); },       set(v) { store.set('currentMainFilter', v); } },
    currentCatalogoTag:      { get() { return store.get('currentCatalogoTag'); },      set(v) { store.set('currentCatalogoTag', v); } },
    playlist: {
        get() { return createReactiveArray(store.get('playlist'), (arr) => store.notify('playlist', [...arr], store.state.playlist)); },
        set(v) { store.set('playlist', v); }
    },
    playlistPlaying:      { get() { return store.get('playlistPlaying'); },      set(v) { store.set('playlistPlaying', v); } },
    currentPlaylistIndex: { get() { return store.get('currentPlaylistIndex'); }, set(v) { store.set('currentPlaylistIndex', v); } },
    isShuffle:            { get() { return store.get('isShuffle'); },            set(v) { store.set('isShuffle', v); } },
});
