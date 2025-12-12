const API_JIKAN = "https://api.jikan.moe/v4";
const API_TVMAZE = "https://api.tvmaze.com";
// Leave empty for Vercel/Production
const API_NODE = ""; 

const EXCLUDED_GENRES = ["Ecchi", "Hentai", "Erotica", "Harem", "Yaoi", "Yuri", "Gore", "Boys Love", "Girls Love"];
const STATUS_OPTIONS_UI = ["Want to Watch", "Watching", "Completed", "Paused", "Dropped"];

// Store IDs of shows we already saved
let SAVED_IDS = new Set(); 

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("animeGrid")) {
        initGenerator();
    } else if (document.getElementById("mylistGrid")) {
        initMyList();
    }
});

/* -------------------- GENERATOR PAGE -------------------- */
async function initGenerator(){
    const sourceSelect = document.getElementById("sourceSelect");
    
    // 1. Fetch the user's saved list FIRST so we know what to hide
    await fetchSavedIds();

    loadGenres(); 
    fetchContent();

    if(sourceSelect) sourceSelect.addEventListener("change", handleSourceChange);
}

// Fetch all saved IDs from the database
async function fetchSavedIds() {
    try {
        const res = await fetch(`${API_NODE}/api/anime/mylist`);
        if (res.ok) {
            const list = await res.json();
            SAVED_IDS.clear();
            list.forEach(item => {
                // Store both Jikan and TVMaze IDs
                if (item.jikanId) SAVED_IDS.add(item.jikanId);
                if (item.tvmazeId) SAVED_IDS.add(item.tvmazeId);
            });
            console.log("Loaded saved IDs:", SAVED_IDS);
        }
    } catch (e) {
        console.error("Could not load saved list for filtering", e);
    }
}

function handleSourceChange() {
    const source = document.getElementById("sourceSelect").value;
    const genreSelect = document.getElementById("genreSelect");
    
    document.getElementById("animeGrid").innerHTML = '<div style="color:#666; grid-column:1/-1;">Click Regenerate...</div>';
    
    if(source === "tv") {
        genreSelect.innerHTML = `
            <option value="">All TV Genres</option>
            <option value="Action">Action</option>
            <option value="Comedy">Comedy</option>
            <option value="Drama">Drama</option>
            <option value="Science-Fiction">Sci-Fi</option>
            <option value="Thriller">Thriller</option>
            <option value="Horror">Horror</option>
        `;
    } else {
        genreSelect.innerHTML = '<option value="">All Genres</option>';
        loadGenres();
    }
}

// --- MAIN FETCH ---
async function fetchContent() {
    const source = document.getElementById("sourceSelect") ? document.getElementById("sourceSelect").value : "anime";
    // Refresh saved IDs before fetching new content to be safe
    await fetchSavedIds();
    
    if (source === "tv") await fetchTVMaze();
    else await fetchAnime();
}

async function fetchAnime() {
    const grid = document.getElementById("animeGrid");
    const genreId = document.getElementById("genreSelect").value;
    grid.innerHTML = '<div style="color:white; grid-column:1/-1; text-align:center;">Finding safe anime...</div>';

    try {
        const url = new URL(`${API_JIKAN}/anime`);
        url.searchParams.append("order_by", "popularity");
        url.searchParams.append("sfw", "true"); 
        url.searchParams.append("limit", "20"); // Fetch more since we might hide some
        url.searchParams.append("page", Math.floor(Math.random() * 3) + 1);
        if (genreId) url.searchParams.append("genres", genreId);
        
        const res = await fetch(url);
        const data = await res.json();
        
        // Normalize AND Filter
        const normalized = data.data
            .map(item => normalizeData(item, 'anime'))
            .filter(item => !SAVED_IDS.has(item.id)); // HIDE IF SAVED

        renderGrid(normalized.slice(0, 12)); // Only show top 12 after filtering
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p style="color:red">Error loading Anime.</p>';
    }
}

