"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNav } from "@/lib/nav-store";
import {
  Globe,
  MapPin,
  Users,
  BookOpen,
  Music,
  Palette,
  Mountain,
  Snowflake,
  TreePine,
  Calendar,
  Languages,
  Landmark,
  ArrowRight,
} from "lucide-react";

export function CultureView() {
  const { navigate } = useNav();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-chart-3 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 komi-ornament opacity-20" />
        <CardContent className="relative p-8 sm:p-12">
          <Badge className="mb-4 bg-white/15 text-white border-white/20 backdrop-blur">
            <Globe className="h-3.5 w-3.5 mr-1" />
            Республика Коми
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Культура и история народа коми
          </h1>
          <p className="text-primary-foreground/90 text-lg max-w-2xl leading-relaxed">
            Коми — финно-угорский народ, коренное население Республики Коми.
            Язык, традиции и культура коми бережно сохраняются и передаются
            из поколения в поколение.
          </p>
        </CardContent>
      </Card>

      {/* Quick facts */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Краткие факты
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FactCard
            icon={MapPin}
            title="Территория"
            value="416,8 тыс. км²"
            sub="на северо-востоке Европы"
            color="from-chart-1 to-chart-4"
          />
          <FactCard
            icon={Users}
            title="Население"
            value="~150 тыс."
            sub="носителей коми языка"
            color="from-chart-2 to-chart-1"
          />
          <FactCard
            icon={Mountain}
            title="Столица"
            value="Сыктывкар"
            sub="основан в 1780 году"
            color="from-chart-3 to-chart-5"
          />
          <FactCard
            icon={Languages}
            title="Языковая семья"
            value="Финно-угорская"
            sub="пермская ветвь"
            color="from-chart-4 to-chart-2"
          />
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          История
        </h2>
        <div className="space-y-4">
          <TimelineItem
            date="XIV век"
            title="Стефан Пермский"
            description="Святой Стефан Пермский создаёт древнепермскую письменность (анбур) — один из древнейших алфавитов для финно-угорских языков. Это стало началом письменной традиции коми языка."
            highlight
          />
          <TimelineItem
            date="XV-XVI века"
            title="Присоединение к Руси"
            description="Великая Permь (Вычегодская) входит в состав Московского государства. Начинается процесс христианизации коми народа."
          />
          <TimelineItem
            date="XVIII век"
            title="Реформа письменности"
            description="Анбур заменяется кириллицей. В 1780 году образован город Усть-Сысольск (ныне Сыктывкар)."
          />
          <TimelineItem
            date="1918-1930-е"
            title="Национальное возрождение"
            description="Создан коми алфавит на латинице, затем переведён на кириллицу с особыми буквами ӧ и ї. Развивается коми литература и пресса."
          />
          <TimelineItem
            date="1922"
            title="Автономия"
            description="Образована Коми автономная область (позже — АССР, затем Республика Коми в составе РФ)."
          />
          <TimelineItem
            date="1992"
            title="Современная Республика"
            description="Республика Коми становится субъектом Российской Федерации. Принимается Конституция Республики Коми."
            highlight
          />
        </div>
      </section>

      {/* Traditions */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Традиции и культура
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 mb-3">
                <Music className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-2">Народная музыка</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Коми музыкальная традиция включает песнопения, горловое пение,
                игру на национальных инструментах: сигудӧк (коми гусли), пӧлив-пӧлив (свистулька).
                Песни делятся на обрядовые, лирические, эпические.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3 mb-3">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-2">Орнаменты</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Коми орнамент — это геометрический узор из ромбов, крестов и зигзагов.
                Цвета: красный (жизнь), чёрный (земля), белый (свет). Орнаментами
                украшали одежду, посуду, оленьи упряжки.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1 mb-3">
                <TreePine className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-2">Тайга и оленеводство</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Традиционные занятия: охота, рыболовство, оленеводство (на севере).
                Коми-зыряне — оседлые земледельцы, коми-ижемцы — кочевые оленеводы.
                Лес — основа жизни и культуры.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5 mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-2">Праздники</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Лудӧм (молодёжные гуляния), Рӧмпӧштан (Масленица), Гаж ва пӧра (праздник воды).
                Особое место занимает Стефан Пермский день (26 апреля) — день памяти создателя коми письменности.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Nature */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Snowflake className="h-6 w-6 text-primary" />
          Природа
        </h2>
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1 shrink-0">
                <TreePine className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Тайга</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Республика Коми — самый лесной регион Европы. 70% территории покрыто
                  тайгой. Здесь находится Печоро-Илычский заповедник — объект
                  Всемирного природного наследия ЮНЕСКО. Девственные леса Коми —
                  крупнейший массив нетронутой тайги в Европе.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4 shrink-0">
                <Mountain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Реки и горы</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Главные реки: Печора, Вычегда, Мезень. Северный Урал — горная цепь
                  на востоке республики, с высшей точкой — горой Народная (1895 м).
                  Манипупунёр — знаменитые каменные столбы-останцы.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Famous people */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Знаменитые коми
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PersonCard
            name="Иван Куратов"
            role="Поэт, основатель коми литературы"
            years="1839-1875"
            description="«Калевала» коми народа. Создал коми литературный язык, писал стихи и поэмы."
          />
          <PersonCard
            name="Стефан Пермский"
            role="Просветитель, святой"
            years="ок. 1340-1396"
            description="Создал древнепермскую письменность (анбур) для коми языка. Крестил коми народ."
          />
          <PersonCard
            name="Василий Лыткин"
            role="Лингвист, академик"
            years="1895-1953"
            description="Выдающийся исследователь коми языка, создал научную грамматику и словари."
          />
        </div>
      </section>

      {/* CTA */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold mb-2">Хотите изучать коми язык?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Начните с наших учебных модулей и интерактивных тренажёров
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => navigate("modules")}>
              <BookOpen className="h-4 w-4 mr-1" />
              Учебные модули
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" onClick={() => navigate("grammar")}>
              Грамматика
            </Button>
            <Button variant="outline" onClick={() => navigate("proverbs")}>
              Пословицы
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FactCard({ icon: Icon, title, value, sub, color }: any) {
  return (
    <Card className="hover-lift">
      <CardContent className="p-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{title}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TimelineItem({ date, title, description, highlight }: any) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-3 w-3 rounded-full ${highlight ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/30"}`} />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>
      <div className="pb-4">
        <Badge variant={highlight ? "default" : "outline"} className="text-xs mb-1">
          {date}
        </Badge>
        <h4 className="font-semibold mt-1">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function PersonCard({ name, role, years, description }: any) {
  return (
    <Card className="hover-lift">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            {name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{name}</h4>
            <div className="text-xs text-muted-foreground">{years}</div>
          </div>
        </div>
        <div className="text-xs text-primary font-medium mb-1">{role}</div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
