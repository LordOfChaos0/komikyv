"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Loader2,
  Gamepad2,
  RefreshCw,
  Volume2,
  Delete,
} from "lucide-react";
import { toast } from "sonner";

interface VocabWord {
  id: string;
  wordKomi: string;
  translationRu: string;
  transcription?: string | null;
  partOfSpeech?: string | null;
}

type GameState = "setup" | "playing" | "finished";

const ROUND_SIZE = 8;
const TIME_LIMIT = 90; // seconds per round

function shuffleString(str: string): string {
  const chars = str.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  let result = chars.join("");
  // Make sure it's different from original
  if (result === str && str.length > 1) {
    [chars[0], chars[1]] = [chars[1], chars[0]];
    result = chars.join("");
  }
  return result;
}

export function WordScrambleView() {
  const [state, setState] = useState<GameState>("setup");
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scrambled, setScrambled] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [playing, setPlaying] = useState(false);

  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["scramble-vocab"],
    queryFn: () => apiFetch<{ items: VocabWord[] }>("/api/vocabulary?pageSize=100&sort=az_komi"),
    enabled: state === "setup",
  });

  const allWords = vocabData?.items || [];

  const startGame = useCallback(() => {
    // Filter to words with reasonable length (3-12 chars, no spaces)
    const suitable = allWords.filter(
      (w) => w.wordKomi.length >= 3 && w.wordKomi.length <= 12 && !w.wordKomi.includes(" ")
    );
    if (suitable.length < ROUND_SIZE) {
      toast.error("Недостаточно подходящих слов для игры");
      return;
    }
    const shuffled = [...suitable].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
    setWords(shuffled);
    setCurrentIdx(0);
    setScrambled(shuffleString(shuffled[0].wordKomi));
    setUserAnswer("");
    setScore(0);
    setCorrect(0);
    setErrors(0);
    setTimeLeft(TIME_LIMIT);
    setHintsUsed(0);
    setShowHint(false);
    setResult(null);
    setState("playing");
  }, [allWords]);

  // Timer
  useEffect(() => {
    if (state !== "playing") return;
    if (timeLeft <= 0) {
      // Use setTimeout to defer setState to avoid cascading renders
      const t = setTimeout(() => setState("finished"), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [state, timeLeft]);

  const currentWord = words[currentIdx];

  const checkAnswer = () => {
    if (!currentWord || !userAnswer) return;
    const isCorrect = userAnswer.toLowerCase().trim() === currentWord.wordKomi.toLowerCase().trim();
    setResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      const points = 15 + Math.max(0, 5 - hintsUsed) * 3;
      setScore((s) => s + points);
      setCorrect((c) => c + 1);
      toast.success(`Верно! +${points} очков`, { duration: 1500 });
    } else {
      setErrors((e) => e + 1);
      toast.error(`Неверно. Правильно: ${currentWord.wordKomi}`, { duration: 2000 });
    }
    setTimeout(() => {
      if (currentIdx + 1 >= words.length) {
        setState("finished");
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setScrambled(shuffleString(words[nextIdx].wordKomi));
        setUserAnswer("");
        setShowHint(false);
        setResult(null);
      }
    }, isCorrect ? 1000 : 2000);
  };

  const skipWord = () => {
    setErrors((e) => e + 1);
    if (currentIdx + 1 >= words.length) {
      setState("finished");
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setScrambled(shuffleString(words[nextIdx].wordKomi));
      setUserAnswer("");
      setShowHint(false);
      setResult(null);
    }
  };

  const useHint = () => {
    setShowHint(true);
    setHintsUsed((h) => h + 1);
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
            <Shuffle className="h-7 w-7 text-primary" />
            Слово-пазл
          </h1>
          <p className="text-muted-foreground mt-1">
            Составьте коми слово из перемешанных букв
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-2 via-chart-1 to-chart-3" />
          <CardContent className="p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
              <Shuffle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Как играть?</h2>
            <div className="text-sm text-muted-foreground space-y-1.5 text-left max-w-md mx-auto">
              <p>• {ROUND_SIZE} слов за раунд, на всё — {TIME_LIMIT} секунд</p>
              <p>• Буквы перемешаны — составьте из них слово</p>
              <p>• Введите ответ в поле и нажмите «Проверить»</p>
              <p>• За верный ответ: +15 XP + бонус за неиспользованные подсказки</p>
              <p>• Подсказка показывает перевод слова (-3 XP)</p>
              <p>• Можно пропустить слово, но это засчитается как ошибка</p>
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
    const percent = Math.round((correct / words.length) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className={`h-2 ${percent >= 70 ? "bg-chart-1" : percent >= 40 ? "bg-chart-2" : "bg-chart-3"}`} />
          <CardContent className="p-6 text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
              percent >= 70 ? "bg-chart-1/15 text-chart-1" : percent >= 40 ? "bg-chart-2/15 text-chart-2" : "bg-chart-3/15 text-chart-3"
            }`}>
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Игра окончена!</h2>
            <p className="text-muted-foreground mb-4">
              {percent >= 70 ? "Отличный результат!" : percent >= 40 ? "Хороший прогресс!" : "Продолжайте практиковаться!"}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-2">{score}</div>
                <div className="text-xs text-muted-foreground">Очки</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-1">{correct}</div>
                <div className="text-xs text-muted-foreground">Верно</div>
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
  const isTimeLow = timeLeft <= 15;
  const progressPercent = ((currentIdx) / words.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="text-sm">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {currentIdx + 1}/{words.length}
        </Badge>
        <div className={`flex items-center gap-1.5 font-bold text-lg ${isTimeLow ? "text-chart-3 animate-pulse" : ""}`}>
          <Clock className="h-5 w-5" />
          {timeLeft}s
        </div>
        <Badge variant="outline" className="text-sm">
          <Zap className="h-3.5 w-3.5 mr-1" />
          {score}
        </Badge>
      </div>
      <Progress value={timePercent} className={`h-2 ${isTimeLow ? "[&>div]:bg-chart-3" : ""}`} />
      <Progress value={progressPercent} className="h-1 [&>div]:bg-muted-foreground" />

      {/* Word card */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-2 to-chart-1" />
        <CardContent className="p-6">
          {/* Hint */}
          {showHint && currentWord && (
            <div className="mb-4 p-3 rounded-lg bg-chart-2/5 border border-chart-2/20 text-center animate-fade-in">
              <div className="text-xs text-chart-2 font-medium mb-1">Подсказка (перевод):</div>
              <div className="text-lg font-semibold">{currentWord.translationRu}</div>
            </div>
          )}

          {/* Scrambled letters */}
          <div className="flex justify-center gap-1.5 flex-wrap mb-6">
            {scrambled.split("").map((char, i) => (
              <div
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/5 text-2xl font-bold text-primary shadow-sm"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {char}
              </div>
            ))}
          </div>

          {/* Translation hint (always visible) */}
          {currentWord && (
            <div className="text-center text-sm text-muted-foreground mb-4">
              <span className="text-xs">Перевод: </span>
              {showHint ? (
                <span className="font-semibold text-chart-2">{currentWord.translationRu}</span>
              ) : (
                <span className="italic">скрыт — используйте подсказку</span>
              )}
            </div>
          )}

          {/* Input */}
          <div className="space-y-3">
            <input
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                if (result) setResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && userAnswer.trim() && !result) checkAnswer();
              }}
              disabled={!!result}
              placeholder="Введите слово..."
              autoFocus
              className={`w-full text-center text-lg p-3 rounded-lg border-2 bg-background outline-none transition-colors ${
                result === "correct"
                  ? "border-chart-1 bg-chart-1/5 text-chart-1"
                  : result === "wrong"
                  ? "border-chart-3 bg-chart-3/5 text-chart-3"
                  : "border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
              }`}
            />

            {/* Result feedback */}
            {result && (
              <div className={`text-center text-sm font-medium animate-fade-in ${
                result === "correct" ? "text-chart-1" : "text-chart-3"
              }`}>
                {result === "correct" ? (
                  <><Check className="inline h-4 w-4 mr-1" /> Верно!</>
                ) : (
                  <><X className="inline h-4 w-4 mr-1" /> Правильно: {currentWord?.wordKomi}</>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              onClick={checkAnswer}
              disabled={!userAnswer.trim() || !!result}
            >
              <Check className="h-4 w-4 mr-1" />
              Проверить
            </Button>
            {!showHint && (
              <Button
                variant="outline"
                onClick={useHint}
                disabled={!!result}
                title="Показать перевод (-3 XP)"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
            {currentWord && (
              <Button
                variant="ghost"
                onClick={() => speak(currentWord.wordKomi)}
                disabled={playing || !!result}
                title="Прослушать"
              >
                {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={skipWord}
              disabled={!!result}
              title="Пропустить"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quit */}
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => setState("setup")}>
          Прервать игру
        </Button>
      </div>
    </div>
  );
}
