/* ==========================================================================
   FitMeals Engine - Complete & Optimized
   ========================================================================== */

const AppState = {
    currentCategory: 'all',
    selectedPantry: [],
    blacklistedIngredients: ['melanzane', 'menta', 'zucchine', 'pomodori', 'insalata'],
    myIngredients: ['pollo', 'spinaci', 'riso integrale', 'ceci', 'feta', 'uova', 'yogurt greco 0%', 'tuna', 'manzo'],
    noCookFilterActive: false,
    grillModeActive: false,
    selectedProtein: 'petto di pollo',
    recipes: [
        {
            id: 1,
            title: "Carpaccio di Manzo con Rucola & Feta",
            time: "5 min",
            calories: "380 kcal",
            protein: "36g",
            category: "sano",
            noCook: true,
            description: "Piatto fresco e proteico senza cottura, pronto in pochi minuti.",
            ingredients: ['manzo', 'feta', 'rucola'],
            steps: ["Disponi il carpaccio sul piatto.", "Aggiungi la rucola fresca e la feta sbriciolata.", "Condisci con olio evo e limone a piacere."]
        },
        {
            id: 2,
            title: "Poke Bowl Tonno & Avocado",
            time: "8 min",
            calories: "490 kcal",
            protein: "38g",
            category: "sano",
            noCook: true,
            description: "Bowl fredda bilanciata con tonno fresco, riso precotto e verdure croccanti.",
            ingredients: ['tuna', 'riso', 'avocado'],
            steps: ["Unisci il riso cotto nella bowl.", "Aggiungi il tonno e l'avocado a cubetti.", "Completa con salsa di soia a basso sodio."]
        },
        {
            id: 3,
            title: "Yogurt Bowl Proteica con Frutti di Bosco",
            time: "3 min",
            calories: "320 kcal",
            protein: "30g",
            category: "medio",
            noCook: true,
            description: "Spuntino o pasto express a base di yogurt greco 0% e topping proteici.",
            ingredients: ['yogurt greco 0%', 'frutti di bosco'],
            steps: ["Versa lo yogurt greco 0% in una ciotola.", "Aggiungi i frutti di bosco freschi.", "Gusta subito."]
        },
        {
            id: 4,
            title: "Bowl Proteica Calda Pollo & Spinaci",
            time: "15 min",
            calories: "520 kcal",
            protein: "42g",
            category: "sano",
            noCook: false,
            description: "Classico piatto caldo con pollo piastrato e spinaci saltati.",
            ingredients: ['pollo', 'spinaci', 'riso integrale'],
            steps: ["Pesa e cuoci il riso integrale.", "Piastra il pollo con le tue spezie preferite.", "Salta gli spinaci in padella e servi tutto insieme."]
        }
    ]
};

// Funzione di utilità per filtrare in base alla blacklist
function isAllowedByBlacklist(recipe) {
    return !recipe.ingredients.some(ing => 
        AppState.blacklistedIngredients.includes(ing.toLowerCase())
    );
}

// Rendering Vista Home (Ricette)
function renderHomeView() {
    const listEl = document.getElementById('recipe-list');
    if (!listEl) return;

    let filtered = AppState.recipes.filter(isAllowedByBlacklist);

    if (AppState.currentCategory !== 'all') {
        filtered = filtered.filter(r => r.category === AppState.currentCategory);
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 20px;">Nessuna ricetta trovata in questa categoria.</p>`;
        return;
    }

    listEl.innerHTML = filtered.map(r => `
        <div class="glass-card" onclick="openRecipeDetail(${r.id})">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.7rem; background: rgba(184,147,94,0.2); color: var(--accent-primary); padding: 3px 8px; border-radius: 6px; font-weight: 700; text-transform: uppercase;">
                    ${r.category}
                </span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">⏱️ ${r.time} | 🔥 ${r.calories}</span>
            </div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 4px;">${r.title}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">${r.description}</p>
            <div style="font-size: 0.75rem; color: var(--accent-primary); font-weight: 600;">Proteine: ${r.protein}</div>
        </div>
    `).join('');
}

