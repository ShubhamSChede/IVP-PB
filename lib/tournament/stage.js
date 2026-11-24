import { SWISS_ROUNDS, isRoundComplete } from "./swiss.js";

/** First Swiss round that isn't complete, else 'playoffs'. */
export function currentStage(matches) {
  for (const r of SWISS_ROUNDS) if (!isRoundComplete(matches, r)) return r;
  return "playoffs";
}
