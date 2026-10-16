# Food Portrait Pipeline — Issue log

## 2026-10-16 — Controlled lot FPP-LOT-001

- `RESOLVED` — I PNG generati per `d32` e `do10` superavano il limite byte del QA tecnico. Nessuna nuova immagine è stata generata: conversione WebP lossless, hash dei pixel decodificati identici e QA tecnico ripetuto con esito PASS.
- `RESOLVED` — Il primo comando di verifica finale concatenava più documenti JSON e passava più test come un solo argomento PowerShell. Nessun file era corrotto. Il comando è stato corretto; cinque JSON validi, tre self-test PASS e registro agenti 6/6 PASS.
- `OPEN / BLOCKED` — `E08_HISTORICAL_VESSEL_SHA_MISMATCH`: l'hash della tavola vessel storica non è dimostrato. La tavola non è usata come evidenza e il relativo gate resta bloccato.
- `RESOLVED` — Owner approval ricevuta per `d32` e `do10`: gli stessi raster verificati sono ora FROZEN. Integrazione e deploy restano non autorizzati.
