# MealUp · Ricette — ghiera V4 (prototipo isolato)

## Riferimento approvato
- Ghiera fisica da forno sulla destra, circa 110 px su 320, 129 px su 390, 136 px su 430.
- Etichetta PORTATA e finestrella meccanica incassata sulla sinistra, come un datario.
- All'avanzamento la parola vecchia esce, la nuova entra nella direzione coerente con il gesto.
- Layout compatto, integrato prima dei filtri rapidi e dei risultati; stile crema/arancio/antracite.
- Nove categorie: Tutte, Colazioni, Antipasti, Primi, Secondi, Contorni, Bevande, Salse, Altro.

## Implementazione realizzata
File: `preview/ricette-oven-dial-v4.html`. Single-file HTML/CSS/JS, senza librerie, senza immagini esterne. Touch su ghiera con scatti; tap avanza; swipe orizzontale nella finestrella cambia la portata; tap normale nella finestrella apre selezione diretta; frecce tastiera; bottom sheet 9 categorie; mini-filtri dimostrativi e ricerca. `window.MealUpDialDemo` espone `setPortata`, `getPortata`, `setPosition` (V4: layout B) e `open`. Emette `mealup-preview:portata` con `detail={portata,index}`.

## Verifiche effettuate (Chromium, 2026-10-25)
- Responsive width 320, 390, 430: nessuno scroll orizzontale.
- Manopola click e trascinamento: passati.
- Touch reale emulato dal browser con protocollo Chromium, rotazione ~65°: passato.
- Swipe orizzontale sulla finestrella, verso il lato opposto: passato.
- Selezione diretta delle 9 categorie: disponibile, scelta Primi e Bevande verificata.
- Apertura/chiusura filtri e interazione chip: passate.
- 30 aggiornamenti rapidi: parola finale corretta e nessun nodo transitorio abbandonato.
- Tastiera (frecce, Enter, Escape) e impostazione preferenza movimento ridotto: passate.
- Eccezioni JavaScript osservate nei test: nessuna.

## Limiti e decisioni ancora aperte
- **Non è stata fatta l'integrazione** nella versione locale attuale raggiungibile nell'ambiente dell'utente su 192.168.1.3.
- Ricette (16 campioni) e filtri rapidi (4 esempi) sono dati fittizi. Non sono i 454+ record né i filtri reali. Non trasferire i dati di demo nella app.
- Non ancora testata su iPhone/Safari fisico o con database reale per misurare input delay e frame drops.
- Il prototipo non è il freeze del codice. Il mockup V4 è solo il riferimento grafico approvato.
- **Main, tester ufficiale, branch Food Portrait, Master e freeze precedenti sono invariati.**

## Prossimo step
Recuperare il branch e i file corrispondenti al server locale aggiornato; mappare tutte le funzioni e i filtri esistenti della sezione Ricette; importare solo il controllo V4 in branch isolato, senza toccare gli asset e i freeze; testare su smartphone fisico, con dati reali e prestazioni prima di qualsiasi merge.
