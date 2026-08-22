"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Library,
  FileQuestion,
  Send,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export function TeacherModuleEditView() {
  const { params, navigate } = useNav();
  const moduleId = params.moduleId as string;
  const queryClient = useQueryClient();

  const { data: module } = useQuery({
    queryKey: ["teacher-module", moduleId],
    queryFn: () => apiFetch<any>(`/api/modules/${moduleId}`),
    enabled: !!moduleId,
  });

  const { data: lessons } = useQuery({
    queryKey: ["teacher-lessons", moduleId],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/teacher/modules/${moduleId}/lessons`),
    enabled: !!moduleId,
  });

  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", theoryContent: "", passingScore: 70 });

  const createLessonMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>(`/api/teacher/modules/${moduleId}/lessons`, { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-module", moduleId] });
      toast.success("Урок создан");
      setCreateLessonOpen(false);
      setLessonForm({ title: "", theoryContent: "", passingScore: 70 });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/teacher/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons", moduleId] });
      toast.success("Урок удалён");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/teacher/modules/${moduleId}`, { method: "PUT", json: { status: "on_moderation" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-module", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-modules"] });
      toast.success("Отправлено на модерацию");
    },
  });

  if (!module) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("teacher-modules")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        К моим модулям
      </Button>

      {/* Module info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {module.title}
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">{module.level}</Badge>
            <span>{module.estimatedMin} мин</span>
            <Badge variant="secondary">
              {module.status === "published" ? "Опубликован" :
               module.status === "on_moderation" ? "На модерации" :
               module.status === "rejected" ? "Отклонён" : "Черновик"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{module.description}</p>
          {module.rejectionComment && (
            <div className="mt-3 text-sm bg-chart-3/5 text-chart-3 p-3 rounded border border-chart-3/20">
              <strong>Комментарий модератора:</strong> {module.rejectionComment}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lessons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Уроки ({lessons?.items.length || 0})
          </h2>
          <Dialog open={createLessonOpen} onOpenChange={setCreateLessonOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Добавить урок
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый урок</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Название урока *</Label>
                  <Input
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="Например: Животные тайги"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Теоретический материал</Label>
                  <Textarea
                    value={lessonForm.theoryContent}
                    onChange={(e) => setLessonForm({ ...lessonForm, theoryContent: e.target.value })}
                    placeholder="Грамматика, правила, примеры..."
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Проходной балл (%)</Label>
                  <Input
                    type="number"
                    value={lessonForm.passingScore}
                    onChange={(e) => setLessonForm({ ...lessonForm, passingScore: parseInt(e.target.value) || 70 })}
                    min={0}
                    max={100}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createLessonMutation.mutate(lessonForm)}
                  disabled={!lessonForm.title || createLessonMutation.isPending}
                >
                  {createLessonMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать урок"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {lessons?.items.map((lesson, i) => (
            <LessonEditor
              key={lesson.id}
              lesson={lesson}
              index={i}
              moduleId={moduleId}
              onDelete={() => {
                if (confirm(`Удалить урок «${lesson.title}»?`)) deleteLessonMutation.mutate(lesson.id);
              }}
              onUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["teacher-lessons", moduleId] });
              }}
            />
          ))}
          {(!lessons || lessons.items.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>В модуле пока нет уроков</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
        {module.status === "draft" && (
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !lessons?.items.length}
          >
            <Send className="h-4 w-4 mr-1" />
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить на модерацию"}
          </Button>
        )}
      </div>
    </div>
  );
}

function LessonEditor({ lesson, index, moduleId, onDelete, onUpdated }: any) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"theory" | "vocabulary" | "exercises">("theory");
  const queryClient = useQueryClient();

  const { data: vocabulary } = useQuery({
    queryKey: ["teacher-vocab", lesson.id],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/teacher/lessons/${lesson.id}/vocabulary`),
    enabled: expanded,
  });
  const { data: exercises } = useQuery({
    queryKey: ["teacher-exercises", lesson.id],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/teacher/lessons/${lesson.id}/exercises`),
    enabled: expanded,
  });

  const [vocabForm, setVocabForm] = useState({ wordKomi: "", translationRu: "", transcription: "", partOfSpeech: "noun" });
  const [exForm, setExForm] = useState({
    type: "translation" as string,
    question: "",
    correctAnswer: "",
    optionsJson: "[]",
    hint: "",
    questionRu: "",
  });

  const addVocabMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/api/teacher/lessons/${lesson.id}/vocabulary`, { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-vocab", lesson.id] });
      toast.success("Слово добавлено");
      setVocabForm({ wordKomi: "", translationRu: "", transcription: "", partOfSpeech: "noun" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteVocabMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/teacher/vocabulary/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-vocab", lesson.id] });
      toast.success("Слово удалено");
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/api/teacher/lessons/${lesson.id}/exercises`, { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exercises", lesson.id] });
      toast.success("Упражнение добавлено");
      setExForm({ type: "translation", question: "", correctAnswer: "", optionsJson: "[]", hint: "", questionRu: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/teacher/exercises/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exercises", lesson.id] });
      toast.success("Упражнение удалено");
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {index + 1}
            </div>
            <div>
              <div className="font-medium">{lesson.title}</div>
              <div className="text-xs text-muted-foreground">
                Проходной балл: {lesson.passingScore}% · {lesson.exercisesCount || 0} упр. · {lesson.vocabularyCount || 0} слов
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/5">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Свернуть" : "Открыть"}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {[
                { id: "theory", label: "Теория", icon: BookOpen },
                { id: "vocabulary", label: "Словарь", icon: Library },
                { id: "exercises", label: "Упражнения", icon: FileQuestion },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                    tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "theory" && (
              <div className="space-y-2">
                <Label>Теоретический материал</Label>
                <Textarea
                  defaultValue={lesson.theoryContent}
                  rows={8}
                  placeholder="Введите теорию, грамматику, правила..."
                  onBlur={async (e) => {
                    if (e.target.value !== lesson.theoryContent) {
                      try {
                        await apiFetch(`/api/teacher/lessons/${lesson.id}`, {
                          method: "PUT",
                          json: { theoryContent: e.target.value },
                        });
                        toast.success("Сохранено");
                        onUpdated();
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }
                  }}
                />
              </div>
            )}

            {tab === "vocabulary" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Input
                    placeholder="Слово (коми)"
                    value={vocabForm.wordKomi}
                    onChange={(e) => setVocabForm({ ...vocabForm, wordKomi: e.target.value })}
                  />
                  <Input
                    placeholder="Перевод (рус)"
                    value={vocabForm.translationRu}
                    onChange={(e) => setVocabForm({ ...vocabForm, translationRu: e.target.value })}
                  />
                  <Input
                    placeholder="Транскрипция"
                    value={vocabForm.transcription}
                    onChange={(e) => setVocabForm({ ...vocabForm, transcription: e.target.value })}
                  />
                  <div className="flex gap-1">
                    <Select value={vocabForm.partOfSpeech} onValueChange={(v) => setVocabForm({ ...vocabForm, partOfSpeech: v })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="noun">сущ.</SelectItem>
                        <SelectItem value="verb">гл.</SelectItem>
                        <SelectItem value="adj">прил.</SelectItem>
                        <SelectItem value="phrase">фраза</SelectItem>
                        <SelectItem value="pronoun">мест.</SelectItem>
                        <SelectItem value="num">числ.</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      onClick={() => addVocabMutation.mutate(vocabForm)}
                      disabled={!vocabForm.wordKomi || !vocabForm.translationRu || addVocabMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
                  {vocabulary?.items.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm">
                      <div className="font-medium text-primary flex-1">{v.wordKomi}</div>
                      <div className="flex-1 text-muted-foreground">{v.translationRu}</div>
                      {v.transcription && <div className="text-xs text-muted-foreground">[{v.transcription}]</div>}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/5"
                        onClick={() => deleteVocabMutation.mutate(v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {vocabulary?.items.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Слов пока нет
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "exercises" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Select value={exForm.type} onValueChange={(v) => setExForm({ ...exForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="translation">Перевод</SelectItem>
                      <SelectItem value="choice">Выбор ответа</SelectItem>
                      <SelectItem value="fill_blank">Заполнить пропуск</SelectItem>
                      <SelectItem value="audio">Аудио</SelectItem>
                      <SelectItem value="matching">Сопоставление</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Вопрос (RU)"
                    value={exForm.questionRu}
                    onChange={(e) => setExForm({ ...exForm, questionRu: e.target.value })}
                  />
                  <Input
                    placeholder="Вопрос (EN/коми)"
                    value={exForm.question}
                    onChange={(e) => setExForm({ ...exForm, question: e.target.value })}
                  />
                  {exForm.type === "choice" && (
                    <Input
                      placeholder='Варианты через запятую: "Вариант 1, Вариант 2, Вариант 3"'
                      value={exForm.optionsJson === "[]" ? "" : exForm.optionsJson}
                      onChange={(e) => setExForm({ ...exForm, optionsJson: JSON.stringify(e.target.value.split(",").map((s) => s.trim()).filter(Boolean)) })}
                    />
                  )}
                  <Input
                    placeholder="Правильный ответ"
                    value={exForm.correctAnswer}
                    onChange={(e) => setExForm({ ...exForm, correctAnswer: e.target.value })}
                  />
                  <Input
                    placeholder="Подсказка (опц.)"
                    value={exForm.hint}
                    onChange={(e) => setExForm({ ...exForm, hint: e.target.value })}
                  />
                  <Button
                    size="sm"
                    onClick={() => addExerciseMutation.mutate(exForm)}
                    disabled={!exForm.question || !exForm.correctAnswer || addExerciseMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить упражнение
                  </Button>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
                  {exercises?.items.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm">
                      <Badge variant="outline" className="text-xs">{ex.type}</Badge>
                      <div className="flex-1 truncate">{ex.questionRu || ex.question}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/5"
                        onClick={() => deleteExerciseMutation.mutate(ex.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {exercises?.items.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Упражнений пока нет
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
