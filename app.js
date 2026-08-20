/* ==========================================================================
   MealUp Complete Engine: Home, Bento Grid, Scanner & Smart Correction Loop
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
            'Disponi le fettine sottili di carpaccio di manzo su un piatto grande[span_0](start_span)[span_0](end_span).',
            'Preparare un\'emulsione veloce unendo la senape, una spolverata di pimentón e un filo d\'acqua[span_1](start_span)[span_1](end_span).',
            'Spennella l\'emulsione sulla carne in modo omogeneo[span_2](start_span)[span_2](end_span).',
            'Sbriciola la feta sopra il carpaccio e guarnisci con abbondante erba cipollina[span_3](start_span)[span_3](end_span).'
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
            'Taglia il petto di pollo a dadini salandoli leggermente[span_4](start_span)[span_4](end_span).',
            'In una padella antiaderente, rosolare la cipolla e i funghi con salsa di soia[span_5](start_span)[span_5](end_span).',
            'Aggiungi il pollo, spolvera con cumino e pimentón e cuoci per 8-10 minuti[span_6](start_span)[span_6](end_span).',
            'Reidrata il couscous con acqua bollente salata e sgrana con la forchetta[span_7](start_span)[span_7](end_span).'
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
            'Scola i ceci e asciugali bene con carta da cucina[span_8](start_span)[span_8](end_span).',
            'Salta i ceci in padella a fuoco alto con pimentón e cumino finché croccanti[span_9](start_span)[span_9](end_span).',
            'Salta gli spinaci freschi in padella per un paio di minuti[span_10](start_span)[span_10](end_span).',
            'Componi la bowl unendo spinaci, ceci, tonno ed erba cipollina[span_11](start_span)[span_11](end_span).'
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

// --- 4. INIZIALIZZAZIONE GENERALE ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    setupEventListeners();
    renderDynamicDashboard();
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
                <span class="subtitle">${timeContextLabel}</span>
                <h1>${timeGreeting}, Athlete</h1>
            </div>
            <button class="chip ${isDayActive ? 'active' : ''}" onclick="toggleUserActivityContext()" style="font-size: 0.75rem; padding: 6px 12px; background: ${isDayActive ? 'var(--accent-primary)' : 'var(--glass-bg)'}; color: ${isDayActive ? 'var(--accent-primary-contrast)' : 'var(--text-primary)'};">
                ${isDayActive ? '⚡ Giornata Attiva' : '🛋️ Giornata Sedentaria'}
            </button>
        </header>

        ${topRecommendation ? `
            <div class="glass-card" style="background: linear-gradient(135deg, rgba(184,147,94,0.15) 0%, rgba(20,20,20,0.6) 100%); border-color: rgba(184,147,94,0.3); margin-bottom: 20px;" onclick="openRecipeDetail('${topRecommendation.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="badge" style="background: var(--accent-primary); color: var(--accent-primary-contrast);">Consigliato per ora</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">⏱️ ${topRecommendation.prepTime + topRecommendation.cookTime} min</span>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">${topRecommendation.title}</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px;">Ottimizzato per il tuo fabbisogno energetico attuale.</p>
                <div style="display: flex; gap: 16px; font-size: 0.85rem;">
                    <div>🔥 <strong>${topRecommendation.calories}</strong> kcal</div>
                    <div>💪 <strong>${topRecommendation.protein}g</strong> proteine</div>
                </div>
            </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
            <div class="glass-card" style="padding: 16px; text-align: center;" onclick="switchView('scanner')">
                <div style="font-size: 1.8rem; margin-bottom: 4px;">📸</div>
                <div style="font-size: 0.85rem; font-weight: 700;">Scannerizza Frigo</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary);">Rilevamento AI rapido</div>
            </div>
            <div class="glass-card" style="padding: 16px; text-align: center;" onclick="switchView('recipes')">
                <div style="font-size: 1.8rem; margin-bottom: 4px;">📖</div>
                <div style="font-size: 0.85rem; font-weight: 700;">Tutte le Ricette</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary);">${AppState.recipes.length} ricette pronte</div>
            </div>
        </div>
    `;
}

// --- 6. SCANNER & SMART CORRECTION LOOP ---
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
                    <button onclick="toggleConfirmItem('${item.id}')" style="background: var(--accent-primary); color: #000; border: none; padding: 4px 8px; border-radius: 4px;">${item.confirmed ? 'Confermato' : 'Conferma'}</button>
                    <button onclick="removeDetectedItem('${item.id}')" style="background: rgba(255,69,58,0.2); color: #ff453a; border: none; padding: 4px 8px; border-radius: 4px;">&times;</button>
                </div>
            </div>
        `;
    }).join('');
}

function openRecipeDetail(recipeId) {
    const recipe = AppState.recipes.find(r => r.id === recipeId);
    if (recipe) alert(`Dettaglio Ricetta: ${recipe.title}`);
}
