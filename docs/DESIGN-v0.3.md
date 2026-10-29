# Carwash Tycoon — ontwerpplan v0.3

**Status:** ontwerp goedgekeurd voor implementatie (29 oktober 2026)  
**Doel:** huidige stilstaande wasbox vervangen door een verzorgde, soepel geanimeerde top-down simulatie van een volledig uitbreidbaar wasstraatterrein.  
**Platform:** mobile web, installeerbaar als PWA (later), met automatische GitHub Pages-publicatie.

## 1. Designprincipes

1. **Het volledige terrein in beeld**: een echte 90° bovenaanzicht-camera, géén isometrische of zijdelingse truc. De speler kan in- en uitzoomen en het terrein verschuiven.
2. **Eerst een geloofwaardige simulatie**: auto's houden afstand, volgen rijstroken, wachten bij bezette machines, remmen en trekken op.
3. **Visuele kwaliteit boven hoeveelheid**: een stijlvaste, strakke 2D-wereld met details, subtiele schaduwen, materiaaltextuur en vloeiende beweging; geen lukraak knipperende emoji's of losse rechthoeken.
4. **Automatische kernloop**: auto's wassen en betalen zonder verplicht te klikken. De speler beheert uitbreiding, efficiëntie en de klantstroom.
5. **Geschikt voor aanraking**: grote touch-targets, contextual bottom sheet, pinch-zoom, pan en optioneel tikken op een gebouw.
6. **Eerlijk over realisme**: fotorealistische 3D is géén doel voor v0.3; wel fysiek geloofwaardige 2D-beweging en mooie effecten.

## 2. Wereldkaart en exacte indeling

Logische wereldmaat: **1920 × 1280 world units**, met basisraster van **80 units per vak** (24 × 16 vakken). De wereld kan later in stukken aan de randen worden uitgebreid.

| Zone | Rasterkolommen | Rasterrijen | Startstatus | Functie |
| --- | --- | --- | --- | --- |
| Inrit + bord | 0–3 | 6–9 | Open | Voertuigen spawnen van buiten beeld |
| Wachtrij / opstelstrook | 3–8 | 4–11 | Open | Capaciteit 4 auto's, later +2 per uitbreiding |
| Voorwas | 9–11 | 5–9 | Open | Schuim en hogedruk, deels onder dak |
| Automatische wasstraat | 12–17 | 5–9 | Open | Borstels, water, wax, drogers, lopende band |
| Uitrit | 18–23 | 6–9 | Open | Auto's rijden de wereld uit |
| Technische ruimte | 12–15 | 2–4 | Vast | Machines, leidingen, opwaarderen via tik |
| Stofzuigplein | 8–16 | 11–15 | Vergrendeld | Vier plekken; pas kopen na enige progressie |
| Extra strook / fast lane | 3–17 | 0–3 | Vergrendeld | Tweede operationele rijbaan |
| Interieurservice | 17–22 | 11–15 | Vergrendeld | Hogere orderwaarde |
| Kantoor / kassa | 1–5 | 11–15 | Open | Statistieken, personeel, beheer |

De exacte visuele polylines van wegen worden aan de zonevormen aangepast; raster is voor plaatsing en upgrades, auto's volgen spline-routes, niet een hoekige tegelroute.

**Startbeeld:** de hele basislocatie zichtbaar in een landscape-browser; op een telefoon in portret wordt passend uitgezoomd met een zoomknop om details te bekijken, zonder dat knoppen het terrein afdekken.

## 3. Schermindeling

**Bovenbalk (compact, sticky):** Carwash Tycoon-logo links, saldo centraal (€), rechts snelheid (1×/2×), instellingen. Onder de balk kleine indicatoren: vandaag gewassen, wachtrijlengte, reputatie, omzet per minuut.

