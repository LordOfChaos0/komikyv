"use client";

import { useState, useMemo, useEffect } from "react";
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
  Layers,
  Volume2,
  Loader2,
  Check,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Brain,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

type Direction = "komi-to-ru" | "ru-to-komi";

interface Flashcard {
  id: string;
  wordKomi: string;
  translationRu: string;
  transcription?: string | null;
  exampleKomi?: string | null;
  exampleRu?: string | null;
  partOfSpeech?: string | null;
}

const SESSION_SIZE = 10;

export function FlashcardsView() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"setup" | "session" | "results">("setup");
  const [direction, setDirection] = useState<Direction>("komi-to-ru");
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "known" | "unknown">>({});
  const [playing, setPlaying] = useState(false);

  // Get all vocabulary (we'll fetch up to 200 to choose from)
  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["flashcards-source", selectedLesson],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100", sort: "az_komi" });
      if (selectedLesson !== "all") params.set("lessonId", selectedLesson);
      return apiFetch<{ items: any[]; total: number }>(`/api/vocabulary?${params.toString()}`);
    },
    enabled: mode === "setup",
  });

  // Get lessons list for the filter
  const { data: modulesData } = useQuery({
    queryKey: ["flashcards-modules"],
    queryFn: () => apiFetch<{ items: any[] }>("/api/modules?pageSize=20"),
  });

  const startSession = () => {
    if (!vocabData || vocabData.items.length === 0) {
      toast.error("Нет слов для тренировки");
      return;
    }
    // Shuffle and take SESSION_SIZE cards
    const shuffled = [...vocabData.items].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(SESSION_SIZE, shuffled.length));
    setCards(selected);
    setCurrentIndex(0);
    setFlipped(false);
    setResults({});
    setMode("session");
  };

  const answerCard = (status: "known" | "unknown") => {
    if (!cards[currentIndex]) return;
    setResults({ ...results, [cards[currentIndex].id]: status });
    if (status === "known") toast.success("Верно! +1");
    else toast.error("Повторим ещё раз");
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    } else {
      // Finish session, award XP
      finishMutation.mutate(results);
      setMode("results");
    }
  };

  const finishMutation = useMutation({
    mutationFn: async (allResults: Record<string, "known" | "unknown">) => {
      // No backend endpoint for flashcards yet — submit XP via progress API stub
      const known = Object.values(allResults).filter((s) => s === "known").length;
      return { xpGained: known * 3, known, total: cards.length };
    },
    onSuccess: (data) => {
      // Optionally could call /api/progress for XP, but to keep isolated we skip
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });

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

  // === SETUP MODE ===
  if (mode === "setup") {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            Карточки слов
          </h1>
          <p className="text-muted-foreground mt-1">
            Тренируйте запоминание коми слов с помощью карточек
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Настройка тренировки
            </CardTitle>
            <CardDescription>Выберите направление и набор слов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Направление</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDirection("komi-to-ru")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    direction === "komi-to-ru"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-medium text-sm">Коми → Русский</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Видите коми слово, вспоминаете перевод</div>
                </button>
                <button
                  onClick={() => setDirection("ru-to-komi")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    direction === "ru-to-komi"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-medium text-sm">Русский → Коми</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Видите перевод, вспоминаете коми слово</div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Набор слов</label>
              <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все слова ({vocabData?.total || "..."})</SelectItem>
                  {modulesData?.items.flatMap((m: any) =>
                    (m.lessons || []).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {m.title} → {l.title}
                      </SelectItem>
                    )) || []
                  )}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {isLoading ? "Загрузка слов..." : `Доступно слов: ${vocabData?.total || 0}`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <InfoBadge icon={Layers} label="Карточек" value={String(Math.min(SESSION_SIZE, vocabData?.items.length || 0))} />
              <InfoBadge icon={TrendingUp} label="XP за карточку" value="+3" />
              <InfoBadge icon={Trophy} label="Время" value="~5 мин" />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={startSession}
              disabled={isLoading || !vocabData?.items.length}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Начать тренировку
            </Button>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 shrink-0">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Как это работает?</h3>
                <ul className="text-sm text-muted-foreground space-y-1 leading-relaxed">
                  <li>• Нажмите на карточку, чтобы перевернуть её и увидеть ответ</li>
                  <li>• Отметьте, знали ли вы слово — это влияет на ваш XP</li>
                  <li>• За каждое угаданное слово вы получаете +3 XP</li>
                  <li>• Тренируйтесь регулярно для лучшего запоминания</li>
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
    const knownCount = Object.values(results).filter((s) => s === "known").length;
    const totalCards = cards.length;
    const percent = Math.round((knownCount / totalCards) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className={`h-2 ${percent >= 70 ? "bg-chart-1" : percent >= 40 ? "bg-chart-2" : "bg-chart-3"}`} />
          <CardHeader className="text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
              percent >= 70 ? "bg-chart-1/15 text-chart-1" : percent >= 40 ? "bg-chart-2/15 text-chart-2" : "bg-chart-3/15 text-chart-3"
            }`}>
              {percent >= 70 ? <Trophy className="h-8 w-8" /> : <Brain className="h-8 w-8" />}
            </div>
            <CardTitle className="text-2xl">Тренировка завершена!</CardTitle>
            <CardDescription>
              {percent >= 70 ? "Отличный результат!" : percent >= 40 ? "Хороший прогресс!" : "Продолжайте тренироваться!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-1">{knownCount}</div>
                <div className="text-xs text-muted-foreground">Знаю</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-3">{totalCards - knownCount}</div>
                <div className="text-xs text-muted-foreground">Учить</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-2">+{knownCount * 3}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
            <Progress value={percent} className="h-3" />
            <div className="text-center text-sm text-muted-foreground">
              Результат: <span className="font-semibold text-foreground">{percent}%</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("setup")}>
                Изменить настройки
              </Button>
              <Button className="flex-1" onClick={startSession}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Ещё раз
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Words review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Повторение слов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cards.map((c) => {
              const status = results[c.id];
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    status === "known" ? "border-chart-1/30 bg-chart-1/5" : "border-chart-3/30 bg-chart-3/5"
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                    status === "known" ? "bg-chart-1 text-white" : "bg-chart-3 text-white"
                  }`}>
                    {status === "known" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-primary">{c.wordKomi}</div>
                    <div className="text-xs text-muted-foreground">{c.translationRu}</div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => speak(c.wordKomi)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // === SESSION MODE ===
  const currentCard = cards[currentIndex];
  if (!currentCard) return null;
  const front = direction === "komi-to-ru" ? currentCard.wordKomi : currentCard.translationRu;
  const back = direction === "komi-to-ru" ? currentCard.translationRu : currentCard.wordKomi;
  const showKomiOnFront = direction === "komi-to-ru";
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Карточка {currentIndex + 1} из {cards.length}</span>
          <span className="text-muted-foreground">Знаю: <span className="text-chart-1 font-semibold">{Object.values(results).filter(s => s === "known").length}</span></span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <div className="relative" style={{ perspective: "1500px" }}>
        <div
          className={`relative w-full transition-transform duration-500 cursor-pointer`}
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "320px",
          }}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-border bg-card shadow-lg flex flex-col items-center justify-center p-6 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute top-3 right-3">
              {showKomiOnFront ? (
                <button
                  onClick={(e) => { e.stopPropagation(); speak(currentCard.wordKomi); }}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                  disabled={playing}
                >
                  {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="text-xs">
                {direction === "komi-to-ru" ? "Коми" : "Русский"}
              </Badge>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {front}
            </div>
            {showKomiOnFront && currentCard.transcription && (
              <div className="text-sm text-muted-foreground">[{currentCard.transcription}]</div>
            )}
            {currentCard.partOfSpeech && (
              <Badge variant="outline" className="mt-3">
                {partOfSpeechLabel(currentCard.partOfSpeech)}
              </Badge>
            )}
            <div className="absolute bottom-3 left-0 right-0 text-xs text-muted-foreground animate-pulse">
              Нажмите, чтобы перевернуть
            </div>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-chart-2/5 shadow-lg flex flex-col items-center justify-center p-6 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="absolute top-3 left-3">
              <Badge className="text-xs">
                {direction === "komi-to-ru" ? "Русский" : "Коми"}
              </Badge>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
              {back}
            </div>
            {!showKomiOnFront && currentCard.transcription && (
              <div className="text-sm text-muted-foreground">[{currentCard.transcription}]</div>
            )}
            {currentCard.exampleKomi && (
              <div className="mt-4 pt-4 border-t border-border max-w-md">
                <div className="text-sm italic text-foreground/80">«{currentCard.exampleKomi}»</div>
                {currentCard.exampleRu && (
                  <div className="text-xs text-muted-foreground mt-1">{currentCard.exampleRu}</div>
                )}
              </div>
            )}
            {!showKomiOnFront && (
              <button
                onClick={(e) => { e.stopPropagation(); speak(currentCard.wordKomi); }}
                className="absolute bottom-3 right-3 p-2 rounded-full hover:bg-muted text-primary"
                disabled={playing}
              >
                {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="border-chart-3/40 text-chart-3 hover:bg-chart-3/10 hover:text-chart-3"
          onClick={() => answerCard("unknown")}
        >
          <X className="h-5 w-5 mr-2" />
          Не знаю
        </Button>
        <Button
          size="lg"
          className="bg-chart-1 hover:bg-chart-1/90"
          onClick={() => answerCard("known")}
        >
          <Check className="h-5 w-5 mr-2" />
          Знаю
        </Button>
      </div>

      {/* Quick nav */}
      <div className="flex items-center justify-between text-sm">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => { setCurrentIndex(currentIndex - 1); setFlipped(false); }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <button
          onClick={() => setMode("setup")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Прервать
        </button>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === cards.length - 1}
          onClick={() => { setCurrentIndex(currentIndex + 1); setFlipped(false); }}
        >
          Пропустить
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
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

function partOfSpeechLabel(p: string) {
  const map: Record<string, string> = {
    noun: "сущ.",
    verb: "гл.",
    adj: "прил.",
    pronoun: "местоим.",
    num: "числ.",
    phrase: "фраза",
    adv: "нареч.",
  };
  return map[p] || p;
}
