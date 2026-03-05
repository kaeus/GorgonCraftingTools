// Shared CDN base URL resolver for Project Gorgon data files.
// Exports a promise `cdnReady` that resolves to the versioned data base URL,
// e.g. "https://cdn.projectgorgon.com/v461/data/".
const CDN_FALLBACK = 'https://cdn.projectgorgon.com/v461/data/';

const cdnReady = (async () => {
    try {
        const res = await fetch('https://cdn.projectgorgon.com/', { redirect: 'follow' });
        const match = res.url.match(/\/(v\d+)\//);
        if (match) {
            const base = `https://cdn.projectgorgon.com/${match[1]}/data/`;
            console.log('[CDN] Auto-detected version:', match[1], '→', base);
            return base;
        }
    } catch (e) {
        console.warn('[CDN] Could not auto-detect version, using fallback:', CDN_FALLBACK, e);
    }
    return CDN_FALLBACK;
})();
