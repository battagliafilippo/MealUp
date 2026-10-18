# MealUp AI Office — Fase 02: protezione del repository e preflight privato
**Stato:** PARZIALMENTE VERIFICATO / blocchi amministrativi aperti. Data 15/10/2026. Scope: SOLO documentazione e laboratorio `experiment/recipe-visual-agents`.

> **AGGIORNAMENTO 18/10/2026 (prevale sullo storico sotto):** il gate AIOS-02.1 è stato COMPLETATO. La regola GitHub [Protect main](https://github.com/battagliafilippo/MealUp/rules/25214872) è ACTIVE, `main` risulta `protected:true`, richiede PR e blocca cancellazioni/non-fast-forward. Le istruzioni di creazione seguenti sono conservate soltanto per documentare il blocco storico e non vanno rieseguite. Rimane aperto AIOS-02.2, accesso privato alla Costituzione nel Director.

## Gate 02.1 — Branch main (BLOCKED; amministrazione GitHub)

Controllo effettivo via GitHub API: `branches/main` segnala `protected:false`, `rulesets` restituisce `[]`. Il connettore autorizzato in chat non espone una funzione per creare o modificare regole di protezione. Una regola di branch richiede permessi amministrativi sulla pagina delle impostazioni del repository. Nessuna scrittura su main né permessi di modifica ad agenti finché il controllo non è superato.

**Unica azione indispensabile a carico del proprietario:**
1. Apri [Settings → Branches del repository](https://github.com/battagliafilippo/MealUp/settings/branches) con la sessione dell'amministratore, scegli **Add classic branch protection rule**.
2. In **Branch name pattern**, scrivi esattamente `main`.
3. Abilita **Require a pull request before merging**; se GitHub mostra anche il requisito di un numero di approvazioni, non impostare obbligatoriamente un secondo revisore non disponibile. Usa controlli e revisione del CEO prima dei merge.
4. Lascia **Allow force pushes** e **Allow deletions** **disabilitati**.
5. Se disponibile, seleziona **Do not allow bypassing the above settings**, per applicare la regola anche agli amministratori.
6. Crea e salva la regola.

**Non scegliere ora status checks obbligatori che non eseguono sui PR verso main**, perché il merge si bloccherebbe senza la relativa verifica. I check specifici per `main` saranno valutati dopo una pipeline PR apposita. Il controllo di uscita per questo gate sarà leggere `branches/main.protected=true` e le regole applicate; non fare push dimostrativi su `main`.

Riferimento GitHub: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule

## Gate 02.2 — Costituzione originale privata (PARZIALMENTE VERIFICATO)

- Fonte: `Costituzione_Operativa_AI_v1.9_FROZEN.docx`, Libreria privata del CEO, non `MealUp` pubblico.
- Verifica reale locale: SHA-256 `51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb`; 152 sezioni rilevate; sezioni `1.3`, `2.1`, `2.17`, `8.6`, `8.9`, `9.3.1`, `9.10`, `12.15`, `12.16`, `13.5`, `14`, `A.14`, `B.4` presenti e non vuote.
- Codice pubblico, senza testo riservato: `tools/ai-office/constitution-task-packet.py`; supporta `--verify-source-only` per verificare una copia canonica PRIVATA ed emettere soltanto metadati, senza testo o output su disco. I test su documenti sintetici coprono permessi e rifiuto senza fonte.
- Preparare il pacchetto soltanto dopo la verifica del task e delle Skill, in una directory locale privata di permessi `0700`, con pacchetto `0600`. Niente upload del DOCX o del pacchetto in pubblico, artefatti GitHub, log CI o commit.
- I processi Github Actions su runner pubblici **non possono consultare direttamente la Libreria ChatGPT**. Il documento non è stato copiato su GitHub e non gli verrà trasferito automaticamente. Il collegamento permanente al Director richiede un runtime autorizzato in grado di accedere alla Libreria o a un archivio privato equivalente, soggetto a revisione della sicurezza.
- Non attribuire all'estrattore locale o a un test sintetico la prova di un Director/Office pienamente autonomo.

**Preflight locale autorizzato:** `python3 tools/ai-office/constitution-task-packet.py --canonical-docx /percorso/privato/Costituzione_Operativa_AI_v1.9_FROZEN.docx --verify-source-only`. Non è prevista alcuna chiamata AI, accesso a main, credenziale nuova o pagamento.

**Gate successivo:** verifica end-to-end, in un contesto autorizzato, che il Director non invii un incarico significativo senza fonte v1.9 autentica, Active Brief, micro-step, permessi, QA e checkpoint. Finché non esiste, l'esecuzione autonoma rimane BLOCCATA.

## Vincoli e prossima azione

Non modificare la Costituzione FROZEN, MealUp Master, PWA, tester o Food Portrait. Budget aggiuntivo permanente 0 €. Lo Scout resta indipendente e riporta solo al CEO. Non presentare come verificato ciò che necessita ancora di autorizzazione o prova indipendente.

Lo stato operativo completo è in [MASTERPLAN.md](MASTERPLAN.md) e `tools/ai-office/masterplan-ledger.json`. Una modifica di scope, standard o stato richiede nuova prova e riconciliazione.
