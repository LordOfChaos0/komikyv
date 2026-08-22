"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  FileText,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function TeacherModulesView() {
  const { navigate } = useNav();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    coverColor: "emerald",
    estimatedMin: 30,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-modules", filter],
    queryFn: () =>
      apiFetch<{ items: any[] }>("/api/teacher/modules" + (filter !== "all" ? `?status=${filter}` : "")),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/api/teacher/modules", { method: "POST", json: data }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-modules"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Модуль создан");
      setCreateOpen(false);
      setCreateForm({ title: "", description: "", level: "beginner", coverColor: "emerald", estimatedMin: 30 });
      navigate("teacher-module-edit", { moduleId: data.module.id });
    },
    onError: (e: any) => toast.error(e.message || "Ошибка создания"),
  });

  const submitForModerationMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/teacher/modules/${id}`, { method: "PUT", json: { status: "on_moderation" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-modules"] });
      toast.success("Отправлено на модерацию");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/teacher/modules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-modules"] });
      toast.success("Модуль удалён");
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Мои модули
          </h1>
          <p className="text-muted-foreground mt-1">
            Создавайте и редактируйте учебные модули
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Создать модуль
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый учебный модуль</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Например: Животные тайги"
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Краткое описание модуля"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Уровень</Label>
                  <Select value={createForm.level} onValueChange={(v) => setCreateForm({ ...createForm, level: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Начальный</SelectItem>
                      <SelectItem value="intermediate">Средний</SelectItem>
                      <SelectItem value="advanced">Продвинутый</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Время (мин)</Label>
                  <Input
                    type="number"
                    value={createForm.estimatedMin}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedMin: parseInt(e.target.value) || 30 })}
                    min={5}
                    max={600}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Цвет обложки</Label>
                <Select value={createForm.coverColor} onValueChange={(v) => setCreateForm({ ...createForm, coverColor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amber">Янтарный</SelectItem>
                    <SelectItem value="rose">Розовый</SelectItem>
                    <SelectItem value="emerald">Изумрудный</SelectItem>
                    <SelectItem value="orange">Оранжевый</SelectItem>
                    <SelectItem value="sky">Голубой</SelectItem>
                    <SelectItem value="violet">Фиолетовый</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(createForm)}
                disabled={!createForm.title || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать модуль"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: "all", label: "Все" },
          { id: "draft", label: "Черновики" },
          { id: "on_moderation", label: "На модерации" },
          { id: "published", label: "Опубликованные" },
          { id: "rejected", label: "Отклонённые" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Modules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate("teacher-module-edit", { moduleId: m.id })}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{m.title}</h3>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {m.description || "Без описания"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {m.lessonsCount} уроков
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {m.estimatedMin} мин
                      </span>
                      {m.rejectionComment && (
                        <span className="flex items-center gap-1 text-chart-3">
                          <AlertCircle className="h-3 w-3" />
                          Есть комментарий модератора
                        </span>
                      )}
                    </div>
                    {m.rejectionComment && (
                      <div className="mt-2 text-xs bg-chart-3/5 text-chart-3 p-2 rounded border border-chart-3/20">
                        {m.rejectionComment}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => navigate("teacher-module-edit", { moduleId: m.id })}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Редактировать
                    </Button>
                    {m.status === "draft" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => submitForModerationMutation.mutate(m.id)}
                        disabled={submitForModerationMutation.isPending}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        На модерацию
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/5"
                      onClick={() => {
                        if (confirm(`Удалить модуль «${m.title}»?`)) deleteMutation.mutate(m.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>У вас пока нет модулей</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Создать первый модуль
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Черновик", className: "bg-muted text-muted-foreground" },
    on_moderation: { label: "На модерации", className: "bg-chart-2/15 text-chart-2" },
    published: { label: "Опубликован", className: "bg-chart-1/15 text-chart-1" },
    rejected: { label: "Отклонён", className: "bg-chart-3/15 text-chart-3" },
    archived: { label: "Архив", className: "bg-muted text-muted-foreground" },
  };
  const s = map[status] || map.draft;
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
}
