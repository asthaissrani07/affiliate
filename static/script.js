// App State
let programsData = [];
let activeProgram = null;

// DOM Elements
const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("category-select");
const paymentSelect = document.getElementById("payment-select");
const sortSelect = document.getElementById("sort-select");
const resetFiltersBtn = document.getElementById("reset-filters");
const programsTbody = document.getElementById("programs-tbody");
const programsMobileList = document.getElementById("programs-mobile-list");
const showingResultsLabel = document.getElementById("showing-results");

const detailModal = document.getElementById("detail-modal");
const adminModal = document.getElementById("admin-modal");
const submitModal = document.getElementById("submit-modal");
const toast = document.getElementById("toast");

// App Init
document.addEventListener("DOMContentLoaded", () => {
    fetchMeta();
    fetchPrograms();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    searchInput.addEventListener("input", debounce(fetchPrograms, 300));
    categorySelect.addEventListener("change", fetchPrograms);
    paymentSelect.addEventListener("change", fetchPrograms);
    sortSelect.addEventListener("change", fetchPrograms);
    resetFiltersBtn.addEventListener("click", resetFilters);
    
    // Close modal on click outside
    window.addEventListener("click", (e) => {
        if (e.target === detailModal) closeDetailModal();
        if (e.target === adminModal) closeAdminModal();
        if (e.target === submitModal) closeSubmitModal();
    });
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Reset all filters
function resetFilters() {
    searchInput.value = "";
    categorySelect.value = "";
    paymentSelect.value = "";
    sortSelect.value = "rating_desc";
    fetchPrograms();
}

// Fetch Filter Metadata
async function fetchMeta() {
    try {
        const response = await fetch("/api/meta");
        const meta = await response.json();
        
        // Populate category dropdown
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        meta.categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
        
        // Populate payment dropdown
        paymentSelect.innerHTML = '<option value="">All Payment Methods</option>';
        meta.payment_methods.forEach(pm => {
            const option = document.createElement("option");
            option.value = pm;
            option.textContent = pm;
            paymentSelect.appendChild(option);
        });
        
        // Populate submit modal checkboxes
        const subCatsContainer = document.getElementById("sub-categories-checkboxes");
        if (subCatsContainer) {
            subCatsContainer.innerHTML = "";
            meta.categories.forEach(cat => {
                const div = document.createElement("div");
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.gap = "0.35rem";
                
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = "categories";
                checkbox.value = cat;
                checkbox.id = `sub-cat-${cat.replace(/\s+/g, '-').toLowerCase()}`;
                
                const label = document.createElement("label");
                label.htmlFor = checkbox.id;
                label.textContent = cat;
                label.style.fontSize = "0.85rem";
                label.style.cursor = "pointer";
                
                div.appendChild(checkbox);
                div.appendChild(label);
                subCatsContainer.appendChild(div);
            });
        }

        const subPaymentsContainer = document.getElementById("sub-payments-checkboxes");
        if (subPaymentsContainer) {
            subPaymentsContainer.innerHTML = "";
            meta.payment_methods.forEach(pm => {
                const div = document.createElement("div");
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.gap = "0.35rem";
                
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = "payments";
                checkbox.value = pm;
                checkbox.id = `sub-pm-${pm.replace(/\s+/g, '-').toLowerCase()}`;
                
                const label = document.createElement("label");
                label.htmlFor = checkbox.id;
                label.textContent = pm;
                label.style.fontSize = "0.85rem";
                label.style.cursor = "pointer";
                
                div.appendChild(checkbox);
                div.appendChild(label);
                subPaymentsContainer.appendChild(div);
            });
        }

        // Update hero numbers if necessary
        document.getElementById("stat-count").textContent = meta.total_programs;
        document.getElementById("stat-categories").textContent = meta.categories.length;
        document.getElementById("stat-payments").textContent = meta.payment_methods.length;
        
    } catch (err) {
        console.error("Error fetching filter metadata:", err);
    }
}

// Fetch programs with query parameters
async function fetchPrograms() {
    const search = searchInput.value;
    const category = categorySelect.value;
    const payment = paymentSelect.value;
    const sort = sortSelect.value;
    
    let url = `/api/programs?sort_by=${sort}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (payment) url += `&payment_method=${encodeURIComponent(payment)}`;
    
    try {
        const response = await fetch(url);
        programsData = await response.json();
        renderPrograms(programsData);
    } catch (err) {
        console.error("Error fetching programs:", err);
    }
}

// Render Table Rows & Mobile Cards
function renderPrograms(programs) {
    // Update count label
    showingResultsLabel.textContent = `Showing ${programs.length} Programs`;
    
    // Clear tbody and list
    programsTbody.innerHTML = "";
    programsMobileList.innerHTML = "";
    
    if (programs.length === 0) {
        const emptyRow = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-face-dashed" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block; color: #cbd5e1;"></i>
                    No affiliate programs found matching your search.
                </td>
            </tr>
        `;
        programsTbody.innerHTML = emptyRow;
        
        programsMobileList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fa-solid fa-face-dashed" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block; color: #cbd5e1;"></i>
                No affiliate programs found matching your search.
            </div>
        `;
        return;
    }
    
    programs.forEach(prog => {
        // Categories HTML (limit to 2 and add +N more badge if needed)
        let catsHtml = "";
        if (prog.categories.length <= 2) {
            catsHtml = prog.categories.map(c => `<span class="tag category">${c}</span>`).join("");
        } else {
            catsHtml = prog.categories.slice(0, 2).map(c => `<span class="tag category">${c}</span>`).join("") +
                       `<span class="tag category-more" title="${prog.categories.slice(2).join(', ')}">+${prog.categories.length - 2} more</span>`;
        }

        // Payments HTML (limit to 2 and add +N more badge if needed)
        let pmsHtml = "";
        if (prog.payment_methods.length <= 2) {
            pmsHtml = prog.payment_methods.map(pm => `<span class="tag payment">${pm}</span>`).join("");
        } else {
            pmsHtml = prog.payment_methods.slice(0, 2).map(pm => `<span class="tag payment">${pm}</span>`).join("") +
                      `<span class="tag payment-more" title="${prog.payment_methods.slice(2).join(', ')}">+${prog.payment_methods.length - 2} more</span>`;
        }
        
        // Promo Badge HTML if referral code exists
        let promoBadge = "";
        if (prog.referral_code) {
            promoBadge = `
                <span class="promo-badge" title="Promo Code: ${prog.referral_code}" onclick="copyReferralCode('${prog.referral_code}', event)">
                    <i class="fa-solid fa-gift"></i> Code
                </span>
            `;
        }
        
        // Check for undefined or empty logo, use fallback
        const logoUrl = prog.logo_url || "https://affiliate.watch/favicon/favicon-96x96.png";
        
        // Desktop Row
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div class="prog-info-cell">
                    <img class="prog-logo" src="${logoUrl}" alt="${prog.name}" onerror="this.src='https://affiliate.watch/favicon/favicon-96x96.png'">
                    <div class="prog-name-desc">
                        <span class="prog-name">${prog.name} ${promoBadge}</span>
                        <span class="prog-desc">${prog.teaser_company}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="prog-commission">${prog.teaser_affiliate}</span>
            </td>
            <td>
                <div class="tags-container">${catsHtml}</div>
            </td>
            <td>
                <div class="tags-container">${pmsHtml}</div>
            </td>
            <td>
                <div class="rating-cell">
                    <span class="ai-rating-badge">${prog.rating_ai}</span>
                    <span class="ai-rating-label">AI RATING</span>
                </div>
            </td>
            <td>
                <div class="actions-cell">
                    <a href="/go/${prog.slug}" target="_blank" class="btn btn-primary" onclick="incrementClicksCount('${prog.slug}')">
                        Join <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                    <button class="btn btn-secondary" onclick="openDetailModal(${prog.id})">
                        Details
                    </button>
                </div>
            </td>
        `;
        programsTbody.appendChild(tr);
        
        // Mobile Card
        const card = document.createElement("div");
        card.className = "mobile-card";
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-title">
                    <img class="prog-logo" src="${logoUrl}" alt="${prog.name}" onerror="this.src='https://affiliate.watch/favicon/favicon-96x96.png'">
                    <div>
                        <h4>${prog.name}</h4>
                        <span class="prog-commission" style="font-size: 0.85rem;">${prog.teaser_affiliate}</span>
                    </div>
                </div>
                <span class="ai-rating-badge" style="font-size: 0.75rem;">${prog.rating_ai} AI</span>
            </div>
            <p class="mobile-card-desc">${prog.teaser_company}</p>
            <div class="mobile-card-meta">
                <div class="mobile-meta-row">
                    <span class="mobile-meta-label">Categories:</span>
                    <span class="mobile-meta-val">${prog.categories.join(", ")}</span>
                </div>
                <div class="mobile-meta-row">
                    <span class="mobile-meta-label">Payouts:</span>
                    <span class="mobile-meta-val">${prog.payment_methods.slice(0, 3).join(", ")}</span>
                </div>
                ${prog.referral_code ? `
                <div class="mobile-meta-row" style="color: var(--success);">
                    <span class="mobile-meta-label">Code:</span>
                    <span class="mobile-meta-val" style="cursor:pointer;" onclick="copyReferralCode('${prog.referral_code}', event)"><strong>${prog.referral_code}</strong> <i class="fa-regular fa-copy"></i></span>
                </div>
                ` : ""}
            </div>
            <div class="mobile-card-actions">
                <a href="/go/${prog.slug}" target="_blank" class="btn btn-primary" onclick="incrementClicksCount('${prog.slug}')">
                    Join <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
                <button class="btn btn-secondary" onclick="openDetailModal(${prog.id})">
                    Details
                </button>
            </div>
        `;
        programsMobileList.appendChild(card);
    });
}

// Copy Code to Clipboard
function copyReferralCode(code, event) {
    if (event) event.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Copied Referral Code: "${code}"!`);
    }).catch(err => {
        console.error("Could not copy referral code: ", err);
    });
}

