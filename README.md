# MealUp

App di nutrizione e ricette in italiano: una PWA in un **singolo file HTML**, senza
dipendenze, senza server, con tutti i dati salvati in locale sul dispositivo.

## Che cosa fa

- **La bilancia della giornata**: una bilancia da salumeria disegnata in SVG con
  l'ago, le cifre sul quadrante, il conta-calorie a flip clock e la striscia dei
  pasti in proporzione. A mezzanotte si riazzera da sola e la giornata finita si
  deposita nello storico.
- **Ricettario** con centinaia di ricette, ricerca, filtri, suggerimenti per
  pasto e icone per famiglia (la farfalla per la pasta, la bistecca per la
  carne, la bottiglietta per le salse...).
- **Dispensa, frigo, freezer e avanzi** con scadenze, calendari e combinazioni
  "con quello che hai". Anche a mezze porzioni.
- **Modalità cucina** passo per passo, con i timer flottanti trascinabili che
  sopravvivono alla chiusura e la sveglia a tutto schermo.
- **Piatto mangiato modificabile**: ogni pasto registrato si corregge senza
  toccare la ricetta originale, con l'ora di consumo.
- **Annulla e rifai** universale, **storico** con grafici, **profili multipli**.

## Come si usa

Basta aprire `index.html` in un browser. Per averla come app sul telefono:
aprirla da un hosting qualsiasi (per esempio GitHub Pages) e "Aggiungi alla
schermata Home".

## Test

```bash
cd test
npm i jsdom
node run.js
```

La suite (200 verifiche) avvia l'app in jsdom e la usa come farebbe una persona,
con l'orologio fermo alle otto di sera per essere ripetibile a qualsiasi ora.
