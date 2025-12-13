// script.js - FAMILY FRIENDLY VERSION

const API_JIKAN = "https://api.jikan.moe/v4";
const API_TVMAZE = "https://api.tvmaze.com";
// CHANGE THIS TO YOUR ACTUAL BACKEND URL IF DEPLOYED
const API_NODE = "https://my-screen-time.vercel.app"; 

// --- SAFETY FILTERS ---
// 1. ANIME: Jikan will exclude these
const EXCLUDED_ANIME_GENRES = ["Ecchi", "Hentai", "Erotica", "Harem", "Yaoi", "Yuri", "Gore", "Boys Love", "Girls Love", "CGDCT", "Adult Cast", "Crossdressing", "High Stakes Game", 
                               "Avant Garde", "Suspense", "Combat Sports", "Delinquents", "Idols (Female)", "Idols (Male)", 
                               "Love Polygon", "Magical Sex Shift", "Martial Arts", "Military","Organized Crime", "Psychological", "Reverse Harem", "Survival", "Horror"];

// 2. TV/CARTOON: We will manually hide these from TVMaze
const EXCLUDED_TV_GENRES = ["Horror", "Thriller", "Crime", "Supernatural", "Adult", "Anime"];

const STATUS_OPTIONS_UI = ["Want to Watch", "Watching", "Completed", "Paused", "Dropped"];

let SAVED_IDS = new Set(); 

document.addEventListener("DOMContentLoaded", () => {
    // Check if we are on MyList page (even if body id is missing)
    if (document.getElementById("mylistGrid")) {
        initMyList();
    } else if (document.getElementById("animeGrid")) {
        initGenerator();
    }
});

/* -------------------- GENERATOR PAGE -------------------- */
async function initGenerator(){
    const sourceSelect = document.getElementById("sourceSelect");
    await fetchSavedIds();
    handleSourceChange(); 
    fetchContent();
    if(sourceSelect) sourceSelect.addEventListener("change", handleSourceChange);
}

async function fetchSavedIds() {
    try {
        const res = await fetch(`${API_NODE}/api/anime/mylist`);
        if (res.ok) {
            const list = await res.json();
            SAVED_IDS.clear();
            list.forEach(item => {
                if (item.jikanId) SAVED_IDS.add(item.jikanId);
                if (item.tvmazeId) SAVED_IDS.add(item.tvmazeId);
            });
        }
    } catch (e) { console.error("Load error", e); }
}

function handleSourceChange() {
    const source = document.getElementById("sourceSelect").value;
    const genreSelect = document.getElementById("genreSelect");
    document.getElementById("animeGrid").innerHTML = '<div style="color:#666; grid-column:1/-1;">Click Regenerate...</div>';
    
    if(source === "tv" || source === "cartoon") {
        genreSelect.innerHTML = `
            <option value="">All Genres</option>
            <option value="Action">Action</option>
            <option value="Adventure">Adventure</option>
            <option value="Comedy">Comedy</option>
            <option value="Drama">Drama</option>
            <option value="Family">Family</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Mystery">Mystery</option>
            <option value="Science-Fiction">Sci-Fi</option>
            <option value="Sports">Sports</option>
        `;
    } else {
        genreSelect.innerHTML = '<option value="">All Genres</option>';
        loadJikanGenres();
    }
}

async function fetchContent() {
    const source = document.getElementById("sourceSelect").value;
    await fetchSavedIds();
    if (source === "anime") await fetchAnime();
    else await fetchTVMaze(source);
}

async function fetchAnime() {
    const grid = document.getElementById("animeGrid");
    const genreId = document.getElementById("genreSelect").value;
    grid.innerHTML = '<div style="color:white; grid-column:1/-1; text-align:center;">Finding safe anime...</div>';

    try {
        const url = new URL(`${API_JIKAN}/anime`);
        url.searchParams.append("order_by", "popularity");
        url.searchParams.append("sfw", "true"); 
        url.searchParams.append("rating", "pg");
        url.searchParams.append("limit", "24"); 
        url.searchParams.append("page", Math.floor(Math.random() * 3) + 1);
        if (genreId) url.searchParams.append("genres", genreId);
        
        const res = await fetch(url);
        const data = await res.json();
        
        const normalized = data.data
            .map(item => normalizeData(item, 'anime'))
            .filter(item => !SAVED_IDS.has(item.id))
            .filter(item => !item.genres.some(g => EXCLUDED_ANIME_GENRES.includes(g)));

        renderGrid(normalized.slice(0, 12)); 
    } catch (error) { grid.innerHTML = '<p style="color:red">Error loading Anime.</p>'; }
}

