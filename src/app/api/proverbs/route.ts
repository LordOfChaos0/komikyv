import { NextResponse } from "next/server";

// GET /api/proverbs — Komi proverbs and idioms collection
// No DB needed — static curated content
export async function GET() {
  return NextResponse.json({ proverbs: PROVERBS, categories: CATEGORIES });
}

interface Proverb {
  id: string;
  komi: string;
  russian: string;
  literalTranslation: string;
  meaning: string;
  category: string;
  words: { komi: string; ru: string }[];
}

const CATEGORIES = [
  { id: "wisdom", label: "Мудрость", icon: "Lightbulb", color: "chart-2" },
  { id: "work", label: "Труд", icon: "Hammer", color: "chart-1" },
  { id: "nature", label: "Природа", icon: "Trees", color: "chart-3" },
  { id: "friendship", label: "Дружба", icon: "Heart", color: "chart-5" },
  { id: "time", label: "Время", icon: "Clock", color: "chart-4" },
  { id: "family", label: "Семья", icon: "Home", color: "primary" },
] as const;

const PROVERBS: Proverb[] = [
  {
    id: "p1",
    komi: "Ас киын шонді, а мӧд киын кӧдзыд.",
    russian: "В одной руке солнце, а в другой холод.",
    literalTranslation: "В одной руке солнце, в другой — холод",
    meaning: "О непостоянстве, о человеке, который меняет своё отношение.",
    category: "wisdom",
    words: [
      { komi: "ас", ru: "свой/один" },
      { komi: "ки", ru: "рука" },
      { komi: "шонді", ru: "солнце" },
      { komi: "мӧд", ru: "другой" },
      { komi: "кӧдзыд", ru: "холод" },
    ],
  },
  {
    id: "p2",
    komi: "Бур ним бурмӧдӧ мортӧ.",
    russian: "Доброе имя человека украшает.",
    literalTranslation: "Доброе имя украшает человека",
    meaning: "Репутация — самое ценное, что есть у человека.",
    category: "wisdom",
    words: [
      { komi: "бур", ru: "добрый" },
      { komi: "ним", ru: "имя" },
      { komi: "бурмӧдӧ", ru: "украшает" },
      { komi: "морт", ru: "человек" },
    ],
  },
  {
    id: "p3",
    komi: "Вӧрӧ эн мун — вӧрысь эн пол.",
    russian: "В лес не ходи — леса не бойся.",
    literalTranslation: "Не ходи в лес — не бойся леса",
    meaning: "Кто не рискует, тот не страдает от страха. О необходимости быть смелым.",
    category: "nature",
    words: [
      { komi: "вӧр", ru: "лес" },
      { komi: "мунны", ru: "идти" },
      { komi: "полыны", ru: "бояться" },
    ],
  },
  {
    id: "p4",
    komi: "Коді уджалӧ, сійӧ и сёйӧ.",
    russian: "Кто работает, тот и ест.",
    literalTranslation: "Кто работает, тот ест",
    meaning: "Труд кормит, а лень портит. Без труда не вытащишь и рыбку из пруда.",
    category: "work",
    words: [
      { komi: "коді", ru: "кто" },
      { komi: "уджалны", ru: "работать" },
      { komi: "сійӧ", ru: "тот" },
      { komi: "сёйны", ru: "есть (кушать)" },
    ],
  },
  {
    id: "p5",
    komi: "Друг кӧ эм — сьӧкыд лёк оз ков.",
    russian: "Если есть друг — тяжелая беда не страшна.",
    literalTranslation: "Если друг есть — тяжёлая беда не нужна",
    meaning: "С другом любая беда легче. Настоящий друг всегда поможет.",
    category: "friendship",
    words: [
      { komi: "друг", ru: "друг" },
      { komi: "эм", ru: "есть" },
      { komi: "сьӧкыд", ru: "тяжёлый" },
      { komi: "лёк", ru: "плохой/беда" },
      { komi: "ковны", ru: "нуждаться" },
    ],
  },
  {
    id: "p6",
    komi: "Кӧдзыд воӧ — шоныд виччысьӧ.",
    russian: "Когда приходит холод, ждут тепла.",
    literalTranslation: "Холод приходит — тепло ждут",
    meaning: "Всему своё время. После зимы всегда приходит весна.",
    category: "time",
    words: [
      { komi: "кӧдзыд", ru: "холод" },
      { komi: "воны", ru: "приходить" },
      { komi: "шоныд", ru: "тепло" },
      { komi: "виччысьны", ru: "ждать" },
    ],
  },
  {
    id: "p7",
    komi: "Мамлӧн кыв — шонді.",
    russian: "Слово матери — солнце.",
    literalTranslation: "Материно слово — солнце",
    meaning: "Материнский совет всегда светлый и добрый. Мать желает только добра.",
    category: "family",
    words: [
      { komi: "мам", ru: "мать" },
      { komi: "кыв", ru: "слово/язык" },
      { komi: "шонді", ru: "солнце" },
    ],
  },
  {
    id: "p8",
    komi: "Уджалан — и сёян, узян — и узьлан.",
    russian: "Работаешь — и ешь, спишь — и спишь.",
    literalTranslation: "Работаешь — ешь, спишь — спишь",
    meaning: "Каждому действию — свой результат. Лень ведёт к безделью.",
    category: "work",
    words: [
      { komi: "уджалны", ru: "работать" },
      { komi: "сёйны", ru: "есть" },
      { komi: "узьны", ru: "спать" },
    ],
  },
  {
    id: "p9",
    komi: "Ва юӧрын кывтан — ва вомӧн сетан.",
    russian: "В воде плывёшь — воде отдаёшь.",
    literalTranslation: "В воде плывёшь — воде отдаёшь",
    meaning: "В чужой монастырь со своим уставом не ходят. Принимай условия среды.",
    category: "wisdom",
    words: [
      { komi: "ва", ru: "вода" },
      { komi: "юӧр", ru: "течение" },
      { komi: "кывтны", ru: "плыть" },
      { komi: "вом", ru: "рот/устье" },
      { komi: "сетны", ru: "отдавать" },
    ],
  },
  {
    id: "p10",
    komi: "Гожӧмын кӧ шонді — тӧлын и шоныд.",
    russian: "Если летом солнце — зимой и тепло.",
    literalTranslation: "Летом солнце — зимой тепло",
    meaning: "Что посеешь, то и пожнёшь. Природа готовит заранее.",
    category: "nature",
    words: [
      { komi: "гожӧм", ru: "лето" },
      { komi: "шонді", ru: "солнце" },
      { komi: "тӧв", ru: "зима" },
      { komi: "шоныд", ru: "тепло" },
    ],
  },
  {
    id: "p11",
    komi: "Ёна сёрнитан — ёна и сорла.",
    russian: "Много говоришь — много и ошибаешься.",
    literalTranslation: "Много говоришь — много и ошибаешься",
    meaning: "Слово — не воробей. Меньше говори, больше делай.",
    category: "wisdom",
    words: [
      { komi: "ёна", ru: "много" },
      { komi: "сёрнитны", ru: "говорить" },
      { komi: "сорлавны", ru: "ошибаться" },
    ],
  },
  {
    id: "p12",
    komi: "Пель чужӧмӧн видзӧдӧ, пельсӧ кывзӧ.",
    russian: "Глазом смотрит, ухом слушает.",
    literalTranslation: "Глазом смотрит, ухом слушает",
    meaning: "Будь внимателен ко всему вокруг. Наблюдательность — залог мудрости.",
    category: "wisdom",
    words: [
      { komi: "пель", ru: "ухо" },
      { komi: "чужӧм", ru: "лицо" },
      { komi: "видзӧдны", ru: "смотреть" },
      { komi: "кывзыны", ru: "слушать" },
    ],
  },
];
