"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Search,
  Trash2,
  Volume2,
  Pencil,
  Loader2,
  Library,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function FavoritesView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);

  const { data, isLoading } = useQuery({
    queryKey: ["favorites", queryParams.toString()],
    queryFn: () => apiFetch<{ items: any[]; total: number }>(`/api/favorites?${queryParams.toString()}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/favorites/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Удалено из избранного");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string | null }) =>
      apiFetch(`/api/favorites/${id}`, { method: "PATCH", json: { note } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Заметка обновлена");
      setEditing(null);
    },
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
      toast.error(e.message || "TTS недоступен");
      setPlaying(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Heart className="h-7 w-7 text-chart-3" />
          Избранные слова
        </h1>
        <p className="text-muted-foreground mt-1">
          {data?.total || 0} слов в вашем личном словаре
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск в избранном..."
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

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-5 skeleton-shimmer rounded w-1/3" />
                <div className="h-3 skeleton-shimmer rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((fav, i) => {
            const v = fav.vocabulary;
            return (
              <Card
                key={fav.id}
                className="hover:shadow-md transition-all hover-lift animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Heart className="h-5 w-5 text-chart-3 fill-chart-3/30 shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-lg text-primary">{v.wordKomi}</h3>
                        {v.partOfSpeech && (
                          <Badge variant="secondary" className="text-xs">
                            {v.partOfSpeech}
                          </Badge>
                        )}
                      </div>
                      <div className="text-base text-foreground/90">{v.translationRu}</div>
                      {v.transcription && (
                        <div className="text-xs text-muted-foreground mt-1">[{v.transcription}]</div>
                      )}
                      {fav.note && (
                        <div className="mt-2 p-2 rounded-lg bg-chart-2/5 border border-chart-2/20 text-sm">
                          <span className="text-xs text-chart-2 font-medium">Заметка: </span>
                          <span className="text-foreground/80">{fav.note}</span>
                        </div>
                      )}
                      {v.lesson && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {v.lesson.module?.title} → {v.lesson.title}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => speak(v.id, v.wordKomi)}
                        disabled={playing === v.id}
                      >
                        {playing === v.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(fav);
                          setNoteText(fav.note || "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/5"
                        onClick={() => removeMutation.mutate(fav.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">В избранном пока нет слов</p>
            <p className="text-sm mt-1">
              Нажимайте на иконку <Heart className="inline h-3.5 w-3.5" /> в словаре, чтобы добавить слово сюда.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit note dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заметка к слову</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editing && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">{editing.vocabulary.wordKomi}</span>{" "}
                — {editing.vocabulary.translationRu}
              </div>
            )}
            <Input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Например: сложное слово, обратить внимание на ӧ"
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => updateNoteMutation.mutate({ id: editing.id, note: null })}
              >
                Удалить заметку
              </Button>
              <Button
                className="flex-1"
                onClick={() => updateNoteMutation.mutate({ id: editing.id, note: noteText })}
                disabled={updateNoteMutation.isPending}
              >
                {updateNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