async function fetchTVMaze() {
    const grid = document.getElementById("animeGrid");
    const genreText = document.getElementById("genreSelect").value;
    grid.innerHTML = '<div style="color:white; grid-column:1/-1; text-align:center;">Finding Western TV shows...</div>';

    try {
        let endpoint = `${API_TVMAZE}/shows`; 
        if (genreText) endpoint = `${API_TVMAZE}/search/shows?q=${genreText}`;

        const res = await fetch(endpoint);
        let data = await res.json();
        let shows = genreText ? data.map(item => item.show) : data;
        
        const westernShows = shows.filter(show => show.language !== 'Japanese');
        
        // Normalize AND Filter
        const normalized = westernShows
            .map(item => normalizeData(item, 'tv'))
            .filter(item => !SAVED_IDS.has(item.id)); // HIDE IF SAVED
        
        if (normalized.length === 0) grid.innerHTML = '<p style="color:white">No new shows found.</p>';
        else renderGrid(normalized.slice(0, 12));
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p style="color:red">Error loading TV Shows.</p>';
    }
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
        grid.innerHTML = '<div style="color:white; grid-column:1/-1; text-align:center;">All items on this page are already in your list! Try Regenerating.</div>';
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
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- DATABASE: ADD TO LIST ---
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

        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || "Failed to save");
        
        showToast(`Saved "${title}"!`);
        
        // Remove the card from the screen immediately
        if(cardElement) {
            cardElement.style.opacity = '0';
            setTimeout(() => cardElement.remove(), 500);
            SAVED_IDS.add(parseInt(id)); // Update local memory so it doesn't come back
        }
        
    } catch (err) {
        console.error("Save failed:", err);
        showToast("Error: Could not save.");
    }
}

/* -------------------- MY LIST PAGE -------------------- */
async function initMyList() {
    const grid = document.getElementById("mylistGrid");
    if(!grid) return;

    grid.innerHTML = '<div style="color:white; text-align:center;">Loading your list...</div>';

    try {
        const res = await fetch(`${API_NODE}/api/anime/mylist`);
        if (!res.ok) throw new Error("Failed to load list");
        
        const list = await res.json();
        renderMyList(list);
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="color:red; text-align:center;">Could not load list. Is the server running?</div>';
    }
}

function renderMyList(items) {
    const grid = document.getElementById("mylistGrid");
    grid.innerHTML = "";
    
    if (items.length === 0) {
        grid.innerHTML = '<div style="color:#aaa; text-align:center;">Your list is empty. Go to Gen to add shows!</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("card");
        const safeTitle = escapeHtml(item.title);
        
        // Determine status for dropdown
        // Convert DB status (WANT_TO_WATCH) to UI (Want to Watch)
        const currentStatusUI = item.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, s => s.toUpperCase()); 
        
        let options = STATUS_OPTIONS_UI.map(s => {
            const isSelected = s === currentStatusUI ? "selected" : "";
            return `<option value="${s}" ${isSelected}>${s}</option>`;
        }).join('');

        card.innerHTML = `
            <img src="${item.image}" alt="${safeTitle}">
            <div class="card-overlay">
                <div class="card-title">${safeTitle}</div>
                <div class="actions" style="margin-top: auto;">
                    <select class="status-select" onchange='updateStatus("${item.id}", this.value)'>
                        ${options}
                    </select>
                    <button class="delete-btn" onclick='deleteEntry("${item.id}", this.closest(".card"))'>🗑</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- DELETE & UPDATE ---
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
        await fetch(`${API_NODE}/api/anime/${dbId}`, { method: "DELETE" });
        cardElement.remove();
        showToast("Entry removed");
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

async function loadGenres() {
    const select = document.getElementById("genreSelect");
    if(!select) return;
    try {
        const res = await fetch(`${API_JIKAN}/genres/anime`);
        const data = await res.json();
        const safe = data.data.filter(g => !EXCLUDED_GENRES.includes(g.name));
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
