# MealUp AI Office — sede privata Windows, gate NTFS

**Stato al 18 ottobre 2026:** **BOOTSTRAP NTFS E VERIFICA ACL DI SINGOLI FILE TESTATI SU RUNNER WINDOWS REALE; NON INSTALLATI SUL PC DELL'UTENTE.**

Questo documento è parte del progetto AI Office sul solo branch `experiment/recipe-visual-agents`. Non modifica la Costituzione v1.9 FROZEN, MealUp Master, l'app, il tester o la Food Portrait Pipeline.

## Decisione del CEO e perimetro

Il CEO ha accettato di utilizzare il proprio PC Windows già disponibile come futura sede privata, senza nuovi abbonamenti. L'autorizzazione a **preparare la soluzione nel laboratorio** non costituisce ancora accesso remoto alla macchina o conferma che un servizio sia effettivamente installato e persistente.

## Componenti aggiunti

- `tools/ai-office/windows-private-host.ps1`: due azioni esplicite, `Provision` e `Verify`, progettate per creare/verificare in modo non distruttivo un'area sotto `%LOCALAPPDATA%\MealUp\AI-Office-Private`.
- Sottocartelle `state` (journal e mailbox), `archive` (snapshot metadata-only) e `original` (futura fonte privata della Costituzione). Non copia né scarica automaticamente l'originale DOCX e non avvia alcun esecutore.
- ACL NTFS senza ereditarietà sui quattro contenitori: **utente Windows corrente, SYSTEM e Administrators** identificati tramite SID, FullControl. Qualsiasi regola inattesa, gruppo pubblico, altro utente, owner non corrispondente, ereditarietà o reparse point viene rifiutato dall'audit.
- Rifiuta cartelle esterne alla `LOCALAPPDATA` dell'utente, directory temporanee, junction nei segmenti del percorso, contenuti preesistenti che potrebbero essere sovrascritti. `Provision` riallinea gli ACL solo su cartelle **vuote**.
- `Verify` è sola lettura: non concede autorizzazioni, modifica file o esegue codice AI.

**Importante:** nessuna procedura automatica può garantire protezione da un amministratore compromesso, malware con privilegi di sistema o un utente Windows già con accesso al profilo. La selezione di ACL NTFS è una barriera necessaria, non un vault crittografico.

## QA effettivo su GitHub Windows

Il workflow indipendente [QA - AI Office Private Windows NTFS Host](https://github.com/battagliafilippo/MealUp/actions/runs/39158008874) esegue **12 test sintetici su Windows reale** e verifica:

1. Installazione **solo dei contenitori** e verifica ACL.
2. Proprietario e protezione dall'ereditarietà.
3. Rifiuto di cartella fuori dal profilo utente.
4. Rifiuto della cartella `Temp`.
5. Rifiuto di una regola permissiva `Everyone`.
6. Riparazione controllata di ACL su contenitori vuoti.
7. Rifiuto di cartella `original` già popolata (non distruttività).
8. Verifica in sola lettura del contenitore inizializzato.
9. Verifica positiva delle ACL di un file fittizio ereditate dalla cartella privata.\n10. Rifiuto di file al di fuori delle tre directory gestite.\n11. Rifiuto di permessi `Everyone` applicati direttamente a un file.\n12. Nessun servizio, documento originale, connessione AI o pagamento.

Il test non carica la Costituzione, non usa credenziali e crea/elimina soltanto cartelle fittizie del runner. Anche i test Node di regressione e il controllo Engineering→QA del laboratorio sono riusciti nella stessa revisione.

## Cosa NON è stato fatto

- Nessuna installazione sul PC del CEO; il sistema non dispone di un collegamento alle cartelle del suo Windows.
- Il Director Node ha ancora guardie POSIX sul journal, sugli snapshot e sul file originale. **Non eliminare queste guardie** finché un adattatore NTFS completo, che utilizzi anche il validatore `VerifyFile`, non sia stato verificato nella catena Windows Node/Python con un originale autentico su host privato.
- Nessun avvio automatico, pianificazione all'accesso Windows, memoria cloud, backup cifrato off-host o uptime 24/7.
- Nessuna connessione persistente dalla Libreria ChatGPT al PC e nessuna identità digitale certificata degli agenti. Non considerare completo `AIOS-02.2`.

## Sequenza successiva con micro-step e gate

**WINDOWS-01 (verificato in CI):** ACL delle cartelle, verifica ACL dei file e 12 test positivi/negativi su Windows vero. Evidenza workflow sopra.

**WINDOWS-02 (implementato, in attesa di CI nativa):** `private-file-security.cjs` collega il validatore PowerShell in modo fail-closed al Director Node. Journal, mailbox, lock, pacchetti dell'estrattore Python, fonte originale e snapshot devono superare `Verify`/`VerifyFile`; su Windows non esiste fallback ai mode bit POSIX. La prova sintetica non usa il DOCX reale e non può completare il gate privato: dopo il CI Windows serve ancora un collaudo supervisionato sul PC autorizzato con l'originale, senza upload.

**WINDOWS-03 (non avviato):** stabilire una modalità di avvio locale e backup indipendente senza privilegi elevati né servizi a pagamento; l'avvio automatico richiede autorizzazione esplicita perché può consumare risorse PC.

**WINDOWS-04 (non avviato):** installazione supervisionata sul PC reale e collaudo dopo riavvio, senza mai caricare l'originale su GitHub o in un runner CI.

Non dichiarare `AIOS-02.2 VERIFIED` o otto agenti AI attivi prima del test end-to-end sul PC autorizzato. Il budget aggiuntivo resta 0 EUR.
