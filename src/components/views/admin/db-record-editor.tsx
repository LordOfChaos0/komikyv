"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Save, Loader2, Trash2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// Редактор записи БД: панель справа с формой по типам полей.
// Используется и для создания, и для изменения записей.
// ============================================================

export interface DbField {
  name: string;
  type: string;
  isId: boolean;
  isRequired: boolean;
  hasDefault: boolean;
  isUpdatedAt: boolean;
  isSensitive: boolean;
  isJson: boolean;
  relationTo?: string;
}

export interface DbModelInfo {
  name: string;
  label: string;
  group: string;
  description: string;
  readOnly: boolean;
  softDelete: boolean;
  listColumns: string[];
  pkFieldNames: string[];
  count: number;
  fields: DbField[];
}

// Известные перечисления (в схеме хранятся как String с комментарием)
const ENUM_OPTIONS: Record<string, string[]> = {
  role: ["student", "teacher", "admin"],
  level: ["beginner", "intermediate", "advanced"],
  "Module.status": ["draft", "on_moderation", "published", "rejected", "archived"],
  "DialogSession.status": ["active", "finished", "abandoned"],
  "Exercise.type": ["translation", "choice", "matching", "fill_blank", "audio", "order"],
  "Notification.type": ["achievement", "streak", "level_up", "lesson_completed", "dialog_completed", "system", "welcome"],
};

// Поля-перечисления: общий предикат
function enumOptions(model: string, field: string): string[] | null {
  return ENUM_OPTIONS[`${model}.${field}`] || ENUM_OPTIONS[field] || null;
}

// Длинные текстовые поля — textarea
const LONG_FIELDS = new Set([
  "description", "theoryContent", "message", "question", "questionRu",
  "correctAnswer", "hint", "explanation", "comment", "note", "rejectionComment",
  "oldValuesJson", "newValuesJson", "userAgent", "transcription", "translationRu",
]);

const BOOL_DEFAULTS: Record<string, boolean> = { isActive: true, isCompleted: false, isRead: false, totpEnabled: false };

function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
  model: DbModelInfo;
  record: any | null; // null — создание новой записи
  onClose: () => void;
  onSaved: () => void;
}