function showToast(message) {
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(() => {
        toast.className = "toast";
    }, 2500);
}

// Click Tracking increment local visual state
function incrementClicksCount(slug) {
    // Optionally update display after delay, or just let backend track it
    setTimeout(() => {
        fetchPrograms();
    }, 1000);
}

// Detail Modal Management
function openDetailModal(id) {
    const prog = programsData.find(p => p.id === id);
    if (!prog) return;
    
    activeProgram = prog;
    
    const logoUrl = prog.logo_url || "https://affiliate.watch/favicon/favicon-96x96.png";
    document.getElementById("modal-logo").src = logoUrl;
    document.getElementById("modal-name").textContent = prog.name;
    document.getElementById("modal-teaser-company").textContent = prog.teaser_company;
    document.getElementById("modal-teaser-affiliate").textContent = prog.teaser_affiliate;
    document.getElementById("modal-rating").textContent = prog.rating_ai;
    document.getElementById("modal-cookie").textContent = prog.cookie_days ? `${prog.cookie_days} Days` : "Lifetime";
    document.getElementById("modal-launch").textContent = prog.launch_year || "N/A";
    
    // Render Modal Categories
    const modalCats = document.getElementById("modal-categories");
    modalCats.innerHTML = prog.categories.map(c => `<span class="tag category">${c}</span>`).join("");
    
    // Render Modal Payments
    const modalPayments = document.getElementById("modal-payments");
    modalPayments.innerHTML = prog.payment_methods.map(pm => `<span class="tag payment">${pm}</span>`).join("");
    
    // Referral code section
    const codeSection = document.getElementById("modal-code-section");
    if (prog.referral_code) {
        codeSection.style.display = "block";
        document.getElementById("modal-code").textContent = prog.referral_code;
    } else {
        codeSection.style.display = "none";
    }
    
    // Action buttons URLs
    document.getElementById("modal-website-btn").href = prog.website;
    document.getElementById("modal-join-btn").href = `/go/${prog.slug}`;
    
    detailModal.style.display = "flex";
}

