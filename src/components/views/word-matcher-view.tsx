"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shuffle,
  Check,
  X,
  Clock,
  Trophy,
  RotateCw,
  Sparkles,
  Zap,
  Target,
  Loader2,
  Gamepad2,
} from "lucide-react";
import { toast } from "sonner";

interface VocabWord {
  id: string;
  wordKomi: string;
  translationRu: string;
}

interface MatchPair {
  vocabId: string;
  komi: string;
  ru: string;
  matched: boolean;
  wrong: boolean;
}

type GameState = "setup" | "playing" | "finished";

const ROUND_SIZE = 6; // pairs per round
const TIME_LIMIT = 60; // seconds

export function WordMatcherView() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<GameState>("setup");
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [selectedKomi, setSelectedKomi] = useState<string | null>(null);
  const [selectedRu, setSelectedRu] = useState<string | null>(null);
  const [matched, setMatched] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // Fetch vocabulary
  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["matcher-vocab"],
    queryFn: () => apiFetch<{ items: VocabWord[] }>("/api/vocabulary?pageSize=100&sort=az_komi"),
    enabled: state === "setup",
  });

  const allWords = vocabData?.items || [];

  const startGame = useCallback(() => {
    if (allWords.length < ROUND_SIZE) {
      toast.error("Недостаточно слов для игры");
      return;
    }
    const shuffled = [...allWords].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
    const newPairs: MatchPair[] = shuffled.map((w) => ({
      vocabId: w.id,
      komi: w.wordKomi,
      ru: w.translationRu,
      matched: false,
      wrong: false,
    }));
    setPairs(newPairs);
    setSelectedKomi(null);
    setSelectedRu(null);
    setMatched(0);
    setErrors(0);
    setScore(0);
    setCombo(0);
    setTimeLeft(TIME_LIMIT);
    setState("playing");
  }, [allWords]);

  // Timer: переход в finished — внутри колбэка setTimeout (async),
  // чтобы не вызывать setState синхронно в теле effect
  useEffect(() => {
    if (state !== "playing") return;
    const timer = setTimeout(() => {
      if (timeLeft <= 1) {
        setState("finished");
      } else {
        setTimeLeft(timeLeft - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state, timeLeft]);

  // Проверка пары — вызывается из обработчиков кликов (не из effect)
  const evaluateMatch = (komiId: string, ru: string) => {
    const pair = pairs.find((p) => p.vocabId === komiId);
    if (pair && pair.ru === ru) {
      // Correct match!
      setPairs((prev) =>
        prev.map((p) =>
          p.vocabId === komiId ? { ...p, matched: true } : p
        )
      );
      const newMatched = matched + 1;
      setMatched(newMatched);
      setCombo((c) => c + 1);
      const points = 10 + combo * 2;
      setScore((s) => s + points);
      toast.success(`+${points} XP! ${combo > 0 ? `Серия x${combo + 1}` : ""}`, { duration: 1500 });
      setSelectedKomi(null);
      setSelectedRu(null);
      // Проверка победы: все пары найдены
      if (newMatched === ROUND_SIZE) {
        const timeBonus = timeLeft * 5;
        setScore((s) => s + timeBonus);
        toast.success(`🎉 Все пары найдены! +${timeBonus} бонус за время!`);
        setState("finished");
      }
    } else {
      // Wrong match
      setPairs((prev) =>
        prev.map((p) =>
          p.vocabId === komiId || p.ru === ru
            ? { ...p, wrong: true }
            : p
        )
      );
      setErrors((e) => e + 1);
      setCombo(0);
      setTimeout(() => {
        setPairs((prev) => prev.map((p) => ({ ...p, wrong: false })));
        setSelectedKomi(null);
        setSelectedRu(null);
      }, 600);
    }
  };

  const handleKomiClick = (pair: MatchPair) => {
    if (pair.matched) return;
    if (selectedRu) {
      evaluateMatch(pair.vocabId, selectedRu);
    } else {
      setSelectedKomi(pair.vocabId);
    }
  };

  const handleRuClick = (pair: MatchPair) => {
    if (pair.matched) return;
    if (selectedKomi) {
      evaluateMatch(selectedKomi, pair.ru);
    } else {
      setSelectedRu(pair.ru);
    }
  };

  // Shuffle the display order of komi and ru independently
  const komiOrder = useMemo(() => {
    return [...pairs].sort(() => Math.random() - 0.5);
  }, [pairs.length]); // reshuffle only when pair count changes (new round)

  const ruOrder = useMemo(() => {
    return [...pairs].sort(() => Math.random() - 0.5);
  }, [pairs.length]);

  // === SETUP ===
  if (state === "setup") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Gamepad2 className="h-7 w-7 text-primary" />
            Слово-матч
          </h1>
          <p className="text-muted-foreground mt-1">
            Соедините коми слова с переводами на время
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
          <CardContent className="p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
              <Shuffle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Как играть?</h2>
            <div className="text-sm text-muted-foreground space-y-1.5 text-left max-w-md mx-auto">
              <p>• На экране {ROUND_SIZE} коми слов и {ROUND_SIZE} переводов</p>
              <p>• Нажмите на коми слово, затем на его перевод</p>
              <p>• За каждый правильный матч: +10 XP (+2 за серию)</p>
              <p>• Ошибка сбрасывает серию</p>
              <p>• Найдите все пары за {TIME_LIMIT} секунд</p>
              <p>• Бонус +5 XP за каждую оставшуюся секунду</p>
            </div>
            <Button
              size="lg"
              className="mt-6"
              onClick={startGame}
              disabled={isLoading || allWords.length < ROUND_SIZE}
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
    const isWin = matched === ROUND_SIZE;
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
              {isWin ? "Все пары найдены!" : `Найдено ${matched} из ${ROUND_SIZE} пар`}
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
  const isTimeLow = timeLeft <= 10;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="text-sm">
          <Target className="h-3.5 w-3.5 mr-1" />
          {matched}/{ROUND_SIZE}
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
      <Progress value={timePercent} className={`h-2 ${isTimeLow ? "[&>div]:bg-chart-3" : ""}`} />

      {combo > 1 && (
        <div className="text-center text-sm font-medium text-chart-2 animate-pulse">
          🔥 Серия x{combo}!
        </div>
      )}

      {/* Game board */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Komi column */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-2">
            Коми
          </div>
          {komiOrder.map((pair) => (
            <button
              key={pair.vocabId}
              disabled={pair.matched}
              onClick={() => handleKomiClick(pair)}
              className={`w-full p-3 rounded-lg border-2 text-center font-medium transition-all ${
                pair.matched
                  ? "border-chart-1/30 bg-chart-1/10 text-chart-1/50 line-through opacity-50"
                  : pair.wrong
                  ? "border-chart-3 bg-chart-3/10 text-chart-3 animate-pulse"
                  : selectedKomi === pair.vocabId
                  ? "border-primary bg-primary/10 text-primary scale-105"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              {pair.komi}
              {pair.matched && <Check className="inline h-4 w-4 ml-1" />}
            </button>
          ))}
        </div>

        {/* Russian column */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-2">
            Русский
          </div>
          {ruOrder.map((pair, idx) => (
            <button
              key={`${pair.vocabId}-${idx}`}
              disabled={pair.matched}
              onClick={() => handleRuClick(pair)}
              className={`w-full p-3 rounded-lg border-2 text-center font-medium transition-all ${
                pair.matched
                  ? "border-chart-1/30 bg-chart-1/10 text-chart-1/50 line-through opacity-50"
                  : pair.wrong
                  ? "border-chart-3 bg-chart-3/10 text-chart-3 animate-pulse"
                  : selectedRu === pair.ru
                  ? "border-primary bg-primary/10 text-primary scale-105"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              {pair.ru}
              {pair.matched && <Check className="inline h-4 w-4 ml-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Quit button */}
      <div className="text-center pt-2">
        <Button variant="ghost" size="sm" onClick={() => setState("setup")}>
          Прервать игру
        </Button>
      </div>
    </div>
  );
}