// Rendering Vista Svuota Frigo
function renderFridgeView() {
    const chipsEl = document.getElementById('pantry-chips');
    const resultsEl = document.getElementById('fridge-results');
    if (!chipsEl || !resultsEl) return;

    chipsEl.innerHTML = AppState.myIngredients.map(ing => {
        const active = AppState.selectedPantry.includes(ing);
        return `
            <button type="button" class="chip ${active ? 'active' : ''}" onclick="togglePantryItem('${ing}')">
                ${active ? '✓ ' : '+ '} ${ing}
            </button>
        `;
    }).join('');

    let matching = AppState.recipes.filter(isAllowedByBlacklist);
    if (AppState.selectedPantry.length > 0) {
        matching = matching.filter(r => 
            r.ingredients.some(i => AppState.selectedPantry.includes(i))
        );
    } else {
        matching = [];
    }

    if (AppState.selectedPantry.length === 0) {
        resultsEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 20px; font-style: italic;">Seleziona almeno un ingrediente sopra per vedere le ricette abbinabili.</p>`;
        return;
    }

    if (matching.length === 0) {
        resultsEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 20px;">Nessuna ricetta trovata con gli ingredienti selezionati.</p>`;
        return;
    }

    resultsEl.innerHTML = matching.map(r => `
        <div class="glass-card" onclick="openRecipeDetail(${r.id})">
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 4px;">${r.title}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">⏱️ ${r.time} | 🥩 Proteine: ${r.protein}</p>
        </div>
    `).join('');
}

function togglePantryItem(ing) {
    const idx = AppState.selectedPantry.indexOf(ing);
    if (idx > -1) {
        AppState.selectedPantry.splice(idx, 1);
    } else {
        AppState.selectedPantry.push(ing);
    }
    renderFridgeView();
}

// Rendering Vista Profilo
function renderProfileView() {
    const blackListEl = document.getElementById('blacklist-tags');
    const myIngEl = document.getElementById('my-ingredients-tags');
    if (!blackListEl || !myIngEl) return;

    blackListEl.innerHTML = AppState.blacklistedIngredients.map(item => `
        <span class="chip" style="background: rgba(231, 76, 60, 0.2); border-color: #e74c3c; color: #ff6b6b;">
            ${item} <span onclick="removeBlacklist('${item}')" style="margin-left:6px; cursor:pointer; font-weight:bold;">&times;</span>
        </span>
    `).join('');

    myIngEl.innerHTML = AppState.myIngredients.map(item => `
        <span class="chip">
            ${item} <span onclick="removeMyIngredient('${item}')" style="margin-left:6px; cursor:pointer; font-weight:bold;">&times;</span>
        </span>
    `).join('');
}

function removeBlacklist(item) {
    AppState.blacklistedIngredients = AppState.blacklistedIngredients.filter(i => i !== item);
    renderProfileView();
    renderHomeView();
    renderFridgeView();
}

function removeMyIngredient(item) {
    AppState.myIngredients = AppState.myIngredients.filter(i => i !== item);
    renderProfileView();
    renderFridgeView();
}

// Rendering Vista Cerca Ricette / Smart Grill Studio
function renderRecipeSearchView() {
    const container = document.getElementById('recipe-search-content');
    if (!container) return;

    const proteins = ['petto di pollo', 'filetto di manzo', 'filetto di tonno', 'salmone', 'uova'];
    const proteinButtons = proteins.map(p => `
        <button type="button" class="chip ${AppState.selectedProtein === p ? 'active' : ''}" onclick="selectGrillProtein('${p}')">
            ${p}
        </button>
    `).join('');

    container.innerHTML = `
        <div class="glass-card" style="margin-bottom: 16px;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 8px;">🥩 Smart Grill Studio</h3>
            <p class="section-desc">Seleziona la proteina per ottenere la marinatura e i tempi perfetti:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">${proteinButtons}</div>
            <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 12px; font-size: 0.85rem; line-height: 1.5;">
                <strong>Consiglio dello Chef:</strong> Massaggia con spezie, pimentón dulce o senape, cuoci su piastra rovente e rispetta il tempo di riposo.
            </div>
        </div>
    `;
}

