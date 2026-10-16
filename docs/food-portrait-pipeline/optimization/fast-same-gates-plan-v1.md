# FAST SAME GATES v1 — piano del Direttore

## Decisione di principio

Il risultato visivo non viene reso piu economico. Il risparmio deriva esclusivamente da meno contesto ripetuto, meno polling, packet deterministici, automazione dei checkpoint e micro-lotti seriali nello stesso turno. ImageGen resta una chiamata separata per asset; QA tecnico, QA visivo indipendente e review owner restano invariati.

## Evidenza baseline

- Lotto corrente: 10 QA PASS su 11 generazioni; first-shot yield 90,9% perche `r5` ha richiesto una correzione autorizzata.
- 9 asset sono candidate-only; `r4` e l'unico owner-approved/FROZEN nel lotto.
- Il flusso p01–p07 ha richiesto circa un heartbeat ogni cinque minuti e ha ripetuto istruzioni stabili, skill completa e scritture narrative per ogni asset.
- Il QA tecnico e eseguibile con la dipendenza Sharp del runtime bundled tramite `NODE_PATH`; il nuovo preflight dovra risolverla e verificarla automaticamente, senza dipendere da configurazione manuale.

## Architettura proposta

1. **Cycle packet compiler** — un comando compatto restituisce solo la prossima ricetta, fatti verificati, reference SHA, gauge target e prompt canonico hashato.
2. **Prompt delta** — il template stile/vessel e versionato; per ricetta cambiano soltanto soggetto, ingredienti, preparazione, kcal e zona lancetta.
3. **Micro-lotto seriale 3–5** — stesso turno e stessa reference cache, ma una chiamata ImageGen distinta per immagine; N+1 parte solo dopo PASS di N.
4. **QA deterministico locale** — hash, pixel, formato, dimensioni, byte, alpha/crop e trasformazione lossless senza contesto modello.
5. **QA visivo indipendente compatto** — rubric fissa sugli stessi pixel: ingredienti, preparazione, vessel, stile, kcal, lancetta, testo/UI e crop.
6. **Commit atomico** — stato, manifest, checkpoint ed evento NDJSON aggiornati da un comando validato; rollup narrativo solo a fine lotto.
7. **Watchdog senza polling inutile** — heartbeat solo su lavoro attivo o anomalia; sospeso ai gate owner.

## Stima da verificare, non promessa

- Token di orchestrazione: riduzione attesa 60–85%.
- Tempo di coordinamento: riduzione attesa 50–75%.
- Costo ImageGen: invariato, una chiamata per asset.
- Qualita: deve risultare statisticamente non inferiore; qualunque regressione critica produce NO-GO.

## Pilot e condizioni

Il pilot deve usare 10 ricette non ancora prodotte, stratificate su almeno quattro vessel FROZEN e includere almeno tre casi medium/high risk. Non basta usare dieci bowl consecutive. Baseline e fast path devono ricevere gli stessi fatti, reference e gate.

Misure: token, byte contesto, tempo, chiamate, first-shot PASS, difetti per gate, decisione owner. Adozione solo con zero regressioni critiche, acceptance non inferiore, first-shot non inferiore al 90,9%, almeno 40% token e 20% tempo risparmiati, rollback provato.

## Stato e prossimo passo

Mandato di ricerca: **ACTIVE**. Produzione catalogo: **PAUSED**. Il prossimo micro-step e progettare e far approvare dall'owner il pilot stratificato; solo dopo si implementano compiler/committer in branch isolato e si misura il confronto.
