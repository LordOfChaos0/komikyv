"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Volume2,
  Target,
  Eye,
  Ear,
  Mail,
  Flame,
  Loader2,
  Check,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface Settings {
  theme: "light" | "dark";
  ttsVoice: string;
  ttsSpeed: number;
  dailyGoalXp: number;
  showTranscription: boolean;
  showTranslationHint: boolean;
  autoPlayTts: boolean;
  preferredLevel: string;
  emailNotifications: boolean;
  streakReminder: boolean;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  ttsVoice: "tongtong",
  ttsSpeed: 1.0,
  dailyGoalXp: 50,
  showTranscription: true,
  showTranslationHint: true,
  autoPlayTts: true,
  preferredLevel: "beginner",
  emailNotifications: true,
  streakReminder: true,
  reducedMotion: false,
};

const VOICES = [
  { id: "tongtong", label: "Тонгтонг (по умолчанию)" },
  { id: "chuichui", label: "Чуичуй (детский)" },
  { id: "xiaochen", label: "Сяочэнь (спокойный)" },
  { id: "jam", label: "Джам (британский)" },
  { id: "kazi", label: "Кази (стандартный)" },
  { id: "douji", label: "Дуджи (естественный)" },
  { id: "luodo", label: "Луодо (выразительный)" },
];

export function SettingsView() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [testPlaying, setTestPlaying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ settings: Settings }>("/api/settings"),
  });

  // Merge with defaults — derived state, no setState-in-effect
  const local: Settings = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };

  // Sync theme on mount only (single useEffect with stable deps)
  useEffect(() => {
    if (local.theme === "dark" && theme !== "dark") setTheme("dark");
    if (local.theme === "light" && theme !== "light") setTheme("light");
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (changes: Partial<Settings>) =>
      apiFetch("/api/settings", { method: "PUT", json: changes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const update = (changes: Partial<Settings>) => {
    updateMutation.mutate(changes);
  };

  const toggleTheme = () => {
    const newTheme = local.theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    update({ theme: newTheme });
  };

  const testVoice = async () => {
    setTestPlaying(true);
    try {
      const data = await apiFetch<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text: "Бур лун, ме тӧда коми кыв.", voice: local.ttsVoice, speed: local.ttsSpeed },
      });
      const audio = new Audio(data.audio);
      audio.onended = () => setTestPlaying(false);
      audio.play();
      toast.success("Тестовое аудио воспроизводится");
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
      setTestPlaying(false);
    }
  };

  const resetSettings = () => {
    setTheme(DEFAULT_SETTINGS.theme);
    updateMutation.mutate(DEFAULT_SETTINGS);
    toast.success("Настройки сброшены");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          Настройки
        </h1>
        <p className="text-muted-foreground mt-1">
          Персонализируйте платформу под свой стиль обучения
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5 text-chart-2" />
            Внешний вид
          </CardTitle>
          <CardDescription>Тема и визуальные настройки</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              {local.theme === "light" ? <Sun className="h-5 w-5 text-chart-2" /> : <Moon className="h-5 w-5 text-primary" />}
              <div>
                <div className="font-medium text-sm">Тема оформления</div>
                <div className="text-xs text-muted-foreground">
                  {local.theme === "light" ? "Светлая тема" : "Тёмная тема"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={local.theme === "light" ? "default" : "outline"}
                onClick={() => { setTheme("light"); update({ theme: "light" }); }}
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={local.theme === "dark" ? "default" : "outline"}
                onClick={() => { setTheme("dark"); update({ theme: "dark" }); }}
              >
                <Moon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ToggleRow
            icon={RotateCcw}
            label="Уменьшить анимации"
            description="Снизить движение для пользователей с вестибулярными расстройствами"
            checked={local.reducedMotion}
            onCheckedChange={(v) => update({ reducedMotion: v })}
          />
        </CardContent>
      </Card>

      {/* Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-chart-1" />
            Произношение и звук
          </CardTitle>
          <CardDescription>Настройки синтеза речи (TTS)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Голос</Label>
            <Select
              value={local.ttsVoice}
              onValueChange={(v) => update({ ttsVoice: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Скорость речи</Label>
              <Badge variant="outline">{local.ttsSpeed.toFixed(1)}x</Badge>
            </div>
            <Slider
              value={[local.ttsSpeed]}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={(v) => update({ ttsSpeed: v[0] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Медленно (0.5x)</span>
              <span>Норма (1.0x)</span>
              <span>Быстро (2.0x)</span>
            </div>
          </div>

          <Button onClick={testVoice} disabled={testPlaying} variant="outline" className="w-full">
            {testPlaying ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Воспроизведение...</>
            ) : (
              <><Volume2 className="h-4 w-4 mr-2" /> Проверить голос</>
            )}
          </Button>

          <ToggleRow
            icon={Ear}
            label="Автовоспроизведение TTS"
            description="Автоматически озвучивать слова при открытии"
            checked={local.autoPlayTts}
            onCheckedChange={(v) => update({ autoPlayTts: v })}
          />
        </CardContent>
      </Card>

      {/* Learning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-chart-3" />
            Цели обучения
          </CardTitle>
          <CardDescription>Дневная цель XP и предпочтительный уровень</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Дневная цель XP</Label>
              <Badge variant="outline">{local.dailyGoalXp} XP/день</Badge>
            </div>
            <Slider
              value={[local.dailyGoalXp]}
              min={10}
              max={500}
              step={10}
              onValueChange={(v) => update({ dailyGoalXp: v[0] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Лёгкая (10)</span>
              <span>Средняя (50)</span>
              <span>Сложная (500)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Предпочтительный уровень</Label>
            <Select
              value={local.preferredLevel}
              onValueChange={(v) => update({ preferredLevel: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Начальный</SelectItem>
                <SelectItem value="intermediate">Средний</SelectItem>
                <SelectItem value="advanced">Продвинутый</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-chart-4" />
            Отображение
          </CardTitle>
          <CardDescription>Что показывать на карточках и в уроках</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Eye}
            label="Показывать транскрипцию"
            description="Отображать [транскрипцию] под коми словами"
            checked={local.showTranscription}
            onCheckedChange={(v) => update({ showTranscription: v })}
          />
          <ToggleRow
            icon={Eye}
            label="Подсказки с переводом"
            description="Показывать переводы в подсказках к упражнениям"
            checked={local.showTranslationHint}
            onCheckedChange={(v) => update({ showTranslationHint: v })}
          />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-chart-5" />
            Уведомления
          </CardTitle>
          <CardDescription>Что присылать и напоминать</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Mail}
            label="Email-уведомления"
            description="Получать уведомления о достижениях на почту"
            checked={local.emailNotifications}
            onCheckedChange={(v) => update({ emailNotifications: v })}
          />
          <ToggleRow
            icon={Flame}
            label="Напоминания о серии"
            description="Напоминать о необходимости поддержать серию"
            checked={local.streakReminder}
            onCheckedChange={(v) => update({ streakReminder: v })}
          />
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={resetSettings}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Сбросить настройки
        </Button>
        {updateMutation.isPending ? (
          <Badge variant="outline">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Сохранение...
          </Badge>
        ) : (
          <Badge variant="outline" className="text-chart-1">
            <Check className="h-3 w-3 mr-1" /> Автосохранение включено
          </Badge>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
