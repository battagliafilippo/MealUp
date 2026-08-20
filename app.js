/* ==========================================================================
   MealUp Complete Engine: Home, Bento Grid, Scanner & State (Single File)
   ========================================================================== */

// --- 1. STATO DELL'APPLICAZIONE (APP STATE) ---
const AppState = {
    workoutState: 'rest', // 'rest' | 'home_gym' | 'cardio' | 'tennis'
    activeCategory: 'all', // 'all' | 'clean' | 'balanced' | 'postworkout' | 'highprotein' | 'sgarro'
    sortBy: 'calories_asc', // 'calories_asc' | 'calories_desc' | 'protein_desc' | 'best_value' | 'compromise' | 'time_asc'
    selectedPantryIngredients: [],
    blacklist: ['insalata', 'menta', 'zucchine', 'melanzane', 'pomodori'],
    recipes: [],
    packagedProducts: [],
    editingRecipeId: null,
    userActivityContext: 'sedentary', // 'sedentary' | 'active'
    scannerMode: 'fridge', // 'fridge' | 'label'
    detectedUncertainItems: [] // Elementi rilevati in attesa di conferma con livello di certezza
};

// --- 2. DATABASE INIZIALE (RICETTE) ---
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
            'Preparare un\'emulsione veloce unendo la senape, una spolverata di pimentón e un filo d\'acqua.',
            'Spennella l\'emulsione sulla carne in modo omogeneo.',
            'Sbriciola la feta sopra il carpaccio e guarnisci con abbondante erba cipollina.'
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
            'In una padella antiaderente, rosolare la cipolla e i funghi con salsa di soia.',
            'Aggiungi il pollo, spolvera con cumino e pimentón e cuoci per 8-10 minuti.',
            'Reidrata il couscous con acqua bollente salata e sgrana con la forchetta.'
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
            'Salta i ceci in padella a fuoco alto con pimentón e cumino finché croccanti.',
            'Salta gli spinaci freschi in padella per un paio di minuti.',
            'Componi la bowl unendo spinaci, ceci, tonno ed erba cipollina.'
        ],
        idealFor: ['home_gym', 'tennis']
    }
];

// --- 3. PERSISTENZA LOCAL STORAGE & ALGORITMI ---
function loadDataFromStorage() {
    try {
        const storedRecipes = localStorage.getItem('mealup_recipes');
        const storedBlacklist = localStorage.getItem('mealup_blacklist');
        const storedProducts = localStorage.getItem('mealup_products');

        AppState.recipes = storedRecipes ? JSON.parse(storedRecipes) : INITIAL_RECIPES;
        AppState.blacklist = storedBlacklist ? JSON.parse(storedBlacklist) : AppState.blacklist;
        AppState.packagedProducts = storedProducts ? JSON.parse(storedProducts) : [];
        
        if (!storedRecipes) saveDataToStorage();
    } catch (e) {
        console.error("Errore nel caricamento dei dati:", e);
    }
}

function saveDataToStorage() {
    try {
        localStorage.setItem('mealup_recipes', JSON.stringify(AppState.recipes));
        localStorage.setItem('mealup_blacklist', JSON.stringify(AppState.blacklist));
        localStorage.setItem('mealup_products', JSON.stringify(AppState.packagedProducts));
    } catch (e) {
        console.error("Errore nel salvataggio dei dati:", e);
    }
}

function calculateBestValueIndex(recipe) {
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const safeTime = totalTime > 0 ? totalTime : 1;
    const safeCalories = recipe.calories > 0 ? recipe.calories : 100;
    return Number(((recipe.protein / safeTime) * (1000 / safeCalories)).toFixed(2));
}

function processBestValueBadges(recipesList) {
    if (!recipesList.length) return [];
    const scored = recipesList.map(r => ({ ...r, bvScore: calculateBestValueIndex(r) }));
    const maxScore = Math.max(...scored.map(r => r.bvScore));
    return scored.map(r => ({
        ...r,
        isBestValue: r.bvScore === maxScore || (maxScore > 0 && r.bvScore >= maxScore * 0.85)
    }));
}

function filterRecipesByBlacklist(recipesList, blacklist) {
    if (!blacklist || !blacklist.length) return recipesList;
    return recipesList.filter(recipe => 
        !recipe.ingredients.some(ing => 
            blacklist.some(forbidden => ing.toLowerCase().includes(forbidden.toLowerCase()))
        )
    );
}

// --- 4. INIZIALIZZAZIONE GENERALE ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    setupEventListeners();
    renderDynamicDashboard();
    renderRecipesBentoGrid();
});

function setupEventListeners() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetView = e.currentTarget.getAttribute('data-view');
            switchView(targetView);
        });
    });

    document.querySelectorAll('.workout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.workout-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            AppState.workoutState = e.currentTarget.getAttribute('data-state');
            renderDynamicDashboard();
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

    const selectedView = document.getElementById(`view-${viewId}`);
    const selectedTab = document.querySelector(`.tab-item[data-view="${viewId}"]`);

    if (selectedView) selectedView.classList.add('active');
    if (selectedTab) selectedTab.classList.add('active');
}

