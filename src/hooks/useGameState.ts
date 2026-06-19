import { useReducer, useCallback } from 'react';
import type { GameState, GameAction, GameMode, GameRound } from '../types';
import { pickRandom, getSpriteUrl } from '../data/pokemon';
import { generateFusion } from '../utils/fusionEngine';

const TIMED_SECONDS = 60;

const INITIAL_STATE: GameState = {
  phase: 'menu',
  mode: 'menu',
  score: 0,
  streak: 0,
  highScore: (() => {
    try { return parseInt(localStorage.getItem('wtf-highscore') || '0', 10); } catch { return 0; }
  })(),
  round: 0,
  currentRound: null,
  isCorrect: null,
  timeLeft: TIMED_SECONDS,
  error: null,
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        phase: 'generating',
        mode: action.mode,
        score: 0,
        streak: 0,
        round: 0,
        isCorrect: null,
        error: null,
        timeLeft: TIMED_SECONDS,
      };

    case 'GENERATING':
      return { ...state, phase: 'generating', error: null };

    case 'ROUND_READY':
      return {
        ...state,
        phase: 'playing',
        currentRound: action.round,
        isCorrect: null,
      };

    case 'TOGGLE_SELECT': {
      if (!state.currentRound) return state;
      const id = action.pokemonId;
      const selected = state.currentRound.selected;
      const alreadySelected = selected.includes(id);

      let newSelected: number[];
      if (alreadySelected) {
        newSelected = selected.filter((s) => s !== id);
      } else if (selected.length < 2) {
        newSelected = [...selected, id];
      } else {
        // Replace the first one
        newSelected = [selected[1], id];
      }

      return {
        ...state,
        currentRound: { ...state.currentRound, selected: newSelected },
      };
    }

    case 'SUBMIT_GUESS': {
      if (!state.currentRound) return state;
      const { pokemon1, pokemon2, selected } = state.currentRound;
      const correct =
        selected.includes(pokemon1.id) && selected.includes(pokemon2.id);

      const newScore = state.score + (correct ? 100 + (state.streak >= 2 ? 50 : 0) : 0);
      const newStreak = correct ? state.streak + 1 : 0;
      const newHighScore = Math.max(newScore, state.highScore);

      try { localStorage.setItem('wtf-highscore', String(newHighScore)); } catch {}

      return {
        ...state,
        phase: 'reveal',
        score: newScore,
        streak: newStreak,
        highScore: newHighScore,
        isCorrect: correct,
      };
    }

    case 'NEXT_ROUND':
      return {
        ...state,
        phase: 'generating',
        round: state.round + 1,
        currentRound: null,
        isCorrect: null,
        error: null,
      };

    case 'TICK': {
      if (state.mode !== 'timed') return state;
      const newTime = state.timeLeft - 1;
      if (newTime <= 0) return { ...state, timeLeft: 0, phase: 'gameover' };
      return { ...state, timeLeft: newTime };
    }

    case 'GAME_OVER':
      return { ...state, phase: 'gameover' };

    case 'GO_MENU':
      return { ...INITIAL_STATE, highScore: state.highScore };

    case 'SET_ERROR':
      return { ...state, phase: 'playing', error: action.error };

    default:
      return state;
  }
}

/** Build a GameRound: pick 2 Pokémon, generate fusion, pick candidates. */
async function buildRound(mode: GameMode): Promise<GameRound> {
  const [p1, p2] = pickRandom(2);
  const fusionUrl = await generateFusion(getSpriteUrl(p1.id), getSpriteUrl(p2.id));

  // Build candidate pool: always include p1 and p2 + random distractors
  const extras = pickRandom(4, [p1.id, p2.id]);
  const candidates = [p1, p2, ...extras].sort(() => Math.random() - 0.5);

  return {
    pokemon1: p1,
    pokemon2: p2,
    fusionDataUrl: fusionUrl.dataUrl,
    candidates,
    selected: [],
  };
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const startGame = useCallback(async (mode: GameMode) => {
    dispatch({ type: 'START_GAME', mode });
    try {
      const round = await buildRound(mode);
      dispatch({ type: 'ROUND_READY', round });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: String(e) });
    }
  }, []);

  const nextRound = useCallback(async () => {
    dispatch({ type: 'NEXT_ROUND' });
    try {
      const round = await buildRound(state.mode);
      dispatch({ type: 'ROUND_READY', round });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: String(e) });
    }
  }, [state.mode]);

  const toggleSelect = useCallback((id: number) => {
    dispatch({ type: 'TOGGLE_SELECT', pokemonId: id });
  }, []);

  const submitGuess = useCallback(() => {
    dispatch({ type: 'SUBMIT_GUESS' });
  }, []);

  const goMenu = useCallback(() => {
    dispatch({ type: 'GO_MENU' });
  }, []);

  const tick = useCallback(() => {
    dispatch({ type: 'TICK' });
  }, []);

  return { state, startGame, nextRound, toggleSelect, submitGuess, goMenu, tick };
}
