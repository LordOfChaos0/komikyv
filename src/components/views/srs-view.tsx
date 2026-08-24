"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Volume2,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Trophy,
  Calendar,
  Zap,
  GraduationCap,
  AlertCircle,
  Meh,
} from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "sonner";

interface SrsCard {
  type: "review" | "new";
  srsReviewId: string | null;
  vocabulary: {
    id: string;
    wordKomi: string;
    translationRu: string;
    transcription?: string | null;
    exampleKomi?: string | null;
    exampleRu?: string | null;
    partOfSpeech?: string | null;
    lesson?: any;
  };
  srsState: any | null;
}

const QUALITY_OPTIONS = [
  { value: 0, label: "Забыл", short: "Забыл", color: "chart-3", icon: "XCircle" },
  { value: 2, label: "Почти", short: "Почти", color: "chart-3", icon: "AlertCircle" },
  { value: 3, label: "Трудно", short: "Трудно", color: "chart-2", icon: "Meh" },
  { value: 4, label: "Ок", short: "Ок", color: "chart-1", icon: "Check" },
  { value: 5, label: "Легко", short: "Легко", color: "chart-1", icon: "Sparkles" },
];

export function SrsView() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"overview" | "session">("overview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ vocabId: string; quality: number; wasNew: boolean }[]>([]);

  const { data: dueData, isLoading: dueLoading } = useQuery({
    queryKey: ["srs-due"],
    queryFn: () => apiFetch<{ cards: SrsCard[]; stats: any }>("/api/srs/due?limit=20"),
    enabled: mode === "overview",
  });

  const { data: statsData } = useQuery({
    queryKey: ["srs-stats"],
    queryFn: () => apiFetch<{ stats: any; activityChart: any[] }>("/api/srs/stats"),
    enabled: mode === "overview",
  });

  const reviewMutation = useMutation({
    mutationFn: ({ vocabId, quality }: { vocabId: string; quality: number }) =>
      apiFetch<any>("/api/srs/review", {
        method: "POST",
        json: { vocabularyId: vocabId, quality },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["srs-due"] });
      queryClient.invalidateQueries({ queryKey: ["srs-stats"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      if (data.isLearned) {
        toast.success(`🎓 Слово изучено! +${data.xpGained} XP`);
      } else if (data.isCorrect) {
        toast.success(`Верно! +${data.xpGained} XP`);
      } else {
        toast.error(`Повторим завтра. +${data.xpGained} XP`);
      }
    },
  });

  const speak = async (text: string, vocabId: string) => {
    setPlaying(true);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text, vocabId },
      });
      const audio = new Audio(data.audio);
      audio.onended = () => setPlaying(false);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
      setPlaying(false);
    }
  };

  const startSession = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionResults([]);
    setMode("session");
  };

  const rateCard = (quality: number) => {
    if (!dueData?.cards[currentIndex]) return;
    const card = dueData.cards[currentIndex];
    reviewMutation.mutate({ vocabId: card.vocabulary.id, quality });
    setSessionResults([
      ...sessionResults,
      { vocabId: card.vocabulary.id, quality, wasNew: card.type === "new" },
    ]);
    if (currentIndex < dueData.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    } else {
      // Session done
      setMode("overview");
      toast.success(`Сессия завершена! Повторено ${sessionResults.length + 1} слов.`);
    }
  };

  // === OVERVIEW MODE ===
  if (mode === "overview") {
    const stats = statsData?.stats;
    const due = dueData?.stats;
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Интервальные повторения
          </h1>
          <p className="text-muted-foreground mt-1">
            Алгоритм SM-2 — запоминайте слова навсегда
          </p>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Calendar}
              label="На сегодня"
              value={due?.dueToday || 0}
              sub={due?.dueToday > 0 ? "повторить" : "всё повторено"}
              color="from-chart-3 to-chart-5"
              highlight={(due?.dueToday || 0) > 0}
            />
            <StatCard
              icon={Sparkles}
              label="Новые слова"
              value={due?.newAvailable || 0}
              sub="доступно"
              color="from-chart-2 to-chart-1"
            />
            <StatCard
              icon={GraduationCap}
              label="Изучено"
              value={stats.learned}
              sub={`из ${stats.totalCards}`}
              color="from-chart-1 to-chart-4"
            />
            <StatCard
              icon={TrendingUp}
              label="Точность"
              value={`${stats.accuracy}%`}
              sub={`${stats.reviewsThisWeek} за неделю`}
              color="from-chart-4 to-chart-2"
            />
          </div>
        )}

        {/* Progress bar */}
        {stats && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Освоенность словаря</span>
                <Badge variant="outline">{stats.masteryRate}%</Badge>
              </div>
              <Progress value={stats.masteryRate} className="h-3" />
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
                <div className="p-2 rounded bg-muted/30">
                  <div className="font-bold text-chart-2">{stats.newCards}</div>
                  <div className="text-muted-foreground">Новые</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="font-bold text-chart-3">{stats.learning}</div>
                  <div className="text-muted-foreground">Изучаются</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="font-bold text-chart-1">{stats.learned}</div>
                  <div className="text-muted-foreground">Изучено</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="overflow-hidden border-2 border-primary/30">
          <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
          <CardContent className="p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
              <Brain className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-1">
              {due?.dueToday && due.dueToday > 0
                ? `${due.dueToday} слов требуют повторения`
                : "Новых повторений нет"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {due?.dueToday && due.dueToday > 0
                ? "Повторите карточки сейчас, чтобы закрепить знания"
                : "Можете изучить новые слова или вернуться позже"}
            </p>
            <Button
              size="lg"
              onClick={startSession}
              disabled={dueLoading || !dueData?.cards.length}
            >
              <Zap className="h-5 w-5 mr-2" />
              {due?.dueToday && due.dueToday > 0 ? "Повторить сейчас" : "Начать сессию"}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 shrink-0">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Как работает SM-2?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Алгоритм SuperMemo 2 планирует интервалы повторений на основе
                  вашей оценки воспроизведения (от «Забыл» до «Легко»). Слова,
                  которые вы хорошо помните, показываются реже, а сложные — чаще.
                  Через 21 день слово считается «изученным».
                </p>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {QUALITY_OPTIONS.map((q) => {
                    const Icon = (Icons as any)[q.icon] || Check;
                    return (
                      <div key={q.value} className={`p-2 rounded text-center border border-${q.color}/20 bg-${q.color}/5`}>
                        <Icon className={`h-4 w-4 mx-auto text-${q.color} mb-1`} />
                        <div className={`text-xs font-medium text-${q.color}`}>{q.short}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === SESSION MODE ===
  const cards = dueData?.cards || [];
  if (cards.length === 0) {
    setMode("overview");
    return null;
  }
  const card = cards[currentIndex];
  if (!card) return null;
  const total = cards.length;
  const progress = ((currentIndex + 1) / total) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setMode("overview")}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Прервать
          </Button>
          <span className="text-sm text-muted-foreground">
            Карточка {currentIndex + 1} из {total}
          </span>
          <Badge variant="outline">
            {card.type === "new" ? (
              <><Sparkles className="h-3 w-3 mr-1" /> Новое</>
            ) : (
              <><TrendingUp className="h-3 w-3 mr-1" /> Повторение</>
            )}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <div className="relative" style={{ perspective: "1500px" }}>
        <div
          className="relative w-full transition-transform duration-500 cursor-pointer"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "300px",
          }}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front: Komi word */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-border bg-card shadow-lg flex flex-col items-center justify-center p-6 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="text-xs">
                {card.type === "new" ? "Новое слово" : `Интервал: ${card.srsState?.interval || 0} дн.`}
              </Badge>
            </div>
            <div className="absolute top-3 right-3">
              <button
                onClick={(e) => { e.stopPropagation(); speak(card.vocabulary.wordKomi, card.vocabulary.id); }}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                disabled={playing}
              >
                {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
              {card.vocabulary.wordKomi}
            </div>
            {card.vocabulary.transcription && (
              <div className="text-sm text-muted-foreground">[{card.vocabulary.transcription}]</div>
            )}
            {card.vocabulary.partOfSpeech && (
              <Badge variant="outline" className="mt-3">{card.vocabulary.partOfSpeech}</Badge>
            )}
            <div className="absolute bottom-3 left-0 right-0 text-xs text-muted-foreground animate-pulse">
              Нажмите, чтобы перевернуть
            </div>
          </div>
          {/* Back: Translation */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-chart-2/5 shadow-lg flex flex-col items-center justify-center p-6 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <Badge className="mb-2">Перевод</Badge>
            <div className="text-3xl font-bold text-foreground/90 mb-2">
              {card.vocabulary.translationRu}
            </div>
            {card.vocabulary.exampleKomi && (
              <div className="mt-3 pt-3 border-t border-border max-w-md">
                <div className="text-sm italic text-foreground/80">«{card.vocabulary.exampleKomi}»</div>
                {card.vocabulary.exampleRu && (
                  <div className="text-xs text-muted-foreground mt-1">{card.vocabulary.exampleRu}</div>
                )}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); speak(card.vocabulary.wordKomi, card.vocabulary.id); }}
              className="absolute bottom-3 right-3 p-2 rounded-full hover:bg-muted text-primary"
              disabled={playing}
            >
              {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quality rating (shown after flip) */}
      {flipped && (
        <div className="space-y-3 animate-fade-in">
          <div className="text-center text-sm text-muted-foreground">
            Как хорошо вы вспомнили?
          </div>
          <div className="grid grid-cols-5 gap-2">
            {QUALITY_OPTIONS.map((q) => {
              const Icon = (Icons as any)[q.icon] || Check;
              return (
                <button
                  key={q.value}
                  onClick={() => rateCard(q.value)}
                  disabled={reviewMutation.isPending}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    q.color === "chart-3"
                      ? "border-chart-3/40 bg-chart-3/5 hover:bg-chart-3/10 text-chart-3"
                      : q.color === "chart-2"
                      ? "border-chart-2/40 bg-chart-2/5 hover:bg-chart-2/10 text-chart-2"
                      : "border-chart-1/40 bg-chart-1/5 hover:bg-chart-1/10 text-chart-1"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{q.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!flipped && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setFlipped(true)}
          >
            Показать ответ
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  highlight,
}: any) {
  return (
    <Card className={highlight ? "border-chart-3/40 bg-chart-3/5" : ""}>
      <CardContent className="p-4">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white mb-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className={`text-xl font-bold ${highlight ? "text-chart-3" : ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
