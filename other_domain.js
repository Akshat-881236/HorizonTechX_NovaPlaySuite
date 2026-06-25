(function() {
    // 1. Deploy the 5-Second Warning Banner
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%;
        background: #f43f5e; color: #ffffff;
        text-align: center; padding: 14px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
        z-index: 999999;
        box-shadow: 0 10px 30px rgba(244, 63, 94, 0.4);
        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease;
        transform: translateY(-100%);
    `;
    banner.innerHTML = `⚠️ Unknown Domain Detected. Local Database & Session Storage are Deactivated.`;
    document.body.appendChild(banner);

    // Animate banner in, then remove after 5 seconds
    requestAnimationFrame(() => { banner.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-10px)';
        setTimeout(() => banner.remove(), 500);
    }, 5000);

    // 2. Cripple Local & Session Storage (Data Persistence Lockdown)
    try {
        window.sessionStorage.clear();
        
        // Hijack native storage objects to prevent unauthorized caching
        const nullStorage = { get: () => ({ setItem: () => {}, getItem: () => null, removeItem: () => {}, clear: () => {} }) };
        Object.defineProperty(window, 'sessionStorage', nullStorage);
        Object.defineProperty(window, 'localStorage', nullStorage);
        
        // Hijack the active NovaDatabase write methods to drop all data silently
        if (window.NovaApp && window.NovaApp.db) {
            window.NovaApp.db.put = async () => console.warn("Action blocked: DB Put Restricted on Foreign Domain");
            window.NovaApp.db.del = async () => console.warn("Action blocked: DB Del Restricted on Foreign Domain");
            window.NovaApp.db.killFolderCascade = async () => console.warn("Action blocked: DB Override Restricted");
        }
    } catch (err) {
        console.warn("Storage deactivation protocol enforced.");
    }
})();