**Midden (85% van beschikbare ruimte wanneer mogelijk):** live top-down canvas. Duidelijke inrit en uitrit. Wegmarkering, groenstroken, hekwerk, machinegebouw, werkende wasinstallatie. Hoogte via subtiele bovenaanzicht-schaduwen en weerspiegelingen.

**Onderkant:** ingeklapte navigatie met 'Terrein', 'Bouwen', 'Personeel', 'Statistieken'. Tikken op een gebouw opent een bottom sheet met status, werking, verbetering, kosten en vereisten. Upgradelocaties tonen op de kaart een bescheiden slot/kost-indicator.

**Camera:** pan met één vinger; pinch-zoom op mobiel; muiswiel op desktop. Terug-naar-overzicht-knop. Contextuele aanraking gaat vóór verslepen bij kleine beweging.

## 4. Voertuigsysteem

1. **Spawn:** aankomst na variabele wachttijd; nieuw voertuig vanaf weg buiten beeld.
2. **Approach:** aanrijden over weg, vloeiend bochten nemen.
3. **Queue:** remmen op afstand van voorganger; geen overlap/teleportatie.
4. **Prewash:** langzaam voorwaszone binnenrijden; tijdelijke spray en schuim.
5. **Conveyor:** auto's gaan gecontroleerd door de tunnel; borstels draaien alleen als er een auto op het juiste punt staat.
6. **Dry:** waterdruppels en nevel nemen zichtbaar af.
7. **Checkout:** opbrengst verschijnt kort als subtiele flyout; reputatie en totaal worden bijgewerkt.
8. **Exit:** versnellen en via uitrit volledig uit beeld.

**Bewegingsmodel:** positie in wereldcoördinaten langs een afgeronde Bezier/catmull-rom-weg, hoek bepaald door routetangent, easing voor acceleratie en remmen, voertuigspecifieke maximumsnelheid, vaste simulatiestap van 1/60 s met geïnterpoleerde rendering, delta-time begrenzen bij tabwissel. Geen harde sprongen tussen statusfases.

**Voertuigvariatie:** 3 silhouetten (hatchback, sedan, SUV), 6 ingetogen lakvarianten, ramen/wielen/lichtunits en zachte contactschaduw.

## 5. VFX + geluid

- **Voorwas:** korte waterstraal met meerdere grootteklassen, fijne mist en waterplassen die subtiel opdrogen; géén grote ondoorzichtige cirkels.
- **Schuim:** schuimmasker verschijnt over het voertuig, wordt daarna in beweging afgevoerd.
- **Borstels:** continue hoekrotatie en lichte veerbeweging bij contact.
- **Droging:** animatie van kleine lucht- en druppeldeeltjes, afnemende natte glans.
- **Terrein:** subtiele verschuiving van schaduwen, trage ventilatoren, lichte licht- en reflectie-effecten.
- **Geluid (later opt-in):** motorgeluid, banden, water, drogers en geld; standaard gedempt tot eerste interactie.

Deeltjes via beperkte pools i.p.v. onbeperkt nieuwe objects. Respecteer `prefers-reduced-motion` zonder gameplay te stoppen.

## 6. Speelbare v0.3-loop

- Automatisch een klant ongeveer elke 5–10 spel-seconden, zolang de wachtrij capaciteit heeft.
- Basispakket €12; premiumprogramma €20; deluxe €28. Prijs wordt betaald bij voltooide wasbeurt.
- Startsaldo €2.500, startcapaciteit 1 waslijn en wachtrij voor 4 auto's.
- Verwerking per auto: voorwas → tunnel → drogen. Capaciteit groeit met upgrades.
- Als wachtrij vol is, rijden nieuwe auto's door; verlies van gemiste omzet wordt geteld.
- Lokale voortgang wordt automatisch opgeslagen. Migratie van oudere `carwash-v1` gegevens waar mogelijk, zonder stilzwijgend verlies.

## 7. Upgradekaart (balans voorlopig)

