# Piano temporaneo — recupero Home

Metodo: Costituzione Operativa AI v1.9. Stato: attivo soltanto per questa correzione; non modifica i freeze già approvati.

## Evidenza

- Il render Home approvato richiede una sola card ricetta per pasto, non una lista.
- La card ha un FO canonico grande ma interamente contenuto, gauge piccolo nell'angolo alto destro, titolo, tempo e CTA `Cucina` sempre visibili.
- Lo swipe riguarda soltanto la card; il selettore Colazione/Pranzo/Cena resta immobile.
- Lo screenshot del tester mostra una geometria a due colonne e testo tagliato: una regola generica `.scheda` sta vincendo sulla geometria Home.

## Intervento minimo

1. Dare alla card Home una specificità superiore alla regola generica, senza toccare le card Ricette.
2. Mantenere la geometria verticale: FO 144 px, metadati sotto, CTA 40 px.
3. Conservare il resolver FO di famiglia `HOME_CARD`; nessun FO legacy o illustrazione aggiuntiva.
4. Far avanzare le proposte dalla sola superficie card con Pointer Events e fallback touch; non modificare il pager dei pasti.

## Criteri di uscita

- Nessun testo oltre il bordo della card.
- Tutti gli elementi della card sono visibili nello stesso viewport della Home.
- Uno swipe orizzontale cambia la proposta e non cambia il pasto.
- Il FO rientra nell'area immagine e ripete la microanimazione al cambio proposta.
- Sintassi valida in sorgente e `dist`, asset FO e mapping invariati.
