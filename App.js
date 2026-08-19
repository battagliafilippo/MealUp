// ==========================================
// DB & STATO INIZIALE
// ==========================================
const DEFAULT_RECIPES = [
    {
        id: "1",
        title: "Tagliata di Pollo Speziata e Ceci",
        prepTime: 3,
        cookTime: 6,
        calories: 420,
        proteinGrams: 45,
        carbsGrams: 30,
        fatGrams: 8,
        healthCategory: "sano",
        ingredientNames: ["Petto di pollo", "Ceci", "Cipolla", "Senape", "Cumino"],
        steps: [
            "Taglia il pollo a straccetti e condiscilo con senape e cumino.",
            "Salta in padella con cipolla e ceci per 6 minuti a fuoco vivo."
        ]
    },
    {
        id: "2",
        title: "Carpaccio di Manzo con Feta e Funghi",
        prepTime: 4,
        cookTime: 1,
        calories: 380,
        proteinGrams: 38,
        carbsGrams: 5,
        fatGrams: 18,
        healthCategory: "sano",
        ingredientNames: ["Carpaccio di manzo", "Feta", "Funghi", "Pimentón"],
        steps: [
            "Disponi il carpaccio nel piatto.",
            "Aggiungi i funghi trifolati caldi e sbriciola la feta sopra con pimentón."
        ]
    },
    {
        id: "3",
        title: "Couscous Express con Tonno e Peperoni",
        prepTime: 5,
        cookTime: 2,
        calories: 450,
        proteinGrams: 35,
        carbsGrams: 50,
        fatGrams: 10,
        healthCategory: "sano",
        ingredientNames: ["Couscous", "Tonno", "Peperoni", "Cipolla"],
        steps: [
            "Reidrata il couscous con acqua bollente per 5 minuti.",
            "Unisci il tonno sgocciolato e i peperoni saltati in padella."
        ]
    }
];

const COMMON_PANTRY = [
    "Petto di pollo", "Carpaccio di manzo", "Tonno", "Uova", "Feta",
    "Riso integrale", "Couscous", "Ceci", "Spinaci", "Cipolla", 
    "Funghi", "Peperoni", "Yogurt greco 0%"
];

const SUBSTITUTION_MAP = {
    "Petto di pollo": { substitute: "Tacchino", prepDelta: 0, cookDelta: 2 },
    "Carpaccio di manzo": { substitute: "Bresaola", prepDelta: -2, cookDelta: -1 },
    "Tonno": { substitute: "Sgombro", prepDelta: 0, cookDelta: 0 },
    "Couscous": { substitute: "Riso Integrale", prepDelta: 0, cookDelta: 3 },
    "Ceci": { substitute: "Fagioli Rossi", prepDelta: 0, cookDelta: 0 }
};

let recipes = JSON.parse(localStorage.getItem("fitmeals_recipes")) || DEFAULT_RECIPES;
let blacklist = JSON.parse(localStorage.getItem("fitmeals_blacklist")) || ["Insalata a foglia", "Menta", "Zucchine", "Melanzane", "Pomodori"];
let selectedPantry = new Set();
let currentFilter = "all";

// ==========================================
// ENGINE LOGIC
// ==========================================
const RecipeEngine = {
    isSafe(recipe, blacklist) {
        if (!recipe.ingredientNames) return true;
        return !recipe.ingredientNames.some(ing => 
            blacklist.some(b => ing.toLowerCase().includes(b.toLowerCase()))
        );
    },

    sortRecipes(recipesList) {
        const categoryPriority = { "sano": 1, "medio": 2, "sgarro": 3 };
        return [...recipesList].sort((a, b) => {
            const prioA = categoryPriority[a.healthCategory] || 99;
            const prioB = categoryPriority[b.healthCategory] || 99;
            if (prioA !== prioB) return prioA - prioB;
            
            const timeA = (a.prepTime || 0) + (a.cookTime || 0);
            const timeB = (b.prepTime || 0) + (b.cookTime || 0);
            return timeA - timeB;
        });
    },

    matchFridge(recipesList, selectedIngredients) {
        if (selectedIngredients.size === 0) return [];

        return recipesList.map(recipe => {
            const matchedCount = recipe.ingredientNames.filter(ing => 
                Array.from(selectedIngredients).some(sel => ing.toLowerCase().includes(sel.toLowerCase()))
            ).length;

            const percentage = Math.round((matchedCount / recipe.ingredientNames.length) * 100);
            return { recipe, percentage, matchedCount };
        })
        .filter(item => item.matchedCount > 0)
        .sort((a, b) => b.percentage - a.percentage);
    }
};

