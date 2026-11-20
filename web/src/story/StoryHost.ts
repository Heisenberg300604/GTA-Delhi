import type * as THREE from 'three';
import type { Input } from '../engine/Input';
import type { AudioSystem } from '../engine/Audio';
import type { Hud } from '../ui/Hud';
import type { DialogueBox } from '../ui/DialogueBox';
import type { Marker } from '../world/Marker';
import type { CameraController } from '../camera/CameraController';
import type { SaveManager } from '../save/SaveManager';
import type { PlayerController } from '../player/PlayerController';
import type { Drivable } from '../vehicles/Drivable';
import type { AnimatedCharacter } from '../player/AnimatedCharacter';

export interface Interaction {
  x: number;
  z: number;
  radius: number;
  label: string;
  triggered: boolean;
}

/** Everything a mission script may touch. Implemented by Game; keeps story code decoupled. */
export interface StoryHost {
  scene: THREE.Scene;
  input: Input;
  audio: AudioSystem;
  hud: Hud;
  dialogue: DialogueBox;
  marker: Marker;
  camera: CameraController;
  save: SaveManager;
  player: PlayerController;
  bike: Drivable;
  car: Drivable;
  /** Vehicle the player is in, or null on foot. */
  vehicle(): Drivable | null;
  /** Player position whether on foot or driving. */
  focus(): THREE.Vector3;
  /** Pull the player out of any vehicle immediately. */
  forceExit(): void;
  setControlsLocked(locked: boolean): void;
  /** Keep pedestrians out of a circle (cutscene sets). */
  setCrowdExclusion(zone: { x: number; z: number; r: number } | null): void;
  /** Ambient story NPCs that live in the world (chaiwala, baker...). */
  npc(id: string): AnimatedCharacter | undefined;
  interaction: Interaction | null;
  hasCharacterModels: boolean;
}
