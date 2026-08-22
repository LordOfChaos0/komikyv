"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Volume2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lightbulb,
  Users,
  Clock,
  Quote,
  BookMarked,
} from "lucide-react";
import { toast } from "sonner";

interface Tale {
  id: string;
  title: string;
  titleKomi: string;
  level: string;
  duration: string;
  excerpt: string;
  fullText: string;
  moral: string;
  characters: { name: string; role: string }[];
  words: { komi: string; ru: string }[];
}

export function FolkTalesView() {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["folktales"],
    queryFn: () => apiFetch<{ tales: Tale[] }>("/api/folktales"),
  });

  const tales = data?.tales || [];

  const filtered = useMemo(() => {
    if (filter === "all") return tales;
    return tales.filter((t) => t.level === filter);
  }, [tales, filter]);

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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BookMarked className="h-7 w-7 text-primary" />
          Коми сказки
        </h1>
        <p className="text-muted-foreground mt-1">
          {tales.length} народных сказок с переводом, разбором и озвучкой
        </p>
      </div>

      {/* Level filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
        {[
          { id: "all", label: "Все", count: tales.length },
          { id: "beginner", label: "Начальный", count: tales.filter((t) => t.level === "beginner").length },
          { id: "intermediate", label: "Средний", count: tales.filter((t) => t.level === "intermediate").length },
          { id: "advanced", label: "Продвинутый", count: tales.filter((t) => t.level === "advanced").length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
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

      {/* Tales list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-2">
                <div className="h-5 skeleton-shimmer rounded w-1/2" />
                <div className="h-3 skeleton-shimmer rounded w-3/4" />
                <div className="h-3 skeleton-shimmer rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tale, i) => {
            const isExpanded = expanded === tale.id;
            return (
              <Card
                key={tale.id}
                className="hover:shadow-md transition-all hover-lift animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-lg">{tale.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {tale.level === "advanced" ? "Продвинутый" : tale.level === "intermediate" ? "Средний" : "Начальный"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {tale.duration}
                        </Badge>
                      </div>
                      <div className="text-sm text-primary font-medium">{tale.titleKomi}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => speak(tale.titleKomi)}
                      disabled={playing}
                      title="Прослушать название"
                    >
                      {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Excerpt */}
                  <p className="text-sm text-muted-foreground italic mb-3 line-clamp-2">
                    «{tale.excerpt}»
                  </p>

                  {/* Expand/collapse */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : tale.id)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Свернуть</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Читать полностью</>
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-4 animate-fade-in">
                      {/* Full text */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Текст сказки
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-lg border border-border">
                            {tale.fullText}
                          </pre>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => speak(tale.fullText.slice(0, 500))}
                          disabled={playing}
                        >
                          {playing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Volume2 className="h-4 w-4 mr-1" />}
                          Озвучить отрывок
                        </Button>
                      </div>

                      {/* Moral */}
                      <div className="p-3 rounded-lg bg-chart-2/5 border border-chart-2/20">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-medium text-chart-2 mb-1">Мораль сказки</div>
                            <div className="text-sm text-foreground/80">{tale.moral}</div>
                          </div>
                        </div>
                      </div>

                      {/* Characters */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Персонажи
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {tale.characters.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                {c.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{c.name}</div>
                                <div className="text-xs text-muted-foreground">{c.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Vocabulary */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Словарь сказки
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {tale.words.map((w, wi) => (
                            <div key={wi} className="p-2 rounded-lg bg-muted/30 text-center">
                              <div className="text-sm font-medium text-primary">{w.komi}</div>
                              <div className="text-xs text-muted-foreground">{w.ru}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">О коми сказках</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Коми сказки — это часть богатого устного народного творчества.
                В них отражается связь народа коми с природой, мудрость поколений
                и уважение к лесу. Многие сказки передавались из уст в уста
                веками, прежде чем были записаны.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
