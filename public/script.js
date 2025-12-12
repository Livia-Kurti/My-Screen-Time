// script.js — Handles Home, Generator, and MyList pages

const API_JIKAN = "https://api.jikan.moe/v4";
const API_TVMAZE = "https://api.tvmaze.com";
// MAKE SURE THIS MATCHES YOUR SERVER PORT
const API_NODE = "http://localhost:5000"; 

const EXCLUDED_GENRES = ["Ecchi", "Hentai", "Erotica", "Harem", "Yaoi", "Yuri", "Gore", "Boys Love", "Girls Love"];
const STATUS_OPTIONS_UI = ["Want to Watch", "Watching", "Completed", "Paused", "Dropped"];

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("animeGrid")) {
        initGenerator();
    } else if (document.getElementById("mylistGrid")) {
        initMyList();
    }
});

/* -------------------- GENERATOR PAGE -------------------- */
function initGenerator(){
    const sourceSelect = document.getElementById("sourceSelect");
    
    // Load defaults
    loadGenres(); 
    fetchContent();

    if(sourceSelect) sourceSelect.addEventListener("change", handleSourceChange);
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
        url.searchParams.append("limit", "12");
        url.searchParams.append("page", Math.floor(Math.random() * 3) + 1);
        if (genreId) url.searchParams.append("genres", genreId);
        
        const res = await fetch(url);
        const data = await res.json();
        const normalized = data.data.map(item => normalizeData(item, 'anime'));
        renderGrid(normalized);
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
        
        // Filter out Japanese content
        const westernShows = shows.filter(show => show.language !== 'Japanese');
        const normalized = westernShows.slice(0, 12).map(item => normalizeData(item, 'tv'));
        
        if (normalized.length === 0) grid.innerHTML = '<p style="color:white">No Western shows found.</p>';
        else renderGrid(normalized);
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p style="color:red">Error loading TV Shows.</p>';
    }
}

function normalizeData(item, source) {
    if (source === 'anime') {
        return {
            id: item.mal_id,
            idType: 'jikanId', // Crucial for Backend
            title: item.title_english || item.title,
            image: item.images.jpg.large_image_url,
            desc: item.synopsis || "No description.",
            genres: item.genres.slice(0,3).map(g => g.name)
        };
    } else {
        return {
            id: item.id,
            idType: 'tvmazeId', // Crucial for Backend
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

    items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("card");
        const safeTitle = escapeHtml(item.title);
        const genresHtml = item.genres.map(g => `<span class="genre-pill">${g}</span>`).join("");
        
        // Create Dropdown Options
        const options = STATUS_OPTIONS_UI.map(s => `<option value="${s}">${s}</option>`).join('');

        card.innerHTML = `
            <img src="${item.image}" alt="${safeTitle}">
            <div class="card-overlay">
                <div class="card-title">${safeTitle}</div>
                <div class="genre-row">${genresHtml}</div>
                <div class="card-desc">${item.desc}</div>
                <div class="actions">
                    <select class="status-select" onchange='closeDropdown(this); addToMyList("${item.id}", "${item.idType}", "${safeTitle}", "${item.image}", this.value)'>
                        <option value="" disabled selected>+ Add to List</option>
                        ${options}
                    </select>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- DATABASE: ADD TO LIST (FIXED) ---
async function addToMyList(id, idType, title, image, statusUI){
    // 1. Convert "Want to Watch" -> "WANT_TO_WATCH"
    const status = statusUI.toUpperCase().replace(/ /g, "_");
    
    // 2. Build Payload
    const payload = { title, image, status };
    payload[idType] = parseInt(id); // Sets jikanId: 123 OR tvmazeId: 456

    console.log("Sending Payload:", payload); // DEBUGGING: Check Console

    try {
        const res = await fetch(`${API_NODE}/api/anime`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.msg || "Failed to save");
        
        // 3. SHOW TOAST
        showToast(`Saved "${title}"!`);
        
    } catch (err) {
        console.error("Save failed:", err);
        showToast("Error: Could not save.");
    }
}

// --- TOAST NOTIFICATION ---
function showToast(message) {
    let toast = document.getElementById("toast");
    // Create toast if it doesn't exist
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = "show";
    
    // Hide after 3 seconds
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// --- GENRE LOADER ---
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
