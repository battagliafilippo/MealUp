# MealUp — Piano unico Recipe Visual Agents (V1)
Stato: PIANO OPERATIVO, NON FROZEN. Non sostituisce MealUp Master, Costituzione v1.9 né alcun freeze grafico. Aggiornare questo file come registro degli avanzamenti; non aprire altri piani paralleli.

## Obiettivo finale (vincolante)
Per ciascuna ricetta MealUp esiste una rappresentazione unica del piatto COMPLETO, nello stile MealUp Toys 3D, composta in modo culinariamente corretto. L'asset è associato stabilmente alla coppia `recipe.id` + versione visuale della ricetta; tutte le superfici già autorizzate lo riutilizzano. L'asset definitivo si salva una volta sola e non si genera durante lo scroll.
- Le 454 ricette del catalogo storico devono essere processabili in batch, senza 454 prompt manuali.
- Ogni nuova ricetta deve poter entrare in una coda; stato pending finché non pronta; QA prima della pubblicazione; FO canonico di famiglia come fallback.
- Ingredienti corretti, presentazione credibile, FO senza collage dinamico; la generazione avviene FUORI dalla UI.
- Nessun costo aggiuntivo non approvato; nessuna promessa di crediti illimitati. ChatGPT e Runway manuali non equivalgono ad API automatizzabili gratuite. Groq potenziale motore testo/analisi, NON generatore immagini.
- Nessuna regressione di Home / Ricette / Dettaglio / Kitchen / Scanner / Spesa / Scorte / Diario / suggestFor / gauge / scroll.
- Nessun deploy o modifica a main senza esplicita approvazione. Un solo tester ufficiale: `mealup-tester-family-fo`; laboratorio di sviluppo solo su `experiment/recipe-visual-agents`, NON secondo tester.

## Stato attuale verificato al 2026-10-14
- AUDIT: 454 righe G8 e 454 ID mappati al sistema FO di famiglia; 14 famiglie. PASS statico; non equivale a 454 immagini complete.
- DUPLICE MOTORE: `assets/family-fo/runtime.js` canonico e G11 storico composito coesistevano nell'app. L'avvio automatico G11 è disattivato SOLO nel laboratorio rimuovendo due script da ciascuno di `index.html` e `dist/index.html`, senza cancellare file storici G11.
- TEST: controllo statico motore singolo PASS; smoke v1.24 7/7 PASS sul laboratorio dopo correzione dei selettori obsoleti nei test.
- REGRESSIONE ESTESA: 253 PASS / 11 FAIL su `test/run.js`. Cause/non-regressioni NON ancora classificate mediante confronto con baseline; non correggere alla cieca i fallimenti generici nel filone immagini.
- VALIDAZIONE VISIVA iPhone e impatto Kitchen Mode dopo disattivazione G11: NON eseguiti; fix NON trasferito nel tester ufficiale.
- AGENTI: non installati. Immagini complete ricetta: non generate da questa pipeline. `main` e tester ufficiale invariati.

