"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Lightbulb,
  BookOpen,
  Volume2,
  Award,
  RotateCcw,
  Lock,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

export function LessonView() {
  const { params } = useNav();
  const lessonId = params.lessonId as string;

  // Use key-based remount to reset all state when lessonId changes
  if (!lessonId) {
    return <div className="p-8 text-center text-muted-foreground">Урок не выбран</div>;
  }
  return <LessonPlayer key={lessonId} lessonId={lessonId} />;
}

function LessonPlayer({ lessonId }: { lessonId: string }) {
  const { navigate } = useNav();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<any>(`/api/lessons/${lessonId}`),
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; isCorrect: boolean; checked: boolean; correctAnswer?: string }>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [showTheory, setShowTheory] = useState(true);
  const [resultDialog, setResultDialog] = useState<any>(null);

  const submitMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/api/progress", { method: "POST", json: data }),
    onSuccess: (data) => {
      setResultDialog(data);
      if (data.newAchievements?.length > 0) {
        data.newAchievements.forEach((a: string) => {
          toast.success(`🏆 Получено достижение: ${a}`);
        });
      }
    },
    onError: (e: any) => toast.error(e.message || "Не удалось сохранить прогресс"),
  });

  const checkMutation = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      apiFetch<any>(`/api/exercises/${id}/check`, { method: "POST", json: { answer } }),
    onSuccess: (data, vars) => {
      setAnswers((prev) => ({
        ...prev,
        [vars.id]: { answer: vars.answer, isCorrect: data.isCorrect, checked: true },
      }));
      if (data.isCorrect) {
        toast.success("Верно!");
      } else {
        toast.error("Неверно. Попробуйте ещё раз.");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return <div className="p-8 text-center text-muted-foreground">Урок не найден</div>;
  }

  if (!lesson.unlocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold mb-2">Урок заблокирован</h2>
        <p className="text-muted-foreground mb-6">
          Сначала пройдите предыдущий урок этого модуля.
        </p>
        <Button onClick={() => navigate("modules", { selectedModuleId: lesson.moduleId })}>
          К списку уроков
        </Button>
      </div>
    );
  }

  // Theory step
  if (showTheory) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("modules", { selectedModuleId: lesson.moduleId })}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          К списку уроков
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              {lesson.module?.title}
            </div>
            <CardTitle className="text-2xl">{lesson.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {lesson.theoryContent ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-lg border border-border">
                {lesson.theoryContent}
              </pre>
            ) : (
              <p className="text-muted-foreground">Теоретический материал отсутствует.</p>
            )}
          </CardContent>
        </Card>

        {/* Vocabulary preview */}
        {lesson.vocabulary?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Словарь урока ({lesson.vocabulary.length} слов)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {lesson.vocabulary.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-primary">{v.wordKomi}</div>
                    <div className="text-xs text-muted-foreground">{v.translationRu}</div>
                  </div>
                  <SpeakButton text={v.wordKomi} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {lesson.exercises.length} упражнений · Проходной балл: {lesson.passingScore}%
          </div>
          <Button onClick={() => setShowTheory(false)}>
            Начать упражнения
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Exercise step
  const exercise = lesson.exercises[currentIndex];
  const total = lesson.exercises.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const allChecked = lesson.exercises.every((e: any) => answers[e.id]?.checked);

  const handleFinish = () => {
    const payload = {
      lessonId: lesson.id,
      answers: lesson.exercises.map((e: any) => ({
        exerciseId: e.id,
        answer: answers[e.id]?.answer || "",
        isCorrect: answers[e.id]?.isCorrect || false,
        scoreWeight: e.scoreWeight,
      })),
    };
    submitMutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => setShowTheory(true)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Теория
        </Button>
        <div className="flex-1 text-center text-sm text-muted-foreground">
          Упражнение {currentIndex + 1} из {total}
        </div>
        <div className="text-sm text-muted-foreground">
          Верно: <span className="text-chart-1 font-semibold">{correctCount}</span>/{total}
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <Card>
        <CardHeader>
          <Badge className="self-start mb-2">{exerciseTypeLabel(exercise.type)}</Badge>
          <CardTitle className="text-xl">{exercise.questionRu || exercise.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExerciseInput
            exercise={exercise}
            value={answers[exercise.id]?.answer || ""}
            checked={answers[exercise.id]?.checked || false}
            isCorrect={answers[exercise.id]?.isCorrect || false}
            correctAnswer={answers[exercise.id]?.correctAnswer}
            hint={exercise.hint}
            showHint={showHint[exercise.id]}
            onAnswer={(val: string) =>
              setAnswers((prev) => ({ ...prev, [exercise.id]: { answer: val, isCorrect: false, checked: false } }))
            }
            onCheck={() => checkMutation.mutate({ id: exercise.id, answer: answers[exercise.id]?.answer || "" })}
            onShowHint={() => setShowHint((prev) => ({ ...prev, [exercise.id]: true }))}
          />

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>

            <div className="flex items-center gap-2">
              {(lesson.exercises.slice(0, currentIndex + 1) as any[]).map((e, i) => (
                <button
                  key={e.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    i === currentIndex
                      ? "bg-primary w-6"
                      : answers[e.id]?.checked
                      ? answers[e.id]?.isCorrect
                        ? "bg-chart-1"
                        : "bg-chart-3"
                      : "bg-muted-foreground/30"
                  }`}
                  title={`Упражнение ${i + 1}`}
                />
              ))}
            </div>

            {currentIndex < total - 1 ? (
              <Button
                size="sm"
                disabled={!answers[exercise.id]?.checked}
                onClick={() => setCurrentIndex(currentIndex + 1)}
              >
                Далее
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!allChecked || submitMutation.isPending}
                onClick={handleFinish}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Завершить урок
                    <Check className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result dialog */}
      <Dialog open={!!resultDialog} onOpenChange={(o) => !o && setResultDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-6 w-6 text-chart-2" />
              Урок завершён!
            </DialogTitle>
          </DialogHeader>
          {resultDialog && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <ResultStat label="Балл" value={`${resultDialog.score}%`} highlight={resultDialog.isCompleted} />
                <ResultStat label="Попытка" value={`№${resultDialog.attemptNumber}`} />
                <ResultStat label="XP получено" value={`+${resultDialog.xpGained}`} />
                <ResultStat label="Всего XP" value={String(resultDialog.totalXp || "")} />
              </div>
              {resultDialog.isCompleted ? (
                <div className="bg-chart-1/10 text-chart-1 rounded-lg p-3 text-sm flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Урок успешно пройден!
                </div>
              ) : (
                <div className="bg-chart-3/10 text-chart-3 rounded-lg p-3 text-sm">
                  Не достигнут проходной балл ({lesson.passingScore}%). Попробуйте ещё раз!
                </div>
              )}
              {resultDialog.newAchievements?.length > 0 && (
                <div className="bg-chart-2/10 rounded-lg p-3 space-y-1.5">
                  <div className="font-medium text-chart-2 flex items-center gap-1.5 text-sm">
                    <Award className="h-4 w-4" />
                    Новые достижения:
                  </div>
                  {resultDialog.newAchievements.map((a: string) => (
                    <div key={a} className="text-sm pl-5">• {a}</div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setResultDialog(null);
                    setAnswers({});
                    setCurrentIndex(0);
                    setShowHint({});
                    setShowTheory(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Пройти заново
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setResultDialog(null);
                    navigate("modules", { selectedModuleId: lesson.moduleId });
                  }}
                >
                  К списку уроков
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? "bg-chart-1/5 border-chart-1/20" : "bg-muted/30 border-border"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function exerciseTypeLabel(type: string) {
  const map: Record<string, string> = {
    translation: "Перевод",
    choice: "Выбор ответа",
    matching: "Сопоставление",
    fill_blank: "Заполнить пропуск",
    audio: "Аудио",
    order: "Порядок",
  };
  return map[type] || type;
}

function SpeakButton({ text }: { text: string }) {
  const [loading, setLoading] = useState(false);
  const speak = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "Не удалось воспроизвести аудио");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={speak} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
}

function ExerciseInput({
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
                checked && opt === exercise.correctAnswer
                  ? "border-chart-1 bg-chart-1/5"
                  : checked && opt === value && !isCorrect
                  ? "border-chart-3 bg-chart-3/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <RadioGroupItem value={opt} id={opt} />
              <span className="text-sm">{opt}</span>
              {checked && opt === exercise.correctAnswer && <Check className="h-4 w-4 text-chart-1 ml-auto" />}
              {checked && opt === value && !isCorrect && <X className="h-4 w-4 text-chart-3 ml-auto" />}
            </label>
          ))}
        </RadioGroup>
        <ActionButton checked={checked} onCheck={onCheck} hint={hint} showHint={showHint} onShowHint={onShowHint} />
        {checked && !isCorrect && correctAnswer && (
          <div className="text-sm text-chart-3">Правильный ответ: <strong>{correctAnswer}</strong></div>
        )}
      </div>
    );
  }

  if (exercise.type === "matching") {
    return (
      <MatchingExercise
        exercise={exercise}
        checked={checked}
        isCorrect={isCorrect}
        correctAnswer={correctAnswer}
        hint={hint}
        showHint={showHint}
        onAnswer={onAnswer}
        onCheck={onCheck}
        onShowHint={onShowHint}
      />
    );
  }

  // translation, fill_blank, audio
  return (
    <div className="space-y-3">
      {exercise.type === "audio" && (
        <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-3">
          <SpeakButton text={JSON.parse(exercise.optionsJson).word || exercise.correctAnswer} />
          <span className="text-sm text-muted-foreground">Прослушайте слово и напишите его</span>
        </div>
      )}
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
      <ActionButton checked={checked} onCheck={onCheck} hint={hint} showHint={showHint} onShowHint={onShowHint} disabled={!value} />
      {checked && !isCorrect && correctAnswer && (
        <div className="text-sm text-chart-3">Правильный ответ: <strong>{correctAnswer}</strong></div>
      )}
    </div>
  );
}

function MatchingExercise({
  exercise,
  checked,
  isCorrect,
  correctAnswer,
  hint,
  showHint,
  onAnswer,
  onCheck,
  onShowHint,
}: any) {
  const opts = JSON.parse(exercise.optionsJson);
  const pairs: [string, string][] = opts.pairs || [];
  const lefts = pairs.map((p) => p[0]);
  const rights = pairs.map((p) => p[1]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const handleLeftClick = (left: string) => {
    if (checked) return;
    setSelectedLeft(left);
  };
  const handleRightClick = (right: string) => {
    if (checked || !selectedLeft) return;
    const newMatches = { ...matches, [selectedLeft]: right };
    setMatches(newMatches);
    setSelectedLeft(null);
    onAnswer(JSON.stringify({ pairs: Object.entries(newMatches) }));
  };

  const allMatched = Object.keys(matches).length === pairs.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {lefts.map((l) => (
            <button
              key={l}
              onClick={() => handleLeftClick(l)}
              disabled={checked}
              className={`w-full p-3 rounded-lg border text-left text-sm transition-all ${
                selectedLeft === l
                  ? "border-primary bg-primary/10"
                  : matches[l]
                  ? "border-chart-2/40 bg-chart-2/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              {l}
              {matches[l] && <span className="text-xs text-muted-foreground ml-2">→ {matches[l]}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map((r) => (
            <button
              key={r}
              onClick={() => handleRightClick(r)}
              disabled={checked || Object.values(matches).includes(r)}
              className={`w-full p-3 rounded-lg border text-left text-sm transition-all ${
                Object.values(matches).includes(r)
                  ? "border-chart-2/40 bg-chart-2/5 opacity-60"
                  : "border-border hover:bg-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ActionButton checked={checked} onCheck={onCheck} hint={hint} showHint={showHint} onShowHint={onShowHint} disabled={!allMatched} />
      {checked && !isCorrect && correctAnswer && (
        <div className="text-sm text-chart-3">
          Правильное сопоставление смотрите в подсказке выше.
        </div>
      )}
    </div>
  );
}

function ActionButton({ checked, onCheck, hint, showHint, onShowHint, disabled }: any) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!checked ? (
        <Button onClick={onCheck} disabled={disabled} size="sm">
          <Check className="h-4 w-4 mr-1" />
          Проверить
        </Button>
      ) : (
        <Badge variant="outline" className="text-xs">
          Проверено
        </Badge>
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
