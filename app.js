/* ==========================================================================
   MealUp App Engine - Complete Code (Fixed)
   ========================================= */

// --- 1. STATO DELL'APPLICAZIONE (APP STATE) ---
const AppState = {
    workoutState: 'rest', // 'rest' | 'home_gym' | 'cardio' | 'tennis'
    activeCategory: 'all', // 'all' | 'clean' | 'postworkout' | 'highprotein' | 'sgarro'
    sortBy: 'calories_asc', // 'calories_asc' | 'calories_desc' | 'protein_desc' | 'best_value'
    selectedPantryIngredients: [],
    blacklist: ['insalata', 'menta', 'zucchine', 'melanzane', 'pomodori'],
    recipes: [],
    packagedProducts: []
};

// --- 2. DATABASE INIZIALE (RICETTE & PRODOTTI CONFEZIONATI) ---
const INITIAL_RECIPES = [
    {
        id: 'rec_1',
        title: 'Carpaccio di Manzo alla Senape, Pimentón e Feta',
        category: 'clean',
        prepTime: 10,
        cookTime: 0,
        calories: 340,
        protein: 42,
        carbs: 6,
        fat: 14,
        ingredients: ['carpaccio', 'feta', 'senape', 'pimenton', 'erba cipollina'],
        steps: [
            'Disponi le fettine sottili di carpaccio di manzo su un piatto grande.',
            'Preparare un\'emulsione veloce unendo la senape, una spolverata di pimentón (dolce o piccante) e un filo d\'acqua per ammorbidire.',
            'Spennella l\'emulsione sulla carne in modo omogeneo.',
            'Sbriciola la feta sopra il carpaccio e guarnisci con abbondante erba cipollina fresca tritata.'
        ],
        idealFor: ['rest', 'home_gym']
    },
    {
        id: 'rec_2',
        title: 'Pollo al Curry Speziato con Couscous e Cumin',
        category: 'postworkout',
        prepTime: 12,
        cookTime: 15,
        calories: 520,
        protein: 48,
        carbs: 58,
        fat: 8,
        ingredients: ['pollo', 'couscous', 'cumino', 'pimenton', 'funghi', 'cipolla', 'salsa soy low sodium'],
        steps: [
            'Taglia il petto di pollo a dadini salandoli leggermente.',
            'In una padella antiaderente, rosolo la cipolla tritata e i funghi a fette con un goccio d\'acqua e salsa di soia a basso contenuto di sodio.',
            'Aggiungi il pollo, spolvera con cumino e pimentón e cuoci a fuoco vivo per 8-10 minuti.',
            'Reidrata il couscous versandoci sopra acqua bollente salata in pari volume, copri per 5 minuti e sgrana con una forchetta.',
            'Servi il pollo ben caldo sopra il letto di couscous.'
        ],
        idealFor: ['home_gym', 'cardio', 'tennis']
    },
    {
        id: 'rec_3',
        title: 'Bowl Proteica di Tonno, Ceci Croccanti e Spinaci',
        category: 'highprotein',
        prepTime: 10,
        cookTime: 12,
        calories: 460,
        protein: 45,
        carbs: 40,
        fat: 10,
        ingredients: ['tonno', 'ceci', 'spinaci', 'pimenton', 'cumino', 'erba cipollina'],
        steps: [
            'Scola i ceci e asciugali bene con carta da cucina.',
            'Salta i ceci in padella a fuoco alto con pimentón e cumino per 10-12 minuti finché non diventano croccanti.',
            'Salta gli spinaci freschi in padella per un paio di minuti finché non appassiscono.',
            'Componi la bowl unendo gli spinaci, i ceci croccanti, il tonno ben sgocciolato e rifinisci con erba cipollina.'
        ],
        idealFor: ['home_gym', 'tennis']
    },
    {
        id: 'rec_4',
        title: 'Riso Integrale con Uova, Peperoni e Soy Dip',
        category: 'clean',
        prepTime: 10,
        cookTime: 20,
        calories: 410,
        protein: 24,
        carbs: 52,
        fat: 11,
        ingredients: ['riso integrale', 'uova', 'peperoni', 'salsa soy low sodium', 'erba cipollina'],
        steps: [
            'Lessa il riso integrale in acqua salata e scolalo al dente.',
            'Taglia i peperoni a dadini e rosolali in padella finché non diventano morbidi.',
            'In un pentolino prepara le uova sode (8 minuti di bollitura) o strapazzale direttamente con i peperoni.',
            'Unisci il riso ai peperoni e all\'uovo, condisci con un filo di salsa di soia a basso contenuto di sodio ed erba cipollina.'
        ],
        idealFor: ['rest', 'cardio']
    },
    {
        id: 'rec_5',
        title: 'Fit-Pancake Proteico al Greco 0% e Pimentón Dolce',
        category: 'highprotein',
        prepTime: 5,
        cookTime: 8,
        calories: 290,
        protein: 36,
        carbs: 22,
        fat: 3,
        ingredients: ['yogurt greco 0%', 'uova', 'erba cipollina', 'pimenton'],
        steps: [
            'In una ciotola, mescola 1 uovo, 2 albumi e un cucchiaio di yogurt greco 0%.',
            'Aggiungi un pizzico di sale e una spolverata di pimentón dolce.',
            'Versa il composto in un pentolino antiaderente ben caldo e cuoci 4 minuti per lato a fuoco basso con coperchio.',
            'Servi il pancake salato guarnito con il restante yogurt greco 0% ed erba cipollina fresca.'
        ],
        idealFor: ['rest', 'home_gym']
    },
    {
        id: 'rec_6',
        title: 'Burger Gourmet di Manzo con Feta, Funghi e Senape',
        category: 'sgarro',
        prepTime: 10,
        cookTime: 12,
        calories: 680,
        protein: 52,
        carbs: 38,
        fat: 32,
        ingredients: ['carpaccio', 'feta', 'funghi', 'senape', 'cipolla'],
        steps: [
            'Forma degli svizzeri o burger spessi partendo da macinato di carne magra o tritando finemente il carpaccio.',
            'Cuoci i burger sulla piastra rovente per 4-5 minuti per lato.',
            'In un\'altra padella, rosoli i funghi e le cipolle a fette con senape e un goccio d\'acqua.',
            'A fine cottura adagia sui burger la feta sbriciolata facendo fondere leggermente e copri con il mix di funghi e cipolle.'
        ],
        idealFor: ['sgarro']
    }
];