// ==========================================
// RENDER FUNCTIONS
// ==========================================
function renderHomeFeed() {
    const container = document.getElementById("recipe-list");
    container.innerHTML = "";

    let safeRecipes = recipes.filter(r => RecipeEngine.isSafe(r, blacklist));
    safeRecipes = RecipeEngine.sortRecipes(safeRecipes);

    if (currentFilter !== "all") {
        safeRecipes = safeRecipes.filter(r => r.healthCategory === currentFilter);
    }

    if (safeRecipes.length === 0) {
        container.innerHTML = `<div class="glass-card"><p class="section-desc">Nessuna ricetta trovata con i filtri e la blacklist selezionati.</p></div>`;
        return;
    }

    safeRecipes.forEach(recipe => {
        const card = document.createElement("div");
        card.className = "glass-card";
        card.onclick = () => openRecipeDetail(recipe.id);
        card.innerHTML = `
            <div class="recipe-card-header">
                <div class="recipe-title">${recipe.title}</div>
                <span class="badge badge-${recipe.healthCategory}">${recipe.healthCategory}</span>
            </div>
            <div class="recipe-info">
                <span>⏱️ ${(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                <span>🔥 ${recipe.calories} kcal</span>
            </div>
            <div class="recipe-macros">
                <div class="macro-item"><span>PRO</span><strong>${recipe.proteinGrams}g</strong></div>
                <div class="macro-item"><span>CARB</span><strong>${recipe.carbsGrams}g</strong></div>
                <div class="macro-item"><span>FAT</span><strong>${recipe.fatGrams}g</strong></div>
                <div class="macro-item"><span>INGR.</span><strong>${recipe.ingredientNames.length}</strong></div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderPantryChips() {
    const container = document.getElementById("pantry-chips");
    container.innerHTML = "";

    COMMON_PANTRY.forEach(ing => {
        const isSelected = selectedPantry.has(ing);
        const chip = document.createElement("div");
        chip.className = `pantry-chip ${isSelected ? 'selected' : ''}`;
        chip.textContent = ing;
        chip.onclick = () => {
            if (isSelected) selectedPantry.delete(ing);
            else selectedPantry.add(ing);
            renderPantryChips();
            renderFridgeResults();
        };
        container.appendChild(chip);
    });
}

function renderFridgeResults() {
    const container = document.getElementById("fridge-results");
    container.innerHTML = "";

    const safeRecipes = recipes.filter(r => RecipeEngine.isSafe(r, blacklist));
    const results = RecipeEngine.matchFridge(safeRecipes, selectedPantry);

    if (results.length === 0) {
        container.innerHTML = `<p class="section-desc">Seleziona uno o più ingredienti in alto per visualizzare le ricette realizzabili.</p>`;
        return;
    }

    results.forEach(({ recipe, percentage, matchedCount }) => {
        const card = document.createElement("div");
        card.className = "glass-card";
        card.onclick = () => openRecipeDetail(recipe.id);
        card.innerHTML = `
            <div class="recipe-card-header">
                <div class="recipe-title">${recipe.title}</div>
                <span class="match-percentage">Match ${percentage}%</span>
            </div>
            <p class="section-desc">Hai ${matchedCount} su ${recipe.ingredientNames.length} ingredienti.</p>
        `;
        container.appendChild(card);
    });
}

function renderBlacklist() {
    const container = document.getElementById("blacklist-tags");
    container.innerHTML = "";

    blacklist.forEach(item => {
        const tag = document.createElement("div");
        tag.className = "tag-forbidden";
        tag.innerHTML = `${item} <span onclick="removeForbidden('${item}')">&times;</span>`;
        container.appendChild(tag);
    });
}

// ==========================================
// DETTAGLIO RICETTA & SOSTITUZIONE
// ==========================================
function openRecipeDetail(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    let modifiedPrep = recipe.prepTime || 0;
    let modifiedCook = recipe.cookTime || 0;
    let activeSubstitutions = {};

    const modal = document.getElementById("modal-detail");
    const body = document.getElementById("detail-body");

    window.toggleSubstitution = (ing) => {
        const subInfo = SUBSTITUTION_MAP[ing];
        if (!subInfo) return;

        if (activeSubstitutions[ing]) {
            delete activeSubstitutions[ing];
            modifiedPrep -= subInfo.prepDelta;
            modifiedCook -= subInfo.cookDelta;
        } else {
            activeSubstitutions[ing] = subInfo.substitute;
            modifiedPrep += subInfo.prepDelta;
            modifiedCook += subInfo.cookDelta;
        }
        renderDetailContent();
    };

    function renderDetailContent() {
        body.innerHTML = `
            <h2>${recipe.title}</h2>
            <div class="recipe-info" style="margin-top:8px;">
                <span>⏱️ Prep: ${modifiedPrep}m | Cottura: ${modifiedCook}m</span>
                <span>🔥 ${recipe.calories} kcal</span>
            </div>

            <hr class="divider">
            <h3>Ingredienti</h3>
            <p class="section-desc">Tocca un ingrediente con icona 🔄 per sostituirlo:</p>
            <div class="pantry-grid">
                ${recipe.ingredientNames.map(ing => {
                    const subInfo = SUBSTITUTION_MAP[ing];
                    const isSubbed = activeSubstitutions[ing];
                    return `
                        <div class="pantry-chip ${isSubbed ? 'selected' : ''}" onclick="toggleSubstitution('${ing}')">
                            ${isSubbed ? activeSubstitutions[ing] : ing} ${subInfo ? '🔄' : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <hr class="divider">
            <h3>Preparazione</h3>
            <ol style="padding-left:20px; font-size:0.9rem; line-height:1.5;">
                ${recipe.steps && recipe.steps.length > 0 
                    ? recipe.steps.map(s => `<li style="margin-bottom:8px;">${s}</li>`).join('')
                    : '<li>Nessuna istruzione inserita.</li>'}
            </ol>
        `;
    }

    renderDetailContent();
    modal.classList.add("active");
}

// ==========================================
// EVENT LISTENERS & NAVIGATION
// ==========================================
document.querySelectorAll(".tab-item").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-item").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        
        btn.classList.add("active");
        document.getElementById(btn.dataset.target).classList.add("active");
    };
});

document.querySelectorAll(".chip").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderHomeFeed();
    };
});

