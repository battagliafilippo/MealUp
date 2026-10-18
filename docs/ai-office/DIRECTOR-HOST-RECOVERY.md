# AI Office — custodia privata e ripresa dei checkpoint

**Data:** 18/10/2026. **Ambito:** solo `experiment/recipe-visual-agents`. **Costo aggiuntivo:** 0 €. **Stato:** pilot POSIX locale positivo, non servizio persistente sempre acceso.

## Implementazione effettiva

`tools/ai-office/director-host-recovery.cjs` crea e ripristina uno snapshot dei soli metadati presenti in `director-events.v1.json` e `office-mailbox.v1.json`. NON contiene il DOCX originale, testo di clausole, secret, file MealUp né risultati immagine. Il modulo:

- richiede directory assolute e private `0700`, diverse e non annidate, fuori dal repository pubblico; snapshot nuovi `0600`, non sovrascrivibili, con ID sicuri;
- conserva i record, le revisioni e i checkpoint con hash dell'archivio per individuare corruzioni ordinarie; i singoli journal continuano ad avere catene SHA;
- rifiuta snapshot danneggiati o con baseline errata, alias symlink, permessi troppo larghi e restore in cartelle già occupate;
- **non consente il ripristino** senza rileggere sulla stessa macchina il DOCX canonico originale (SHA-256 fisso, file privato non symlink);
- richiede checkout pulito sulla revisione Git effettiva, branch del laboratorio e revisione attesa identica;
- ritorna solo lo stato del restore: non avvia gli agenti, non si collega a provider e non trasforma uno snapshot in autorizzazione di lavoro;
- al prossimo vero incarico, `director-local-readonly.cjs` riesegue obbligatoriamente il preflight sulla fonte originale e decide se riutilizzare gli step già verificati.

Un SHA-256 senza una chiave di firma **non autentica un proprietario ostile dello snapshot**; il modello di sicurezza assume custodia locale privata, non un archivio pubblico. Per resistere alla perdita fisica del disco occorre un ulteriore backup cifrato su supporto indipendente autorizzato. Questa implementazione dimostra ripresa dopo arresto/processo, non disponibilità 24/7 o disaster recovery multi-host.

## Test reali e prove

Test GitHub pubblici (documento vero NON caricato): [QA suite](https://github.com/battagliafilippo/MealUp/actions/runs/39135454445), [Skill Engineering→QA](https://github.com/battagliafilippo/MealUp/actions/runs/39135454458). Otto nuove prove negative e di archiviazione: permessi, directory annidate, snapshot duplicato, contenuto manomesso, nome improprio, fonte assente/imitata, ruoli non eseguiti.

Prova **positiva aggiuntiva**, eseguita in un ambiente privato isolato da GitHub: codice pubblico estratto dall'[artifact capsule](https://github.com/battagliafilippo/MealUp/actions/runs/39135660948) e montato in una nuova checkout locale del branch sperimentale (SHA locale `5fb79d699f415400baddeb45b0610d07c37d7001`, diverso dallo SHA di pubblicazione dell'artifact). Il DOCX originale v1.9, hash canonico, è rimasto fuori dalla checkout. Risultati:

1. `runPrivateOffice` sullo stesso host: `PRIVATE_ORIGINAL_LAB_CHAIN_PASS_NOT_AUTONOMOUS_AI`, 67 regole applicate, Engineering PASS, QA PASS, 5 eventi, 3 messaggi, 0 chiamate AI.
2. `createSnapshot`: `PRIVATE_METADATA_SNAPSHOT_CREATED`, 5 eventi, 3 messaggi, `sourceCopied:false`.
3. `restoreSnapshot` in **nuova directory vuota**: `PRIVATE_CHECKPOINTS_RESTORED_NO_AGENT_EXECUTION`, `originalReverified:true`, stessi 5 eventi e 3 messaggi.
4. `runPrivateOffice` sulla nuova directory: ancora PASS, `reusedEngineering:true`, `reusedQA:true`, nessun doppio lavoro, nessuna scrittura all'app o costo.

La prova positiva è nel perimetro privato della sessione e il riepilogo documentale non contiene originale, path sensibili o estratti delle regole. Non può essere ripetuta dentro un GitHub Action pubblico senza esportare il documento, cosa vietata.

## Quale computer ospiterà davvero il Director

**Scelta raccomandata da validare col CEO:** PC personale già disponibile, senza nuovo abbonamento o macchina, con cartella privata durevole e controllo del proprietario. Il computer deve rimanere acceso durante il lavoro; quando spento, i checkpoint restano ma gli agenti NON proseguono. L'installazione effettiva sul computer dell'utente non è stata eseguita.

- **Windows nativo:** non è ancora approvato perché il modulo di sicurezza POSIX rifiuta esplicitamente `win32` in attesa di un controllo reale delle ACL NTFS. Non eliminare questo blocco per comodità; produrre e testare un adattatore Windows separato prima del deployment.
- **Linux/macOS POSIX:** prototipo collaudato con permessi `0700/0600`. Prima di renderlo operativo serve una directory realmente persistente (non `/tmp`) sotto il controllo del CEO, backup indipendente e runner con privilegi minimi.
- **GitHub Actions:** non usare runner pubblici come sede della Costituzione privata o come memoria durevole. Un workflow CI senza originale può soltanto eseguire test sintetici.
- **VPS gratuito o provider sperimentali:** non adottare come host finché persistenza, privacy, rinnovo gratuito e quota ricorrente non sono verificati; vietati crediti prova una tantum.

## Gate ancora aperti e prossimo micro-step

1. Confermare il computer già disponibile e l'accesso amministrativo legittimo del CEO; non configurare un host di terzi senza consenso.
2. Se Windows, creare un bootstrap con ACL NTFS verificate e QA anche su Windows; se POSIX, usare directory persistente e permessi minimi.
3. Qualificare l'avvio supervisionato, ripristino dopo reale restart del computer, backup separato e gestione della fonte originale.
4. Soltanto dopo collegare identità autentiche e ruoli agentici, quote gratuite effettive e richieste reali del Director. Preflight sull'originale prima di ciascun incarico.
5. Non dare permessi di scrittura ad agenti; Scout sempre CEO-only; niente deploy, tester, main o FROZEN.

**Masterplan:** `AIOS-02.2` e `AIOS-03.2` rimangono **PARTIALLY_VERIFIED**. La dimostrazione del ripristino locale non prova che l'ufficio abbia già un host a disposizione fra conversazioni.
