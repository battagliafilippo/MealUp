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
        healthCategory: "clean",
        ingredients: [
            { nome: "Petto di pollo", quantita: 200, unita: "g" },
            { nome: "Ceci", quantita: 150, unita: "g" },
            { nome: "Cipolla", quantita: 0.5, unita: "pz" },
            { nome: "Senape", quantita: 1, unita: "cucchiaio" },
            { nome: "Cumino", quantita: 1, unita: "cucchiaino" }
        ],
        tags: ["Veloce", "Sano"],
        note: "Ottima anche fredda il giorno dopo.",
        contestoUso: "Pranzo da portare in ufficio",
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
        healthCategory: "highprotein",
        ingredients: [
            { nome: "Carpaccio di manzo", quantita: 150, unita: "g" },
            { nome: "Feta", quantita: 40, unita: "g" },
            { nome: "Funghi", quantita: 100, unita: "g" },
            { nome: "Pimentón", quantita: 1, unita: "pizzico" }
        ],
        tags: ["Veloce", "Senza cottura pollo"],
        note: "",
        contestoUso: "Cena leggera veloce",
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
        healthCategory: "postworkout",
        ingredients: [
            { nome: "Couscous", quantita: 80, unita: "g" },
            { nome: "Tonno", quantita: 120, unita: "g" },
            { nome: "Peperoni", quantita: 100, unita: "g" },
            { nome: "Cipolla", quantita: 0.5, unita: "pz" }
        ],
        tags: ["Veloce", "Sgarro leggero"],
        note: "Facoltativo: un filo d'olio a crudo prima di servire.",
        contestoUso: "Pranzo veloce da preparare in 10 minuti",
        steps: [
            "Reidrata il couscous con acqua bollente per 5 minuti.",
            "Unisci il tonno sgocciolato e i peperoni saltati in padella."
        ]
    }
];

function getDefaultIngredientNames() {
    const namesSet = new Set();
    DEFAULT_RECIPES.forEach(r => {
        r.ingredients.forEach(ing => namesSet.add(ing.nome));
    });
    return Array.from(namesSet);
}

const SUBSTITUTION_MAP = {
    "Petto di pollo": { substitute: "Tacchino", prepDelta: 0, cookDelta: 2 },
    "Carpaccio di manzo": { substitute: "Bresaola", prepDelta: -2, cookDelta: -1 },
    "Tonno": { substitute: "Sgombro", prepDelta: 0, cookDelta: 0 },
    "Couscous": { substitute: "Riso Integrale", prepDelta: 0, cookDelta: 3 },
    "Ceci": { substitute: "Fagioli Rossi", prepDelta: 0, cookDelta: 0 }
};

let recipes = JSON.parse(localStorage.getItem("fitmeals_recipes")) || DEFAULT_RECIPES;
let blacklist = JSON.parse(localStorage.getItem("fitmeals_blacklist")) || ["Insalata a foglia", "Menta", "Zucchine", "Melanzane", "Pomodori"];
let userIngredients = JSON.parse(localStorage.getItem("fitmeals_ingredients")) || getDefaultIngredientNames();
let selectedPantry = new Set();
let currentFilter = "all";

function saveUserIngredients() {
    localStorage.setItem("fitmeals_ingredients", JSON.stringify(userIngredients));
}