## Sequenza unica di micro-step (uno per volta)
- [x] M0. Audit di struttura, mapping e superfici; decisione un solo tester.
- [x] M1. Isolare nel laboratorio il motore storico G11 senza cancellazioni; controllo statico e smoke superati.
- [ ] M1b. Confronto MIRATO con la baseline solo per i difetti che impediscono il motore visuale; test Kitchen Mode visuale necessario prima del passaggio al tester ufficiale. Gli altri fallimenti restano segnalati, non bloccano la progettazione degli agenti; niente correzioni fuori scope.
- [ ] M2. AGENTE 1 (PRIORITÀ IMMEDIATA): Recipe Analyzer in laboratorio. Input dati reali ricetta `id/title/ing/steps`; output deterministico di schede JSON con ingredienti visualmente rilevanti, tecniche/forme (fettine, scaglie, impiattamento), vincoli, confidenza e motivi review. Batch 454, senza immagini, senza API segrete, senza toccare UI. Test minimo: 454 ID unici; output validi; 0 ricette perse; fallimenti isolati.
- [ ] M3. Visual Director + prompt builder: specifica completa del piatto coerente con ingredienti e passaggi; esempi difficili e regole QA; vietata la resurrezione del vecchio collage FO.
- [ ] M4. Provider abstraction: verificare limiti tecnici, termini e costo per API Groq/testo e generatori immagini. ChatGPT Plus / Runway crediti personali NON presumere automaticamente pilotabili da API. Imporre budget cap 0, backoff, pausa e ripresa; mai chiavi nel frontend.
- [ ] M5. Produzione immagini pilota con gli strumenti effettivamente disponibili; confronto 5 piatti difficili; controllo ingredienti inventati/mancanti/posizione e coerenza MealUp; approvazione prima del batch.
- [ ] M6. Registro persistente asset: `recipe.id`, `visualRevision`, `imageUrl`, hash, provenienza, QA e status pending/ready/review/error. Una sorgente immagine per tutte le superfici consentite; family FO fallback; lazy load/preload mirato e test zero micro-lag. Nessuna modifica ai dati personali locali.
- [ ] M7. Batch progressivo sul catalogo completo, dedup, resume, report QA automatico + eccezioni per review umana; nessuna rigenerazione degli asset approvati senza motivo.
- [ ] M8. Nuove ricette: coda asincrona sicura, controllo della privacy, trigger post-salvataggio, soluzione gratuita sostenibile da validare prima di attivarla sugli utenti.

## Regola anti-deriva
Ogni intervento deve riportare: micro-step corrente, risultato verificato, impatto sui FROZEN, eventuale blocco, e **un solo** prossimo passo.
Difetti già presenti o estranei alle immagini: registrare in backlog, verificare se bloccanti e NON intraprendere fix collaterali in questo filone. Non aggiungere nuovi tester, branch, design, servizi, API o workflow senza necessità esplicita.
L'avanzamento agli agenti NON richiede correggere tutte le 11 anomalie storiche: l'analizzatore può lavorare sui dati in isolamento. La promozione dei cambiamenti visivi richiede invece prova di non regressione mirata e approvazione esplicita.


## Audit comparativo sui 11 fallimenti (2026-10-14)
- **Baseline testata realmente:** commit originale tester `4716804ea4a6e38ecd8fdf462de61d81d4d4e857`. Job GitHub Actions `38594611752`, `baseline_11`: stessi 11 casi selezionati, **0 PASS / 11 FAIL**, con stessi messaggi riscontrati nel laboratorio (`test/run.js`: 253 PASS / 11 FAIL). Nessuno degli 11 fallimenti è una regressione introdotta dalla rimozione dell'autoload G11.
- **Non confondere origine e gravità:** preesistente NON significa innocuo. I test riflettono possibili bug reali di Spesa, Scorte, Kitchen Mode, Dettaglio e possibili controlli obsoleti. Le classi `.ricette-icon` e `.scorte-icon` attese dal vecchio test non sono quelle realmente utilizzate nella navbar approvata: il relativo fallimento è obsolescenza del test.
- **Priorità di prodotto fuori dall'analizzatore:** (P1) quantità e conteggi confezioni, completamento campo suggerimenti Spesa; (P1/P2 dopo riproduzione) indicatori Scorte e testo scadenze freezer; (P1/P2) presenza voto /100 in Dettaglio secondo FROZEN; (P2) aspettative animazione/riconoscimento gesto Kitchen Mode solo dopo confronto con FROZEN; (test-only) icone navigazione. Sono ipotesi da confermare su UI reale, non bug dichiarati risolti.
- **Gate sviluppo:** Recipe Analyzer M2 NON dipende da queste funzioni e può procedere in isolamento. Prima di promuovere cambiamenti visivi nel tester ufficiale occorre test di regressione pertinente, verifica Kitchen Mode e decisione esplicita sugli eventuali bug preesistenti che impattano l'app. Non correggere 11 casi in blocco e non cambiare i FROZEN senza autorizzazione.
- **Budget/sicurezza:** confronto fatto esclusivamente sul branch laboratorio con checkout temporaneo del commit originale; `main` e `mealup-tester-family-fo` non modificati, nessun deploy.
