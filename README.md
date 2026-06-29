# Frontline Arcana

A 2-player multiplayer WW2 card game with Magic-inspired turns, supply lines, exhausted units, blockers, tactics, operations, and faction-specific decks.

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`, create a battle, then open the same URL in another browser or private window and join with the room code.

## Deploy

The app runs as a normal Node.js web process and reads `PORT` from the environment, so it is suitable for Azure App Service, Replit, Render, Railway, or a similar host.

```bash
npm install
npm start
```

Azure App Service startup command:

```bash
npm start
```

## Factions

- UK: radar, navy, air defense, resilient midrange.
- Germany: Blitz armor, dive bombers, flak, fast tempo.
- France: fortifications, field guns, cavalry tanks, resistance.
- Italy: Mediterranean raids, mobile infantry, risky operations.
- Russia: mass infantry, rockets, armor, attrition.
- Japan: carrier air, island defense, infiltration, naval strikes.
- USA: logistics, industry, air superiority, heavy combined arms.
- Australia: ANZAC patrols, jungle fighting, desert endurance.

Card art currently uses one placeholder SVG per card id. Replace individual files in `public/assets/cards/` as custom art becomes available.
Germany and Australia also have faction art in `public/assets/factions/`; other factions still use the neutral UI treatment until art is added.

## Replaceable Assets

Card placeholders are packaged individually in `public/assets/cards/<card-id>.svg`.
Faction art is packaged individually in `public/assets/factions/<faction-id>.png`.
Sound effects are packaged individually in `public/assets/sounds/`; committed attacks use `attack.mp3`.

Regenerate placeholder assets after adding cards:

```bash
npm run assets
```

The active background is `public/assets/battlefield-bg.png`.

## Tests

```bash
npm test
```
