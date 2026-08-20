/* ==========================================================================
   MealUp RecipeSearch & Smart Grill & Marinade Creator Engine
   ========================================================================== */

// --- 1. STATO DEL MODULO DI RICERCA E SMART GRILL ---
const RecipeSearchState = {
    searchQuery: '',
    selectedPantryItems: [],
    noCookFilterActive: false,
    zeroWasteModeActive: false,
    rescueRecipe: null,
    // Stato dedicato allo Smart Grill & Marinade Creator
    grillModeActive: false,
    selectedProtein: 'petto di pollo',
    marinadeResult: null,
    availableProteins: ['petto di pollo', 'filetto di manzo', 'filetto di tonno', 'salmone', 'uova'],
    pantrySpices: ['pimentón dulce', 'cumino', 'senape', 'soia a basso sodio', 'erba cipollina', 'olio evo'],
    recipeCatalog: [
        {
            id: 1,
            title: "Carpaccio di Manzo con Rucola & Feta",
            time: "5 min",
            calories: "380 kcal",
            protein: "36g",
            category: "Clean & Lean",
            noCook: true,
            description: "Piatto fresco e proteico senza cottura, pronto in pochi minuti.",
            ingredients: ['manzo', 'feta', 'rucola']
        },
        {
            id: 2,
            title: "Poke Bowl Tonno & Avocado",
            time: "8 min",
            calories: "490 kcal",
            protein: "38g",
            category: "Clean & Lean",
            noCook: true,
            description: "Bowl fredda bilanciata con tonno fresco, riso precotto e verdure croccanti.",
            ingredients: ['tuna', 'riso', 'avocado']
        },
        {
            id: 3,
            title: "Yogurt Bowl Proteica con Frutti di Bosco",
            time: "3 min",
            calories: "320 kcal",
            protein: "30g",
            category: "Clean & Lean",
            noCook: true,
            description: "Spuntino o pasto express a base di yogurt greco 0% e topping proteici.",
            ingredients: ['yogurt greco 0%', 'frutti di bosco']
        },
        {
            id: 4,
            title: "Bowl Proteica Calda Pollo & Spinaci",
            time: "15 min",
            calories: "520 kcal",
            protein: "42g",
            category: "Balanced",
            noCook: false,
            description: "Classico piatto caldo con pollo piastrato e spinaci saltati.",
            ingredients: ['pollo', 'spinaci', 'riso integrale']
        }
    ],
    pantryIngredients: ['pollo', 'spinaci', 'riso integrale', 'ceci', 'feta', 'uova', 'yogurt greco 0%', 'tuna', 'manzo']
};

// --- 2. GESTIONE FILTRI E SMART GRILL & MARINADE ---
function toggleNoCookFilter() {
    RecipeSearchState.noCookFilterActive = !RecipeSearchState.noCookFilterActive;
    renderRecipeSearchView();
}

function toggleSearchPantryItem(ingredient) {
    const idx = RecipeSearchState.selectedPantryItems.indexOf(ingredient);
    if (idx > -1) {
        RecipeSearchState.selectedPantryItems.splice(idx, 1);
    } else {
        RecipeSearchState.selectedPantryItems.push(ingredient);
    }
    renderRecipeSearchView();
}

function toggleGrillMode() {
    RecipeSearchState.grillModeActive = !RecipeSearchState.grillModeActive;
    if (RecipeSearchState.grillModeActive && !RecipeSearchState.marinadeResult) {
        generateSmartMarinade();
    } else {
        renderRecipeSearchView();
    }
}

function selectProteinForGrill(protein) {
    RecipeSearchState.selectedProtein = protein;
    generateSmartMarinade();
}