const INITIAL_PACKAGED_PRODUCTS = [
    {
        id: 'pack_1',
        name: 'HiPRO Danone Drink 25g',
        brand: 'Danone',
        calories: 160,
        protein: 25,
        type: 'Drink Proteico',
        description: 'Senza grassi, ideale post-workout immediato.'
    },
    {
        id: 'pack_2',
        name: 'HiPRO Pudding Cioccolato',
        brand: 'Danone',
        calories: 152,
        protein: 20,
        type: 'Pudding Proteico',
        description: 'Cremoso, perfetto per placare la voglia di dolce rimanendo in target.'
    },
    {
        id: 'pack_3',
        name: 'Protein Pudding Caramel',
        brand: 'Ehrmann',
        calories: 150,
        protein: 20,
        type: 'Pudding Proteico',
        description: 'Gusto caramello intenso, zero zuccheri aggiunti.'
    }
];

// --- 3. LOGICA ALGORITMICA: BEST VALUE & VALUTAZIONE METRICHE ---
function calculateBestValueIndex(recipe) {
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const safeTime = totalTime > 0 ? totalTime : 1;
    const safeCalories = recipe.calories > 0 ? recipe.calories : 100;
    
    const index = (recipe.protein / safeTime) * (1000 / safeCalories);
    return Number(index.toFixed(2));
}

function processBestValueBadges(recipesList) {
    if (!recipesList.length) return [];
    
    const scored = recipesList.map(r => ({
        ...r,
        bvScore: calculateBestValueIndex(r)
    }));

    const maxScore = Math.max(...scored.map(r => r.bvScore));

    return scored.map(r => ({
        ...r,
        isBestValue: r.bvScore === maxScore || (maxScore > 0 && r.bvScore >= maxScore * 0.85)
    }));
}

// --- 4. GESTIONE BLACKLIST & FILTRAGGIO INGREDIENTI ---
function containsBlacklistedIngredient(ingredientsList, blacklist) {
    if (!ingredientsList || !ingredientsList.length) return false;
    return ingredientsList.some(ing => 
        blacklist.some(forbidden => ing.toLowerCase().includes(forbidden.toLowerCase()))
    );
}