| Bouw/upgrade | Richtprijs | Eerste effect | Vereiste |
| --- | ---: | --- | --- |
| Sterkere voorwas | €350 | Voorwas 15% sneller | Vanaf start |
| Snellere band | €650 | Tunneldoorvoer +15% | Vanaf start |
| Premium wax | €950 | Meeropbrengst op premium was | 10 gewassen auto's |
| Wachtrijuitbreiding | €600 | +2 plaatsen | Vanaf start |
| Stofzuigplein | €2.400 | Extra opbrengst op optionele klanten | 20 gewassen auto's |
| Interieurservice | €4.200 | Deluxe-service | Stofzuigplein |
| Tweede waslijn | €8.000 | Parallelle verwerking | 80 gewassen auto's |
| Extra perceel | €12.000 | Meer bouwruimte | Tweede waslijn |

Interactie: selecteer een kavel → bekijk voorbeeld/footprint → bevestig met één knop. Geld en vereisten serverloos en lokaal gevalideerd. Kosten lopen voor herhaalupgrades op.

## 8. Technische architectuur

- **Renderer:** Canvas 2D met device-pixel-ratio (max. 2 voor mobiel), requestAnimationFrame; later uitbreidbaar naar PixiJS/Phaser als animatiecomplexiteit daarom vraagt.
- **Simulatie:** onafhankelijke vaste game-tick en separate renderer; statusmodel met voertuigen, gebouwen, paden en upgrades.
- **Padvolging:** vloeiende bochten en bezettingscontrole per segment; geen cars die op elkaar stapelen.
- **UI:** HTML/CSS-overlay, toegankelijk en leesbaar op smartphones.
- **Assets:** consistente eigen sprites/vectors, geen emoji-objecten in de spelwereld.
- **Opslag:** versiebeheer voor savegames, localStorage voor v0.3; serveraccounts later.
- **Hosting:** statische site op GitHub Pages; buildstap niet nodig voor eerste werkende versie.

Voorgestelde structuur:
```
index.html
styles/
  game.css
src/
  main.js
  sim.js
  world.js
  cars.js
  render.js
  effects.js
  economy.js
  save.js
assets/
  (sprites / textures indien nodig)
docs/
  DESIGN-v0.3.md
```

## 9. Definition of Done

- [ ] Kaart toont volledig terrein, niet alleen één voertuig.
- [ ] Auto's rijden vloeiend binnen, door de wasstraat en naar buiten; geen teleportatie.
- [ ] Meerdere auto's kunnen tegelijk aankomen en in een echte rij wachten.
- [ ] Water, schuim, borstels en drogers zijn aan de wasfase gekoppeld.
- [ ] Gebouwen op het terrein zijn te selecteren en te verbeteren.
- [ ] Één uitbreiding voegt zichtbaar nieuw terreinonderdeel toe.
- [ ] Economie werkt automatisch, met zichtbare uitbetalingen en betaalbare upgrades.
- [ ] Touchbediening werkt op een iPhone; desktop met muis eveneens.
- [ ] Spelvoortgang wordt opgeslagen zonder onnodig te resetten.
- [ ] Soepele, responsieve frame pacing op mobiele apparaten; streven 60 fps.
- [ ] Publicatie via GitHub Pages na commit naar `main`.

## 10. Bouwvolgorde

**Fase A: kwaliteit van de basis.** Nieuw terrein + camera + eerste hoogwaardige auto + vloeiende inrit/uitrit; tijdelijke oude UI mag weg.

**Fase B: werkende wasstraat.** Queue, machines, effecten, omzet en sim-timing.

**Fase C: tycoon.** Selecteerbare gebouwen, uitbreidbare percelen, upgradepaneel, economie en opslag.

**Fase D: polish.** Animatietweaks, tablet/telefoons, feedback, geluid, balans en prestatietests.

**Belangrijk:** publiceer eerst een samenhangende speelbare nieuwe basis; voorkom het doorplakken van oude moddervlek-animaties.