function selectGrillProtein(p) {
    AppState.selectedProtein = p;
    renderRecipeSearchView();
}

// Gestione Modale Dettaglio
function openRecipeDetail(id) {
    const recipe = AppState.recipes.find(r => r.id === id);
    const modal = document.getElementById('modal-detail');
    const body = document.getElementById('detail-body');
    if (!recipe || !modal || !body) return;

    body.innerHTML = `
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">${recipe.title}</h2>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px;">⏱️ ${recipe.time} | 🔥 ${recipe.calories} | 🥩 ${recipe.protein}</p>
        <p style="font-size: 0.9rem; margin-bottom: 16px;">${recipe.description}</p>
        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px;">Passaggi:</h3>
        <ol style="padding-left: 20px; font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary);">
            ${recipe.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
    `;
    modal.classList.add('active');
}

// Inizializzazione Eventi Globali
document.addEventListener('DOMContentLoaded', () => {
    // Navigazione Tab
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            
            tab.classList.add('active');
            const target = tab.getAttribute('data-target');
            const targetView = document.getElementById(target);
            if (targetView) {
                targetView.classList.add('active');
                if (target === 'view-home') renderHomeView();
                if (target === 'view-fridge') renderFridgeView();
                if (target === 'view-profile') renderProfileView();
                if (target === 'view-recipe-search') renderRecipeSearchView();
            }
        });
    });

    // Filtri Categoria Home
    const filterChips = document.querySelectorAll('.filter-bar .chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            AppState.currentCategory = chip.getAttribute('data-filter');
            renderHomeView();
        });
    });

    // Modale Aggiungi Ricetta
    const btnOpenAdd = document.getElementById('btn-open-add');
    const modalAdd = document.getElementById('modal-add');
    const btnCloseAdd = document.getElementById('btn-close-add');

    if (btnOpenAdd && modalAdd) {
        btnOpenAdd.addEventListener('click', () => modalAdd.classList.add('active'));
    }
    if (btnCloseAdd && modalAdd) {
        btnCloseAdd.addEventListener('click', () => modalAdd.classList.remove('active'));
    }

    // Modale Dettaglio Chiusura
    const btnCloseDetail = document.getElementById('btn-close-detail');
    const modalDetail = document.getElementById('modal-detail');
    if (btnCloseDetail && modalDetail) {
        btnCloseDetail.addEventListener('click', () => modalDetail.classList.remove('active'));
    }

    // Gestione Input Profilo (Blacklist e Ingredienti)
    const btnAddForbidden = document.getElementById('btn-add-forbidden');
    const inputForbidden = document.getElementById('input-forbidden');
    if (btnAddForbidden && inputForbidden) {
        btnAddForbidden.addEventListener('click', () => {
            const val = inputForbidden.value.trim().toLowerCase();
            if (val && !AppState.blacklistedIngredients.includes(val)) {
                AppState.blacklistedIngredients.push(val);
                inputForbidden.value = '';
                renderProfileView();
                renderHomeView();
                renderFridgeView();
            }
        });
    }

    const btnAddIngredient = document.getElementById('btn-add-ingredient');
    const inputIngredient = document.getElementById('input-ingredient');
    if (btnAddIngredient && inputIngredient) {
        btnAddIngredient.addEventListener('click', () => {
            const val = inputIngredient.value.trim().toLowerCase();
            if (val && !AppState.myIngredients.includes(val)) {
                AppState.myIngredients.push(val);
                inputIngredient.value = '';
                renderProfileView();
                renderFridgeView();
            }
        });
    }

    // Primo rendering iniziale
    renderHomeView();
    renderFridgeView();
    renderProfileView();
    renderRecipeSearchView();
});
