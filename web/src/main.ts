import './style.css';
import { Engine } from './engine/Engine';
import { Game } from './game/Game';
import type { Quality } from './config';

const app = document.getElementById('app')!;
const loading = document.createElement('div');
loading.className = 'loading';
loading.textContent = 'Building Kamla Nagar…';
app.appendChild(loading);

// ?q=low | medium | high
const param = new URLSearchParams(location.search).get('q');
const quality: Quality = param === 'low' || param === 'medium' || param === 'high' ? param : 'high';

const engine = new Engine(app, quality);
Game.create(engine, app)
  .then((game) => {
    loading.remove();
    engine.start(game);
    (window as unknown as { __game: Game }).__game = game; // handy for console debugging
  })
  .catch((err) => {
    loading.textContent = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
    console.error(err);
  });
