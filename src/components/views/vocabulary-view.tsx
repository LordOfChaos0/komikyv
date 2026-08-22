"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Library,
  Volume2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function VocabularyView() {
  const [q, setQ] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState<string | null>(null);

  const queryParams = new URLSearchParams({
    pageSize: "20",
    page: String(page),
    sort,
  });
  if (q) queryParams.set("q", q);
  if (partOfSpeech !== "all") queryParams.set("partOfSpeech", partOfSpeech);

  const { data, isLoading } = useQuery({
    queryKey: ["vocabulary", queryParams.toString()],
    queryFn: () =>
      apiFetch<{ items: any[]; total: number; totalPages: number }>(
        `/api/vocabulary?${queryParams.toString()}`
      ),
  });

  const speak = async (id: string, text: string) => {
    setPlaying(id);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text, vocabId: id },
      });
      const audio = new Audio(data.audio);
      audio.onended = () => setPlaying(null);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "Не удалось воспроизвести аудио");
      setPlaying(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Library className="h-7 w-7 text-primary" />
          Словарь
        </h1>
        <p className="text-muted-foreground mt-1">
          {data?.total || ""} слов коми языка с произношением и примерами
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Поиск по коми или русскому..."
            className="pl-9"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={partOfSpeech} onValueChange={(v) => { setPartOfSpeech(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Часть речи" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все части речи</SelectItem>
            <SelectItem value="noun">Существительные</SelectItem>
            <SelectItem value="verb">Глаголы</SelectItem>
            <SelectItem value="adj">Прилагательные</SelectItem>
            <SelectItem value="pronoun">Местоимения</SelectItem>
            <SelectItem value="num">Числительные</SelectItem>
            <SelectItem value="phrase">Фразы</SelectItem>
            <SelectItem value="adv">Наречия</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="az_komi">По алфавиту (коми)</SelectItem>
            <SelectItem value="az_ru">По алфавиту (русский)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((v) => (
            <Card key={v.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg text-primary">{v.wordKomi}</h3>
                      {v.partOfSpeech && (
                        <Badge variant="secondary" className="text-xs">
                          {partOfSpeechLabel(v.partOfSpeech)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-base text-foreground">{v.translationRu}</div>
                    {v.transcription && (
                      <div className="text-xs text-muted-foreground mt-1">
                        [{v.transcription}]
                      </div>
                    )}
                    {v.exampleKomi && (
                      <div className="mt-3 pt-3 border-t border-border space-y-0.5">
                        <div className="text-sm text-foreground/80 italic">«{v.exampleKomi}»</div>
                        {v.exampleRu && (
                          <div className="text-xs text-muted-foreground">{v.exampleRu}</div>
                        )}
                      </div>
                    )}
                    {v.lesson && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {v.lesson.module?.title} → {v.lesson.title}
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-9 w-9"
                    onClick={() => speak(v.id, v.wordKomi)}
                    disabled={playing === v.id}
                  >
                    {playing === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Library className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Слова не найдены.</p>
          </CardContent>
        </Card>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {data.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
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
