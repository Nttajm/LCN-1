// Runtime config for Crossshare cloud services.
// Replace the placeholder Worker / media URLs after deploying Cloudflare.
window.CROSSSHARE_CONFIG = Object.assign({
    workerUrl: 'https://crossshare-upload.joelmulonde81.workers.dev',
    publicMediaBaseUrl: 'https://pub-21d5b946991b464ea5952a5f6933679c.r2.dev',
    usePopupAuth: true
}, window.CROSSSHARE_CONFIG || {});
