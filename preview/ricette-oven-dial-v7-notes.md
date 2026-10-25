# MealUp — Ricette V7 · Filtro Cibo (25/10/2026)

## Stato e baseline
- Costituzione Operativa AI v1.9 FROZEN applicata.
- Baseline approvata: `experiment/ricette-v6-1-frecce-esterne-20261025` → `preview/ricette-oven-dial-v6-1.html`.
- Write scope: nuovo file isolato `preview/ricette-oven-dial-v7.html` e questo registro; non modificare V6.1, main, tester, Master, FO, Food Portrait.
- Active Brief: V7-CIBO-20261025-1.
- Requisito: sostituire solo il filtro rapido `Gusti` con `Cibo`, mantenendo tempo e voglia, il funzionamento combinabile, le esigenze precedenti e tutto il design approvato.

## Decisioni operative
- Sono disponibili otto selezioni pragmatiche: Pasta, Riso, Carne, Pesce, Verdure, Uova, Legumi, Formaggi.
- `Cibo` è un filtro per INGREDIENTI / tipi alimentari, non un duplicato delle portate della ghiera. Le dieci portate (`Tutte`, `Colazioni`, `Antipasti`, `Primi`, `Secondi`, `Contorni`, `Bevande`, `Salse`, `Dolci`, `Altro`) non cambiano.
- Cibo è multiselezione libera: OR tra le categorie selezionate. Unito con la portata scelta, il tempo, la voglia, i requisiti alimentari e la ricerca tramite AND. Nessun questionario o ordine obbligatorio.
- `Leggero`, `Proteico`, `Vegetariano`, `Con le tue scorte` sono conservati nella finestra completa `Filtri` come `Esigenze alimentari e scorte`.
- Le esigenze in multiselezione si intersecano (AND) perché sono vincoli; nessuna opzione è persa.
- La classificazione usa nomi degli ingredienti del dato ricetta: `_foodKeywords`/`classifyFood` in prototipo. Non usa il Food Object illustrato o solo il nome della portata.
- Alias legacy `setFilter('gusti',...)` e `getFilters().gusti` preservati per retrocompatibilità con il prototipo.

## Limitazioni e integrazione reale
- V7 è **un prototipo indipendente** con circa 20 ricette DEMO; né 454+ ricette reali né gli ingredienti canonici sono disponibili nel codice della pagina locale `192.168.1.3` qui accessibile.
- Il vocabolario `foodKeywords` è preparatorio e **non** è validato sul catalogo reale. In produzione deve essere riconciliato con strutture ingredienti, sinonimi, categorie composite e inventario reali, evitando falsi positivi. Le famiglie FO grafiche restano indipendenti.
- Nuove ricette demo solo per verificare Riso, Pesce e Formaggi; non vanno importate in produzione.
- L'app reale va integrata solo dopo individuazione dell'ultimo branch/file del server locale; mai sovrascrivere main/tester.

## Verifiche eseguite
- 48/48 controlli in Playwright Chromium (viewport 320 / 390 / 430 px; touch emulato), nessuna eccezione JS.
- Tutte e 8 le scelte Cibo hanno esempi dimostrativi, OR multiselezione, AND con portata/tempo/voglia, esigenze dal menu esteso, reset, compatibilità getter legacy, ricerca, Dolci, menu portate e tocco ghiera.
- Nessun overflow orizzontale a 320, 390, 430 px.
- Confronto pixel dell'intero componente ghiera + finestrella V6.1 vs V7 a viewport 390 CSS px: **nessuna differenza** (`PIL.ImageChops.getbbox() is None`).
- Non verificato su Safari/iPhone fisico né su database reale. Il risultato è VERIFIED per demo, PARTIALLY VERIFIED per integrazione MealUp.

## Prossimo passo
1. Recuperare la versione attuale del repository/branch della MealUp in uso sul PC; leggere i campi ingrediente del catalogo.
2. Creare mapping stabile per le otto famiglie usando nomi canonici degli ingredienti e sinonimi, con test di copertura sul catalogo.
3. Integrare soltanto il filtro `Cibo` in branch isolato e verificare risultati reali, performance, regressioni e iPhone, poi eventuale approvazione di merge.