// --- 5. LOGICA HOME & DASHBOARD DINAMICA ---
function getAmbientGreetingAndTimeContext() {
    const hour = new Date().getHours();
    let timeGreeting = 'Buongiorno';
    let timeContextLabel = 'Colazione & Energia';

    if (hour >= 12 && hour < 15) {
        timeGreeting = 'Buon Pranzo';
        timeContextLabel = 'Smart Quick Lunch';
    } else if (hour >= 15 && hour < 19) {
        timeGreeting = 'Buon Pomeriggio';
        timeContextLabel = 'Post-Workout Recovery';
    } else if (hour >= 19) {
        timeGreeting = 'Buonasera';
        timeContextLabel = 'Cena Bilanciata o Comfort';
    }

    return { timeGreeting, timeContextLabel };
}

function toggleUserActivityContext() {
    AppState.userActivityContext = AppState.userActivityContext === 'sedentary' ? 'active' : 'sedentary';
    renderDynamicDashboard();
}

function renderDynamicDashboard() {
    const homeContainer = document.getElementById('view-home');
    if (!homeContainer) return;

    const { timeGreeting, timeContextLabel } = getAmbientGreetingAndTimeContext();
    const isDayActive = AppState.userActivityContext === 'active';

    let filteredRecipes = [...AppState.recipes];
    if (isDayActive) {
        filteredRecipes.sort((a, b) => (b.protein || 0) - (a.protein || 0));
    } else {
        filteredRecipes.sort((a, b) => (a.calories || 0) - (b.calories || 0));
    }

    const topRecommendation = filteredRecipes.length > 0 ? filteredRecipes[0] : null;

    homeContainer.innerHTML = `
        <header class="header" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <span class="subtitle" style="font-size: 0.8rem; color: var(--text-secondary);">${timeContextLabel}</span>
                <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${timeGreeting}, Athlete</h1>
            </div>
            <button class="chip ${isDayActive ? 'active' : ''}" onclick="toggleUserActivityContext()" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 20px; border: 1px solid var(--glass-border); background: ${isDayActive ? 'var(--accent-primary)' : 'var(--glass-bg)'}; color: ${isDayActive ? 'var(--accent-primary-contrast)' : 'var(--text-primary)'}; cursor: pointer;">
                ${isDayActive ? '⚡ Giornata Attiva' : '🛋️ Giornata Sedentaria'}
            </button>
        </header>

        ${topRecommendation ? `
            <div class="glass-card" style="background: linear-gradient(135deg, rgba(184,147,94,0.15) 0%, rgba(20,20,20,0.6) 100%); border: 1px solid rgba(184,147,94,0.3); border-radius: 16px; padding: 16px; margin: 16px 0; cursor: pointer;" onclick="openRecipeDetail('${topRecommendation.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="badge" style="background: var(--accent-primary); color: var(--accent-primary-contrast); font-size: 0.7rem; padding: 3px 8px; border-radius: 6px;">Consigliato per ora</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">⏱️ ${topRecommendation.prepTime + topRecommendation.cookTime} min</span>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">${topRecommendation.title}</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px;">Ottimizzato per il tuo fabbisogno energetico attuale.</p>
                <div style="display: flex; gap: 16px; font-size: 0.85rem; color: var(--text-primary);">
                    <div>🔥 <strong>${topRecommendation.calories}</strong> kcal</div>
                    <div>💪 <strong>${topRecommendation.protein}g</strong> proteine</div>
                </div>
            </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
            <div class="glass-card" style="padding: 16px; text-align: center; border-radius: 14px; background: rgba(255,255,255,0.04); cursor: pointer;" onclick="switchView('scanner')">
                <div style="font-size: 1.8rem; margin-bottom: 4px;">📸</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">Scannerizza Frigo</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary);">Rilevamento AI rapido</div>
            </div>
            <div class="glass-card" style="padding: 16px; text-align: center; border-radius: 14px; background: rgba(255,255,255,0.04); cursor: pointer;" onclick="switchView('recipes')">
                <div style="font-size: 1.8rem; margin-bottom: 4px;">📖</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">Tutte le Ricette</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary);">${AppState.recipes.length} ricette pronte</div>
            </div>
        </div>
    `;
}

// --- 6. BENTO GRID & LISTA RICETTE ---
function renderRecipesBentoGrid() {
    const container = document.getElementById('recipes-container');
    if (!container) return;

    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    container.style.gap = '16px';

    let filtered = filterRecipesByBlacklist(AppState.recipes, AppState.blacklist);
    filtered = processBestValueBadges(filtered);

    if (AppState.activeCategory && AppState.activeCategory !== 'all') {
        filtered = filtered.filter(r => r.category === AppState.activeCategory);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px; background: rgba(25, 25, 25, 0.6); backdrop-filter: blur(20px); border-radius: 16px;">
                <p style="color: var(--text-secondary);">Nessuna ricetta disponibile con i filtri attuali.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((recipe, index) => {
        const isFeaturedBento = recipe.isBestValue || index === 0;
        const bentoStyle = isFeaturedBento 
            ? 'background: linear-gradient(135deg, rgba(184,147,94,0.18) 0%, rgba(20,20,20,0.75) 100%); border: 1px solid rgba(184,147,94,0.4); box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15);' 
            : 'background: rgba(22, 22, 22, 0.55); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.4);';

        return `
            <div class="glass-card bento-card" style="${bentoStyle} border-radius: 20px; padding: 20px; transition: transform 0.25s ease, box-shadow 0.25s ease; cursor: pointer; position: relative; overflow: hidden;" onclick="openRecipeDetail('${recipe.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: ${isFeaturedBento ? '1.15rem' : '1.05rem'}; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${recipe.title}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <span style="font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; background: rgba(48,209,88,0.15); color: #30d158;">${recipe.category}</span>
                        ${recipe.isBestValue ? `<span style="background: var(--accent-primary); color: var(--accent-primary-contrast); font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 6px;">⚡ Smart Pick</span>` : ''}
                    </div>
                </div>

                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 14px;">
                    <span>⏱️ Prep: ${recipe.prepTime}m | Cottura: ${recipe.cookTime}m</span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: rgba(0, 0, 0, 0.25); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.04);">
                    <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--text-secondary); display: block;">Calorie</span><strong style="font-size: 0.85rem; color: var(--text-primary);">${recipe.calories}</strong></div>
                    <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--text-secondary); display: block;">Proteine</span><strong style="font-size: 0.85rem; color: var(--accent-primary);">${recipe.protein}g</strong></div>
                    <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--text-secondary); display: block;">Carbi</span><strong style="font-size: 0.85rem; color: var(--text-primary);">${recipe.carbs}g</strong></div>
                    <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--text-secondary); display: block;">Grassi</span><strong style="font-size: 0.85rem; color: var(--text-primary);">${recipe.fat}g</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 7. SCANNER & SMART CORRECTION LOOP ---
