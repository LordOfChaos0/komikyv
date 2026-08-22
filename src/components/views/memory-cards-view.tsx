"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Check,
  RotateCw,
  Zap,
  Loader2,
  Trophy,
  Clock,
  Sparkles,
  Volume2,
  Grid3x3,
} from "lucide-react";
import { toast } from "sonner";

interface VocabWord {
  id: string;
  wordKomi: string;
  translationRu: string;
}

interface GameCard {
  id: string;
  vocabId: string;
  text: string;
  type: "komi" | "ru";
  matched: boolean;
  flipped: boolean;
  wrong: boolean;
}

type GameState = "setup" | "playing" | "finished";

const PAIRS_COUNT = 6;
const TOTAL_CARDS = PAIRS_COUNT * 2;
const TIME_LIMIT = 120;

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function MemoryCardsView() {
  const [state, setState] = useState<GameState>("setup");
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["memory-vocab"],
    queryFn: () => apiFetch<{ items: VocabWord[] }>("/api/vocabulary?pageSize=100&sort=az_komi"),
    enabled: state === "setup",
  });

  const allWords = vocabData?.items || [];

  const startGame = useCallback(() => {
    const suitable = allWords.filter((w) => w.wordKomi.length >= 2 && w.wordKomi.length <= 15);
    if (suitable.length < PAIRS_COUNT) {
      toast.error("Недостаточно слов для игры");
      return;
    }
    const selected = shuffleArray(suitable).slice(0, PAIRS_COUNT);
    const newCards: GameCard[] = [];
    selected.forEach((w) => {
      newCards.push({ id: `${w.id}-komi`, vocabId: w.id, text: w.wordKomi, type: "komi", matched: false, flipped: false, wrong: false });
      newCards.push({ id: `${w.id}-ru`, vocabId: w.id, text: w.translationRu, type: "ru", matched: false, flipped: false, wrong: false });
    });
    setCards(shuffleArray(newCards));
    setFlipped([]);
    setMatched(0);
    setErrors(0);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setStartTime(Date.now());
    setState("playing");
  }, [allWords]);

  // Timer
  useEffect(() => {
    if (state !== "playing") return;
    if (timeLeft <= 0) {
      const t = setTimeout(() => setState("finished"), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [state, timeLeft]);

  // Check for matches when 2 cards flipped
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [firstId, secondId] = flipped;
    const first = cards.find((c) => c.id === firstId);
    const second = cards.find((c) => c.id === secondId);
    if (!first || !second) return;

    if (first.vocabId === second.vocabId && first.type !== second.type) {
      // Match!
      setTimeout(() => {
        setCards((prev) => prev.map((c) =>
          c.id === firstId || c.id === secondId
            ? { ...c, matched: true, flipped: false }
            : c
        ));
        setMatched((m) => m + 1);
        const points = 15 + Math.max(0, 5 - errors) * 3;
        setScore((s) => s + points);
        toast.success(`Пара! +${points} очков`, { duration: 1200 });
        setFlipped([]);
      }, 500);
    } else {
      // No match — mark wrong via timeout to avoid synchronous setState in effect
      const markWrong = setTimeout(() => {
        setCards((prev) => prev.map((c) =>
          c.id === firstId || c.id === secondId
            ? { ...c, wrong: true }
            : c
        ));
      }, 0);
      setTimeout(() => {
        setCards((prev) => prev.map((c) =>
          c.id === firstId || c.id === secondId
            ? { ...c, wrong: false, flipped: false }
            : c
        ));
        setErrors((e) => e + 1);
        setFlipped([]);
      }, 800);
      return () => clearTimeout(markWrong);
    }
  }, [flipped]);

  // Check win
  useEffect(() => {
    if (state === "playing" && matched === PAIRS_COUNT) {
      const timeBonus = timeLeft * 3;
      const t1 = setTimeout(() => setScore((s) => s + timeBonus), 0);
      toast.success(`🎉 Все пары найдены! +${timeBonus} бонус за время!`);
      const t2 = setTimeout(() => setState("finished"), 0);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [matched, state]);

  const handleCardClick = (cardId: string) => {
    if (flipped.length >= 2) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.matched || card.flipped) return;
    setCards((prev) => prev.map((c) =>
      c.id === cardId ? { ...c, flipped: true } : c
    ));
    setFlipped((prev) => [...prev, cardId]);
  };

  const speak = async (text: string) => {
    setPlaying(true);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.onended = () => setPlaying(false);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
      setPlaying(false);
    }
  };

  // === SETUP ===
  if (state === "setup") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Grid3x3 className="h-7 w-7 text-primary" />
            Карточки памяти
          </h1>
          <p className="text-muted-foreground mt-1">
            Найдите все пары: коми слово ↔ перевод
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-2 via-chart-1 to-chart-3" />
          <CardContent className="p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
              <Brain className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Как играть?</h2>
            <div className="text-sm text-muted-foreground space-y-1.5 text-left max-w-md mx-auto">
              <p>• {PAIRS_COUNT} пар карточек ({TOTAL_CARDS} штук)</p>
              <p>• Переворачивайте 2 карточки за ход</p>
              <p>• Найдите все пары: коми слово + его перевод</p>
              <p>• За каждую пару: +15 XP + бонус за точность</p>
              <p>• Лимит времени: {TIME_LIMIT} секунд</p>
              <p>• Бонус: +3 XP за каждую оставшуюся секунду</p>
            </div>
            <Button
              size="lg"
              className="mt-6"
              onClick={startGame}
              disabled={isLoading || allWords.length < PAIRS_COUNT}
            >
              {isLoading ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Загрузка...</>
              ) : (
                <><Zap className="h-5 w-5 mr-2" /> Начать игру</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === FINISHED ===
  if (state === "finished") {
    const isWin = matched === PAIRS_COUNT;
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className={`h-2 ${isWin ? "bg-chart-1" : "bg-chart-3"}`} />
          <CardContent className="p-6 text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
              isWin ? "bg-chart-1/15 text-chart-1" : "bg-chart-3/15 text-chart-3"
            }`}>
              {isWin ? <Trophy className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {isWin ? "Победа!" : "Время вышло!"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isWin ? "Все пары найдены!" : `Найдено ${matched} из ${PAIRS_COUNT} пар`}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-2">{score}</div>
                <div className="text-xs text-muted-foreground">Очки</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-1">{matched}</div>
                <div className="text-xs text-muted-foreground">Пар</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-3">{errors}</div>
                <div className="text-xs text-muted-foreground">Ошибок</div>
              </div>
            </div>
            <Button className="mt-6" onClick={startGame}>
              <RotateCw className="h-4 w-4 mr-1" />
              Играть ещё
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === PLAYING ===
  const timePercent = (timeLeft / TIME_LIMIT) * 100;
  const isTimeLow = timeLeft <= 20;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="text-sm">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {matched}/{PAIRS_COUNT} пар
        </Badge>
        <div className={`flex items-center gap-1.5 font-bold text-lg ${isTimeLow ? "text-chart-3 animate-pulse" : ""}`}>
          <Clock className="h-5 w-5" />
          {timeLeft}s
        </div>
        <Badge variant="outline" className="text-sm">
          <Zap className="h-3.5 w-3.5 mr-1" />
          {score} очков
        </Badge>
      </div>
      <div className={`h-2 rounded-full overflow-hidden bg-muted ${isTimeLow ? "" : ""}`}>
        <div
          className={`h-full transition-all ${isTimeLow ? "bg-chart-3" : "bg-primary"}`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Game board */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => (
          <button
            key={card.id}
            disabled={card.matched || (flipped.length >= 2 && !card.flipped)}
            onClick={() => handleCardClick(card.id)}
            className={`relative aspect-[3/4] rounded-xl border-2 transition-all duration-300 ${
              card.matched
                ? "border-chart-1/40 bg-chart-1/10 opacity-50"
                : card.flipped
                ? card.wrong
                  ? "border-chart-3 bg-chart-3/10 scale-95"
                  : "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer hover:scale-105"
            }`}
            style={{ animationDelay: `${i * 20}ms` }}
          >
            {card.matched ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="h-8 w-8 text-chart-1/50" />
              </div>
            ) : card.flipped ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                <div className={`text-sm sm:text-base font-bold ${
                  card.type === "komi" ? "text-primary" : "text-foreground/80"
                }`}>
                  {card.text}
                </div>
                {card.type === "komi" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(card.text); }}
                    className="mt-1 text-muted-foreground hover:text-primary"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-2xl sm:text-3xl font-bold text-muted-foreground/30 select-none">
                  ?
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Quit */}
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => setState("setup")}>
          Прервать игру
        </Button>
      </div>
    </div>
  );
}