function filterRecipesByBlacklist(recipesList, blacklist) {
    return recipesList.filter(recipe => !containsBlacklistedIngredient(recipe.ingredients, blacklist));
}

// --- 5. CALCOLO AUTOMATICO NUTRIENTI & CATEGORIE ---
function autoCalculateCategoryAndMacros(recipeData) {
    const cal = Number(recipeData.calories) || 0;
    const prot = Number(recipeData.protein) || 0;
    const carbs = Number(recipeData.carbs) || 0;
    const fat = Number(recipeData.fat) || 0;

    let assignedCategory = 'clean';

    if (cal > 650 || fat > 25) {
        assignedCategory = 'sgarro';
    } else if (prot >= 40 && carbs >= 45) {
        assignedCategory = 'postworkout';
    } else if (prot >= 35) {
        assignedCategory = 'highprotein';
    } else {
        assignedCategory = 'clean';
    }

    return assignedCategory;
}

// --- 6. PERSISTENZA LOCAL STORAGE ---
function loadDataFromStorage() {
    const storedRecipes = localStorage.getItem('mealup_recipes');
    const storedBlacklist = localStorage.getItem('mealup_blacklist');
    const storedProducts = localStorage.getItem('mealup_products');

    if (storedRecipes) {
        AppState.recipes = JSON.parse(storedRecipes);
    } else {
        AppState.recipes = INITIAL_RECIPES;
        localStorage.setItem('mealup_recipes', JSON.stringify(INITIAL_RECIPES));
    }

    if (storedBlacklist) {
        AppState.blacklist = JSON.parse(storedBlacklist);
    } else {
        localStorage.setItem('mealup_blacklist', JSON.stringify(AppState.blacklist));
    }

    if (storedProducts) {
        AppState.packagedProducts = JSON.parse(storedProducts);
    } else {
        AppState.packagedProducts = INITIAL_PACKAGED_PRODUCTS;
        localStorage.setItem('mealup_products', JSON.stringify(INITIAL_PACKAGED_PRODUCTS));
    }
}

function saveDataToStorage() {
    localStorage.setItem('mealup_recipes', JSON.stringify(AppState.recipes));
    localStorage.setItem('mealup_blacklist', JSON.stringify(AppState.blacklist));
    localStorage.setItem('mealup_products', JSON.stringify(AppState.packagedProducts));
}

// --- 7. RENDERING & UI CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    setupEventListeners();
    renderAll();
});

function setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetView = e.currentTarget.getAttribute('data-view');
            switchView(targetView);
        });
    });

    // Workout State Selector
    document.querySelectorAll('.workout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.workout-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            AppState.workoutState = e.currentTarget.getAttribute('data-state');
            renderRecipes();
        });
    });

    // Category Chips
    document.querySelectorAll('.filter-bar .chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-bar .chip').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            AppState.activeCategory = e.currentTarget.getAttribute('data-category');
            renderRecipes();
        });
    });

    // Sorting Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            AppState.sortBy = e.target.value;
            renderRecipes();
        });
    }

    // Modal Add Recipe
    const addBtn = document.getElementById('btn-add-recipe');
    const modal = document.getElementById('modal-add');
    const closeModal = document.getElementById('btn-close-modal');

    if (addBtn && modal) {
        addBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeModal && modal) {
        closeModal.addEventListener('click', () => modal.classList.remove('active'));
    }

    // Form Aggiunta Ricetta
    const formAdd = document.getElementById('form-add-recipe');
    if (formAdd) {
        formAdd.addEventListener('submit', handleAddRecipe);
    }

    // Blacklist Input
    const addForbiddenBtn = document.getElementById('btn-add-forbidden');
    if (addForbiddenBtn) {
        addForbiddenBtn.addEventListener('click', handleAddForbiddenIngredient);
    }
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

    const selectedView = document.getElementById(`view-${viewId}`);
    const selectedTab = document.querySelector(`.tab-item[data-view="${viewId}"]`);

    if (selectedView) selectedView.classList.add('active');
    if (selectedTab) selectedTab.classList.add('active');
}

function renderAll() {
    renderRecipes();
    renderPantryGrid();
    renderBlacklistTags();
    renderPackagedProducts();
}