// ==========================================
// ENGINE LOGIC
// ==========================================
const RecipeEngine = {
    isSafe(recipe, blacklist) {
        if (!recipe.ingredients) return true;
        return !recipe.ingredients.some(ing => 
            blacklist.some(b => ing.nome.toLowerCase().includes(b.toLowerCase()))
        );
    },

    sortRecipes(recipesList) {
        const categoryPriority = { "clean": 1, "postworkout": 2, "highprotein": 3, "sgarro": 4 };
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
            const matchedCount = recipe.ingredients.filter(ing => 
                Array.from(selectedIngredients).some(sel => ing.nome.toLowerCase().includes(sel.toLowerCase()))
            ).length;

            const percentage = Math.round((matchedCount / recipe.ingredients.length) * 100);
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
        const tagsHtml = (recipe.tags && recipe.tags.length > 0)
            ? `<div class="recipe-info">${recipe.tags.map(t => `<span>#${t}</span>`).join(' ')}</div>`
            : '';
        card.innerHTML = `
            <div class="recipe-card-header">
                <div class="recipe-title">${recipe.title}</div>
                <span class="badge badge-${recipe.healthCategory}">${recipe.healthCategory}</span>
            </div>
            <div class="recipe-info">
                <span>⏱️ ${(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                <span>🔥 ${recipe.calories} kcal</span>
            </div>
            ${tagsHtml}
            <div class="recipe-macros">
                <div class="macro-item"><span>PRO</span><strong>${recipe.proteinGrams}g</strong></div>
                <div class="macro-item"><span>CARB</span><strong>${recipe.carbsGrams}g</strong></div>
                <div class="macro-item"><span>FAT</span><strong>${recipe.fatGrams}g</strong></div>
                <div class="macro-item"><span>INGR.</span><strong>${recipe.ingredients.length}</strong></div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderPantryChips() {
    const container = document.getElementById("pantry-chips");
    container.innerHTML = "";

    userIngredients.forEach(ing => {
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
            <p class="section-desc">Hai ${matchedCount} su ${recipe.ingredients.length} ingredienti.</p>
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

function renderMyIngredients() {
    const container = document.getElementById("my-ingredients-tags");
    if (!container) return;
    container.innerHTML = "";

    userIngredients.forEach(name => {
        const tag = document.createElement("div");
        tag.className = "tag-forbidden";
        tag.innerHTML = `${name} <span onclick="removeUserIngredient('${name.replace(/'/g, "\\'")}')">&times;</span>`;
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
    let openSteps = new Set();

    const modal = document.getElementById("modal-detail");
    const body = document.getElementById("detail-body");

    window.toggleStepAccordion = (idx) => {
        if (openSteps.has(idx)) {
            openSteps.delete(idx);
        } else {
            openSteps.add(idx);
        }
        renderDetailContent();
    };

    window.toggleSubstitution = (nome) => {
        const subInfo = SUBSTITUTION_MAP[nome];
        if (!subInfo) return;

        if (activeSubstitutions[nome]) {
            delete activeSubstitutions[nome];
            modifiedPrep -= subInfo.prepDelta;
            modifiedCook -= subInfo.cookDelta;
        } else {
            activeSubstitutions[nome] = subInfo.substitute;
            modifiedPrep += subInfo.prepDelta;
            modifiedCook += subInfo.cookDelta;
        }
        renderDetailContent();
    };

    function renderDetailContent() {
        const tagsHtml = (recipe.tags && recipe.tags.length > 0)
            ? `<div class="tags-container" style="margin-top:8px;">${recipe.tags.map(t => `<span class="chip">${t}</span>`).join('')}</div>`
            : '';

        const contestoHtml = recipe.contestoUso
            ? `<p class="section-desc" style="margin-top:8px;"><strong>Contesto d'uso:</strong> ${recipe.contestoUso}</p>`
            : '';

        const noteHtml = recipe.note
            ? `<p class="section-desc"><strong>Note:</strong> ${recipe.note}</p>`
            : '';

        body.innerHTML = `
            <h2>${recipe.title}</h2>
            <div class="recipe-info" style="margin-top:8px;">
                <span>⏱️ Prep: ${modifiedPrep}m | Cottura: ${modifiedCook}m</span>
                <span>🔥 ${recipe.calories} kcal</span>
            </div>
            ${tagsHtml}
            ${contestoHtml}
            ${noteHtml}

            <hr class="divider">
            <h3>Ingredienti</h3>
            <p class="section-desc">Tocca un ingrediente con icona 🔄 per sostituirlo:</p>
            <div class="pantry-grid">
                ${recipe.ingredients.map(ing => {
                    const subInfo = SUBSTITUTION_MAP[ing.nome];
                    const isSubbed = activeSubstitutions[ing.nome];
                    const displayName = isSubbed ? activeSubstitutions[ing.nome] : ing.nome;
                    return `
                        <div class="pantry-chip ${isSubbed ? 'selected' : ''}" onclick="toggleSubstitution('${ing.nome}')">
                            ${displayName} — ${ing.quantita}${ing.unita} ${subInfo ? '🔄' : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <hr class="divider">
            <h3>Preparazione</h3>
            <div class="step-accordion-list">
                ${recipe.steps && recipe.steps.length > 0
                    ? recipe.steps.map((s, idx) => {
                        const words = s.trim().split(/\s+/);
                        const preview = words.slice(0, 5).join(' ') + (words.length > 5 ? '…' : '');
                        const isOpen = openSteps.has(idx);
                        return `
                            <div class="step-accordion-item ${isOpen ? 'step-open' : ''}">
                                <div class="step-accordion-header" onclick="toggleStepAccordion(${idx})">
                                    <span class="step-accordion-number">${idx + 1}</span>
                                    <span class="step-accordion-preview">${preview}</span>
                                    <span class="step-accordion-arrow">›</span>
                                </div>
                                <div class="step-accordion-body" id="step-body-${idx}">
                                    <div class="step-accordion-content">${s}</div>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : '<p class="section-desc">Nessuna istruzione inserita.</p>'}
            </div>
        `;

        openSteps.forEach(idx => {
            const stepBody = document.getElementById(`step-body-${idx}`);
            if (stepBody) {
                stepBody.style.maxHeight = stepBody.scrollHeight + "px";
            }
        });
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

document.getElementById("btn-open-add").onclick = () => {
    document.getElementById("ingredient-suggestions").innerHTML = "";
    document.getElementById("modal-add").classList.add("active");
};
document.getElementById("btn-close-add").onclick = () => document.getElementById("modal-add").classList.remove("active");
document.getElementById("btn-close-detail").onclick = () => document.getElementById("modal-detail").classList.remove("active");

document.getElementById("form-add-recipe").onsubmit = (e) => {
    e.preventDefault();

    const rawIngredients = document.getElementById("add-ingredients").value
        .split(",")
        .map(i => i.trim())
        .filter(i => i.length > 0);

    const ingredients = rawIngredients.map(entry => {
        const parts = entry.split(":").map(p => p.trim());
        const nome = parts[0] || "";
        const quantita = parts[1] !== undefined ? parseFloat(parts[1]) || 0 : 0;
        const unita = parts[2] || "";
        return { nome, quantita, unita };
    }).filter(ing => ing.nome.length > 0);

    const tags = document.getElementById("add-tags").value
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

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
        ingredients: ingredients,
        tags: tags,
        note: document.getElementById("add-note").value.trim(),
        contestoUso: document.getElementById("add-contesto").value.trim(),
        steps: document.getElementById("add-steps").value.split(".").map(s => s.trim()).filter(s => s.length > 0)
    };

    recipes.push(newRecipe);
    localStorage.setItem("fitmeals_recipes", JSON.stringify(recipes));

    let ingredientsChanged = false;
    ingredients.forEach(ing => {
        if (ing.nome && !userIngredients.some(i => i.toLowerCase() === ing.nome.toLowerCase())) {
            userIngredients.push(ing.nome);
            ingredientsChanged = true;
        }
    });
    if (ingredientsChanged) {
        saveUserIngredients();
        renderMyIngredients();
        renderPantryChips();
    }

    document.getElementById("form-add-recipe").reset();
    document.getElementById("ingredient-suggestions").innerHTML = "";
    document.getElementById("modal-add").classList.remove("active");
    renderHomeFeed();
};

document.getElementById("add-ingredients").addEventListener("input", (e) => {
    const value = e.target.value;
    const segments = value.split(",");
    const lastSegment = segments[segments.length - 1].trim().toLowerCase();
    const suggestionsContainer = document.getElementById("ingredient-suggestions");
    suggestionsContainer.innerHTML = "";

    if (lastSegment.length === 0) return;

    const matches = userIngredients
        .filter(name => name.toLowerCase().includes(lastSegment))
        .slice(0, 6);

    matches.forEach(name => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = name;
        chip.onclick = () => {
            segments[segments.length - 1] = ` ${name}:`;
            e.target.value = segments.join(",").replace(/^\s+/, "");
            suggestionsContainer.innerHTML = "";
            e.target.focus();
        };
        suggestionsContainer.appendChild(chip);
    });
});

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

document.getElementById("btn-add-ingredient").onclick = () => {
    const input = document.getElementById("input-ingredient");
    const val = input.value.trim();
    if (val && !userIngredients.some(i => i.toLowerCase() === val.toLowerCase())) {
        userIngredients.push(val);
        saveUserIngredients();
        input.value = "";
        renderMyIngredients();
        renderPantryChips();
        renderFridgeResults();
    }
};

window.removeUserIngredient = (name) => {
    const isUsed = recipes.some(r =>
        r.ingredients.some(ing => ing.nome.toLowerCase() === name.toLowerCase())
    );

    if (isUsed) {
        alert(`Non puoi rimuovere "${name}": è usato in almeno una ricetta esistente.`);
        return;
    }

    userIngredients = userIngredients.filter(i => i !== name);
    saveUserIngredients();
    selectedPantry.delete(name);
    renderMyIngredients();
    renderPantryChips();
    renderFridgeResults();
};

renderHomeFeed();
renderPantryChips();
renderBlacklist();
renderMyIngredients();