export function DbRecordEditor({ model, record, onClose, onSaved }: Props) {
  const isNew = record === null;
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState(""); // только для создания User
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const editable = useMemo(
    () => model.fields.filter((f) => !f.isUpdatedAt && !(f.isSensitive && !isNew ? true : false)),
    [model, isNew]
  );

  // Начальные значения формы
  const [form, setForm] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const f of model.fields) {
      if (f.isUpdatedAt) continue;
      const v = record?.[f.name];
      if (f.type === "DateTime") init[f.name] = isoToLocal(v);
      else if (f.type === "Boolean") init[f.name] = isNew ? (BOOL_DEFAULTS[f.name] ?? false) : !!v;
      else init[f.name] = v === null || v === undefined ? "" : String(v);
    }
    return init;
  });

  const setField = (name: string, value: any) => setForm((f) => ({ ...f, [name]: value }));

  // Клиентская валидация JSON-полей
  const jsonErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const f of model.fields) {
      if (f.isJson && typeof form[f.name] === "string" && form[f.name].trim() !== "") {
        try {
          JSON.parse(form[f.name]);
        } catch {
          errs[f.name] = "Некорректный JSON";
        }
      }
    }
    return errs;
  }, [form, model]);

  const buildPayload = () => {
    const payload: Record<string, any> = {};
    for (const f of model.fields) {
      if (f.isUpdatedAt || f.isSensitive) continue;
      if (f.isId && !isNew) continue;
      const v = form[f.name];
      if (f.type === "DateTime") {
        payload[f.name] = localToIso(v);
      } else if (f.type === "Boolean") {
        payload[f.name] = !!v;
      } else if (f.type === "Int" || f.type === "Float") {
        payload[f.name] = v === "" || v === null ? null : Number(v);
      } else {
        payload[f.name] = v === "" ? null : v;
      }
    }
    if (isNew && model.name === "User" && newPassword) {
      payload.password = newPassword;
    }
    return payload;
  };

  const save = async () => {
    if (Object.keys(jsonErrors).length > 0) {
      toast.error("Исправьте ошибки JSON перед сохранением");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const url = isNew
        ? `/api/admin/db/${model.name}`
        : `/api/admin/db/${model.name}/${encodeURIComponent(record.recordKey)}`;
      const data = await apiFetch<{ record: any; generatedPassword?: string | null }>(url, {
        method: isNew ? "POST" : "PUT",
        json: payload,
      });
      if (isNew && data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        toast.success(isNew ? "Запись создана" : "Изменения сохранены");
        onSaved();
        onClose();
      }
      onSaved();
    } catch (e: any) {
      const details = e.data?.details;
      toast.error(e.message + (Array.isArray(details) ? `: ${details.join("; ")}` : ""));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await apiFetch(
        `/api/admin/db/${model.name}/${encodeURIComponent(record.recordKey)}${hardDelete ? "?hard=1" : ""}`,
        { method: "DELETE" }
      );
      toast.success(hardDelete ? "Запись удалена безвозвратно" : "Запись помечена как удалённая");
      setDeleteOpen(false);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const copyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success("Пароль скопирован");
    } catch {
      toast.error("Скопируйте пароль вручную");
    }
  };

  return (
    <>
      <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b border-border sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2 text-lg">
              {isNew ? `Новая запись — ${model.label}` : `Запись — ${model.label}`}
              {model.readOnly && <Badge variant="secondary">только чтение</Badge>}
            </SheetTitle>
            <SheetDescription>
              {isNew
                ? "Заполните поля и сохраните. Обязательные поля отмечены *"
                : `${model.pkFieldNames.join(" + ")}: ${record?.recordKey}`}
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-4">
            {model.fields.map((f) => {
              const opts = enumOptions(model.name, f.name);
              const isPkDisplay = f.isId && !isNew;
              const canEdit = !f.isUpdatedAt && !isPkDisplay && !(f.isSensitive && !isNew) && !model.readOnly;
              const fieldLabel = (
                <Label className="flex items-center gap-1.5 text-sm">
                  {f.name}
                  {f.isRequired && <span className="text-destructive">*</span>}
                  {f.isId && <Badge variant="outline" className="text-[10px] px-1 py-0">PK</Badge>}
                  {f.relationTo && <Badge variant="outline" className="text-[10px] px-1 py-0">FK → {f.relationTo}</Badge>}
                  {f.isSensitive && <Badge variant="outline" className="text-[10px] px-1 py-0">секрет</Badge>}
                  <span className="text-[10px] text-muted-foreground font-normal">{f.type}</span>
                </Label>
              );

              let control: React.ReactNode;
              if (f.isSensitive && !isNew) {
                control = <Input value="••••••••" disabled className="font-mono" />;
              } else if (isPkDisplay || f.isUpdatedAt) {
                control = (
                  <Input
                    value={f.isUpdatedAt ? (record?.[f.name] ? new Date(record[f.name]).toLocaleString("ru-RU") : "—") : String(record?.[f.name] ?? "")}
                    disabled
                    className="font-mono text-xs"
                  />
                );
              } else if (f.type === "Boolean") {
                control = (
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={!!form[f.name]} onCheckedChange={(v) => setField(f.name, v)} />
                    <span className="text-sm text-muted-foreground">{form[f.name] ? "да" : "нет"}</span>
                  </div>
                );
              } else if (f.type === "DateTime") {
                control = (
                  <Input
                    type="datetime-local"
                    value={form[f.name] || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                  />
                );
              } else if (f.type === "Int" || f.type === "Float") {
                control = (
                  <Input
                    type="number"
                    step={f.type === "Float" ? "any" : "1"}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    placeholder={f.isRequired ? "" : "пусто"}
                  />
                );
              } else if (opts && canEdit) {
                control = (
                  <Select value={form[f.name] || undefined} onValueChange={(v) => setField(f.name, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите значение" />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              } else if (f.isJson || LONG_FIELDS.has(f.name)) {
                control = (
                  <Textarea
                    value={form[f.name] ?? ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className={f.isJson ? "font-mono text-xs" : ""}
                    rows={f.isJson ? 6 : 3}
                    placeholder={f.isJson ? '{ "key": "value" }' : ""}
                  />
                );
              } else {
                control = (
                  <Input
                    value={form[f.name] ?? ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    placeholder={f.isRequired ? "" : "пусто"}
                    className={f.relationTo ? "font-mono text-xs" : ""}
                  />
                );
              }

              return (
                <div key={f.name} className="space-y-1.5">
                  {fieldLabel}
                  {control}
                  {jsonErrors[f.name] && (
                    <p className="text-xs text-destructive">{jsonErrors[f.name]}</p>
                  )}
                </div>
              );
            })}

            {/* Пароль при создании пользователя */}
            {isNew && model.name === "User" && (
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border">
                <Label className="flex items-center gap-1.5 text-sm">
                  <KeyRound className="h-3.5 w-3.5" /> Пароль пользователя
                </Label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Оставьте пустым — будет сгенерирован и показан один раз"
                />
                <p className="text-xs text-muted-foreground">
                  Минимум 8 символов. Сгенерированный пароль отображается только после создания.
                </p>
              </div>
            )}
          </div>

          {!model.readOnly && (
            <div className="p-4 border-t border-border sticky bottom-0 bg-background flex gap-2">
              <Button onClick={save} disabled={saving || Object.keys(jsonErrors).length > 0} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {isNew ? "Создать" : "Сохранить"}
              </Button>
              {!isNew && (
                <Button
                  variant="destructive"
                  onClick={() => { setHardDelete(false); setDeleteOpen(true); }}
                  title={model.softDelete ? "Удалить запись" : "Удалить безвозвратно"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Подтверждение удаления */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  {model.softDelete && !hardDelete
                    ? "Запись будет помечена как удалённая (мягкое удаление, deletedAt). Её можно восстановить, очистив поле deletedAt."
                    : "ВНИМАНИЕ: запись будет удалена из базы безвозвратно. Это действие нельзя отменить."}
                </p>
                {model.softDelete && (
                  <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardDelete}
                      onChange={(e) => setHardDelete(e.target.checked)}
                      className="accent-destructive"
                    />
                    Удалить физически (без возможности восстановления)
                  </label>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); remove(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : hardDelete ? "Удалить навсегда" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Показ сгенерированного пароля (создание User) */}
      <Dialog open={!!generatedPassword} onOpenChange={(o) => { if (!o) { setGeneratedPassword(null); onSaved(); onClose(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Пользователь создан</DialogTitle>
            <DialogDescription>
              Пароль сгенерирован автоматически и показан только один раз — передайте его пользователю.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 rounded-lg bg-muted font-mono font-bold tracking-wider break-all select-all">
              {generatedPassword}
            </code>
            <Button size="icon" variant="outline" onClick={copyPassword}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => { setGeneratedPassword(null); onSaved(); onClose(); }}>
            Готово
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
