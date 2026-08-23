// SM-2 Spaced Repetition Algorithm implementation.
// Based on the SuperMemo 2 algorithm by Piotr Wozniak.
// Quality scale: 0-5 (0=complete blackout, 5=perfect recall)

export interface SrsState {
  interval: number;       // days until next review
  easinessFactor: number; // 1.3..3.0
  repetitions: number;    // consecutive correct responses
}

export interface SrsReviewResult {
  state: SrsState;
  nextReviewAt: Date;
  isLearned: boolean; // true if interval >= 21 days (considered "learned")
}

/**
 * Apply SM-2 algorithm to compute next review state.
 * @param currentState current interval/EF/repetitions
 * @param quality 0-5 quality of response (5=perfect, 4=correct w/ hesitation, 3=correct w/ difficulty, 2=incorrect but easy to recall, 1=incorrect, hard to recall, 0=blackout)
 * @returns new state + next review date
 */
export function applySm2(
  currentState: SrsState,
  quality: number
): SrsReviewResult {
  // Clamp quality to [0, 5]
  const q = Math.max(0, Math.min(5, quality));
  let { interval, easinessFactor, repetitions } = currentState;

  // Update easiness factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easinessFactor = easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  // EF must be >= 1.3
  easinessFactor = Math.max(1.3, easinessFactor);

  if (q >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1; // first success: 1 day
    } else if (repetitions === 1) {
      interval = 6; // second success: 6 days
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response — reset
    repetitions = 0;
    interval = 1; // show again tomorrow
  }

  // Compute next review date (interval days from now)
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  nextReviewAt.setHours(0, 0, 0, 0);

  // Considered "learned" if interval >= 21 days (3 weeks)
  const isLearned = interval >= 21;

  return {
    state: { interval, easinessFactor, repetitions },
    nextReviewAt,
    isLearned,
  };
}

/**
 * Map UI quality labels to SM-2 quality values.
 */
export const QUALITY_OPTIONS = [
  { value: 0, label: "Полностью забыл", short: "Забыл", color: "chart-3", icon: "XCircle" },
  { value: 2, label: "Неправильно, но вспомнил", short: "Почти", color: "chart-3", icon: "AlertCircle" },
  { value: 3, label: "Правильно, с трудом", short: "Трудно", color: "chart-2", icon: "Meh" },
  { value: 4, label: "Правильно, с задержкой", short: "Ок", color: "chart-1", icon: "Check" },
  { value: 5, label: "Легко вспомнил", short: "Легко", color: "chart-1", icon: "Sparkles" },
] as const;

/**
 * Get human-readable status for an SRS card.
 */
export function getSrsStatus(state: SrsState): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  if (state.repetitions === 0) {
    return {
      label: "Новое",
      color: "chart-2",
      icon: "Sparkles",
      description: "Слово ещё не изучалось",
    };
  }
  if (state.interval < 7) {
    return {
      label: "Изучается",
      color: "chart-3",
      icon: "Flame",
      description: `Повторение через ${state.interval} дн.`,
    };
  }
  if (state.interval < 21) {
    return {
      label: "Знакомо",
      color: "chart-1",
      icon: "Check",
      description: `Повторение через ${state.interval} дн.`,
    };
  }
  return {
    label: "Изучено",
    color: "chart-1",
    icon: "GraduationCap",
    description: `Освоено, повторение через ${state.interval} дн.`,
  };
}
