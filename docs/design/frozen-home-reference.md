# MealUp — frozen Home reference, Fase 0/6

Questa scheda **congela la misurazione delle due immagini**. Non contiene modifiche alla UI né scelte di implementazione della bilancia o della navigation.

## Prerequisiti verificati

- Branch remoto `mealup-redesign-preview`: HEAD `708ac3dfcc6170f1d18fac08e98a2833dd968e02`, figlio diretto di `e8e9dbfabcb694d365ad758411cf5f4542daec2c`. Il checkout locale con i commit precedenti non è stato usato come baseline visiva.
- Chrome: font face `Satoshi` **loaded**, `document.fonts.check('700 20px Satoshi') = true`, famiglia CSS computata `Satoshi, sans-serif`. La stringa di prova misura **408,37 px** in Satoshi e **394,61 px** nel fallback; nessun errore pagina.
- Bilancia: **1672 × 941 px**, SHA-256 `802e5bbe43c4139c9f6cc6937550cca245b11a8551d7ef2b0bf5b4ead73443dd`.
- Navigation: **1536 × 1024 px**, SHA-256 `46f6bfa963bb17aa2efd64421b3bbcf9ce3ddab4ea5801d0deed84d3b68648d9`.

Origine delle coordinate: angolo alto sinistro; rettangoli `x0,y0–x1,y1` con bordo finale escluso. Le immagini sono PNG RGB senza alpha o profilo ICC. Le coordinate ricavate per soglia colore descrivono il materiale visibile e possono escludere antialiasing/ombre; le altre sono stime visive con tolleranza indicata. I box non sono misure CSS da applicare direttamente.

## Geometria

| Reference | Parte | Box in px | L × H | Metodo / tolleranza |
|---|---|---:|---:|---|
| Bilancia | `visible_object_including_feet` | `449,73–1218,844` | 769 × 771 | stima visiva ±4 px |
| Bilancia | `head_outer` | `449,73–1218,488` | 769 × 415 | maschera ±3 px |
| Bilancia | `dial_recess` | `483,94–1185,460` | 702 × 366 | stima visiva ±6 px |
| Bilancia | `neck_narrow` | `762,486–904,626` | 142 × 140 | stima visiva ±7 px |
| Bilancia | `neck_flare` | `647,603–1018,729` | 371 × 126 | stima visiva ±8 px |
| Bilancia | `base_outer` | `509,710–1148,814` | 639 × 104 | maschera ±3 px |
| Bilancia | `base_recessed_slot` | `553,756–1105,794` | 552 × 38 | stima visiva ±5 px |
| Bilancia | `left_foot` | `558,816–637,844` | 79 × 28 | maschera ±3 px |
| Bilancia | `right_foot` | `1023,816–1101,844` | 78 × 28 | maschera ±3 px |
| Bilancia | `dial_ticks_span` | `532,120–1132,256` | 600 × 136 | stima visiva ±12 px |
| Bilancia | `amber_arc_visible_state` | `648,167–847,230` | 199 × 63 | maschera ±3 px |
| Bilancia | `needle_visible_state` | `842,219–894,344` | 52 × 125 | maschera ±3 px |
| Bilancia | `flip_four_tiles` | `724,344–928,402` | 204 × 58 | maschera ±3 px |
| Bilancia | `kcal_word` | `952,364–1007,387` | 55 × 23 | maschera ±3 px |
| Bilancia | `round_orange_button` | `809,535–858,588` | 49 × 53 | maschera ±3 px |
| Bilancia | `label_730` | `608,239–672,271` | 64 × 32 | stima visiva ±8 px |
| Bilancia | `label_1470` | `792,207–871,241` | 79 × 34 | stima visiva ±8 px |
| Bilancia | `label_2200` | `970,242–1052,273` | 82 × 31 | stima visiva ±8 px |
| Bilancia | `label_80` | `1072,314–1119,344` | 47 × 30 | stima visiva ±8 px |
| Navigazione | `top_integrated_bar` | `147,50–1383,273` | 1236 × 223 | stima visiva ±8 px |
| Navigazione | `top_key_home` | `202,73–389,253` | 187 × 180 | stima visiva ±10 px |
| Navigazione | `top_key_recipes_active` | `434,72–628,255` | 194 × 183 | stima visiva ±10 px |
| Navigazione | `top_key_shopping` | `677,73–863,253` | 186 × 180 | stima visiva ±10 px |
| Navigazione | `top_key_pantry` | `913,73–1099,253` | 186 × 180 | stima visiva ±10 px |
| Navigazione | `top_key_profile` | `1147,73–1333,253` | 186 × 180 | stima visiva ±10 px |
| Navigazione | `pressed_key_sample` | `657,365–859,545` | 202 × 180 | stima visiva ±12 px |
| Navigazione | `detail_inactive_sample` | `60,361–269,553` | 209 × 192 | stima visiva ±12 px |
| Navigazione | `detail_active_sample` | `350,360–567,554` | 217 × 194 | stima visiva ±12 px |
| Navigazione | `bottom_frontal_bar` | `51,754–828,894` | 777 × 140 | stima visiva ±10 px |
| Navigazione | `bottom_side_profile` | `899,804–1504,875` | 605 × 71 | stima visiva ±12 px |