function generateSmartMarinade() {
    const protein = RecipeSearchState.selectedProtein;
    let spiceMix = "Senape, un cucchiaio di soia a basso sodio e pimentón dulce";
    let cookTime = "6-8 min su piastra rovente";
    let restTime = "3-5 min prima di affettare";

    if (protein.includes('manzo')) {
        spiceMix = "Olio evo, cumino e un pizzico di pepe nero macinato fresco";
        cookTime = "3-4 min per lato (cottura medium-rare)";
        restTime = "5-7 min su tagliere per redistribuire i succhi";
    } else if (protein.includes('tonno') || protein.includes('salmone')) {
        spiceMix = "Salsa di soia a basso sodio, erba cipollina e gocce di limone";
        cookTime = "2-3 min per lato (cuore tenero e rosato)";
        restTime = "2 min di riposo delicato";
    }

    RecipeSearchState.marinadeResult = {
        title: `Marinatura Smart per ${protein}`,
        spiceMix: spiceMix,
        cookTime: cookTime,
        restTime: restTime,
        instructions: [
            `1. Massaggia il ${protein} con la combinazione di spezie ed erbe della dispensa.`,
            `2. Lascia insaporire in frigorifero per almeno 15-30 minuti.`,
            `3. Cuoci su piastra antiaderente ben calda per ${cookTime}.`,
            `4. Rispetta rigorosamente il tempo di riposo (${restTime}) prima del servizio per preservare la tenerezza.`
        ]
    };

    renderRecipeSearchView();
}

function clearRecipeSearchFilters() {
    RecipeSearchState.selectedPantryItems = [];
    RecipeSearchState.searchQuery = '';
    RecipeSearchState.noCookFilterActive = false;
    RecipeSearchState.zeroWasteModeActive = false;
    RecipeSearchState.grillModeActive = false;
    RecipeSearchState.rescueRecipe = null;
    RecipeSearchState.marinadeResult = null;
    renderRecipeSearchView();
}

function activateZeroWasteRescueMode() {
    RecipeSearchState.zeroWasteModeActive = true;
    const availablePool = RecipeSearchState.selectedPantryItems.length > 0 
        ? RecipeSearchState.selectedPantryItems 
        : RecipeSearchState.pantryIngredients.slice(0, 3);

    RecipeSearchState.rescueRecipe = {
        title: "⚡ Ricetta Flash Svuota Frigo",
        prepTime: "8 min",
        calories: "430 kcal",
        protein: "34g",
        badge: "Zero Waste Rescue",
        description: `Ricetta creata al volo per valorizzare gli ingredienti rimasti (${availablePool.join(', ')}), azzerando gli sprechi.`,
        steps: [
            "1. Riunisci gli ingredienti freschi disponibili e tagliali a pezzetti.",
            "2. Unisci una fonte proteica e condisci a crudo con olio evo e spezie.",
            "3. Servi subito in una bowl fresca."
        ]
    };
    renderRecipeSearchView();
}

