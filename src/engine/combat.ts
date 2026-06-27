/* ============================================================================
 * THE MAJOROT — Combat Engine (pure, Build-spec §8 / ChaosPatch "Combat")
 * ----------------------------------------------------------------------------
 * The dice + matchup math, lifted from the tracker's calculator. Damage and the
 * elemental wheel come straight from the content module so the digital game and
 * the tabletop rules can never drift.
 *
 * The round: Strike (−1 Spark; empty Spark costs Self) → Cast the Bones d6
 * (1 backfire / 2–5 hit / 6 surge ×2) → if the threat lives it answers → Evade
 * d6 (4–6 slip / 1–3 connect, lose Strike). HP≤0 wins (+1 Spark); Self≤0 = Ruin.
 * ========================================================================== */
import { matchup, damage, type Element } from "@/content/majorot-content";
import type { Rng } from "./deck";

export type BonesKind = "backfire" | "hit" | "surge";

export function rollD6(rng: Rng = Math.random): number {
  return 1 + Math.floor(rng() * 6);
}

/** 1 = backfire · 2–5 = hit · 6 = surge. */
export function bonesKind(roll: number): BonesKind {
  if (roll <= 1) return "backfire";
  if (roll >= 6) return "surge";
  return "hit";
}

/** Evade slips the Strike on 4–6; 1–3 connects. */
export function evadeSlips(roll: number): boolean {
  return roll >= 4;
}

export interface AttackPreview {
  /** Elemental multiplier: 0 dead · ½ mirror · 1 neutral · 2 super-effective. */
  multiplier: 0 | 0.5 | 1 | 2;
  /** floor((spellBase + channelStat) × multiplier) — the pre-dice damage. */
  damage: number;
}

/** The damage a cast WOULD do before the Bones are thrown. */
export function attackPreview(
  spellBase: number,
  channelStat: number,
  channel: Element,
  enemy: Element,
): AttackPreview {
  const multiplier = matchup(channel, enemy);
  return { multiplier, damage: damage(spellBase, channelStat, multiplier) };
}

/** Apply the Bones outcome to a pre-dice damage figure. */
export function bonesDamage(baseDamage: number, kind: BonesKind): number {
  switch (kind) {
    case "backfire":
      return 0;
    case "surge":
      return baseDamage * 2;
    case "hit":
      return baseDamage;
  }
}

export function matchupText(m: number): string {
  if (m === 2) return "×2 super-effective";
  if (m === 1) return "×1 neutral";
  if (m === 0.5) return "×½ mirror";
  return "×0 dead — channel elsewhere";
}

/** Tone for the matchup chip (maps to gain/neutral/loss styling). */
export function matchupTone(m: number): "gain" | "neutral" | "loss" {
  if (m === 2) return "gain";
  if (m === 0) return "loss";
  return "neutral";
}

/** The element with the strongest matchup against this enemy (UI hint / default). */
export function bestChannel(enemy: Element): Element {
  const order: Element[] = ["fire", "water", "air", "earth"];
  return order.reduce((best, el) => (matchup(el, enemy) > matchup(best, enemy) ? el : best), order[0]);
}
