"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Database, Search, Plus, Pencil, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, ShieldAlert, KeyRound, Eye, EyeOff,
} from "lucide-react";
import { useNav } from "@/lib/nav-store";
import { DbRecordEditor, DbModelInfo } from "./db-record-editor";

// ============================================================
// Редактор базы данных: полный CRUD по всем таблицам сервиса.
// Доступен только администраторам с включённой 2FA
// (иначе API возвращает код TWOFA_SETUP_REQUIRED/TWOFA_REQUIRED).
// ============================================================

function formatCell(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "string") {
    // Даты в ISO — показываем кратко
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 16).replace("T", " ");
    }
    return value.length > 60 ? value.slice(0, 57) + "…" : value;
  }
  return String(value);
}

export function AdminDbView() {
  const queryClient = useQueryClient();
  const { navigate } = useNav();

  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("20");
  const [deleted, setDeleted] = useState("hide");
  const [sort, setSort] = useState("");
  const [editor, setEditor] = useState<{ record: any | null } | null>(null);

  // Реестр моделей (он же — проверка 2FA-доступа)
  const modelsQuery = useQuery({
    queryKey: ["admin-db-models"],
    queryFn: () => apiFetch<{ models: DbModelInfo[] }>("/api/admin/db"),
    retry: false,
  });

  const models = modelsQuery.data?.models || [];
  const current = useMemo(() => models.find((m) => m.name === selected) || null, [models, selected]);

  // Если API отклонил запрос — показываем причину (2FA)
  const guardError = modelsQuery.error ? ((modelsQuery.error as any).data?.code as string) : null;
  const guardMessage =
    guardError === "TWOFA_SETUP_REQUIRED"
      ? "Для работы с базой данных требуется двухфакторная аутентификация. Включите её в настройках (раздел «Безопасность»), затем вернитесь сюда."
      : guardError === "TWOFA_REQUIRED"
        ? "Двухфакторная аутентификация включена, но текущая сессия входила без кода. Выйдите из системы и войдите снова с кодом аутентификатора."
        : null;

  const listParams = new URLSearchParams({
    page: String(page),
    pageSize,
  });
  if (q) listParams.set("q", q);
  if (deleted !== "hide") listParams.set("deleted", deleted);
  if (sort) listParams.set("sort", sort);

  const recordsQuery = useQuery({
    queryKey: ["admin-db-records", selected, listParams.toString()],
    queryFn: () => apiFetch<any>(`/api/admin/db/${selected}?${listParams.toString()}`),
    enabled: !!selected && modelsQuery.isSuccess,
    retry: false,
  });

  const selectModel = (name: string) => {
    setSelected(name);
    setPage(1);
    setQ("");
    setSort("");
    setDeleted("hide");
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-db-models"] });
    queryClient.invalidateQueries({ queryKey: ["admin-db-records"] });
  };

  // Группировка моделей для сайдбара
  const groups = useMemo(() => {
    const map = new Map<string, DbModelInfo[]>();
    for (const m of models) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return Array.from(map.entries());
  }, [models]);

  if (modelsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2FA-гейт или ошибка доступа
  if (guardMessage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ShieldAlert className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Доступ к базе данных защищён</h1>
            <p className="text-muted-foreground max-w-md mx-auto">{guardMessage}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("settings")}>
                <KeyRound className="h-4 w-4 mr-1" /> Настроить 2FA
              </Button>
              <Button variant="outline" onClick={() => modelsQuery.refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Проверить снова
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (modelsQuery.isError && !guardMessage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-muted-foreground">
              {(modelsQuery.error as any)?.message || "Не удалось загрузить список моделей"}
            </p>
            <Button variant="outline" onClick={() => modelsQuery.refetch()}>Повторить</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const records = recordsQuery.data?.items || [];
  const total = recordsQuery.data?.total || 0;
  const totalPages = recordsQuery.data?.totalPages || 1;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Database className="h-7 w-7 text-primary" />
          База данных
          <Badge variant="secondary">{models.length} таблиц</Badge>
          <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
            <KeyRound className="h-3 w-3" /> 2FA активна
          </Badge>
        </h1>
        <p className="text-muted-foreground mt-1">
          Просмотр и редактирование записей. Все операции фиксируются в журнале аудита
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Сайдбар: список моделей по группам */}
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <ScrollArea className="h-[calc(100vh-220px)] min-h-[300px]">
            <div className="p-2">
              {groups.map(([group, items]) => (
                <div key={group} className="mb-3">
                  <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  {items.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => selectModel(m.name)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                        selected === m.name
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{m.label}</span>
                      <span className={`text-xs shrink-0 ${selected === m.name ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {m.count}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Таблица записей */}
        <div className="space-y-4 min-w-0">
          {!current ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Выберите таблицу слева для просмотра и редактирования записей</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Панель инструментов */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Поиск по текстовым полям..."
                    className="pl-9"
                  />
                </div>
                <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "20", "50", "100"].map((n) => (
                      <SelectItem key={n} value={n}>{n} / стр.</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {current.softDelete && (
                  <Select value={deleted} onValueChange={(v) => { setDeleted(v); setPage(1); }}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hide"><span className="flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5" /> Активные</span></SelectItem>
                      <SelectItem value="only"><span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Удалённые</span></SelectItem>
                      <SelectItem value="all">Все записи</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="icon" onClick={refresh} title="Обновить">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {!current.readOnly && (
                  <Button onClick={() => setEditor({ record: null })}>
                    <Plus className="h-4 w-4 mr-1" /> Создать
                  </Button>
                )}
              </div>

              {/* Таблица */}
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {current.listColumns.map((col) => (
                          <TableHead
                            key={col}
                            className="cursor-pointer select-none whitespace-nowrap"
                            onClick={() => setSort(sort === col ? "" : col)}
                            title={sort === col ? "Сортировка активна — нажмите, чтобы сбросить" : "Сортировать по полю"}
                          >
                            {col}
                            {sort === col && " ▾"}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordsQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={current.listColumns.length + 1} className="text-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={current.listColumns.length + 1} className="text-center py-10 text-muted-foreground">
                            Записей не найдено
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((r: any) => (
                          <TableRow
                            key={r.recordKey}
                            className={`cursor-pointer ${r.deletedAt ? "opacity-50" : ""}`}
                            onClick={() => setEditor({ record: r })}
                          >
                            {current.listColumns.map((col) => (
                              <TableCell key={col} className="whitespace-nowrap max-w-[260px] truncate">
                                {typeof r[col] === "boolean" ? (
                                  <Badge variant={r[col] ? "default" : "secondary"} className="text-[10px]">
                                    {r[col] ? "да" : "нет"}
                                  </Badge>
                                ) : (
                                  <span className={r[col] === null || r[col] === undefined ? "text-muted-foreground" : ""}>
                                    {formatCell(r[col])}
                                  </span>
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon" variant="ghost"
                                  onClick={() => setEditor({ record: r })}
                                  title={current.readOnly ? "Просмотр записи" : "Редактировать запись"}
                                >
                                  {current.readOnly ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Пагинация */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {total > 0 ? `Страница ${page} из ${totalPages} · записей: ${total}` : ""}
                </p>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" disabled={page <= 1 || recordsQuery.isLoading} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" disabled={page >= totalPages || recordsQuery.isLoading} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Редактор записи */}
      {editor && current && (
        <DbRecordEditor
          model={current}
          record={editor.record}
          onClose={() => setEditor(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-db-records"] });
            queryClient.invalidateQueries({ queryKey: ["admin-db-models"] });
          }}
        />
      )}
    </div>
  );
}