function closeDetailModal() {
    detailModal.style.display = "none";
    activeProgram = null;
}

function copyModalCode() {
    if (activeProgram && activeProgram.referral_code) {
        copyReferralCode(activeProgram.referral_code);
    }
}

function incrementLocalClicks() {
    if (activeProgram) {
        incrementClicksCount(activeProgram.slug);
    }
    closeDetailModal();
}

// Database Admin Modal Management
async function openAdminModal() {
    // Fetch latest fresh data for admin view
    try {
        const response = await fetch("/api/programs?sort_by=name_asc");
        const programs = await response.json();
        renderAdminRows(programs);
        adminModal.style.display = "flex";
    } catch (err) {
        console.error("Error loading programs for admin panel: ", err);
    }
}

function renderAdminRows(programs) {
    const adminTbody = document.getElementById("admin-tbody");
    adminTbody.innerHTML = "";
    
    programs.forEach(prog => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${prog.name}</strong></td>
            <td><a href="${prog.website}" target="_blank" style="color:var(--primary);text-decoration:underline;">${prog.website.replace("https://", "").replace("www.", "")}</a></td>
            <td>
                <input type="text" id="admin-url-${prog.id}" value="${prog.affiliate_url}" placeholder="https://...">
            </td>
            <td>
                <input type="text" id="admin-code-${prog.id}" value="${prog.referral_code || ''}" placeholder="e.g. SAVE20 (Optional)">
            </td>
            <td>
                <button class="btn btn-primary" onclick="saveProgramChanges(${prog.id})">
                    <i class="fa-solid fa-save"></i> Save
                </button>
            </td>
        `;
        adminTbody.appendChild(tr);
    });
}

async function saveProgramChanges(id) {
    const urlInput = document.getElementById(`admin-url-${id}`);
    const codeInput = document.getElementById(`admin-code-${id}`);
    
    const payload = {
        affiliate_url: urlInput.value,
        referral_code: codeInput.value || null
    };
    
    if (!payload.affiliate_url.startsWith("http://") && !payload.affiliate_url.startsWith("https://")) {
        alert("Affiliate URL must start with http:// or https://");
        return;
    }
    
    try {
        const response = await fetch(`/api/programs/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Program settings saved successfully!");
            fetchPrograms(); // Refresh main lists
        } else {
            const err = await response.json();
            alert(`Error: ${err.detail || "Could not save details"}`);
        }
    } catch (err) {
        console.error("Error saving program settings:", err);
        alert("A server error occurred. Please verify your FastAPI server connection.");
    }
}

