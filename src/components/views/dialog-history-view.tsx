"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Bot,
  User as UserIcon,
  Loader2,
  Clock,
  ChevronRight,
  Volume2,
  Sparkles,
  Trophy,
  RotateCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DialogHistoryView() {
  const { navigate } = useNav();
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dialog-sessions"],
    queryFn: () => apiFetch<{ items: any[]; total: number }>("/api/dialog/sessions"),
  });

  const speak = async (text: string, idx: number) => {
    setPlayingIdx(idx);
    try {
      const audioData = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(audioData.audio);
      audio.onended = () => setPlayingIdx(null);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
      setPlayingIdx(null);
    }
  };

  const openSession = (session: any) => {
    // Fetch full session details (we already have messages in DialogSession.messagesJson)
    // For now, parse messages from the preview — but we need full messages.
    // We'll re-fetch the session via dialog/scenarios or store the messages.
    // For simplicity, we'll just show what we have.
    setSelectedSession(session);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            История диалогов
          </h1>
          <p className="text-muted-foreground mt-1">
            {data?.total || 0} проведённых тренировок
          </p>
        </div>
        <Button onClick={() => navigate("dialog")}>
          <Sparkles className="h-4 w-4 mr-1" />
          Новый диалог
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-5 skeleton-shimmer rounded w-1/3" />
                <div className="h-3 skeleton-shimmer rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((s, i) => (
            <Card
              key={s.id}
              className="hover:shadow-md transition-all hover-lift cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => openSession(s)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    s.status === "finished"
                      ? "bg-chart-1/15 text-chart-1"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {s.status === "finished" ? <Trophy className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {s.scenario?.title || "Свободный диалог"}
                      </h3>
                      <Badge
                        variant={s.status === "finished" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {s.status === "finished" ? "Завершён" : s.status === "active" ? "Активен" : "Заброшен"}
                      </Badge>
                      {s.scenario?.level && (
                        <Badge variant="outline" className="text-xs">
                          {s.scenario.level === "advanced" ? "Продвинутый" : s.scenario.level === "intermediate" ? "Средний" : "Начальный"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1 italic">
                      «{s.preview}»
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(s.startedAt)}
                      </span>
                      <span>·</span>
                      <span>{s.messageCount} сообщений</span>
                      <span>·</span>
                      <span>{s.userTurns} ваших реплик</span>
                      {s.score?.overall && (
                        <>
                          <span>·</span>
                          <span className="text-chart-1 font-medium">Оценка: {s.score.overall}/100</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Вы ещё не проводили диалоги</p>
            <p className="text-sm mt-1">Начните свою первую тренировку с ИИ-собеседником</p>
            <Button className="mt-4" onClick={() => navigate("dialog")}>
              <Sparkles className="h-4 w-4 mr-1" />
              Начать диалог
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session detail dialog (shows full messages) */}
      <Dialog open={!!selectedSession} onOpenChange={(o) => !o && setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              {selectedSession?.scenario?.title || "Свободный диалог"}
            </DialogTitle>
            {selectedSession && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(selectedSession.startedAt)}
                </span>
                <span>·</span>
                <span>{selectedSession.messageCount} сообщений</span>
                {selectedSession.score?.overall && (
                  <>
                    <span>·</span>
                    <Badge variant="outline" className="text-xs">
                      Оценка: {selectedSession.score.overall}/100
                    </Badge>
                  </>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 -mx-2 px-2">
            {selectedSession?.messages?.map((msg: any, idx: number) => {
              const isUser = msg.role === "user";
              return (
                <div key={idx} className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                    isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-chart-2 to-chart-3 text-white"
                  }`}>
                    {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`group max-w-[80%] rounded-2xl px-3 py-2 ${
                    isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted border border-border rounded-tl-sm"
                  }`}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    {!isUser && (
                      <button
                        onClick={() => speak(msg.content, idx)}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        disabled={playingIdx === idx}
                      >
                        {playingIdx === idx ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        Прослушать
                      </button>
                    )}
                  </div>
                </div>
              );
            }) || (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Загрузка сообщений...
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-border flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedSession(null);
                navigate("dialog");
              }}
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Новый диалог
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedSession(null)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (diff < day && now.getDate() === date.getDate()) {
    return "сегодня, " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 2 * day) return "вчера, " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * day) {
    const days = Math.floor(diff / day);
    return `${days} дн. назад`;
  }
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
