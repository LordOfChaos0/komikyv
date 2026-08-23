"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Lightbulb,
  Hammer,
  Trees,
  Heart,
  Clock,
  Home,
  Volume2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Quote,
} from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "sonner";

interface Proverb {
  id: string;
  komi: string;
  russian: string;
  literalTranslation: string;
  meaning: string;
  category: string;
  words: { komi: string; ru: string }[];
}

export function ProverbsView() {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["proverbs"],
    queryFn: () => apiFetch<{ proverbs: Proverb[]; categories: any[] }>("/api/proverbs"),
  });

  const proverbs = data?.proverbs || [];
  const categories = data?.categories || [];

  const filtered = useMemo(() => {
    if (filter === "all") return proverbs;
    return proverbs.filter((p) => p.category === filter);
  }, [proverbs, filter]);

  const speak = async (text: string) => {
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Кomi пословицы и поговорки
        </h1>
        <p className="text-muted-foreground mt-1">
          {proverbs.length} пословиц с переводом, разбором и озвучкой
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted hover:bg-muted/70 text-foreground/70"
          }`}
        >
          Все ({proverbs.length})
        </button>
        {categories.map((cat) => {
          const Icon = (Icons as any)[cat.icon] || BookOpen;
          const count = proverbs.filter((p) => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === cat.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted hover:bg-muted/70 text-foreground/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Proverbs list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-2">
                <div className="h-5 skeleton-shimmer rounded w-1/2" />
                <div className="h-3 skeleton-shimmer rounded w-2/3" />
                <div className="h-3 skeleton-shimmer rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const cat = categories.find((c) => c.id === p.category);
            const Icon = (Icons as any)[cat?.icon || "BookOpen"] || BookOpen;
            const isExpanded = expanded === p.id;
            return (
              <Card
                key={p.id}
                className="hover:shadow-md transition-all hover-lift animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${cat?.color || "primary"}/10 text-${cat?.color || "primary"} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Komi proverb */}
                      <div className="flex items-start gap-2 mb-2">
                        <Quote className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
                        <div>
                          <div className="text-lg font-bold text-primary leading-snug">{p.komi}</div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => speak(p.komi)}
                          title="Прослушать"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Russian translation */}
                      <div className="text-base text-foreground/90 mb-1">{p.russian}</div>

                      {/* Literal translation */}
                      <div className="text-xs text-muted-foreground italic mb-2">
                        Буквально: {p.literalTranslation}
                      </div>

                      {/* Expand/collapse */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : p.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Свернуть</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Разбор и слова</>
                        )}
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3 animate-fade-in">
                          {/* Meaning */}
                          <div className="p-3 rounded-lg bg-chart-2/5 border border-chart-2/20">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs font-medium text-chart-2 mb-1">Значение</div>
                                <div className="text-sm text-foreground/80">{p.meaning}</div>
                              </div>
                            </div>
                          </div>

                          {/* Word-by-word breakdown */}
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Разбор по словам
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {p.words.map((w, wi) => (
                                <div key={wi} className="p-2 rounded-lg bg-muted/30 text-center">
                                  <div className="text-sm font-medium text-primary">{w.komi}</div>
                                  <div className="text-xs text-muted-foreground">{w.ru}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Category badge */}
                      <div className="mt-3">
                        <Badge variant="outline" className="text-xs">
                          {cat?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
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
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">О коми пословицах</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Коми пословицы и поговорки отражают мудрость народа коми, его связь
                с природой и трудом. Многие из них передаются из поколения в поколение
                и являются важной частью культурного наследия. Каждая пословица содержит
                практический урок и наблюдение за жизнью.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