function closeAdminModal() {
    adminModal.style.display = "none";
}

// Submit Program Modal Management
function openSubmitModal() {
    submitModal.style.display = "flex";
}

function closeSubmitModal() {
    submitModal.style.display = "none";
    document.getElementById("submit-program-form").reset();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get checked categories
    const categories = [];
    document.querySelectorAll('input[name="categories"]:checked').forEach(cb => {
        categories.push(cb.value);
    });
    
    // Get checked payment methods
    const payment_methods = [];
    document.querySelectorAll('input[name="payments"]:checked').forEach(cb => {
        payment_methods.push(cb.value);
    });
    
    const payload = {
        name: document.getElementById("sub-name").value,
        website: document.getElementById("sub-website").value,
        affiliate_url: document.getElementById("sub-aff-url").value,
        referral_code: document.getElementById("sub-ref-code").value || null,
        teaser_affiliate: document.getElementById("sub-commission").value,
        teaser_company: document.getElementById("sub-description").value,
        rating_ai: parseFloat(document.getElementById("sub-rating").value) || 90.0,
        cookie_days: parseInt(document.getElementById("sub-cookie").value) || 30,
        launch_year: parseInt(document.getElementById("sub-launch").value) || 2026,
        logo_url: document.getElementById("sub-logo").value || null,
        categories: categories,
        payment_methods: payment_methods
    };
    
    try {
        const response = await fetch("/api/programs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Program submitted successfully!");
            closeSubmitModal();
            // Refresh counts, filters and programs
            await fetchMeta();
            await fetchPrograms();
        } else {
            const err = await response.json();
            alert(`Error: ${err.detail || "Could not submit program"}`);
        }
    } catch (err) {
        console.error("Error submitting program:", err);
        alert("A server error occurred. Please verify your connection.");
    }
}
