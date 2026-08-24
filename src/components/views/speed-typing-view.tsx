"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Keyboard,
  Clock,
  Trophy,
  RotateCw,
  Zap,
  Loader2,
  Check,
  X,
  Volume2,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface VocabWord {
  id: string;
  wordKomi: string;
  translationRu: string;
  transcription?: string | null;
}

type GameState = "setup" | "playing" | "finished";

const ROUND_DURATION = 60; // seconds
const WORDS_PER_ROUND = 15; // target word count

export function SpeedTypingView() {
  const [state, setState] = useState<GameState>("setup");
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [playing, setPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["typing-vocab"],
    queryFn: () => apiFetch<{ items: VocabWord[] }>("/api/vocabulary?pageSize=100&sort=az_komi"),
    enabled: state === "setup",
  });

  const allWords = vocabData?.items || [];

  const startGame = useCallback(() => {
    const suitable = allWords.filter((w) => w.wordKomi.length >= 2 && w.wordKomi.length <= 20);
    if (suitable.length < WORDS_PER_ROUND) {
      toast.error("Недостаточно слов для тренировки");
      return;
    }
    const shuffled = [...suitable].sort(() => Math.random() - 0.5).slice(0, Math.max(WORDS_PER_ROUND, 20));
    setWords(shuffled);
    setCurrentIdx(0);
    setUserInput("");
    setTimeLeft(ROUND_DURATION);
    setCompleted(0);
    setErrors(0);
    setTotalChars(0);
    setCorrectChars(0);
    setStartTime(Date.now());
    setWordStartTime(Date.now());
    setFeedback(null);
    setState("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
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

  const currentWord = words[currentIdx];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);
    if (feedback) setFeedback(null);

    if (currentWord && value.toLowerCase().trim() === currentWord.wordKomi.toLowerCase().trim()) {
      // Correct!
      const wordLen = currentWord.wordKomi.length;
      setCorrectChars((c) => c + wordLen);
      setTotalChars((t) => t + wordLen);
      setCompleted((c) => c + 1);
      setFeedback("correct");

      // Advance after short delay
      setTimeout(() => {
        if (currentIdx + 1 >= words.length) {
          setState("finished");
        } else {
          setCurrentIdx((i) => i + 1);
          setUserInput("");
          setWordStartTime(Date.now());
          setFeedback(null);
        }
      }, 300);
    } else if (currentWord && value.length > currentWord.wordKomi.length) {
      // Too long — wrong
      setErrors((e) => e + 1);
      setFeedback("wrong");
      setTotalChars((t) => t + value.length);
      setTimeout(() => {
        setUserInput("");
        setFeedback(null);
      }, 500);
    }
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

  // Calculate stats
  const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
  const wpm = elapsedSeconds > 0 ? Math.round((completed / elapsedSeconds) * 60) : 0;
  const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;

  // === SETUP ===
  if (state === "setup") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Keyboard className="h-7 w-7 text-primary" />
            Тренажёр скоропечати
          </h1>
          <p className="text-muted-foreground mt-1">
            Печатайте коми слова как можно быстрее и точнее
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
          <CardContent className="p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
              <Keyboard className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Как играть?</h2>
            <div className="text-sm text-muted-foreground space-y-1.5 text-left max-w-md mx-auto">
              <p>• На экране появляется коми слово</p>
              <p>• Печатайте его в поле ввода как можно быстрее</p>
              <p>• При верном вводе — автоматический переход к следующему</p>
              <p>• Длительность: {ROUND_DURATION} секунд</p>
              <p>• Цель: набрать больше слов за отведённое время</p>
              <p>• Отслеживается: WPM (слов в минуту), точность, время</p>
            </div>
            <Button
              size="lg"
              className="mt-6"
              onClick={startGame}
              disabled={isLoading || allWords.length < WORDS_PER_ROUND}
            >
              {isLoading ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Загрузка...</>
              ) : (
                <><Zap className="h-5 w-5 mr-2" /> Начать тренировку</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === FINISHED ===
  if (state === "finished") {
    const finalWpm = elapsedSeconds > 0 ? Math.round((completed / elapsedSeconds) * 60) : 0;
    const finalAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;
    const score = completed * 10 + finalAccuracy;
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-chart-1 to-chart-2" />
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-1/15 text-chart-1">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Тренировка завершена!</h2>
            <p className="text-muted-foreground mb-4">
              {completed >= 10 ? "Отличная скорость!" : completed >= 5 ? "Хороший результат!" : "Продолжайте тренироваться!"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox icon={Target} label="Слов" value={completed} color="text-chart-1" />
              <StatBox icon={TrendingUp} label="WPM" value={finalWpm} color="text-chart-2" />
              <StatBox icon={Check} label="Точность" value={`${finalAccuracy}%`} color="text-chart-1" />
              <StatBox icon={Zap} label="Очки" value={score} color="text-primary" />
            </div>
            <Button className="mt-6" onClick={startGame}>
              <RotateCw className="h-4 w-4 mr-1" />
              Ещё раз
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === PLAYING ===
  const timePercent = (timeLeft / ROUND_DURATION) * 100;
  const isTimeLow = timeLeft <= 10;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="text-sm">
          <Target className="h-3.5 w-3.5 mr-1" />
          {completed} слов
        </Badge>
        <div className={`flex items-center gap-1.5 font-bold text-lg ${isTimeLow ? "text-chart-3 animate-pulse" : ""}`}>
          <Clock className="h-5 w-5" />
          {timeLeft}s
        </div>
        <Badge variant="outline" className="text-sm">
          <TrendingUp className="h-3.5 w-3.5 mr-1" />
          {wpm} WPM
        </Badge>
      </div>
      <Progress value={timePercent} className={`h-2 ${isTimeLow ? "[&>div]:bg-chart-3" : ""}`} />

      {/* Word display */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-1 to-chart-2" />
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-6">
            {/* Translation hint */}
            {currentWord && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Перевод</div>
                <div className="text-lg text-muted-foreground">{currentWord.translationRu}</div>
              </div>
            )}

            {/* Target word */}
            <div className="text-center">
              <div className={`text-5xl sm:text-6xl font-bold transition-colors ${
                feedback === "correct" ? "text-chart-1" : feedback === "wrong" ? "text-chart-3" : "text-primary"
              }`}>
                {currentWord?.wordKomi || "..."}
              </div>
              {currentWord?.transcription && (
                <div className="text-sm text-muted-foreground mt-2">[{currentWord.transcription}]</div>
              )}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`flex items-center gap-1.5 text-sm font-medium animate-fade-in ${
                feedback === "correct" ? "text-chart-1" : "text-chart-3"
              }`}>
                {feedback === "correct" ? (
                  <><Check className="h-4 w-4" /> Верно!</>
                ) : (
                  <><X className="h-4 w-4" /> Неверно</>
                )}
              </div>
            )}

            {/* Input */}
            <input
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              placeholder="Печатайте здесь..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={`w-full max-w-md text-center text-2xl p-3 rounded-lg border-2 bg-background outline-none transition-colors font-mono ${
                feedback === "correct"
                  ? "border-chart-1 bg-chart-1/5"
                  : feedback === "wrong"
                  ? "border-chart-3 bg-chart-3/5"
                  : "border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
              }`}
            />

            {/* TTS */}
            {currentWord && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak(currentWord.wordKomi)}
                disabled={playing}
              >
                {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                Прослушать
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="p-2 rounded-lg bg-muted/30">
          <div className="font-bold">{completed}</div>
          <div className="text-xs text-muted-foreground">Верно</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/30">
          <div className="font-bold text-chart-3">{errors}</div>
          <div className="text-xs text-muted-foreground">Ошибок</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/30">
          <div className="font-bold">{accuracy}%</div>
          <div className="text-xs text-muted-foreground">Точность</div>
        </div>
      </div>

      {/* Quit */}
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => setState("setup")}>
          Прервать
        </Button>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <Icon className={`h-5 w-5 mx-auto ${color} mb-1`} />
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