async function fetchTVMaze(type) {
    const grid = document.getElementById("animeGrid");
    const genreText = document.getElementById("genreSelect").value;
    grid.innerHTML = `<div style="color:white; grid-column:1/-1; text-align:center;">Finding Shows...</div>`;

    try {
        let endpoint = `${API_TVMAZE}/shows?page=${Math.floor(Math.random() * 5)}`; 
        const res = await fetch(endpoint);
        let data = await res.json();
        
        let filtered = data.filter(item => {
            const isAnimation = item.type === 'Animation' || item.genres.includes('Anime');
            if (type === 'cartoon') return isAnimation;
            if (type === 'tv') return !isAnimation; 
            return true;
        });

        if (genreText) filtered = filtered.filter(item => item.genres.includes(genreText));

        filtered = filtered.filter(item => item.genres.includes("Children") || item.genres.includes("Family"));

        const normalized = filtered
            .map(item => normalizeData(item, 'tv'))
            .filter(item => !SAVED_IDS.has(item.id)); 
        
        if (normalized.length === 0) grid.innerHTML = '<p style="color:white; grid-column:1/-1; text-align:center">No shows found.</p>';
        else renderGrid(normalized.slice(0, 12));
    } catch (error) { grid.innerHTML = '<p style="color:red">Error loading TV Shows.</p>'; }
}

function normalizeData(item, source) {
    if (source === 'anime') {
        return {
            id: item.mal_id,
            idType: 'jikanId',
            title: item.title_english || item.title,
            image: item.images.jpg.large_image_url,
            desc: item.synopsis || "No description.",
            genres: item.genres.slice(0,3).map(g => g.name)
        };
    } else {
        return {
            id: item.id,
            idType: 'tvmazeId',
            title: item.name,
            image: item.image ? item.image.medium : 'https://via.placeholder.com/210x295',
            desc: item.summary ? item.summary.replace(/<[^>]*>?/gm, '') : 'No summary.',
            genres: item.genres ? item.genres.slice(0,3) : []
        };
    }
}