function switchScannerMode(mode) {
    AppState.scannerMode = mode;
    AppState.detectedUncertainItems = [];
    renderScannerDetectedList();
}

function simulateScanning() {
    const laser = document.getElementById('scanner-laser');
    const previewContent = document.getElementById('scanner-preview-content');
    
    if (laser) laser.style.display = 'block';
    if (previewContent) {
        previewContent.innerHTML = '<span style="font-size: 1rem; font-weight: 700; color: var(--accent-primary);">Analisi AI Vision in corso...</span>';
    }

    setTimeout(() => {
        if (laser) laser.style.display = 'none';
        AppState.detectedUncertainItems = [
            { id: 'det_1', name: 'salmone', confidence: 'alta', confirmed: false },
            { id: 'det_2', name: 'asparagi', confidence: 'alta', confirmed: false },
            { id: 'det_3', name: 'tofu bio', confidence: 'bassa', confirmed: false }
        ];
        if (previewContent) {
            previewContent.innerHTML = '<span style="font-size: 1.5rem;">🔍</span><span style="font-size: 0.85rem; color: var(--accent-primary); font-weight: 700;">Elementi rilevati! Verifica sotto.</span>';
        }
        renderScannerDetectedList();
    }, 1800);
}

function toggleConfirmItem(itemId) {
    const item = AppState.detectedUncertainItems.find(i => i.id === itemId);
    if (item) {
        item.confirmed = !item.confirmed;
        renderScannerDetectedList();
    }
}

function removeDetectedItem(itemId) {
    AppState.detectedUncertainItems = AppState.detectedUncertainItems.filter(i => i.id !== itemId);
    renderScannerDetectedList();
}

function renderScannerDetectedList() {
    const container = document.getElementById('scanner-detected-items');
    if (!container) return;

    if (AppState.detectedUncertainItems.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 0.85rem;">Nessuna scansione attiva.</div>`;
        return;
    }

    container.innerHTML = AppState.detectedUncertainItems.map(item => {
        const isLow = item.confidence === 'bassa' && !item.confirmed;
        const style = isLow ? 'background: rgba(255,159,10,0.12); border: 1px dashed var(--accent-orange); animation: pulseUncertain 1.5s infinite;' : 'background: rgba(255,255,255,0.05);';
        return `
            <div style="${style} border-radius: 12px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div><strong>${item.name}</strong> (${item.confidence})</div>
                <div>
                    <button onclick="toggleConfirmItem('${item.id}')" style="background: var(--accent-primary); color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">${item.confirmed ? 'Confermato' : 'Conferma'}</button>
                    <button onclick="removeDetectedItem('${item.id}')" style="background: rgba(255,69,58,0.2); color: #ff453a; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">&times;</button>
                </div>
            </div>
        `;
    }).join('');
}

function openRecipeDetail(recipeId) {
    const recipe = AppState.recipes.find(r => r.id === recipeId);
    if (recipe) alert(`Dettaglio Ricetta: ${recipe.title}`);
}
