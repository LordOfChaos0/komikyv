"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronLeft,
  Volume2,
  Loader2,
  Search,
  Info,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import * as Icons from "lucide-react";
import { GRAMMAR_SECTIONS, GRAMMAR_CATEGORIES, type GrammarBlock, type GrammarSection } from "@/lib/grammar-data";
import { toast } from "sonner";
import { apiFetch as af } from "@/lib/api-client";

export function GrammarView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const sections = GRAMMAR_SECTIONS;

  const selected = selectedId ? sections.find((s) => s.id === selectedId) : null;
  const filtered = filter === "all" ? sections : sections.filter((s) => s.category === filter);

  if (selected) {
    return <GrammarDetailView section={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Грамматика коми языка
        </h1>
        <p className="text-muted-foreground mt-1">
          Справочник по фонетике, морфологии и синтаксису
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted hover:bg-muted/70 text-foreground/70"
          }`}
        >
          Все ({sections.length})
        </button>
        {GRAMMAR_CATEGORIES.map((cat) => {
          const count = sections.filter((s) => s.category === cat.id).length;
          const Icon = (Icons as any)[cat.icon] || BookOpen;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === cat.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted hover:bg-muted/70 text-foreground/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Sections grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((s, i) => {
          const Icon = (Icons as any)[s.icon] || BookOpen;
          const cat = GRAMMAR_CATEGORIES.find((c) => c.id === s.category);
          return (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-md transition-all hover-lift animate-fade-in group"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => setSelectedId(s.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${cat?.color || "primary"}/10 text-${cat?.color || "primary"} shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{s.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {s.blocksCount} блок.
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function GrammarDetailView({ section, onBack }: { section: GrammarSection; onBack: () => void }) {
  const speak = async (text: string) => {
    try {
      const data = await af<{ audio: string }>("/api/tts", {
        method: "POST",
        json: { text },
      });
      const audio = new Audio(data.audio);
      audio.play();
    } catch (e: any) {
      toast.error(e.message || "TTS недоступен");
    }
  };

  const Icon = (Icons as any)[section.icon] || BookOpen;
  const cat = GRAMMAR_CATEGORIES.find((c) => c.id === section.category);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        К списку разделов
      </Button>

      <Card className="overflow-hidden">
        <div className={`h-1.5 bg-${cat?.color || "primary"}`} />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${cat?.color || "primary"}/10 text-${cat?.color || "primary"}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">{section.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content blocks */}
      <div className="space-y-5">
        {section.content.map((block, i) => (
          <BlockRenderer key={i} block={block} onSpeak={speak} />
        ))}
      </div>

      {/* Navigation footer */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Наверх ↑
        </Button>
      </div>
    </div>
  );
}

function BlockRenderer({ block, onSpeak }: { block: GrammarBlock; onSpeak: (text: string) => Promise<void> }) {
  if (block.type === "paragraph") {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "table") {
    return (
      <Card className="overflow-hidden">
        {block.heading && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{block.heading}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              {block.headers && (
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {block.headers.map((h, i) => (
                      <th key={i} className="text-left font-semibold p-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {block.rows?.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`p-3 ${ci === 0 ? "font-medium text-primary" : "text-foreground/80"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "list") {
    return (
      <Card>
        {block.heading && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{block.heading}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-5 pt-0">
          <ul className="space-y-2">
            {block.items?.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-primary mt-0.5">•</span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  // "heading_note" — a styled sub-heading
  if ((block as any).type === "heading_note") {
    return (
      <div className="pt-2">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-chart-2" />
          {block.text}
        </h3>
      </div>
    );
  }

  if (block.type === "example") {
    const text = block.text || "";
    return (
      <Card className="border-chart-2/30 bg-chart-2/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-chart-2 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-chart-2">Пример: </span>
            <span className="text-foreground/90">{text}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => onSpeak(text.replace(/\s*\(.*?\)\s*/g, ""))}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "note") {
    const variant = block.variant || "info";
    const config = {
      info: { icon: Info, className: "border-primary/30 bg-primary/5 text-primary" },
      warning: { icon: AlertTriangle, className: "border-chart-3/30 bg-chart-3/5 text-chart-3" },
      success: { icon: CheckCircle2, className: "border-chart-1/30 bg-chart-1/5 text-chart-1" },
    }[variant];
    const Icon = config.icon;
    return (
      <Card className={config.className}>
        <CardContent className="p-4 flex items-start gap-3">
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">{block.text}</div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
