"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Play,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy,
  RotateCw,
  Sparkles,
  Lightbulb,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

interface QuizExercise {
  id: string;
  orderIndex: number;
  type: string;
  question: string;
  questionRu?: string | null;
  optionsJson: string;
  hint?: string | null;
  scoreWeight: number;
  lesson: any;
}

export function QuizView() {
  const { navigate, params } = useNav();
  const [mode, setMode] = useState<"setup" | "session" | "results">("setup");
  const [moduleId, setModuleId] = useState<string>(params.moduleId || "all");
  const [count, setCount] = useState(10);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; isCorrect: boolean; checked: boolean }>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});

  const { data: modules } = useQuery({
    queryKey: ["modules", "quiz-select"],
    queryFn: () => apiFetch<{ items: any[] }>("/api/modules?pageSize=20"),
  });

  const startMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ quiz: any }>(`/api/quiz?${moduleId !== "all" ? `moduleId=${moduleId}&` : ""}count=${count}`),
    onSuccess: (data) => {
      if (!data.quiz) {
        toast.error("Нет упражнений для генерации теста. Выберите другой модуль.");
        return;
      }
      setQuiz(data.quiz);
      setCurrentIdx(0);
      setAnswers({});
      setShowHint({});
      setMode("session");
    },
    onError: (e: any) => toast.error(e.message || "Не удалось создать тест"),
  });

  const checkMutation = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      apiFetch<any>(`/api/exercises/${id}/check`, { method: "POST", json: { answer } }),
    onSuccess: (data, vars) => {
      setAnswers((prev) => ({
        ...prev,
        [vars.id]: { answer: vars.answer, isCorrect: data.isCorrect, checked: true, ...data },
      }));
      if (data.isCorrect) toast.success("Верно!");
      else toast.error("Неверно");
    },
  });

  // === SETUP MODE ===
  if (mode === "setup") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Мини-тест
          </h1>
          <p className="text-muted-foreground mt-1">
            Случайная подборка упражнений для проверки знаний
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Настройка теста
            </CardTitle>
            <CardDescription>Выберите модуль и количество вопросов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Модуль</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все модули (случайно)</SelectItem>
                  {modules?.items.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Количество вопросов</Label>
                <Badge variant="outline">{count}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <Button
                    key={n}
                    variant={count === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Создаём тест...</>
              ) : (
                <><Play className="h-5 w-5 mr-2" /> Начать тест</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 shrink-0">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Как это работает?</h3>
                <ul className="text-sm text-muted-foreground space-y-1 leading-relaxed">
                  <li>• Тест генерируется случайно из упражнений выбранного модуля</li>
                  <li>• В одном тесте могут быть разные типы вопросов</li>
                  <li>• За каждый верный ответ начисляется XP</li>
                  <li>• Результат сохраняется в вашей статистике</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === RESULTS MODE ===
  if (mode === "results" && quiz) {
    const total = quiz.exercises.length;
    const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
    const percent = Math.round((correctCount / total) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Card className="overflow-hidden">
          <div className={`h-2 ${percent >= 70 ? "bg-chart-1" : percent >= 40 ? "bg-chart-2" : "bg-chart-3"}`} />
          <CardHeader className="text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
              percent >= 70 ? "bg-chart-1/15 text-chart-1" : percent >= 40 ? "bg-chart-2/15 text-chart-2" : "bg-chart-3/15 text-chart-3"
            }`}>
              <PartyPopper className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Тест завершён!</CardTitle>
            <CardDescription>
              {percent >= 70 ? "Отличный результат!" : percent >= 40 ? "Хороший прогресс!" : "Продолжайте учиться!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-1">{correctCount}</div>
                <div className="text-xs text-muted-foreground">Верно</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-3">{total - correctCount}</div>
                <div className="text-xs text-muted-foreground">Ошибок</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-chart-2">+{correctCount * 5}</div>
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
              <Button className="flex-1" onClick={() => startMutation.mutate()}>
                <RotateCw className="h-4 w-4 mr-1" />
                Новый тест
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detailed review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Разбор ответов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quiz.exercises.map((ex: QuizExercise, i: number) => {
              const a = answers[ex.id];
              return (
                <div
                  key={ex.id}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    a?.isCorrect ? "border-chart-1/30 bg-chart-1/5" : "border-chart-3/30 bg-chart-3/5"
                  }`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                    a?.isCorrect ? "bg-chart-1 text-white" : "bg-chart-3 text-white"
                  }`}>
                    {a?.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Вопрос {i + 1} · {ex.type}</div>
                    <div className="text-sm font-medium truncate">{ex.questionRu || ex.question}</div>
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Ваш ответ: </span>
                      <span className={a?.isCorrect ? "text-chart-1" : "text-chart-3"}>{a?.answer || "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // === SESSION MODE ===
  if (!quiz) return null;
  const ex = quiz.exercises[currentIdx] as QuizExercise;
  if (!ex) return null;
  const total = quiz.exercises.length;
  const progress = ((currentIdx + 1) / total) * 100;
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const allChecked = quiz.exercises.every((e: QuizExercise) => answers[e.id]?.checked);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header + progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("setup")}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Прервать
          </Button>
          <div className="text-sm text-muted-foreground">
            Вопрос {currentIdx + 1} из {total}
          </div>
          <div className="text-sm">
            Верно: <span className="text-chart-1 font-semibold">{correctCount}</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge>{typeLabel(ex.type)}</Badge>
            {ex.lesson?.module && (
              <Badge variant="outline" className="text-xs">
                {ex.lesson.module.title}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{ex.questionRu || ex.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuizInput
            exercise={ex}
            value={answers[ex.id]?.answer || ""}
            checked={answers[ex.id]?.checked || false}
            isCorrect={answers[ex.id]?.isCorrect || false}
            correctAnswer={(answers[ex.id] as any)?.correctAnswer}
            hint={ex.hint}
            showHint={showHint[ex.id]}
            onAnswer={(val: string) =>
              setAnswers((prev) => ({ ...prev, [ex.id]: { answer: val, isCorrect: false, checked: false } }))
            }
            onCheck={() => checkMutation.mutate({ id: ex.id, answer: answers[ex.id]?.answer || "" })}
            onShowHint={() => setShowHint((prev) => ({ ...prev, [ex.id]: true }))}
          />

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(currentIdx - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {quiz.exercises.map((e: QuizExercise, i: number) => (
                <button
                  key={e.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    i === currentIdx
                      ? "bg-primary w-6"
                      : answers[e.id]?.checked
                      ? answers[e.id]?.isCorrect ? "bg-chart-1" : "bg-chart-3"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {currentIdx < total - 1 ? (
              <Button
                size="sm"
                disabled={!answers[ex.id]?.checked}
                onClick={() => setCurrentIdx(currentIdx + 1)}
              >
                Далее
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!allChecked}
                onClick={() => setMode("results")}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Результат
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    translation: "Перевод",
    choice: "Выбор",
    matching: "Сопоставление",
    fill_blank: "Пропуск",
    audio: "Аудио",
    order: "Порядок",
  };
  return map[type] || type;
}

function QuizInput({
  exercise,
  value,
  checked,
  isCorrect,
  correctAnswer,
  hint,
  showHint,
  onAnswer,
  onCheck,
  onShowHint,
}: any) {
  if (exercise.type === "choice") {
    const options: string[] = JSON.parse(exercise.optionsJson);
    return (
      <div className="space-y-2">
        <RadioGroup value={value} onValueChange={onAnswer} disabled={checked}>
          {options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                checked && opt === correctAnswer
                  ? "border-chart-1 bg-chart-1/5"
                  : checked && opt === value && !isCorrect
                  ? "border-chart-3 bg-chart-3/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <RadioGroupItem value={opt} id={opt} />
              <span className="text-sm">{opt}</span>
              {checked && opt === correctAnswer && <Check className="h-4 w-4 text-chart-1 ml-auto" />}
              {checked && opt === value && !isCorrect && <X className="h-4 w-4 text-chart-3 ml-auto" />}
            </label>
          ))}
        </RadioGroup>
        <ActionRow checked={checked} onCheck={onCheck} hint={hint} showHint={showHint} onShowHint={onShowHint} disabled={!value} />
        {checked && !isCorrect && correctAnswer && (
          <div className="text-sm text-chart-3">Правильный ответ: <strong>{correctAnswer}</strong></div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Ваш ответ</Label>
        <Input
          value={value}
          onChange={(e) => onAnswer(e.target.value)}
          disabled={checked}
          placeholder="Введите ответ..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !checked && value) onCheck();
          }}
          className={checked ? (isCorrect ? "border-chart-1" : "border-chart-3") : ""}
        />
      </div>
      <ActionRow checked={checked} onCheck={onCheck} hint={hint} showHint={showHint} onShowHint={onShowHint} disabled={!value} />
      {checked && !isCorrect && correctAnswer && (
        <div className="text-sm text-chart-3">Правильный ответ: <strong>{correctAnswer}</strong></div>
      )}
    </div>
  );
}

function ActionRow({ checked, onCheck, hint, showHint, onShowHint, disabled }: any) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!checked ? (
        <Button onClick={onCheck} disabled={disabled} size="sm">
          <Check className="h-4 w-4 mr-1" />
          Проверить
        </Button>
      ) : (
        <Badge variant="outline" className="text-xs">Проверено</Badge>
      )}
      {hint && !showHint && (
        <Button variant="ghost" size="sm" onClick={onShowHint}>
          <Lightbulb className="h-4 w-4 mr-1" />
          Подсказка
        </Button>
      )}
      {showHint && hint && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          <Lightbulb className="h-3.5 w-3.5" />
          {hint}
        </div>
      )}
    </div>
  );
}
