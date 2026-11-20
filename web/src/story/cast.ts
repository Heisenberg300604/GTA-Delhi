import type { Palette } from '../player/AnimatedCharacter';

/** Everyone who speaks. Colours drive the dialogue name tag; palettes dress their 3D actor. */
export interface CastMember {
  name: string;
  color: string;
  palette: Palette;
}

const p = (skin: string, hair: string, shirt: string, pants: string): Palette => ({ skin, eyes: '#161616', hair, shirt, pants });

export const CAST = {
  aryan: { name: 'Aryan', color: '#7bd389', palette: p('#7a4e33', '#120c08', '#2f7d32', '#2b3a55') },
  shanaya: { name: 'Shanaya', color: '#ff8fb1', palette: p('#a8714a', '#1c120c', '#7b1f45', '#1f1f1f') },
  pihu: { name: 'Pihu', color: '#ffd166', palette: p('#8d5a3c', '#120c08', '#fdd835', '#4e5b6e') },
  neelam: { name: 'Mummy', color: '#f4a261', palette: p('#8a5a3c', '#2b1d14', '#b23a48', '#7d1f2f') },
  vinod: { name: 'Papa', color: '#a8dadc', palette: p('#7a4b2e', '#5e5e5e', '#e9e4d8', '#5d4037') },
  ramesh: { name: 'Ramesh bhaiya', color: '#e9c46a', palette: p('#6e4429', '#1c140f', '#e8e2d0', '#3e2723') },
  baker: { name: 'Sweety Aunty', color: '#f4acb7', palette: p('#c48b5f', '#2b1d14', '#f8bbd0', '#ffffff') },
  gogi: { name: 'Gogi', color: '#e76f51', palette: p('#7a4b2e', '#120d0a', '#ffffff', '#1f1f1f') },
  sheru: { name: 'Sheru', color: '#e76f51', palette: p('#5c3a24', '#120d0a', '#212121', '#2b3a55') },
  lucky: { name: 'Lucky', color: '#ff9f1c', palette: p('#7a4b2e', '#120d0a', '#5d4037', '#1f1f1f') },
  dhanpat: { name: 'Head Constable Dhanpat', color: '#c9b37e', palette: p('#6e4429', '#1c140f', '#b59a5b', '#a68b4f') },
  constable: { name: 'Constable', color: '#c9b37e', palette: p('#8d5a3c', '#120c08', '#b59a5b', '#a68b4f') },
  worker: { name: 'Worker', color: '#bdbdbd', palette: p('#5c3a24', '#120d0a', '#90a4ae', '#4e5b6e') },
  bittu: { name: 'Bittu', color: '#90be6d', palette: p('#8d5a3c', '#120c08', '#1e88e5', '#2b2b2b') },
} satisfies Record<string, CastMember>;

export type CastId = keyof typeof CAST;
