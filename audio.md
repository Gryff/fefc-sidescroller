# Audio Module Plan

Implementation plan for `src/audio.ts`: a small Web Audio wrapper that adds SFX and background music without pulling in a dependency.

## Scope

- One-shot sound effects triggered by gameplay events (projectile fire, enemy hit, boss hit, player damage, platform land).
- Looping background music with a clean start/stop.
- Independent volume control for SFX and music buses.
- Browser autoplay policy handled (AudioContext resumed on first user gesture).

Out of scope: positional/3D audio, dynamic mixing, audio sprites, crossfades between tracks.

## 1. Asset Location & Format

- New directory: `public/audio/`
  - `public/audio/sfx/` — short one-shots (`projectile.mp3`, `hit.mp3`, `boss-hit.mp3`, `player-hurt.mp3`, `land.mp3`)
  - `public/audio/music/` — looping tracks (`level-1.mp3`)
- Format: `.mp3` (universal browser support, smaller than `.wav`). `.ogg` is an option if we want higher quality at same size, but `.mp3` avoids the Safari edge cases.
- Keep SFX under ~100KB each; music under ~2MB (loop-friendly).

## 2. Module Shape

`src/audio.ts` exports:

```ts
export interface AudioSystem {
  playSfx(name: SfxName): void;
  playMusic(name: MusicName): void;
  stopMusic(): void;
  setSfxVolume(v: number): void;   // 0..1
  setMusicVolume(v: number): void; // 0..1
  unlock(): void;                  // call from first user gesture
}

export async function loadAudio(): Promise<AudioSystem>;
```

Internal structure:

- Single `AudioContext` created lazily (constructed on first `loadAudio` call, but `resume()` only on user gesture — see §5).
- Two `GainNode`s wired to `context.destination`: `sfxBus` and `musicBus`. Per-bus volume is just `gain.value`.
- `Map<SfxName, AudioBuffer>` and `Map<MusicName, AudioBuffer>` populated at load time.
- Current music `AudioBufferSourceNode` tracked on a field so `stopMusic` / `playMusic` can cancel the previous loop.

### Name types

```ts
type SfxName = "projectile" | "hit" | "boss-hit" | "player-hurt" | "land";
type MusicName = "level-1";
```

A const map from name → file path lives in the module so callers never pass raw paths.

## 3. Loading

`loadAudio()`:

1. Construct `AudioContext` (`new (window.AudioContext || window.webkitAudioContext)()`).
2. Create `sfxBus` and `musicBus` gain nodes, default `gain = 0.8` and `0.5` respectively (music quieter than SFX is the usual feel).
3. For every entry in the sfx + music path maps, in parallel:
   - `fetch(path)` → `arrayBuffer()` → `context.decodeAudioData(buf)` → store in the right map.
4. Return the `AudioSystem` interface.

Hook into `main.ts` alongside `loadAssets()` — run both in `Promise.all` so audio decode happens in parallel with image decode.

## 4. Playback

### `playSfx(name)`

- Look up buffer; if missing, warn and return (don't throw — audio should never crash gameplay).
- Create a fresh `AudioBufferSourceNode` each call (sources are one-shot and GC themselves after `onended`).
- Connect → `sfxBus` → destination. Call `.start(0)`.
- Overlapping calls naturally layer (e.g. rapid-fire projectiles), which is what we want.

### `playMusic(name)`

- If a track is already playing, stop it first (`currentMusicSource.stop()`).
- Create `AudioBufferSourceNode` with `loop = true`, connect to `musicBus`, `start(0)`, store reference.

### `stopMusic()`

- If `currentMusicSource` exists, `.stop()` and null it out.

## 5. Autoplay Unlock

Browsers suspend `AudioContext` until a user gesture. Strategy:

- `unlock()` calls `context.resume()` and is idempotent.
- In `main.ts`, attach `unlock` to the first `keydown`, `click`, and `touchstart` (once each, `{ once: true }`).
- On touch devices the existing joystick/fire handlers in `src/input/touch.ts` are a natural hook — call `audio.unlock()` from inside `setupTouchInput`'s first real interaction.

Music can't start until after unlock, so `playMusic("level-1")` is deferred: called from inside the same first-gesture handler that runs `unlock()`, not from bootstrap.

## 6. Integration Points

Wire the `AudioSystem` into `GameContext` (`src/types.ts`) so systems can access it without a global:

```ts
export interface GameContext {
  // ...existing fields...
  audio: AudioSystem;
}
```

Then fire events from:

| Event | File | Trigger |
|---|---|---|
| projectile spawn | `src/systems/projectile.ts` (`spawnProjectile`) | on every spawn |
| projectile hits enemy/boss | `src/systems/projectile-hits.ts` | on hit detected |
| player takes damage | `src/systems/health-damage.ts` | when player health decrements |
| land on platform | `src/systems/platform-collision.ts` | transition from airborne → grounded |

Each call is one line: `gameCtx.audio.playSfx("projectile")`. Systems that don't currently receive `gameCtx` get it threaded through (small refactor — most already do).

## 7. Bootstrap Changes

`src/main.ts`:

```ts
const [assets, audio] = await Promise.all([loadAssets(), loadAudio()]);

const gameCtx: GameContext = {
  canvas,
  ctx,
  projectileSpriteTemplate,
  isTouchDevice,
  audio,
};

const startAudio = () => {
  audio.unlock();
  audio.playMusic("level-1");
};
window.addEventListener("keydown", startAudio, { once: true });
window.addEventListener("pointerdown", startAudio, { once: true });
```

## 8. Testing

- `src/__tests__/audio.test.ts`: mock `AudioContext` / `fetch` / `decodeAudioData` and assert:
  - `loadAudio` decodes every declared path.
  - `playSfx` creates a source node connected to the sfx bus.
  - `playMusic` sets `loop = true` and cancels prior track on second call.
  - `setSfxVolume` / `setMusicVolume` clamp to `[0, 1]` and update the right bus.
- Integration testing is manual — verify in-browser that sounds fire on the right events and music loops cleanly.

## 9. Rollout Order

1. Add `public/audio/` with placeholder files (silent 100ms clips are fine to start).
2. Write `src/audio.ts` + unit tests.
3. Thread `audio` through `GameContext`, wire `loadAudio` into `main.ts`.
4. Add `playSfx` calls to the four gameplay systems in §6.
5. Replace placeholders with real assets (freesound.org for SFX, opengameart.org for music — check CC license).
6. Tune per-bus default volumes based on feel.

## Open Questions

- Do we want a mute toggle in the UI? Easy to add later (just `setSfxVolume(0)` / `setMusicVolume(0)` and persist to `localStorage`).
- Should music change per level or stay constant? Current plan assumes one track; `MusicName` union grows naturally when we add levels.
