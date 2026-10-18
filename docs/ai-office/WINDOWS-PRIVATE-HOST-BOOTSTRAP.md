# MealUp AI Office — sede privata Windows, gate NTFS

**Stato al 18 ottobre 2026:** **BOOTSTRAP NTFS VERIFICATO SU RUNNER WINDOWS REALE; NON INSTALLATO SUL PC DELL'UTENTE.**

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

Il workflow indipendente [QA - AI Office Private Windows NTFS Host](https://github.com/battagliafilippo/MealUp/actions/runs/39157572574) esegue test sintetici su `windows-latest` e verifica:

1. Installazione **solo dei contenitori** e verifica ACL.
2. Proprietario e protezione dall'ereditarietà.
3. Rifiuto di cartella fuori dal profilo utente.
4. Rifiuto della cartella `Temp`.
5. Rifiuto di una regola permissiva `Everyone`.
6. Riparazione controllata di ACL su contenitori vuoti.
7. Rifiuto di cartella `original` già popolata (non distruttività).
8. Verifica in sola lettura del contenitore inizializzato.
9. Nessun servizio, documento originale, connessione AI o pagamento.

Il test non carica la Costituzione, non usa credenziali e crea/elimina soltanto cartelle fittizie del runner. Anche i test Node di regressione e il controllo Engineering→QA del laboratorio sono riusciti nella stessa revisione.

## Cosa NON è stato fatto

- Nessuna installazione sul PC del CEO; il sistema non dispone di un collegamento alle cartelle del suo Windows.
- Il Director Node ha ancora guardie POSIX sul journal, sugli snapshot e sul file originale. **Non eliminare queste guardie** finché un adattatore NTFS completo non sia stato verificato da test Windows che coprano anche file/symlink/sorgente, non soltanto directory.
- Nessun avvio automatico, pianificazione all'accesso Windows, memoria cloud, backup cifrato off-host o uptime 24/7.
- Nessuna connessione persistente dalla Libreria ChatGPT al PC e nessuna identità digitale certificata degli agenti. Non considerare completo `AIOS-02.2`.

## Sequenza successiva con micro-step e gate

**WINDOWS-01 (verificato in CI):** ACL directory provisioning + negative tests. Evidenza workflow sopra.

**WINDOWS-02 (prossimo):** aggiungere un validatore nativo NTFS di *file* per il DOCX originale, journal, mailbox e snapshot, poi collegarlo in modo fail-closed al Director Node e all'estrattore Python, preservando il supporto POSIX già verificato. Servono veri test Windows di scrittura/ripresa e controlli su symlink, hash originale, ACL esplicite su file.

**WINDOWS-03 (non avviato):** stabilire una modalità di avvio locale e backup indipendente senza privilegi elevati né servizi a pagamento; l'avvio automatico richiede autorizzazione esplicita perché può consumare risorse PC.

**WINDOWS-04 (non avviato):** installazione supervisionata sul PC reale e collaudo dopo riavvio, senza mai caricare l'originale su GitHub o in un runner CI.

Non dichiarare `AIOS-02.2 VERIFIED` o otto agenti AI attivi prima del test end-to-end sul PC autorizzato. Il budget aggiuntivo resta 0 EUR.