L'oggetto bilancia, piedini compresi e ombra esterna esclusa, occupa circa **769 × 771 px** (x 449–1218, y 73–844), centrato a x **833,5**. La testa esterna misura **769 × 415 px**; la base chiara **639 × 104 px**. La scanalatura incassata è circa **552 × 38 px**. La lancetta visibile e l'arco ambra sono fotografie di uno stato soltanto: non forniscono una funzione di mapping. Il contatore ha **4 tessere** e mostra **1282 kcal**; le scritte del quadrante sono **730 / 1470 / 2200 / 80** così come compaiono, senza reinterpretazione numerica.

La barretta principale della navigation misura circa **1236 × 223 px**; cinque tasti in rilievo hanno centri visivi vicini a x **295 / 531 / 770 / 1006 / 1240**. È selezionato **Ricette**. Le viste frontale e laterale in basso servono a misurare continuità, spessore e luce interna del materiale; non rappresentano componenti separati da aggiungere alla Home.

## Palette campionata

La foto della **bilancia** governa l'arancione della Home e la materia crema. La reference navigation serve per rilievo, bruni e luce del tasto attivo; il suo fondale beige non sostituisce l'arancione Home. I valori sono mediane di regioni o maschere cromatiche indicate nel JSON, quindi descrivono **pixel della reference con luci e ombre già incorporate**, non nuovi token arbitrari.

| Reference | Materiale / dettaglio | Mediana sRGB | Regione |
|---|---|---|---|
| Bilancia / Home | `home_orange_top` | `#eb6217` | crop [30, 30, 350, 350] |
| Bilancia / Home | `home_orange_lower_variation` | `#e65c14` | crop [30, 700, 350, 890] |
| Bilancia / Home | `dial_cream` | `#f2dbc6` | crop [740, 260, 810, 320] |
| Bilancia / Home | `shell_highlight` | `#f6e3d0` | crop [790, 78, 900, 92] |
| Bilancia / Home | `neck_cream` | `#efd3bc` | crop [790, 620, 805, 670] |
| Bilancia / Home | `base_front_cream` | `#ebccb3` | crop [750, 790, 795, 805] |
| Bilancia / Home | `recessed_slot_cream` | `#eacbb2` | crop [725, 768, 775, 784] |
| Bilancia / Home | `flip_anthracite` | `#33302a` | crop [735, 360, 751, 375] |
| Bilancia / Home | `dial_ink_brown_masked` | `#745438` | maschera colore |
| Bilancia / Home | `flip_digit_gray_masked` | `#9c9996` | maschera colore |
| Bilancia / Home | `arc_amber_masked` | `#f7ae61` | maschera colore |
| Bilancia / Home | `needle_orange` | `#ed5408` | crop [876, 234, 884, 252] |
| Bilancia / Home | `button_orange` | `#e06206` | crop [820, 548, 842, 570] |
| Bilancia / Home | `foot_brown` | `#5c341c` | crop [567, 829, 595, 840] |
| Bilancia / Home | `ground_shadow_warm` | `#b43b03` | crop [730, 834, 930, 858] |
| Navigazione / materiale | `surround_beige` | `#eee5db` | crop [50, 18, 120, 75] |
| Navigazione / materiale | `unselected_key_cream` | `#e3d7ca` | crop [728, 106, 744, 119] |
| Navigazione / materiale | `active_key_warm_face` | `#fcca87` | crop [477, 170, 492, 180] |
| Navigazione / materiale | `active_key_diffused_light` | `#fed79b` | crop [518, 229, 533, 241] |
| Navigazione / materiale | `icon_dark` | `#41382f` | crop [747, 153, 767, 164] |
| Navigazione / materiale | `selected_icon_orange_masked` | `#fb7825` | maschera colore |
| Navigazione / materiale | `side_shadow` | `#c3b09d` | crop [100, 874, 122, 883] |

Il fondo arancione varia nella fotografia: mediana alto sinistra **#eb6217**, basso sinistra **#e65c14**. Il quadrante è **#f2dbc6**, la luce sul guscio **#f6e3d0**, la scanalatura **#eacbb2**. Inchiostro del quadrante **#745438**, flip **#33302a**, arco **#f7ae61**, lancetta **#ed5408**. La luce diffusa della navigation selezionata è circa **#fed79b**; il tasto inattivo campionato **#e3d7ca**.

## Vincoli visivi congelati

- La bilancia è direttamente sull'arancione; il bordo fisico del suo guscio appartiene all'oggetto, non a una card UI.
- Non compaiono piatto, bracci laterali, contrappesi esterni, elementi cromati o una progress bar nella scanalatura della base.
- Arco, lancetta e contatore di questa foto descrivono uno stato statico. Nessuna formula calorie→angolo viene stabilita in questa Fase 0/6.
- La navigation è un unico pezzo crema morbido con cinque tasti; il selezionato ha luce interna ambra/arancione diffusa.
- La foto della bilancia include lo sfondo arancione nei pixel RGB. Un eventuale riuso statico come cutout richiede un'estrazione esplicita in una fase successiva; non è disponibile trasparenza originale.

Il file [JSON](frozen-home-reference.json) contiene coordinate normalizzate, tolleranze, aree di campionamento e SHA delle immagini per ripetere la verifica.