function renderRecipes() {
    const container = document.getElementById('recipes-container');
    if (!container) return;

    let filtered = filterRecipesByBlacklist(AppState.recipes, AppState.blacklist);
    filtered = processBestValueBadges(filtered);

    if (AppState.activeCategory !== 'all') {
        filtered = filtered.filter(r => r.category === AppState.activeCategory);
    }

    if (AppState.workoutState !== 'rest') {
        filtered.sort((a, b) => {
            const aMatch = a.idealFor && a.idealFor.includes(AppState.workoutState) ? 1 : 0;
            const bMatch = b.idealFor && b.idealFor.includes(AppState.workoutState) ? 1 : 0;
            return bMatch - aMatch;
        });
    }

    filtered.sort((a, b) => {
        if (AppState.sortBy === 'calories_asc') {
            return a.calories - b.calories;
        } else if (AppState.sortBy === 'calories_desc') {
            return b.calories - a.calories;
        } else if (AppState.sortBy === 'protein_desc') {
            return b.protein - a.protein;
        } else if (AppState.sortBy === 'best_value') {
            return (b.bvScore || 0) - (a.bvScore || 0);
        }
        return 0;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 30px;">
                <p style="color: var(--text-secondary);">Nessuna ricetta disponibile con i filtri attuali o le restrizioni della blacklist.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(recipe => {
        const isIdealForToday = recipe.idealFor && recipe.idealFor.includes(AppState.workoutState) && AppState.workoutState !== 'rest';

        return `
            <div class="glass-card" onclick="openRecipeDetail('${recipe.id}')">
                <div class="recipe-card-header">
                    <div>
                        <div class="recipe-title">${recipe.title}</div>
                        ${isIdealForToday ? `<span class="efficiency-indicator" style="margin-top: 4px;">🎯 Ideale per la sessione di oggi</span>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        ${getCategoryBadgeHtml(recipe.category)}
                        ${recipe.isBestValue ? `<span class="badge-best-value">BEST VALUE</span>` : ''}
                    </div>
                </div>

                <div class="recipe-info">
                    <span>⏱️ Prep: ${recipe.prepTime}m | Cottura: ${recipe.cookTime}m</span>
                </div>

                <div class="recipe-macros">
                    <div class="macro-item">
                        <span>Calorie</span>
                        <strong>${recipe.calories} kcal</strong>
                    </div>
                    <div class="macro-item">
                        <span>Proteine</span>
                        <strong>${recipe.protein}g</strong>
                    </div>
                    <div class="macro-item">
                        <span>Carbi</span>
                        <strong>${recipe.carbs}g</strong>
                    </div>
                    <div class="macro-item">
                        <span>Grassi</span>
                        <strong>${recipe.fat}g</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryBadgeHtml(category) {
    switch (category) {
        case 'clean': return '<span class="badge badge-clean">Clean / Sano</span>';
        case 'postworkout': return '<span class="badge badge-postworkout">Post-Workout</span>';
        case 'highprotein': return '<span class="badge badge-highprotein">High Protein</span>';
        case 'sgarro': return '<span class="badge badge-sgarro">Sgarro</span>';
        default: return '<span class="badge">Generico</span>';
    }
}

function openRecipeDetail(recipeId) {
    const recipe = AppState.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const modal = document.getElementById('modal-detail');
    const content = document.getElementById('modal-detail-content');
    if (!modal || !content) return;

    const stepsHtml = recipe.steps.map((step, idx) => `
        <div class="step-accordion-item step-open" id="step-item-${idx}">
            <div class="step-accordion-header" onclick="toggleAccordion('step-item-${idx}')">
                <div class="step-accordion-number">${idx + 1}</div>
                <div class="step-accordion-preview">Fase ${idx + 1}</div>
                <div class="step-accordion-arrow">›</div>
            </div>
            <div class="step-accordion-body" style="max-height: 200px;">
                <div class="step-accordion-content">${step}</div>
            </div>
        </div>
    `).join('');

    content.innerHTML = `
        <div class="recipe-card-header">
            <h2 class="recipe-title" style="font-size: 1.4rem;">${recipe.title}</h2>
            ${getCategoryBadgeHtml(recipe.category)}
        </div>
        <p class="section-desc" style="margin-top: 6px;">
            ⏱️ Tempo totale: ${recipe.prepTime + recipe.cookTime} min (Prep: ${recipe.prepTime}m, Cottura: ${recipe.cookTime}m)
        </p>

        <div class="recipe-macros" style="margin: 16px 0;">
            <div class="macro-item"><span>Calorie</span><strong>${recipe.calories} kcal</strong></div>
            <div class="macro-item"><span>Proteine</span><strong>${recipe.protein}g</strong></div>
            <div class="macro-item"><span>Carbi</span><strong>${recipe.carbs}g</strong></div>
            <div class="macro-item"><span>Grassi</span><strong>${recipe.fat}g</strong></div>
        </div>

        <h3 style="font-size: 1rem; margin-bottom: 8px;">Ingredienti:</h3>
        <div class="tags-container" style="margin-bottom: 16px;">
            ${recipe.ingredients.map(ing => `<span class="chip">${ing}</span>`).join('')}
        </div>

        <h3 style="font-size: 1rem; margin-bottom: 10px;">Preparazione Passaggio per Passaggio:</h3>
        <div class="step-accordion-list">
            ${stepsHtml}
        </div>
    `;

    modal.classList.add('active');
}

function toggleAccordion(itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;

    const body = item.querySelector('.step-accordion-body');
    if (item.classList.contains('step-open')) {
        item.classList.remove('step-open');
        body.style.max-height = '0px';
    } else {
        item.classList.add('step-open');
        body.style.max-height = '200px';
    }
}

function closeDetailModal() {
    const modal = document.getElementById('modal-detail');
    if (modal) modal.classList.remove('active');
}

// --- 8. SISTEMA SVUOTA FRIGO (INTERATTIVO) ---
const PANTRY_INGREDIENTS = [
    'pollo', 'carpaccio', 'tonno', 'uova', 'feta', 
    'ceci', 'riso integrale', 'couscous', 'spinaci', 
    'cipolla', 'funghi', 'peperoni', 'senape', 'pimenton', 'cumino'
];

function renderPantryGrid() {
    const grid = document.getElementById('pantry-grid');
    if (!grid) return;

    AppState.selectedPantryIngredients = AppState.selectedPantryIngredients.filter(
        ing => !containsBlacklistedIngredient([ing], AppState.blacklist)
    );

    const safePantry = PANTRY_INGREDIENTS.filter(
        ing => !containsBlacklistedIngredient([ing], AppState.blacklist)
    );

    grid.innerHTML = safePantry.map(ing => {
        const isSelected = AppState.selectedPantryIngredients.includes(ing);
        return `
            <div class="pantry-chip ${isSelected ? 'selected' : ''}" onclick="togglePantryIngredient('${ing}')">
                ${ing}
            </div>
        `;
    }).join('');

    renderPantryMatches();
}

function togglePantryIngredient(ing) {
    const index = AppState.selectedPantryIngredients.indexOf(ing);
    if (index > -1) {
        AppState.selectedPantryIngredients.splice(index, 1);
    } else {
        AppState.selectedPantryIngredients.push(ing);
    }
    renderPantryGrid();
}

function renderPantryMatches() {
    const container = document.getElementById('pantry-results');
    if (!container) return;

    if (AppState.selectedPantryIngredients.length === 0) {
        container.innerHTML = `<p class="section-desc">Seleziona uno o più ingredienti dal frigo per trovare le ricette idonee.</p>`;
        return;
    }

    let availableRecipes = filterRecipesByBlacklist(AppState.recipes, AppState.blacklist);

    const matches = availableRecipes.map(recipe => {
        const matchingCount = recipe.ingredients.filter(ing => 
            AppState.selectedPantryIngredients.some(selected => ing.toLowerCase().includes(selected.toLowerCase()))
        ).length;

        const matchRatio = matchingCount / recipe.ingredients.length;
        return {
            recipe,
            matchingCount,
            matchPercentage: Math.round(matchRatio * 100)
        };
    }).filter(item => item.matchingCount > 0);

    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    if (matches.length === 0) {
        container.innerHTML = `<p class="section-desc">Nessuna ricetta trovata con gli ingredienti selezionati.</p>`;
        return;
    }

    container.innerHTML = matches.map(item => `
        <div class="glass-card" onclick="openRecipeDetail('${item.recipe.id}')">
            <div class="recipe-card-header">
                <div class="recipe-title">${item.recipe.title}</div>
                <span class="match-percentage">${item.matchPercentage}% MATCH</span>
            </div>
            <div class="recipe-info">
                <span>Ingredienti combacianti: ${item.matchingCount} / ${item.recipe.ingredients.length}</span>
            </div>
        </div>
    `).join('');
}

// --- 9. GESTIONE BLACKLIST ---
function renderBlacklistTags() {
    const container = document.getElementById('blacklist-tags');
    if (!container) return;

    container.innerHTML = AppState.blacklist.map(item => `
        <div class="tag-forbidden">
            ⛔ ${item}
            <span onclick="removeForbiddenIngredient('${item}')">&times;</span>
        </div>
    `).join('');
}

function handleAddForbiddenIngredient() {
    const input = document.getElementById('input-forbidden');
    if (!input) return;

    const val = input.value.trim().toLowerCase();
    if (val && !AppState.blacklist.includes(val)) {
        AppState.blacklist.push(val);
        input.value = '';
        saveDataToStorage();
        renderBlacklistTags();
        renderRecipes();
        renderPantryGrid();
    }
}

function removeForbiddenIngredient(item) {
    AppState.blacklist = AppState.blacklist.filter(i => i !== item);
    saveDataToStorage();
    renderBlacklistTags();
    renderRecipes();
    renderPantryGrid();
}

// --- 10. PRODOTTI CONFEZIONATI & MAPPE INTEGRATE ---
function renderPackagedProducts() {
    const container = document.getElementById('packaged-products-container');
    if (!container) return;

    container.innerHTML = AppState.packagedProducts.map(prod => `
        <div class="packaged-card">
            <div class="packaged-thumb">🥣</div>
            <div class="packaged-title">${prod.name}</div>
            <div class="packaged-sub">${prod.protein}g Proteine | ${prod.calories} kcal</div>
            <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${prod.description}</p>
            <button class="btn-primary full-width" style="padding: 6px; font-size: 0.75rem; margin-top: 8px;" onclick="openStoreMaps('${prod.name}')">
                📍 Trova nei Negozi Vicini
            </button>
        </div>
    `).join('');
}

function openStoreMaps(productName) {
    const query = encodeURIComponent(`supermercato acquistare ${productName}`);
    const isAppleDevice = /Mac|iPhone|iPod|iPad/.test(navigator.platform);

    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (isAppleDevice) {
        url = `maps://maps.apple.com/?q=${query}`;
    }

    window.open(url, '_blank');
}

// --- 11. FORM DI AGGIUNTA E MODIFICA RICETTE ---
function handleAddRecipe(e) {
    e.preventDefault();

    const title = document.getElementById('field-title').value.trim();
    const prepTime = Number(document.getElementById('field-preptime').value) || 0;
    const cookTime = Number(document.getElementById('field-cooktime').value) || 0;
    const calories = Number(document.getElementById('field-calories').value) || 0;
    const protein = Number(document.getElementById('field-protein').value) || 0;
    const carbs = Number(document.getElementById('field-carbs').value) || 0;
    const fat = Number(document.getElementById('field-fat').value) || 0;
    const rawIngredients = document.getElementById('field-ingredients').value;
    const rawSteps = document.getElementById('field-steps').value;

    if (!title || calories <= 0) {
        alert('Inserisci un titolo valido e le calorie.');
        return;
    }

    const ingredientsList = rawIngredients.split(',').map(i => i.trim()).filter(i => i.length > 0);
    const stepsList = rawSteps.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    if (containsBlacklistedIngredient(ingredientsList, AppState.blacklist)) {
        alert('La ricetta contiene ingredienti presenti nella tua blacklist! Rimuovili prima di salvarla.');
        return;
    }

    const autoCategory = autoCalculateCategoryAndMacros({ calories, protein, carbs, fat });

    const newRecipe = {
        id: 'rec_' + Date.now(),
        title,
        category: autoCategory,
        prepTime,
        cookTime,
        calories,
        protein,
        carbs,
        fat,
        ingredients: ingredientsList,
        steps: stepsList.length ? stepsList : ['Preparare gli ingredienti e servire.'],
        idealFor: ['rest', 'home_gym']
    };

    AppState.recipes.unshift(newRecipe);
    saveDataToStorage();

    document.getElementById('form-add-recipe').reset();
    const modal = document.getElementById('modal-add');
    if (modal) modal.classList.remove('active');

    renderRecipes();
}
