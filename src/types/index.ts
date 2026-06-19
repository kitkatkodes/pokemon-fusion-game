export interface Pokemon {
  id: number;
  name: string;
  types: PokemonType[];
}

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric'
  | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying'
  | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon';

export type GameMode = 'menu' | 'guess-all' | 'multiple-choice' | 'timed';
export type GamePhase = 'menu' | 'generating' | 'playing' | 'reveal' | 'gameover';

export interface GameRound {
  pokemon1: Pokemon;
  pokemon2: Pokemon;
  fusionDataUrl: string | null;
  candidates: Pokemon[]; // 6 for multiple-choice modes
  selected: number[];    // player-selected IDs
}

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  score: number;
  streak: number;
  highScore: number;
  round: number;
  currentRound: GameRound | null;
  isCorrect: boolean | null;
  timeLeft: number;
  error: string | null;
}

export type GameAction =
  | { type: 'START_GAME'; mode: GameMode }
  | { type: 'GENERATING' }
  | { type: 'ROUND_READY'; round: GameRound }
  | { type: 'TOGGLE_SELECT'; pokemonId: number }
  | { type: 'SUBMIT_GUESS' }
  | { type: 'NEXT_ROUND' }
  | { type: 'TICK' }
  | { type: 'GAME_OVER' }
  | { type: 'GO_MENU' }
  | { type: 'SET_ERROR'; error: string };

export const TYPE_COLORS: Record<PokemonType, string> = {
  normal:   '#A8A77A',
  fire:     '#EE8130',
  water:    '#6390F0',
  grass:    '#7AC74C',
  electric: '#F7D02C',
  ice:      '#96D9D6',
  fighting: '#C22E28',
  poison:   '#A33EA1',
  ground:   '#E2BF65',
  flying:   '#A98FF3',
  psychic:  '#F95587',
  bug:      '#A6B91A',
  rock:     '#B6A136',
  ghost:    '#735797',
  dragon:   '#6F35FC',
};