document.getElementById("btn-open-add").onclick = () => document.getElementById("modal-add").classList.add("active");
document.getElementById("btn-close-add").onclick = () => document.getElementById("modal-add").classList.remove("active");
document.getElementById("btn-close-detail").onclick = () => document.getElementById("modal-detail").classList.remove("active");

document.getElementById("form-add-recipe").onsubmit = (e) => {
    e.preventDefault();
    const newRecipe = {
        id: Date.now().toString(),
        title: document.getElementById("add-title").value,
        prepTime: parseInt(document.getElementById("add-prep").value) || 0,
        cookTime: parseInt(document.getElementById("add-cook").value) || 0,
        calories: parseInt(document.getElementById("add-cal").value) || 0,
        proteinGrams: parseInt(document.getElementById("add-pro").value) || 0,
        carbsGrams: parseInt(document.getElementById("add-carbs").value) || 0,
        fatGrams: parseInt(document.getElementById("add-fat").value) || 0,
        healthCategory: document.getElementById("add-cat").value,
        ingredientNames: document.getElementById("add-ingredients").value.split(",").map(i => i.trim()).filter(i => i.length > 0),
        steps: document.getElementById("add-steps").value.split(".").map(s => s.trim()).filter(s => s.length > 0)
    };

    recipes.push(newRecipe);
    localStorage.setItem("fitmeals_recipes", JSON.stringify(recipes));
    document.getElementById("form-add-recipe").reset();
    document.getElementById("modal-add").classList.remove("active");
    renderHomeFeed();
};

document.getElementById("btn-add-forbidden").onclick = () => {
    const input = document.getElementById("input-forbidden");
    const val = input.value.trim();
    if (val && !blacklist.includes(val)) {
        blacklist.push(val);
        localStorage.setItem("fitmeals_blacklist", JSON.stringify(blacklist));
        input.value = "";
        renderBlacklist();
        renderHomeFeed();
    }
};

window.removeForbidden = (item) => {
    blacklist = blacklist.filter(b => b !== item);
    localStorage.setItem("fitmeals_blacklist", JSON.stringify(blacklist));
    renderBlacklist();
    renderHomeFeed();
};

// Inizializzazione
renderHomeFeed();
renderPantryChips();
renderBlacklist();
