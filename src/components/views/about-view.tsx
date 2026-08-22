"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Scale,
  FileText,
  Bot,
  Mic,
  BookOpen,
  Trophy,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

export function AboutView() {
  const { navigate } = useNav();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/95 to-chart-3 text-primary-foreground">
        <div className="absolute inset-0 komi-ornament opacity-30 pointer-events-none" />
        <CardContent className="relative p-8 sm:p-12">
          <Badge className="bg-white/15 text-white border-white/20 mb-4">
            О платформе
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Коми кыв</h1>
          <p className="text-primary-foreground/90 text-lg max-w-2xl">
            Интерактивная веб-платформа для изучения коми языка с интеграцией
            нейросетевых моделей синтеза речи и диалоговых тренажёров.
            Создана для сохранения и популяризации языка народа коми.
          </p>
        </CardContent>
      </Card>

      {/* Mission */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Наша миссия</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <Bot className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Сохранение языка</h3>
              <p className="text-sm text-muted-foreground">
                Коми язык — один из коренных языков Российской Федерации.
                Современные образовательные технологии помогают сделать его изучение
                доступным широкой аудитории.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <GraduationCap className="h-8 w-8 text-chart-2 mb-3" />
              <h3 className="font-semibold mb-2">Адаптивное обучение</h3>
              <p className="text-sm text-muted-foreground">
                Платформа подходит как новичкам, так и продолжающим изучать
                язык, благодаря адаптивной подаче материала и геймификации.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Возможности</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: BookOpen, title: "Интерактивные уроки", desc: "Теория, упражнения, проверка в реальном времени" },
            { icon: Bot, title: "Диалоговый тренажёр", desc: "Общение с ИИ на коми языке с оценкой грамматики" },
            { icon: Mic, title: "Синтез и распознавание речи", desc: "TTS для озвучки слов и ASR для оценки произношения" },
            { icon: Trophy, title: "Геймификация", desc: "XP, достижения, серии занятий, рейтинг" },
            { icon: GraduationCap, title: "Конструктор модулей", desc: "Преподаватели создают собственные учебные материалы" },
            { icon: ShieldCheck, title: "Модерация контента", desc: "Многоэтапная проверка модулей перед публикацией" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Кому подходит платформа</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <Badge className="bg-chart-1/15 text-chart-1 mb-3">Ученик</Badge>
              <p className="text-sm text-muted-foreground">
                Проходит интерактивные уроки, общается с диалоговым тренажёром,
                тренирует произношение, получает достижения и следит за прогрессом.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Badge className="bg-chart-2/15 text-chart-2 mb-3">Преподаватель</Badge>
              <p className="text-sm text-muted-foreground">
                Создаёт и редактирует учебные модули, добавляет диалоговые
                сценарии и словарь, отслеживает успеваемость учеников.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Badge className="bg-chart-3/15 text-chart-3 mb-3">Администратор</Badge>
              <p className="text-sm text-muted-foreground">
                Управляет пользователями, модерирует контент, мониторит
                работу платформы через дашборд со статистикой.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Legal */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Правовое соответствие</h2>
        <div className="space-y-3">
          <LegalItem
            icon={ShieldCheck}
            title="152-ФЗ «О персональных данных»"
            desc="Согласие на обработку данных при регистрации, шифрование голосовых слепков, возможность удаления аккаунта с anonymized-удалением."
          />
          <LegalItem
            icon={Scale}
            title="ГК РФ (авторское право)"
            desc="Указание авторов учебных текстов, проверка лицензий на аудио с носителями языка."
          />
          <LegalItem
            icon={FileText}
            title="149-ФЗ «Об информации»"
            desc="Защита переписки с ботом, фильтрация запрещённого контента через модерацию."
          />
        </div>
      </section>

      {/* Tech */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Технологический стек</CardTitle>
            <CardDescription>Современные технологии для качественного обучения</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <div className="font-medium mb-1">Frontend</div>
              <div className="text-muted-foreground">Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui</div>
            </div>
            <div>
              <div className="font-medium mb-1">Backend</div>
              <div className="text-muted-foreground">Next.js API Routes, Prisma ORM, SQLite</div>
            </div>
            <div>
              <div className="font-medium mb-1">AI-сервисы</div>
              <div className="text-muted-foreground">LLM для диалогов, TTS для синтеза речи, ASR для распознавания</div>
            </div>
            <div>
              <div className="font-medium mb-1">Безопасность</div>
              <div className="text-muted-foreground">JWT-сессии, scrypt-хэширование паролей, RBAC, аудит действий</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="text-center pt-4">
        <Button size="lg" onClick={() => navigate("modules")}>
          Начать обучение
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function LegalItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
