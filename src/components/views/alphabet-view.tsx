"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Type,
  Volume2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  X,
  RotateCw,
  Trophy,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface Letter {
  letter: string;
  upper: string;
  name: string;
  sound: string;
  example: string;
  translation: string;
  isVowel: boolean;
  isSpecial: boolean;
  isConsonant: boolean;
  description?: string;
}

type FilterType = "all" | "vowels" | "consonants" | "special";

export function AlphabetView() {
  const [mode, setMode] = useState<"browse" | "test">("browse");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<Letter | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alphabet"],
    queryFn: () => apiFetch<{ letters: Letter[]; vowels: string[]; special: string[]; consonants: string[] }>("/api/alphabet"),
  });

  const letters = data?.letters || [];
  const filtered = useMemo(() => {
    if (filter === "all") return letters;
    if (filter === "vowels") return letters.filter((l) => l.isVowel);
    if (filter === "consonants") return letters.filter((l) => l.isConsonant);
    if (filter === "special") return letters.filter((l) => l.isSpecial);
    return letters;
  }, [letters, filter]);

  const speak = async (text: string, id: string) => {
    setPlaying(id);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.onended = () => setPlaying(null);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
      setPlaying(null);
    }
  };

  if (mode === "test") {
    return <AlphabetTest letters={letters} onBack={() => setMode("browse")} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Type className="h-7 w-7 text-primary" />
            Коми алфавит
          </h1>
          <p className="text-muted-foreground mt-1">
            {letters.length} букв: кириллица + особые ӧ и ї
          </p>
        </div>
        <Button onClick={() => setMode("test")} disabled={isLoading}>
          <Sparkles className="h-4 w-4 mr-1" />
          Проверить знания
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
        {([
          { id: "all", label: "Все", count: letters.length },
          { id: "vowels", label: "Гласные", count: letters.filter((l) => l.isVowel).length },
          { id: "consonants", label: "Согласные", count: letters.filter((l) => l.isConsonant).length },
          { id: "special", label: "Особые (ӧ, ї, ы, і)", count: letters.filter((l) => l.isSpecial).length },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as FilterType)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              filter === f.id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted hover:bg-muted/70 text-foreground/70"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Letters grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 aspect-square flex items-center justify-center">
                <div className="skeleton-shimmer h-12 w-12 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((l, i) => (
            <Card
              key={l.letter}
              className="cursor-pointer hover:shadow-md transition-all hover-lift animate-fade-in group"
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => setSelected(l)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className={`text-3xl font-bold ${l.isSpecial ? "text-chart-3" : l.isVowel ? "text-chart-2" : "text-primary"} group-hover:scale-110 transition-transform`}>
                    {l.upper}
                  </span>
                  <span className="text-lg text-muted-foreground">{l.letter}</span>
                </div>
                <div className="text-xs text-muted-foreground">{l.name}</div>
                {l.isSpecial && (
                  <Badge variant="outline" className="text-xs mt-1 bg-chart-3/5">особая</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Letter detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <Card className="max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`h-2 ${selected.isSpecial ? "bg-chart-3" : selected.isVowel ? "bg-chart-2" : "bg-primary"}`} />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-6xl font-bold ${selected.isSpecial ? "text-chart-3" : selected.isVowel ? "text-chart-2" : "text-primary"}`}>
                    {selected.upper}
                  </span>
                  <span className="text-3xl text-muted-foreground">{selected.letter}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => speak(selected.example, selected.letter)}
                  disabled={playing === selected.letter}
                  title="Прослушать пример"
                >
                  {playing === selected.letter ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Название</div>
                    <div className="font-medium">{selected.name}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Звук (МФА)</div>
                    <div className="font-medium font-mono">{selected.sound || "—"}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-1">Пример слова</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-primary">{selected.example}</div>
                      <div className="text-sm text-muted-foreground">{selected.translation}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => speak(selected.example, selected.letter + "-ex")}
                      disabled={playing === selected.letter + "-ex"}
                    >
                      {playing === selected.letter + "-ex" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {selected.description && (
                  <div className="p-3 rounded-lg bg-chart-2/5 border border-chart-2/20">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                      <div className="text-sm text-foreground/80">{selected.description}</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {selected.isVowel && <Badge className="bg-chart-2/15 text-chart-2">Гласная</Badge>}
                  {selected.isConsonant && <Badge className="bg-primary/15 text-primary">Согласная</Badge>}
                  {selected.isSpecial && <Badge className="bg-chart-3/15 text-chart-3">Особая</Badge>}
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4" onClick={() => setSelected(null)}>
                Закрыть
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ====== Alphabet test mode ======
function AlphabetTest({ letters, onBack }: { letters: Letter[]; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<Letter[]>([]);

  // Generate a deterministic quiz of 10 letters
  const quiz = useMemo(() => {
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [letters]);

  if (quiz.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p>Нет букв для теста</p>
        <Button onClick={onBack} className="mt-4">Назад</Button>
      </div>
    );
  }

  if (done) {
    const percent = Math.round((correctCount / quiz.length) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className={`h-2 ${percent >= 70 ? "bg-chart-1" : percent >= 40 ? "bg-chart-2" : "bg-chart-3"}`} />
          <CardHeader className="text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
              percent >= 70 ? "bg-chart-1/15 text-chart-1" : percent >= 40 ? "bg-chart-2/15 text-chart-2" : "bg-chart-3/15 text-chart-3"
            }`}>
              <Trophy className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Тест завершён!</CardTitle>
            <CardDescription>
              {percent >= 70 ? "Отличное знание алфавита!" : "Продолжайте практиковаться!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-1">{correctCount}</div>
                <div className="text-xs text-muted-foreground">Верно</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-2">{percent}%</div>
                <div className="text-xs text-muted-foreground">Точность</div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                К алфавиту
              </Button>
              <Button className="flex-1" onClick={() => {
                setIdx(0);
                setUserInput("");
                setRevealed(false);
                setResult(null);
                setCorrectCount(0);
                setDone(false);
                setHistory([]);
              }}>
                <RotateCw className="h-4 w-4 mr-1" />
                Ещё раз
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = quiz[idx];
  const progress = ((idx + 1) / quiz.length) * 100;

  const check = () => {
    if (!userInput.trim()) return;
    const normalized = (a: string, b: string) =>
      a.toLowerCase().trim().replace(/ё/g, "е") === b.toLowerCase().trim().replace(/ё/g, "е");
    const isCorrect = normalized(userInput, current.letter) || normalized(userInput, current.name);
    setResult(isCorrect ? "correct" : "wrong");
    setRevealed(true);
    if (isCorrect) setCorrectCount(correctCount + 1);
    setHistory([...history, current]);
  };

  const next = () => {
    if (idx + 1 >= quiz.length) {
      setDone(true);
      return;
    }
    setIdx(idx + 1);
    setUserInput("");
    setRevealed(false);
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            К алфавиту
          </Button>
          <div className="text-sm text-muted-foreground">
            Буква {idx + 1} из {quiz.length} · Верно: {correctCount}
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-1 to-chart-2" />
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Какая это буква?</div>
            <div className={`text-9xl font-bold ${current.isSpecial ? "text-chart-3" : current.isVowel ? "text-chart-2" : "text-primary"}`}>
              {current.upper}
            </div>

            <div className="w-full max-w-xs space-y-2">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !revealed && userInput.trim()) check();
                  if (e.key === "Enter" && revealed) next();
                }}
                disabled={revealed}
                placeholder="Введите букву (строчную)"
                autoFocus
                className={`w-full text-center text-lg p-3 rounded-lg border bg-background outline-none transition-colors ${
                  revealed
                    ? result === "correct"
                      ? "border-chart-1 bg-chart-1/5"
                      : "border-chart-3 bg-chart-3/5"
                    : "border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                }`}
              />
              {revealed && (
                <div className={`text-center text-sm animate-fade-in ${result === "correct" ? "text-chart-1" : "text-chart-3"}`}>
                  {result === "correct" ? (
                    <><Check className="inline h-4 w-4 mr-1" /> Верно!</>
                  ) : (
                    <><X className="inline h-4 w-4 mr-1" /> Правильно: {current.letter} ({current.name})</>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full max-w-xs">
              {!revealed ? (
                <Button className="flex-1" onClick={check} disabled={!userInput.trim()}>
                  <Check className="h-4 w-4 mr-1" />
                  Проверить
                </Button>
              ) : (
                <Button className="flex-1" onClick={next}>
                  {idx + 1 >= quiz.length ? "Завершить" : "Дальше"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {!revealed && (
                <Button
                  variant="ghost"
                  onClick={() => { setRevealed(true); setResult("wrong"); }}
                  title="Показать ответ"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
