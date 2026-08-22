"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Headphones,
  Volume2,
  Volume1,
  VolumeX,
  Loader2,
  Check,
  X,
  RotateCw,
  ArrowRight,
  Trophy,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface AttemptResult {
  isCorrect: boolean;
  accuracy: number;
  feedback: string;
}

const SESSION_SIZE = 10;

export function ListeningView() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"setup" | "session" | "results">("setup");
  const [level, setLevel] = useState<string>("all");
  const [currentSentence, setCurrentSentence] = useState<any | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [showText, setShowText] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [history, setHistory] = useState<{ sentence: string; translation: string; accuracy: number; isCorrect: boolean }[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  // Fetch a new sentence
  const fetchSentence = async () => {
    setUserInput("");
    setResult(null);
    setShowText(false);
    setPlayCount(0);
    setCurrentSentence(null);
    setAudioLoading(true);
    try {
      const data = await apiFetch<{ sentence: any; total: number }>(
        `/api/listening${level !== "all" ? `?level=${level}` : ""}`
      );
      if (data.sentence) {
        setCurrentSentence(data.sentence);
        // Auto-play TTS on first load
        setTimeout(() => playAudio(data.sentence.text), 300);
      } else {
        toast.error("Нет предложений для тренировки");
        setMode("setup");
      }
    } catch (e: any) {
      toast.error(e.message || "Не удалось загрузить предложение");
    } finally {
      setAudioLoading(false);
    }
  };

  const playAudio = async (text: string) => {
    setAudioLoading(true);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.play();
      setPlayCount(playCount + 1);
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
    } finally {
      setAudioLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!currentSentence || !userInput.trim()) return;
    const target = currentSentence.text;
    const accuracy = computeAccuracy(userInput.toLowerCase().trim(), target.toLowerCase().trim());
    const isCorrect = accuracy >= 80;
    setResult({
      isCorrect,
      accuracy,
      feedback:
        accuracy === 100
          ? "Идеально! Все слова распознаны верно."
          : accuracy >= 90
          ? "Отлично! Почти без ошибок."
          : accuracy >= 80
          ? "Хорошо! Несколько мелких неточностей."
          : accuracy >= 60
          ? "Неплохо, но пропущено несколько слов."
          : "Попробуйте прослушать ещё раз.",
    });
    setAttempts(attempts + 1);
    if (isCorrect) setCorrect(correct + 1);
    setHistory([
      ...history,
      {
        sentence: target,
        translation: currentSentence.translation,
        accuracy,
        isCorrect,
      },
    ]);
  };

  const next = async () => {
    if (history.length + 1 >= SESSION_SIZE) {
      setMode("results");
      return;
    }
    await fetchSentence();
  };

  const startSession = async () => {
    setHistory([]);
    setAttempts(0);
    setCorrect(0);
    setMode("session");
    await fetchSentence();
  };

  const computeAccuracy = (a: string, b: string): number => {
    if (!a || !b) return 0;
    if (a === b) return 100;
    // Word-level accuracy
    const wordsA = a.split(/\s+/).filter(Boolean);
    const wordsB = b.split(/\s+/).filter(Boolean);
    let matched = 0;
    for (const w of wordsB) {
      if (wordsA.some((x) => x === w || levenshtein(x, w) <= 1)) matched++;
    }
    return Math.round((matched / wordsB.length) * 100);
  };

  const levenshtein = (a: string, b: string): number => {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  };

  // === SETUP MODE ===
  if (mode === "setup") {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Headphones className="h-7 w-7 text-primary" />
            Аудирование
          </h1>
          <p className="text-muted-foreground mt-1">
            Слушайте предложения на коми и пишите, что услышали
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Настройка тренировки
            </CardTitle>
            <CardDescription>Выберите уровень сложности</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Уровень</label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="beginner">Начальный</SelectItem>
                  <SelectItem value="intermediate">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <InfoBadge icon={Headphones} label="Предложений" value={String(SESSION_SIZE)} />
              <InfoBadge icon={Trophy} label="XP за верный" value="+5" />
              <InfoBadge icon={Sparkles} label="Время" value="~7 мин" />
            </div>

            <Button className="w-full" size="lg" onClick={startSession}>
              <Headphones className="h-5 w-5 mr-2" />
              Начать тренировку
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 shrink-0">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Как это работает?</h3>
                <ul className="text-sm text-muted-foreground space-y-1 leading-relaxed">
                  <li>• Нажмите на 🔊, чтобы прослушать предложение на коми</li>
                  <li>• Можно слушать несколько раз — для улучшения навыка</li>
                  <li>• Напишите услышанное в поле ввода и нажмите «Проверить»</li>
                  <li>• Оценка точности — пословная (с учётом мелких неточностей)</li>
                  <li>• Можно подсмотреть текст кнопкой «Показать текст»</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === RESULTS MODE ===
  if (mode === "results") {
    const avg = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.accuracy, 0) / history.length) : 0;
    const percent = Math.round((correct / history.length) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className={`h-2 ${percent >= 70 ? "bg-chart-1" : percent >= 40 ? "bg-chart-2" : "bg-chart-3"}`} />
          <CardHeader className="text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
              percent >= 70 ? "bg-chart-1/15 text-chart-1" : percent >= 40 ? "bg-chart-2/15 text-chart-2" : "bg-chart-3/15 text-chart-3"
            }`}>
              {percent >= 70 ? <Trophy className="h-8 w-8" /> : <Headphones className="h-8 w-8" />}
            </div>
            <CardTitle className="text-2xl">Тренировка завершена!</CardTitle>
            <CardDescription>
              {percent >= 70 ? "Отличный слух!" : percent >= 40 ? "Хороший прогресс!" : "Продолжайте тренироваться!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-1">{correct}</div>
                <div className="text-xs text-muted-foreground">Верно</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-2">{avg}%</div>
                <div className="text-xs text-muted-foreground">Средняя точность</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-primary">+{correct * 5}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
            <Progress value={percent} className="h-3" />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("setup")}>
                Изменить настройки
              </Button>
              <Button className="flex-1" onClick={startSession}>
                <RotateCw className="h-4 w-4 mr-1" />
                Ещё раз
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sentences review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Повторение предложений</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                  h.isCorrect ? "border-chart-1/30 bg-chart-1/5" : "border-chart-3/30 bg-chart-3/5"
                }`}
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                  h.isCorrect ? "bg-chart-1 text-white" : "bg-chart-3 text-white"
                }`}>
                  {h.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-primary text-sm">{h.sentence}</div>
                  <div className="text-xs text-muted-foreground">{h.translation}</div>
                </div>
                <Badge variant="outline" className="text-xs">{h.accuracy}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // === SESSION MODE ===
  const currentIdx = history.length;
  const progress = (currentIdx / SESSION_SIZE) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Предложение {currentIdx + 1} из {SESSION_SIZE}</span>
          <span className="text-muted-foreground">
            Верно: <span className="text-chart-1 font-semibold">{correct}</span>
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Audio player card */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-1 to-chart-2" />
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-5">
            <Badge variant="outline" className="text-xs">
              {currentSentence?.lesson?.module?.level === "advanced" ? "Продвинутый" :
               currentSentence?.lesson?.module?.level === "intermediate" ? "Средний" : "Начальный"}
            </Badge>

            {/* Big play button */}
            <button
              onClick={() => currentSentence && playAudio(currentSentence.text)}
              disabled={audioLoading || !currentSentence}
              className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary to-chart-1 text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 animate-pulse-ring"
            >
              {audioLoading ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : playCount === 0 ? (
                <Volume2 className="h-10 w-10" />
              ) : (
                <Volume1 className="h-10 w-10" />
              )}
            </button>

            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                {audioLoading ? "Загрузка аудио..." :
                 playCount === 0 ? "Нажмите, чтобы прослушать" :
                 `Прослушано ${playCount} раз`}
              </div>
              {playCount > 0 && (
                <button
                  onClick={() => setShowText(!showText)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1"
                >
                  {showText ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showText ? "Скрыть текст" : "Показать текст"}
                </button>
              )}
            </div>

            {/* Show original text (when toggled) */}
            {showText && currentSentence && (
              <div className="w-full p-3 rounded-lg bg-muted/30 text-center animate-fade-in">
                <div className="text-sm italic text-foreground/80">«{currentSentence.text}»</div>
                <div className="text-xs text-muted-foreground mt-1">{currentSentence.translation}</div>
              </div>
            )}

            {/* User input */}
            <div className="w-full space-y-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Напишите, что услышали на коми..."
                disabled={!!result}
                className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !result && userInput.trim()) {
                    checkAnswer();
                  }
                }}
              />
              <div className="text-xs text-muted-foreground text-right">
                {userInput.length} символов · Ctrl+Enter для проверки
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="w-full space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Результат:</span>
                  <Badge variant={result.accuracy >= 80 ? "default" : result.accuracy >= 60 ? "secondary" : "destructive"}>
                    {result.accuracy}%
                  </Badge>
                </div>
                <Progress value={result.accuracy} className={`h-2.5 ${
                  result.accuracy >= 80 ? "[&>div]:bg-chart-1" : result.accuracy >= 60 ? "[&>div]:bg-chart-2" : "[&>div]:bg-chart-3"
                }`} />
                <div className="text-sm text-muted-foreground">{result.feedback}</div>
                {currentSentence && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-0.5">Вы написали:</div>
                      <div>{userInput}</div>
                    </div>
                    <div className="p-2 rounded bg-chart-1/5 border border-chart-1/20">
                      <div className="text-xs text-chart-1 mb-0.5">Правильно:</div>
                      <div className="text-chart-1">{currentSentence.text}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 w-full">
              {!result ? (
                <Button
                  className="flex-1"
                  onClick={checkAnswer}
                  disabled={!userInput.trim()}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Проверить
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={next}
                >
                  {currentIdx + 1 >= SESSION_SIZE ? "Завершить" : "Следующее"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setMode("setup")}
              >
                Прервать
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <div className="font-bold text-sm">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