function renderGrid(items) {
    const grid = document.getElementById("animeGrid");
    grid.innerHTML = "";
    if (items.length === 0) {
        grid.innerHTML = '<div style="color:white; grid-column:1/-1; text-align:center;">All items saved!</div>';
        return;
    }
    items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("card");
        const safeTitle = escapeHtml(item.title);
        const genresHtml = item.genres.map(g => `<span class="genre-pill">${g}</span>`).join("");
        const options = STATUS_OPTIONS_UI.map(s => `<option value="${s}">${s}</option>`).join('');

        card.innerHTML = `
            <img src="${item.image}" alt="${safeTitle}">
            <div class="card-overlay">
                <div class="card-title">${safeTitle}</div>
                <div class="genre-row">${genresHtml}</div>
                <div class="card-desc">${item.desc}</div>
                <div class="actions">
                    <select class="status-select" onchange='closeDropdown(this); addToMyList("${item.id}", "${item.idType}", "${safeTitle}", "${item.image}", this.value, this.closest(".card"))'>
                        <option value="" disabled selected>+ Add to List</option>
                        ${options}
                    </select>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

async function addToMyList(id, idType, title, image, statusUI, cardElement){
    const status = statusUI.toUpperCase().replace(/ /g, "_");
    const payload = { title, image, status };
    payload[idType] = parseInt(id);

    try {
        const res = await fetch(`${API_NODE}/api/anime`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to save");
        showToast(`Saved "${title}"!`);
        if(cardElement) {
            cardElement.style.opacity = '0';
            setTimeout(() => cardElement.remove(), 500);
            SAVED_IDS.add(parseInt(id)); 
        }
    } catch (err) { showToast("Error: Could not save."); }
}

/* -------------------- MY LIST PAGE -------------------- */
async function initMyList() {
    const grid = document.getElementById("mylistGrid");
    const filterSelect = document.getElementById("statusFilter");
    
    // 1. POPULATE DROPDOWN IMMEDIATELY
    if(filterSelect) {
        filterSelect.innerHTML = `<option value="">All Statuses</option>` + 
            STATUS_OPTIONS_UI.map(s => `<option value="${s}">${s}</option>`).join("");
        
        filterSelect.addEventListener("change", () => {
             renderMyList(filterSelect.value); // Filter when changed
        });
    }

    if(!grid) return;
    grid.innerHTML = '<div style="color:white; text-align:center;">Loading your list...</div>';

    try {
        const res = await fetch(`${API_NODE}/api/anime/mylist`);
        if (!res.ok) throw new Error("Failed to load list");
        const list = await res.json();
        
        // Store full list globally so filtering is easier (optional but good for speed)
        window.myFullList = list; 
        renderMyList(); // Render all initially
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="color:red; text-align:center;">Could not load list.</div>';
    }
}

function renderMyList(filterStatusUI = "") {
    const grid = document.getElementById("mylistGrid");
    let items = window.myFullList || [];

    // Filter logic
    if (filterStatusUI) {
        // Convert UI "Want to Watch" -> DB "WANT_TO_WATCH"
        const dbStatus = filterStatusUI.toUpperCase().replace(/ /g, "_");
        items = items.filter(i => i.status === dbStatus);
    }

    grid.innerHTML = "";
    if (items.length === 0) {
        grid.innerHTML = '<div style="color:#aaa; text-align:center; width:100%;">No items found.</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("card");
        const safeTitle = escapeHtml(item.title);
        const currentStatusUI = item.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, s => s.toUpperCase()); 
        
        let options = STATUS_OPTIONS_UI.map(s => {
            const isSelected = s === currentStatusUI ? "selected" : "";
            return `<option value="${s}" ${isSelected}>${s}</option>`;
        }).join('');

        // FIXED UI: Added style to make Select and Button match
        // Both are set to flex-grow: 1 or width: 100% with spacing
        card.innerHTML = `
            <img src="${item.image}" alt="${safeTitle}">
            <div class="card-overlay">
                <div class="card-title">${safeTitle}</div>
                <div class="actions" style="margin-top: auto; display: flex; flex-direction: column; gap: 8px; width: 100%;">
                    <select class="status-select" style="width: 100%; padding: 10px;" onchange='updateStatus("${item.id}", this.value)'>
                        ${options}
                    </select>
                    <button 
                        class="remove-btn" 
                        style="background-color: #d93025; color: white; border: none; padding: 10px; width: 100%; border-radius: 4px; cursor: pointer; font-weight: bold;" 
                        onclick='deleteEntry("${item.id}", this.closest(".card"))'
                    >
                        Remove
                    </button>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

async function updateStatus(dbId, newStatusUI) {
    const status = newStatusUI.toUpperCase().replace(/ /g, "_");
    try {
        await fetch(`${API_NODE}/api/anime/${dbId}`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        showToast("Status updated");
    } catch (e) { showToast("Update failed"); }
}

async function deleteEntry(dbId, cardElement) {
    if(!confirm("Remove from list?")) return;
    try {
        const res = await fetch(`${API_NODE}/api/anime/${dbId}`, { method: "DELETE" });
        if (res.ok) {
            cardElement.remove();
            showToast("Entry removed");
            // Remove from local list so filtering works without reload
            if(window.myFullList) {
                window.myFullList = window.myFullList.filter(i => i.id !== dbId);
            }
        } else {
            showToast("Delete failed");
        }
    } catch (e) { showToast("Delete failed"); }
}

// --- UTILS ---
function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

async function loadJikanGenres() {
    const select = document.getElementById("genreSelect");
    if(!select) return;
    try {
        const res = await fetch(`${API_JIKAN}/genres/anime`);
        const data = await res.json();
        const safe = data.data.filter(g => !EXCLUDED_ANIME_GENRES.includes(g.name));
        safe.forEach(g => {
            const opt = document.createElement("option");
            opt.value = g.mal_id;
            opt.textContent = g.name;
            select.appendChild(opt);
        });
    } catch (e) { console.log("Genre load error"); }
}

function escapeHtml(str) { return String(str || "").replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[s]); }
function closeDropdown(el){ el.blur(); }

function openNav() { document.getElementById("mySidenav").style.width = "250px"; }
function closeNav() { document.getElementById("mySidenav").style.width = "0"; }