// --- 3. RENDER DELLA VISTA RECIPE SEARCH & SMART GRILL ---
function renderRecipeSearchView() {
    const container = document.getElementById('view-recipe-search') || createRecipeSearchContainer();
    if (!container) return;

    let filteredRecipes = RecipeSearchState.recipeCatalog;
    if (RecipeSearchState.noCookFilterActive) {
        filteredRecipes = filteredRecipes.filter(r => r.noCook);
    }
    if (RecipeSearchState.selectedPantryItems.length > 0) {
        filteredRecipes = filteredRecipes.filter(r => 
            RecipeSearchState.selectedPantryItems.some(item => r.ingredients.includes(item))
        );
    }

    const recipesHtml = filteredRecipes.length > 0 ? filteredRecipes.map(r => `
        <div class="glass-card" style="background: rgba(22, 22, 22, 0.7); border: 1px solid var(--glass-border); border-radius: 16px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.7rem; background: ${r.noCook ? 'rgba(46,204,113,0.2); color: #2ecc71;' : 'rgba(184,147,94,0.2); color: var(--accent-primary);'}; padding: 3px 8px; border-radius: 6px; font-weight: 700;">
                    ${r.noCook ? '❄️ Fresh & No-Cook' : '🔥 ' + r.category}
                </span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">⏱️ ${r.time} | 🔥 ${r.calories}</span>
            </div>
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${r.title}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">${r.description}</p>
            <div style="font-size: 0.75rem; color: var(--accent-primary); font-weight: 600;">Proteine: ${r.protein}</div>
        </div>
    `).join('') : '<p style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic; text-align: center; padding: 20px;">Nessuna ricetta corrisponde ai filtri selezionati.</p>';

    const pantryChipsHtml = RecipeSearchState.pantryIngredients.map(ing => {
        const isSelected = RecipeSearchState.selectedPantryItems.includes(ing);
        return `
            <button onclick="toggleSearchPantryItem('${ing}')" style="background: ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)'}; color: ${isSelected ? 'var(--accent-primary-contrast)' : 'var(--text-primary)'}; border: 1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--glass-border)'}; padding: 6px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-transform: capitalize;">
                ${isSelected ? '✓ ' : '+ '} ${ing}
            </button>
        `;
    }).join('');

    // Generazione HTML per Smart Grill & Marinade Creator
    let grillSectionHtml = '';
    const proteinsHtml = RecipeSearchState.availableProteins.map(p => {
        const isSelected = RecipeSearchState.selectedProtein === p;
        return `
            <button onclick="selectProteinForGrill('${p}')" style="background: ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)'}; color: ${isSelected ? 'var(--accent-primary-contrast)' : 'var(--text-primary)'}; border: 1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--glass-border)'}; padding: 6px 12px; border-radius: 14px; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-transform: capitalize;">
                ${isSelected ? '✓ ' : ''} ${p}
            </button>
        `;
    }).join('');

    if (RecipeSearchState.grillModeActive) {
        const m = RecipeSearchState.marinadeResult;
        const stepsHtml = m.instructions.map(s => `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 6px;">${s}</p>`).join('');
        
        grillSectionHtml = `
            <div class="glass-card" style="background: linear-gradient(135deg, rgba(184,147,94,0.2) 0%, rgba(22,22,22,0.9) 100%); border: 1px solid var(--accent-primary); border-radius: 20px; padding: 20px; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 0.7rem; background: var(--accent-primary); color: var(--accent-primary-contrast); padding: 3px 8px; border-radius: 6px; font-weight: 700;">Smart Grill Studio</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">🔥 Timer & Riposo</span>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 10px;">${m.title}</h3>
                
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">Seleziona la proteina base:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">${proteinsHtml}</div>
                </div>

                <div style="background: rgba(0,0,0,0.35); padding: 12px; border-radius: 12px; margin-bottom: 12px;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-primary); display: block; margin-bottom: 4px;">Mix Spezie & Condimenti (Dispensa):</span>
                    <p style="font-size: 0.8rem; color: var(--text-primary); margin-bottom: 8px;">🌿 ${m.spiceMix}</p>
                    <div style="display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-secondary);">
                        <span>⏱️ Cottura: <b>${m.cookTime}</b></span>
                        <span>⏳ Riposo: <b>${m.restTime}</b></span>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 12px; margin-bottom: 12px;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">Procedimento e Timer:</span>
                    ${stepsHtml}
                </div>

                <button onclick="toggleGrillMode()" style="background: rgba(255,255,255,0.1); color: var(--text-primary); border: none; padding: 8px 12px; border-radius: 10px; font-size: 0.75rem; cursor: pointer; width: 100%;">Chiudi Smart Grill</button>
            </div>
        `;
    }

    let rescueBannerHtml = '';
    if (RecipeSearchState.zeroWasteModeActive && RecipeSearchState.rescueRecipe) {
        const r = RecipeSearchState.rescueRecipe;
        const stepsHtml = r.steps.map(s => `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">${s}</p>`).join('');
        rescueBannerHtml = `
            <div class="glass-card" style="background: rgba(184,147,94,0.15); border: 1px solid var(--accent-primary); border-radius: 20px; padding: 16px; margin-bottom: 16px;">
                <span style="font-size: 0.7rem; background: var(--accent-primary); color: var(--accent-primary-contrast); padding: 3px 8px; border-radius: 6px; font-weight: 700;">${r.badge}</span>
                <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 6px 0;">${r.title}</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">${r.description}</p>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; margin-bottom: 10px;">${stepsHtml}</div>
                <button onclick="clearRecipeSearchFilters()" style="background: rgba(255,255,255,0.1); color: var(--text-primary); border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.7rem; cursor: pointer;">Chiudi Emergenza</button>
            </div>
        `;
    }

    container.innerHTML = `
        <header class="header" style="margin-bottom: 16px;">
            <span class="subtitle" style="font-size: 0.8rem; color: var(--text-secondary);">Smart Recipe Finder</span>
            <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">Cerca Ricette & Tools</h1>
        </header>

        <!-- Pulsante Accesso Smart Grill & Marinade Creator -->
        <div class="glass-card" style="background: linear-gradient(135deg, rgba(22,22,22,0.9) 0%, rgba(184,147,94,0.2) 100%); border: 1px solid var(--accent-primary); border-radius: 20px; padding: 16px; margin-bottom: 16px; text-align: center;">
            <span style="font-size: 1.3rem; display: block; margin-bottom: 4px;">🥩</span>
            <h2 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Smart Grill & Marinade Creator</h2>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 10px;">Crea marinature su misura incrociando carne o pesce con le spezie in dispensa.</p>
            <button onclick="toggleGrillMode()" style="background: var(--accent-primary); color: var(--accent-primary-contrast); border: none; padding: 10px 20px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                ${RecipeSearchState.grillModeActive ? 'Nascondi Smart Grill' : 'Apri Smart Grill Studio 🥩'}
            </button>
        </div>

        ${grillSectionHtml}

        <!-- Pulsante Svuota Frigo Flash -->
        <div class="glass-card" style="background: linear-gradient(135deg, rgba(184,147,94,0.25) 0%, rgba(22,22,22,0.8) 100%); border: 1px solid var(--accent-primary); border-radius: 20px; padding: 16px; margin-bottom: 16px; text-align: center;">
            <span style="font-size: 1.3rem; display: block; margin-bottom: 4px;">⚡</span>
            <h2 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Svuota Frigo Flash (Zero Waste)</h2>
            <button onclick="activateZeroWasteRescueMode()" style="background: var(--accent-primary); color: var(--accent-primary-contrast); border: none; padding: 10px 20px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; cursor: pointer; margin-top: 8px;">
                Attiva Svuota Frigo ⚡
            </button>
        </div>

        ${rescueBannerHtml}

        <!-- Filtro Rapido Fresh & No-Cook -->
        <div style="margin-bottom: 16px; display: flex; gap: 8px; align-items: center;">
            <button onclick="toggleNoCookFilter()" style="background: ${RecipeSearchState.noCookFilterActive ? '#2ecc71' : 'rgba(255,255,255,0.08)'}; color: ${RecipeSearchState.noCookFilterActive ? '#fff' : 'var(--text-primary)'}; border: 1px solid ${RecipeSearchState.noCookFilterActive ? '#2ecc71' : 'var(--glass-border)'}; padding: 10px 16px; border-radius: 14px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; transition: all 0.2s ease;">
                ❄️ ${RecipeSearchState.noCookFilterActive ? 'Filtro No-Cook Attivo (Mostra Tutti)' : 'Filtro Rapido "Fresh & No-Cook" (< 10 min)'}
            </button>
        </div>

        <!-- Filtro Dispensa -->
        <div class="glass-card" style="background: rgba(22, 22, 22, 0.7); border: 1px solid var(--glass-border); border-radius: 20px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Filtra per Dispensa</h3>
                ${(RecipeSearchState.selectedPantryItems.length > 0 || RecipeSearchState.noCookFilterActive) ? `<button onclick="clearRecipeSearchFilters()" style="background: none; border: none; color: var(--accent-primary); font-size: 0.75rem; cursor: pointer;">Resetta filtri</button>` : ''}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${pantryChipsHtml}
            </div>
        </div>

        <!-- Lista Risultati -->
        <div>
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">Ricette Disponibili (${filteredRecipes.length})</h3>
            ${recipesHtml}
        </div>
    `;
}

function createRecipeSearchContainer() {
    const newView = document.createElement('div');
    newView.id = 'view-recipe-search';
    newView.className = 'view';
    document.body.appendChild(newView);
    return newView;
}
