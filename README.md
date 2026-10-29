# Carwash Tycoon 🚘

**v0.3 — compleet vernieuwde top-down managementgame.** Bouw en verbeter je eigen wasstraatterrein rechtstreeks in de browser.

🎮 **Spelen:** https://theroyalcaptain.github.io/Carwash-Tycoon/

## Wat werkt er nu?
- Volledig bovenaanzicht van een terrein met inrit, wachtrij, voorwas, automatische tunnel, drooginstallatie, kantoor en uitbreidbare kavels.
- Auto's komen autonoom binnen, remmen voor een bezette installatie, rijden door de wasstraat en vertrekken.
- Auto-animaties met optrekken, afremmen, verschillende voertuigen, draaiende borstels, waterdeeltjes, schuim en uitbetalingen.
- Upgrades voor wachtrij, voorwas, band, wax, marketing, stofzuigplein en interieurservice.
- Realtime inkomsten en statistieken, 1×/2× snelheid, automatisch opslaan in `localStorage`.
- Pan en pinch-zoom op mobiel, muiswiel en slepen op desktop.

## Bediening
1. Open de website op mobiel of desktop.
2. Versleep de kaart of gebruik de zoomknoppen om gebouwen te bekijken.
3. Tik op een installatie of op **Upgrades** om verbeteringen te kopen.
4. Gebruik **Bouwen** om nieuwe diensten te kopen zodra je genoeg klanten hebt gewassen.
5. De wasstraat draait automatisch; de speler beslist hoe het bedrijf groeit.

## Techniek
- Statisch: HTML, CSS, vanilla JavaScript, Canvas 2D.
- Geen externe libraries, API-sleutels, server of buildstap nodig.
- GitHub Pages publiceert automatisch vanaf `main`.
- Data per apparaat/browser. Gebruik dezelfde browser voor je opgeslagen voortgang.
- Savegame v3 met migratie van het saldo, het aantal klanten en de reputatie uit de oudere game.

## Projectstructuur
```
index.html
styles/game.css
src/game.js
docs/DESIGN-v0.3.md
```

## Roadmap
- [x] Rebuild naar een terrein-brede top-down renderer
- [x] Autonome voertuigsimulatie, wachtrij en afhandeling
- [x] Machines met animaties en effecten
- [x] In-game aankoopbare, zichtbaar veranderende uitbreidingen
- [x] Mobiele pan / zoom en opslaan
- [ ] Verbeterde voertuigroutes met bochten naar specifieke serviceplaatsen
- [ ] Echt operationele tweede wasstraat
- [ ] Eigen artwork, geluiden en betere terreintexturen
- [ ] Meer medewerkers, kapotte machines en onderhoud
- [ ] Optionele online accounts en synchronisatie

**Ontwerpkeuzes:** [DESIGN-v0.3.md](docs/DESIGN-v0.3.md)
