/* ==========================================================================
     * ENGINE 1: HARD-ISOLATED INDEXED-DB v2 (NovaDatabase)
     * ========================================================================== */
    class NovaDatabase {
        constructor() {
            // Renamed to ensure absolute origin sandbox from Brother's project
            this.idbName = 'NovaPlay_Sound_Engine_v1';
            this.ver = 2;
        }

        async init() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(this.idbName, this.ver);
                req.onerror = () => reject(req.error);
                req.onsuccess = () => { this.db = req.result; resolve(); };
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('local_vault')) db.createObjectStore('local_vault', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('custom_folders')) db.createObjectStore('custom_folders', { keyPath: 'id', autoIncrement: true });
                    if (!db.objectStoreNames.contains('folder_mappings')) {
                        const m = db.createObjectStore('folder_mappings', { keyPath: 'mapId', autoIncrement: true });
                        m.createIndex('folderId', 'folderId', { unique: false });
                    }
                    if (!db.objectStoreNames.contains('blocklist_vault')) db.createObjectStore('blocklist_vault', { keyPath: 'lookupKey' });
                };
            });
        }

        exec(store, mode, op) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(store, mode);
                let req;
                try {
                    req = op(tx.objectStore(store));
                    if (req) { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }
                    else { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }
                } catch (e) { reject(e); }
            });
        }

        put(s, obj) { return this.exec(s, 'readwrite', st => st.put(obj)); }
        get(s, key) { return this.exec(s, 'readonly', st => st.get(key)); }
        getAll(s) { return this.exec(s, 'readonly', st => st.getAll()); }
        del(s, key) { return this.exec(s, 'readwrite', st => st.delete(key)); }
        getIdx(s, idx, val) { return this.exec(s, 'readonly', st => st.index(idx).getAll(val)); }

        async killFolderCascade(fid) {
            await this.del('custom_folders', fid);
            const maps = await this.getIdx('folder_mappings', 'folderId', fid);
            for (const m of maps) await this.del('folder_mappings', m.mapId);
        }
    }

    /* ==========================================================================
     * ENGINE 2: MODAL SUBSYSTEM (PamphletCard)
     * ========================================================================== */
    class PamphletCard {
        static create({ title, body, buttons }) {
            return new Promise(resolve => {
                const ov = document.createElement('div'); ov.className = 'm-backdrop';
                ov.innerHTML = `<div class="m-panel" onclick="event.stopPropagation()"><div class="m-head">${title}</div><div class="m-body">${body}</div><div class="m-foot">${buttons}</div></div>`;
                document.body.appendChild(ov);
                const exit = v => { ov.remove(); resolve(v); };
                ov.onclick = () => exit(null);
                ov.querySelectorAll('[data-ret]').forEach(b => b.onclick = () => exit(b.getAttribute('data-ret') === 'null' ? null : b.getAttribute('data-ret')));
            });
        }

        static alert(title, msg) { return this.create({ title: `<span>${title}</span>`, body: msg, buttons: `<button class="glass-btn accent" data-ret="ok">Understood</button>` }); }
        static confirm(title, msg) { return this.create({ title: `<span style="color:var(--rose-alert);">${title}</span>`, body: msg, buttons: `<button class="glass-btn" data-ret="null">Dismiss</button><button class="glass-btn accent" style="background:var(--rose-alert);border-color:var(--rose-alert);" data-ret="yes">Execute</button>` }); }
        
        static prompt(title, msg) {
            return new Promise(resolve => {
                const id = 'inp_' + Math.random().toString(36).slice(2,8);
                this.create({ title: `<span>${title}</span>`, body: `${msg}<input id="${id}" class="m-inp" autocomplete="off"/>`, buttons: `<button class="glass-btn" data-ret="null">Cancel</button><button id="p-commit" class="glass-btn accent" data-ret="ok">Commit</button>` }).then(r => { if (!r) resolve(null); });
                setTimeout(() => { const i = document.getElementById(id); if (i) { i.focus(); i.onkeydown = e => { if (e.key === 'Enter') document.getElementById('p-commit').click(); }; } }, 40);
                document.getElementById('p-commit').onclick = () => { resolve(document.getElementById(id)?.value?.trim() || null); document.querySelector('.m-backdrop')?.remove(); };
            });
        }

        static pickFolder(folders) {
            return new Promise(resolve => {
                const opts = `<div class="f-opt" data-id="new"><span style="color:var(--violet-glow);font-weight:700;">+ Generate New Folder</span></div>` + folders.map(f => `<div class="f-opt" data-id="${f.id}">📁 ${f.name}</div>`).join('');
                this.create({ title: `<span>Target Folder</span>`, body: `<div class="f-select-list">${opts}</div>`, buttons: `<button class="glass-btn" data-ret="null">Abort</button>` }).then(() => resolve(null));
                document.querySelectorAll('.f-opt').forEach(el => el.onclick = async () => {
                    const id = el.getAttribute('data-id'); document.querySelector('.m-backdrop')?.remove();
                    if (id === 'new') { const n = await PamphletCard.prompt('New Folder', 'Assign unique title:'); resolve(n ? { isNew: true, name: n } : null); }
                    else resolve({ isNew: false, id: parseInt(id) });
                });
            });
        }

        /* --- FEATURE UPGRADE: BATCH ARTWORK ASSIGNMENT MATRIX MODAL --- */
        static renderBatchArtAssigner(files, fallbackGen) {
            return new Promise(resolve => {
                const tracksState = files.map((f, i) => ({
                    id: 'nova_' + Date.now() + '_' + i,
                    title: f.name.replace(/\.[^/.]+$/, ''), artist: 'Local Media', album: 'Nova Vault Import',
                    isVideo: f.type.startsWith('video/'), isLocal: true, isFav: false, artwork: '', blob: f
                }));

                const ov = document.createElement('div'); ov.className = 'm-backdrop';
                
                const buildRows = () => tracksState.map((t, idx) => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--surface-hover); border-radius:12px; margin-bottom:8px; gap:12px;">
                        <div style="display:flex; align-items:center; gap:12px; overflow:hidden; flex:1;">
                            <img src="${t.artwork || fallbackGen(t.title, t.isVideo)}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; flex-shrink:0; border:1px solid rgba(255,255,255,0.05);"/>
                            <div style="overflow:hidden;">
                                <div style="font-weight:700; font-size:13px; color:white; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${t.title}</div>
                                <div style="font-size:11px; color:var(--text-sub);">Slot #${idx + 1}</div>
                            </div>
                        </div>
                        <label class="glass-btn" style="padding:6px 12px; font-size:11px; margin:0; background:var(--surface-card);">
                            <span>Set Art #${idx + 1}</span>
                            <input type="file" accept="image/*" style="display:none;" onchange="NovaApp.doSingleArt(event, ${idx})"/>
                        </label>
                    </div>
                `).join('');

                const refreshUI = () => { const w = ov.querySelector('#b-rows-box'); if (w) w.innerHTML = buildRows(); };

                ov.innerHTML = `
                    <div class="m-panel" style="max-width:600px; width:96%; padding:28px;" onclick="event.stopPropagation()">
                        <div class="m-head" style="justify-content:space-between;"><span>Assign Artwork Matrix (${files.length} Items)</span><button class="sink-ctrl" id="b-x">✕</button></div>
                        <div class="m-body" style="margin-bottom:20px;">
                            <div style="background:rgba(139, 92, 246, 0.08); border:1px dashed var(--violet-glow); padding:16px; border-radius:16px; text-align:center; margin-bottom:20px;">
                                <div style="font-size:12px; font-weight:800; color:var(--violet-glow); margin-bottom:4px; letter-spacing:0.5px;">⚡ BATCH AUTO-SLOT MATRIX</div>
                                <div style="font-size:11px; color:var(--text-sub); margin-bottom:12px;">Upload ${files.length} images simultaneously. The engine will assign them sequentially to Slot #1, #2, #3 instantly.</div>
                                <label class="glass-btn accent" style="display:inline-flex; padding:8px 16px;">
                                    <span>Upload ${files.length} Artwork Images</span>
                                    <input type="file" multiple accept="image/*" style="display:none;" id="b-master-inp"/>
                                </label>
                            </div>
                            <div style="font-size:10px; font-weight:800; color:var(--text-sub); margin-bottom:8px; letter-spacing:1px;">INDIVIDUAL OVERRIDES:</div>
                            <div id="b-rows-box" style="max-height:260px; overflow-y:auto; padding-right:4px;">${buildRows()}</div>
                        </div>
                        <div class="m-foot"><button class="glass-btn" id="b-cnl">Abort Import</button><button class="glass-btn accent" id="b-sav">Commit ${files.length} Tracks to Vault</button></div>
                    </div>
                `;
                document.body.appendChild(ov);

                window.NovaApp._st = tracksState;
                window.NovaApp.doSingleArt = (e, i) => {
                    const f = e.target.files[0]; if (!f) return;
                    const r = new FileReader(); r.onload = evt => { tracksState[i].artwork = evt.target.result; refreshUI(); }; r.readAsDataURL(f);
                };

                ov.querySelector('#b-master-inp').onchange = e => {
                    const imgs = Array.from(e.target.files); if (!imgs.length) return;
                    let c = 0;
                    imgs.forEach((img, imgI) => {
                        if (imgI >= tracksState.length) return;
                        const r = new FileReader();
                        r.onload = evt => { tracksState[imgI].artwork = evt.target.result; c++; if (c === Math.min(imgs.length, tracksState.length)) refreshUI(); };
                        r.readAsDataURL(img);
                    });
                };

                const kill = ret => { delete window.NovaApp._st; delete window.NovaApp.doSingleArt; ov.remove(); resolve(ret); };
                ov.querySelector('#b-x').onclick = () => kill(null);
                ov.querySelector('#b-cnl').onclick = () => kill(null);
                ov.querySelector('#b-sav').onclick = () => kill(tracksState.map(t => ({ ...t, artwork: t.artwork || fallbackGen(t.title, t.isVideo) })));
            });
        }

        static toast(m) {
            const t = document.createElement('div'); t.className = 'toast-ui'; t.innerHTML = `<span style="color:var(--violet-glow);">●</span><span>${m}</span>`;
            document.body.appendChild(t); setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 2500);
        }
    }

    /* ==========================================================================
     * ENGINE 3: MASTER SINK ORCHESTRATOR (NovaApp)
     * ========================================================================== */
    class NovaPlayEngine {
        constructor() {
            this.db = new NovaDatabase();
            this.sink = document.getElementById('master-media-sink');
            this.audioCtx = null; this.analyser = null;
            this.cvs = document.getElementById('vis-canvas'); this.cCtx = this.cvs.getContext('2d');
            this.anim = null;

            this.blocks = new Set(); this.folders = []; this.vault = []; this.searchCache = [];
            this.queue = []; this.qIdx = 0; this.activeTrack = null;
            this.view = 'v-vault'; this.folderId = null;
            this.shuf = false; this.rep = false;
        }

        async boot() {
            await this.db.init(); await this.sync();
            this.bind(); this.renderNav(); this.dump('v-vault');
        }

        async sync() {
            const b = await this.db.getAll('blocklist_vault'); this.blocks = new Set(b.map(x => x.lookupKey));
            this.folders = await this.db.getAll('custom_folders'); this.vault = await this.db.getAll('local_vault');
        }

        key(t) { return ((t.title || '') + '_' + (t.artist || '')).toLowerCase().replace(/\s+/g, ''); }

        /* Geometry-Based Audiophile Fallback Art */
        genArt(title = '', isVid = false) {
            const c = (title.trim()[0] || 'N').toUpperCase(); const bg = isVid ? '#2b1216' : '#121218'; const ac = isVid ? '#f43f5e' : '#8b5cf6';
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><path d="M0 100 L100 0 L100 100 Z" fill="#ffffff" opacity="0.02"/><circle cx="50" cy="50" r="32" fill="none" stroke="${ac}" stroke-width="3" opacity="0.3"/><text x="50" y="59" font-family="sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">${c}</text></svg>`;
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }

        bind() {
            const app = document.getElementById('app-matrix'); const drawer = document.getElementById('drawer-sidebar');
            const toggle = () => { drawer.classList.toggle('mobile-open'); };
            document.getElementById('drawer-toggle-btn').onclick = toggle; document.getElementById('mobile-drawer-kill').onclick = toggle;

            document.getElementById('desktop-collapse-btn').onclick = () => app.classList.toggle('collapsed-mode');

            // Search Triggers (Invidious Full-Length audio pipe integration)
            let timer; const mag = document.getElementById('in-mag'); const clr = document.getElementById('in-clear');
            mag.oninput = () => {
                clearTimeout(timer); clr.style.display = mag.value ? 'block' : 'none';
                const q = mag.value.trim(); if (q.length < 3) { if (q.length === 0) this.dump('v-vault'); return; }
                timer = setTimeout(() => this.scrapePipes(q), 400);
            };
            clr.onclick = () => { mag.value = ''; clr.style.display = 'none'; this.dump('v-vault'); };

            // Upload Broker Hook
            document.getElementById('btn-import').onclick = () => document.getElementById('hidden-file-broker').click();
            document.getElementById('hidden-file-broker').onchange = e => this.brokerUploads(e.target.files);

            // Right Drawer Navigation Hook
            drawer.onclick = e => {
                const b = e.target.closest('.drawer-btn'); if (!b || e.target.closest('.del-folder')) return;
                drawer.querySelectorAll('.drawer-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
                if (window.innerWidth <= 1024) toggle();
                if (b.dataset.dump) this.dump(b.dataset.dump);
                else if (b.dataset.fid) this.dump('v-folder', parseInt(b.dataset.fid), b.textContent.replace('📁','').trim());
            };

            document.getElementById('f-new-btn').onclick = async () => {
                const n = await PamphletCard.prompt('Custom Folder', 'Assign unique directory title:');
                if (n) { await this.db.put('custom_folders', { name: n, created: Date.now() }); await this.sync(); this.renderNav(); PamphletCard.toast('Directory Generated'); }
            };

            // Island Playback Sink Triggers
            document.getElementById('i-ply').onclick = () => { if (!this.activeTrack) return; this.sink.paused ? this.sink.play() : this.sink.pause(); };
            document.getElementById('i-nxt').onclick = () => this.runNext(); document.getElementById('i-prv').onclick = () => this.runPrev();
            document.getElementById('i-shuf').onclick = e => { this.shuf = !this.shuf; e.currentTarget.classList.toggle('active'); };
            document.getElementById('i-rep').onclick = e => { this.rep = !this.rep; e.currentTarget.classList.toggle('active'); };
            document.getElementById('i-vis').onclick = () => this.launchVis(); document.getElementById('v-kill').onclick = () => this.killVis();

            const bar = document.getElementById('i-bar'); bar.onclick = e => { const r = bar.getBoundingClientRect(); if (this.sink.duration) this.sink.currentTime = ((e.clientX - r.left) / r.width) * this.sink.duration; };
            const vbar = document.getElementById('i-vbar'); vbar.onclick = e => { const r = vbar.getBoundingClientRect(); const v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); this.sink.volume = v; document.getElementById('i-vrun').style.width = (v * 100) + '%'; };

            this.sink.ontimeupdate = () => {
                const c = this.sink.currentTime || 0; const d = this.sink.duration || 0;
                document.getElementById('i-run').style.width = d ? ((c / d) * 100) + '%' : '0%';
                document.getElementById('i-cur').textContent = this.fmt(c); document.getElementById('i-dur').textContent = this.fmt(d);
            };
            this.sink.onplay = () => { document.getElementById('i-ply').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; this.glowPlayingCard(); };
            this.sink.onpause = () => { document.getElementById('i-ply').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; };
            this.sink.onended = () => { if (this.rep) this.sink.play(); else this.runNext(); };
        }

        /* Broker Uploads via the requested Stage 2 Batch Matrix Modal */
        async brokerUploads(files) {
            const arr = Array.from(files); if (!arr.length) return;
            const finalized = await PamphletCard.renderBatchArtAssigner(arr, (t, isVid) => this.genArt(t, isVid));
            if (!finalized) return;

            for (const item of finalized) await this.db.put('local_vault', item);
            await this.sync(); this.dump('v-vault'); PamphletCard.toast(`Committed ${finalized.length} media assets`);
        }

        /* Scrape Pipes (Full Length Invidious Audio Pipe API + iTunes fallback) */
        async scrapePipes(term) {
            document.getElementById('render-s-name').textContent = `Pipes Query: "${term}"`;
            this.dump('v-search'); const grid = document.getElementById('g-search');
            grid.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-sub);">Negotiating public Web Pipes...</div>`;
            try {
                // Hits open-source Invidious node for full-length 128kbps M4A audio stream
                const r = await fetch(`https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(term)}&type=video`);
                if (!r.ok) throw new Error('Failover'); const d = await r.json();
                this.searchCache = d.slice(0, 28).map(v => ({
                    id: 'yt_' + v.videoId, apiId: v.videoId, title: v.title, artist: v.author, album: 'Invidious Audio Stream',
                    previewUrl: `https://inv.tux.pizza/latest_version?id=${v.videoId}&itag=140`, duration: v.lengthSeconds || 0,
                    artwork: v.videoThumbnails?.[3]?.url || v.videoThumbnails?.[0]?.url || this.genArt(v.title, false), isVideo: false, isLocal: false, isFav: false
                })).filter(t => !this.blocks.has(this.key(t)));
                this.renderCards(grid, this.searchCache);
            } catch (e) {
                // Standard iTunes failover
                try {
                    const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=30`); const d = await r.json();
                    this.searchCache = (d.results || []).filter(x => x.previewUrl).map(i => ({
                        id: 'api_' + i.trackId, apiId: i.trackId, title: i.trackName, artist: i.artistName, album: i.collectionName, previewUrl: i.previewUrl,
                        artwork: i.artworkUrl100?.replace('100x100bb', '300x300bb') || this.genArt(i.trackName, false), duration: 30, isVideo: false, isLocal: false, isFav: false
                    })).filter(t => !this.blocks.has(this.key(t)));
                    this.renderCards(grid, this.searchCache);
                } catch (err) { grid.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--rose-alert);">Pipe Negotiation Failed. Check Network.</div>`; }
            }
        }

        async dump(target, fid = null, fname = '') {
            document.querySelectorAll('.deck-view').forEach(s => s.classList.remove('active'));
            this.view = target; this.folderId = fid;

            if (target === 'v-vault') {
                document.getElementById('v-vault').classList.add('active'); document.getElementById('c-vault').textContent = `${this.vault.length} Assets`;
                this.renderCards(document.getElementById('g-vault'), this.vault);
            } else if (target === 'v-loved') {
                document.getElementById('v-loved').classList.add('active'); const f = this.vault.filter(x => x.isFav); document.getElementById('c-loved').textContent = `${f.length} Assets`;
                this.renderCards(document.getElementById('g-loved'), f);
            } else if (target === 'v-blocked') {
                document.getElementById('v-blocked').classList.add('active'); this.renderBlocks();
            } else if (target === 'v-folder') {
                document.getElementById('v-folder').classList.add('active'); document.getElementById('render-f-name').textContent = fname;
                const m = await this.db.getIdx('folder_mappings', 'folderId', fid); const mappedIds = m.map(x => x.trackId);
                const items = this.vault.filter(x => mappedIds.includes(x.id)); document.getElementById('c-folder').textContent = `${items.length} Mapped`;
                this.renderCards(document.getElementById('g-folder'), items, true);
            } else if (target === 'v-search') {
                document.getElementById('v-search').classList.add('active'); this.renderCards(document.getElementById('g-search'), this.searchCache);
            }
        }

        renderNav() {
            const box = document.getElementById('f-drawer-inject');
            box.innerHTML = this.folders.map(f => `<li><button class="drawer-btn ${this.folderId === f.id ? 'active':''}" data-fid="${f.id}"><span>📁 ${f.name}</span><svg class="del-folder" data-kill="${f.id}" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></li>`).join('');
            box.querySelectorAll('.del-folder').forEach(d => d.onclick = async e => {
                e.stopPropagation(); const id = parseInt(d.dataset.kill);
                if (await PamphletCard.confirm('Purge Directory', 'Annihilate custom directory and its mapping registry?')) { await this.db.killFolderCascade(id); await this.sync(); this.renderNav(); if (this.folderId === id) this.dump('v-vault'); PamphletCard.toast('Directory Purged'); }
            });
        }

        /* Matrix Cards Renderer */
        renderCards(container, tracks, isFMap = false) {
            container.innerHTML = '';
            if (!tracks.length) { container.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-sub);">Zero entities in current memory tier.</div>`; return; }

            tracks.forEach((t, idx) => {
                const card = document.createElement('div'); card.className = `sound-tile ${this.activeTrack?.id === t.id ? 'playing':''}`; card.dataset.id = t.id;
                card.innerHTML = `
                    <div class="tile-art"><img src="${t.artwork || this.genArt(t.title, t.isVideo)}" alt="Art"/><div class="tile-hover-deck"><button class="tile-play-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button></div><span class="tile-badge">${t.isVideo ? 'VID':(t.isLocal ? 'VLT':'PIPE')}</span></div>
                    <div class="tile-meta"><span class="tile-title" title="${t.title}">${t.title}</span><span class="tile-author">${t.artist}</span></div>
                    <div class="tile-bar">
                        <button class="tile-btn fld" title="Slot to Folder"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg></button>
                        <button class="tile-btn fav ${t.isFav ? 'active':''}" title="Loved One"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
                        ${isFMap ? `<button class="tile-btn block" title="Unmap"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 11H7v-2h10v2z"/></svg></button>` : `<button class="tile-btn block" title="Block Stream"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg></button>`}
                    </div>
                `;

                card.querySelector('.tile-hover-deck').onclick = () => { this.queue = tracks; this.qIdx = idx; this.dispatchSink(t); };

                card.querySelector('.fld').onclick = async e => {
                    e.stopPropagation(); const res = await PamphletCard.pickFolder(this.folders); if (!res) return;
                    let target = t; if (!t.isLocal) { target = { ...t, id: 'pipe_cached_' + t.apiId, isLocal: true }; await this.db.put('local_vault', target); }
                    const fid = res.isNew ? (await this.db.put('custom_folders', { name: res.name, created: Date.now() })) : res.id;
                    await this.db.put('folder_mappings', { folderId: fid, trackId: target.id }); await this.sync(); this.renderNav(); PamphletCard.toast('Slotted to Directory');
                };

                const h = card.querySelector('.fav'); h.onclick = async e => {
                    e.stopPropagation(); let target = t; if (!t.isLocal) { target = { ...t, id: 'pipe_cached_' + t.apiId, isLocal: true }; }
                    target.isFav = !target.isFav; await this.db.put('local_vault', target); await this.sync(); h.classList.toggle('active'); PamphletCard.toast(target.isFav ? 'Bookmarked as Loved' : 'Removed from Favorites');
                };

                card.querySelector('.block').onclick = async e => {
                    e.stopPropagation();
                    if (isFMap) {
                        const m = (await this.db.getIdx('folder_mappings', 'folderId', this.folderId)).find(x => x.trackId === t.id);
                        if (m) await this.db.del('folder_mappings', m.mapId); card.remove(); PamphletCard.toast('Registry Unmapped');
                    } else {
                        const k = this.key(t); await this.db.put('blocklist_vault', { lookupKey: k, title: t.title, artist: t.artist }); await this.sync(); card.remove();
                        if (this.view === 'v-search') this.searchCache = this.searchCache.filter(x => this.key(x) !== k);
                        PamphletCard.toast('Stream Pipe Restricted');
                    }
                };
                container.appendChild(card);
            });
        }

        renderBlocks() {
            const box = document.getElementById('t-blocked');
            this.db.getAll('blocklist_vault').then(l => {
                if (!l.length) { box.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-sub);">Zero stream restrictions present.</div>`; return; }
                box.innerHTML = `<table class="b-table"><thead><tr><th>Entity Title</th><th>Author</th><th>System Hook</th></tr></thead><tbody>${l.map(b => `<tr><td style="font-weight:700;color:white;">${b.title||'Raw Hook'}</td><td>${b.artist||'—'}</td><td><button class="glass-btn accent" style="background:var(--emerald-ok);border-color:var(--emerald-ok);" data-rst="${b.lookupKey}">Restore Pipe</button></td></tr>`).join('')}</tbody></table>`;
                box.querySelectorAll('[data-rst]').forEach(b => b.onclick = async () => { await this.db.del('blocklist_vault', b.dataset.rst); await this.sync(); this.renderBlocks(); PamphletCard.toast('Stream Pipe Unlocked'); });
            });
        }

        /* Dispatch Audio/Video Pipe to Master Sink */
        async dispatchSink(t) {
            this.activeTrack = t;
            document.getElementById('i-title').textContent = t.title; document.getElementById('i-sub').textContent = t.artist;
            document.getElementById('i-thumb').src = t.artwork || this.genArt(t.title, t.isVideo);
            
            if (t.isLocal && t.blob) this.sink.src = URL.createObjectURL(t.blob);
            else if (t.previewUrl) this.sink.src = t.previewUrl;
            else return PamphletCard.toast('Corrupted Data Pipe');

            if (t.isVideo) this.launchVis();
            await this.sink.play().catch(() => PamphletCard.toast('Engine Autoplay Suppressed'));
            this.engageWebAudio();
        }

        runNext() { if (!this.queue.length) return; let n = this.shuf ? Math.floor(Math.random() * this.queue.length) : (this.qIdx + 1) % this.queue.length; this.qIdx = n; this.dispatchSink(this.queue[n]); }
        runPrev() { if (!this.queue.length) return; let p = (this.qIdx - 1 + this.queue.length) % this.queue.length; this.qIdx = p; this.dispatchSink(this.queue[p]); }

        glowPlayingCard() {
            document.querySelectorAll('.sound-tile').forEach(c => c.classList.remove('playing'));
            if (this.activeTrack) { const a = document.querySelector(`.sound-tile[data-id="${this.activeTrack.id}"]`); a?.classList.add('playing'); }
        }

        /* Visualizer Matrix (Handles raw MP4 elements or FFT Canvas streams) */
        launchVis() {
            const m = document.getElementById('vis-matrix'); const dock = document.getElementById('v-dock');
            if (this.activeTrack?.isVideo) {
                this.cvs.style.display = 'none'; this.sink.classList.add('docked-sink'); this.sink.style.display = 'block';
                dock.appendChild(this.sink);
            } else { this.cvs.style.display = 'block'; this.engageWebAudio(); }
            m.classList.add('active');
        }

        killVis() {
            const m = document.getElementById('vis-matrix');
            if (this.activeTrack?.isVideo) { this.sink.classList.remove('docked-sink'); this.sink.style.display = 'none'; document.body.appendChild(this.sink); }
            m.classList.remove('active');
        }

        engageWebAudio() {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); this.analyser = this.audioCtx.createAnalyser(); this.analyser.fftSize = 256;
                const s = this.audioCtx.createMediaElementAudioSource(this.sink); s.connect(this.analyser); this.analyser.connect(this.audioCtx.destination);
            }
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            if (this.anim) cancelAnimationFrame(this.anim);
            const buf = this.analyser.frequencyBinCount; const data = new Uint8Array(buf);

            const draw = () => {
                this.anim = requestAnimationFrame(draw);
                if (this.cvs.width !== this.cvs.offsetWidth) this.cvs.width = this.cvs.offsetWidth;
                if (this.cvs.height !== this.cvs.offsetHeight) this.cvs.height = this.cvs.offsetHeight;
                try { this.analyser.getByteFrequencyData(data); } catch(e) { return; }
                this.cCtx.fillStyle = 'rgba(5, 5, 7, 0.4)'; this.cCtx.fillRect(0, 0, this.cvs.width, this.cvs.height);
                const bw = (this.cvs.width / buf) * 2.5; let x = 0;
                for (let i = 0; i < buf; i++) {
                    const bh = (data[i] / 255) * this.cvs.height * 0.8;
                    this.cCtx.fillStyle = `hsl(${(i / buf) * 360}, 90%, 55%)`; this.cCtx.fillRect(x, this.cvs.height - bh, bw - 1, bh); x += bw;
                }
            }; draw();
        }

        fmt(s) { if (!isFinite(s)) return '0:00'; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`; }
    }

    window.addEventListener('DOMContentLoaded', () => { window.NovaApp = new NovaPlayEngine(); window.NovaApp.boot(); });

    /* --- FLUID SWIPE GESTURES FOR MOBILE OFF-CANVAS SIDEBAR --- */
const drawer = document.getElementById('drawer-sidebar');
const backdrop = document.getElementById('sidebar-backdrop');

let tStartX = 0;
let tStartY = 0;

document.addEventListener('touchstart', (e) => {
    tStartX = e.changedTouches[0].screenX;
    tStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    // Only execute swipe logic on tablet/mobile views (1024px or below)
    if (window.innerWidth > 1024) return;
    
    let dX = e.changedTouches[0].screenX - tStartX;
    let dY = e.changedTouches[0].screenY - tStartY;

    // Ensure it's a deliberate horizontal swipe (X distance greater than Y distance and > 40px)
    if (Math.abs(dX) > Math.abs(dY) && Math.abs(dX) > 40) {
        
        // 1. Swipe Left (from the right edge) to OPEN the right-sided drawer
        // We require the swipe to start near the right edge of the screen (e.g., last 60px)
        if (dX < 0 && tStartX > window.innerWidth - 60) {
            drawer.classList.add('mobile-open');
            backdrop.classList.add('mobile-open');
        }
        
        // 2. Swipe Right (anywhere on screen) to CLOSE the right-sided drawer
        else if (dX > 0 && drawer.classList.contains('mobile-open')) {
            drawer.classList.remove('mobile-open');
            backdrop.classList.remove('mobile-open');
        }
    }
}, { passive: true });