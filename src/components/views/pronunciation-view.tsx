"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
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
  Mic,
  Square,
  Volume2,
  Loader2,
  CheckCircle2,
  XCircle,
  MicOff,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

interface PronunciationWord {
  id: string;
  wordKomi: string;
  translationRu: string;
  transcription?: string | null;
}

interface AttemptResult {
  transcript: string;
  accuracy: number;
  feedback: string;
}

export function PronunciationView() {
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [history, setHistory] = useState<{ word: string; accuracy: number }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const params = new URLSearchParams({ pageSize: "50", sort: "az_komi" });
  if (selectedLesson !== "all") params.set("lessonId", selectedLesson);

  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["pronunciation-words", selectedLesson],
    queryFn: () => apiFetch<{ items: PronunciationWord[]; total: number }>(`/api/vocabulary?${params.toString()}`),
  });

  const { data: modulesData } = useQuery({
    queryKey: ["pronunciation-modules"],
    queryFn: () => apiFetch<{ items: any[] }>("/api/modules?pageSize=20"),
  });

  const words = vocabData?.items || [];
  const currentWord = words[currentWordIdx];

  const startRecording = async () => {
    setMicError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await processAudio(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        // Stop tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start();
      setIsRecording(true);
    } catch (e: any) {
      console.error("Mic error:", e);
      setMicError(
        e.name === "NotAllowedError"
          ? "Доступ к микрофону запрещён. Разрешите доступ в настройках браузера."
          : e.name === "NotFoundError"
          ? "Микрофон не найден. Подключите устройство ввода аудио."
          : "Ошибка доступа к микрофону: " + (e.message || e.name)
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudio = async (base64Audio: string) => {
    if (!currentWord) return;
    setIsProcessing(true);
    try {
      const data = await apiFetch<{ transcript: string; accuracy: number; feedback: string }>("/api/asr", {
        method: "POST",
        json: { audioBase64, target: currentWord.wordKomi },
      });
      setResult({
        transcript: data.transcript,
        accuracy: data.accuracy,
        feedback: data.feedback,
      });
      setHistory([...history, { word: currentWord.wordKomi, accuracy: data.accuracy }]);
      if (data.accuracy >= 80) {
        toast.success(`Отлично! Точность ${data.accuracy}%`);
      } else if (data.accuracy >= 60) {
        toast(`Хорошо! Точность ${data.accuracy}%`, { description: data.feedback });
      } else {
        toast.error(`Попробуйте ещё раз. Точность ${data.accuracy}%`);
      }
    } catch (e: any) {
      toast.error(e.message || "Не удалось распознать речь");
    } finally {
      setIsProcessing(false);
    }
  };

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

  const nextWord = () => {
    if (currentWordIdx < words.length - 1) {
      setCurrentWordIdx(currentWordIdx + 1);
      setResult(null);
    } else {
      toast.success("Вы прошли все слова!");
    }
  };

  const prevWord = () => {
    if (currentWordIdx > 0) {
      setCurrentWordIdx(currentWordIdx - 1);
      setResult(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const avgAccuracy = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.accuracy, 0) / history.length)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Mic className="h-7 w-7 text-primary" />
          Тренажёр произношения
        </h1>
        <p className="text-muted-foreground mt-1">
          Запишите произношение коми слова и получите оценку точности
        </p>
      </div>

      {/* Setup */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Настройка
          </CardTitle>
          <CardDescription>Выберите набор слов для тренировки</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedLesson} onValueChange={(v) => { setSelectedLesson(v); setCurrentWordIdx(0); setResult(null); setHistory([]); }}>
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
        </CardContent>
      </Card>

      {micError && (
        <Card className="border-chart-3/40 bg-chart-3/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-chart-3 shrink-0 mt-0.5" />
            <div className="text-sm text-chart-3">{micError}</div>
          </CardContent>
        </Card>
      )}

      {/* Main word card */}
      {currentWord ? (
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-chart-1 to-chart-2" />
          <CardContent className="p-6">
            {/* Word */}
            <div className="text-center mb-6">
              <div className="text-xs text-muted-foreground mb-2">
                Слово {currentWordIdx + 1} из {words.length}
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <h2 className="text-4xl sm:text-5xl font-bold text-primary">
                  {currentWord.wordKomi}
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10"
                  onClick={() => speak(currentWord.wordKomi)}
                  title="Прослушать образец"
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
              </div>
              {currentWord.transcription && (
                <div className="text-base text-muted-foreground">[{currentWord.transcription}]</div>
              )}
              <div className="text-sm text-foreground/70 mt-2">{currentWord.translationRu}</div>
            </div>

            {/* Mic button */}
            <div className="flex flex-col items-center gap-3 py-4">
              {!isRecording && !isProcessing && (
                <Button
                  size="lg"
                  variant="default"
                  className="h-20 w-20 rounded-full shadow-lg hover:scale-105 transition-transform"
                  onClick={startRecording}
                >
                  <Mic className="h-8 w-8" />
                </Button>
              )}
              {isRecording && (
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-20 w-20 rounded-full shadow-lg animate-pulse"
                  onClick={stopRecording}
                >
                  <Square className="h-8 w-8" />
                </Button>
              )}
              {isProcessing && (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {!isRecording && !isProcessing && "Нажмите на микрофон и произнесите слово"}
                {isRecording && "Запись... Нажмите, чтобы остановить"}
                {isProcessing && "Обработка аудио..."}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="space-y-3 pt-4 border-t border-border animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Результат:</span>
                  <Badge variant={result.accuracy >= 80 ? "default" : result.accuracy >= 60 ? "secondary" : "destructive"}>
                    {result.accuracy}%
                  </Badge>
                </div>
                <Progress value={result.accuracy} className={`h-2.5 ${
                  result.accuracy >= 80 ? "[&>div]:bg-chart-1" : result.accuracy >= 60 ? "[&>div]:bg-chart-2" : "[&>div]:bg-chart-3"
                }`} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Вы произнесли:</div>
                    <div className="text-sm font-medium">{result.transcript || "(не распознано)"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Правильно:</div>
                    <div className="text-sm font-medium text-primary">{currentWord.wordKomi}</div>
                  </div>
                </div>
                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                  result.accuracy >= 80
                    ? "bg-chart-1/10 text-chart-1"
                    : result.accuracy >= 60
                    ? "bg-chart-2/10 text-chart-2"
                    : "bg-chart-3/10 text-chart-3"
                }`}>
                  {result.accuracy >= 80 ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{result.feedback}</span>
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentWordIdx === 0}
                onClick={prevWord}
              >
                ← Назад
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setResult(null); }}
                disabled={!result}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Заново
              </Button>
              <Button
                size="sm"
                onClick={nextWord}
                disabled={currentWordIdx === words.length - 1}
              >
                Далее →
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /> : <MicOff className="h-12 w-12 mx-auto mb-3 opacity-40" />}
            <p>{isLoading ? "Загрузка слов..." : "Нет слов для тренировки"}</p>
          </CardContent>
        </Card>
      )}

      {/* Session stats */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-chart-2" />
              Статистика сессии
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-bold">{history.length}</div>
                <div className="text-xs text-muted-foreground">Попыток</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-bold text-chart-1">{avgAccuracy}%</div>
                <div className="text-xs text-muted-foreground">Средняя точность</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xl font-bold text-chart-2">
                  {history.filter(h => h.accuracy >= 80).length}
                </div>
                <div className="text-xs text-muted-foreground">Отличных</div>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {history.slice().reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded text-sm">
                  <div className={`h-2 w-2 rounded-full ${
                    h.accuracy >= 80 ? "bg-chart-1" : h.accuracy >= 60 ? "bg-chart-2" : "bg-chart-3"
                  }`} />
                  <div className="flex-1 truncate">{h.word}</div>
                  <Badge variant="outline" className="text-xs">{h.accuracy}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy notice */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Соответствие 152-ФЗ:</strong> Голосовые записи
            обрабатываются нейросетью для распознавания речи и <strong>не сохраняются</strong> на сервере.
            Аудиоданные удаляются сразу после получения текстовой транскрипции.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
