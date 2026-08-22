"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  Bot,
  User as UserIcon,
  Volume2,
  Loader2,
  ArrowLeft,
  Sparkles,
  ListVideo,
  Star,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function DialogView() {
  const { navigate } = useNav();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; ts: number }[]>([]);
  const [input, setInput] = useState("");
  const [grammarFeedback, setGrammarFeedback] = useState<string>("");
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: scenarios } = useQuery({
    queryKey: ["dialog-scenarios"],
    queryFn: () => apiFetch<any[]>("/api/dialog/scenarios"),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, scenarioId, sessionId }: any) =>
      apiFetch<any>("/api/dialog/message", {
        method: "POST",
        json: { message, scenarioId, sessionId, language: "komi" },
      }),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages([
        ...data.history.map((m: any) => ({ role: m.role, content: m.content, ts: Date.now() })),
      ]);
      setGrammarFeedback(data.grammarFeedback || "");
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (e: any) => {
      toast.error(e.message || "Не удалось получить ответ");
    },
  });

  const finishMutation = useMutation({
    mutationFn: () =>
      apiFetch<any>("/api/dialog/finish", {
        method: "POST",
        json: { sessionId, rating: 5 },
      }),
    onSuccess: (data) => {
      toast.success(`Диалог завершён! +${data.xpGained} XP`);
      if (data.newAchievements?.length > 0) {
        data.newAchievements.forEach((a: string) => toast.success(`🏆 Достижение: ${a}`));
      }
      handleReset();
    },
  });

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      message: input.trim(),
      scenarioId: selectedScenario,
      sessionId,
    });
  };

  const handleReset = () => {
    setSessionId(null);
    setMessages([]);
    setSelectedScenario(null);
    setGrammarFeedback("");
    setInput("");
  };

  const speak = async (text: string, idx: number) => {
    setPlayingAudio(idx);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
      setPlayingAudio(null);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedScenarioObj = scenarios?.find((s) => s.id === selectedScenario);

  // Scenario picker
  if (!sessionId && messages.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            Диалоговый тренажёр
          </h1>
          <p className="text-muted-foreground mt-1">
            Выберите сценарий и начните диалог с ИИ на коми языке
          </p>
        </div>

        <div className="rounded-2xl border border-chart-2/30 bg-chart-2/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-chart-2 shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/80">
            Тренажёр использует нейросеть для генерации ответов. Старайтесь
            отвечать на коми языке — ИИ подскажет перевод и исправит ошибки.
            Зелёная кнопка <Volume2 className="inline h-3.5 w-3.5" /> озвучит реплику.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {scenarios?.map((s) => (
            <Card
              key={s.id}
              className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              onClick={() => {
                setSelectedScenario(s.id);
                setMessages([]);
                setSessionId(null);
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-chart-2 to-chart-3 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {s.level === "advanced" ? "Продвинутый" : s.level === "intermediate" ? "Средний" : "Начальный"}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{s.description}</p>
                {s.scenario?.vocabulary && (
                  <div className="flex flex-wrap gap-1">
                    {s.scenario.vocabulary.slice(0, 3).map((v: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs font-normal">
                        {v}
                      </Badge>
                    ))}
                    {s.scenario.vocabulary.length > 3 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{s.scenario.vocabulary.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {s.attempts > 0 && (
                  <div className="text-xs text-muted-foreground mt-3">
                    Пройдено раз: {s.attempts}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedScenario && (
          <div className="fixed bottom-4 left-0 right-0 lg:left-72 z-40 px-4">
            <div className="mx-auto max-w-md bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Выбран сценарий:</div>
                <div className="font-medium truncate">{selectedScenarioObj?.title}</div>
              </div>
              <Button size="sm" onClick={() => {
                sendMessageMutation.mutate({ message: "Бур лун!", scenarioId: selectedScenario, sessionId: null });
              }} disabled={sendMessageMutation.isPending}>
                {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Начать"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setSelectedScenario(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleReset} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-chart-2 to-chart-3 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            {selectedScenarioObj?.title || "Диалог с ИИ"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-chart-1 animate-pulse" />
            Нейросеть готова ответить
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => finishMutation.mutate()}
          disabled={finishMutation.isPending || messages.length < 2}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Завершить
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            onSpeak={() => speak(msg.content, idx)}
            playing={playingAudio === idx}
          />
        ))}
        {sendMessageMutation.isPending && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-chart-2 to-chart-3 text-white shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Grammar feedback */}
      {grammarFeedback && (
        <div className="px-4 py-2 bg-chart-2/10 border-t border-chart-2/20 text-sm flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-chart-2">Подсказка:</span>{" "}
            <span className="text-foreground/80">{grammarFeedback}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Напишите на коми языке..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 px-1">
          Enter — отправить · Shift+Enter — новая строка
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onSpeak,
  playing,
}: {
  message: { role: string; content: string; ts: number };
  onSpeak: () => void;
  playing: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-chart-2 to-chart-3 text-white"
        }`}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`group max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
        {!isUser && (
          <button
            onClick={onSpeak}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            disabled={playing}
          >
            {playing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            Прослушать
          </button>
        )}
      </div>
    </div>
  );
}
