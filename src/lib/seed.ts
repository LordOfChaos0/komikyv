// Seed data for «Коми кыв» platform — Komi language learning content.
// Sources: public-domain Komi language learning materials and the existing
// project's seed data (full_context_20260819_155222.md).

import { db } from "./db";
import { hashPassword } from "./auth";

// ============================================================
// Categories
// ============================================================

const CATEGORIES = [
  { name: "Основы", slug: "basics", description: "Базовые слова, приветствия, числительные", color: "amber", icon: "Sparkles" },
  { name: "Семья и быт", slug: "family", description: "Семья, дом, повседневная жизнь", color: "rose", icon: "Home" },
  { name: "Природа", slug: "nature", description: "Природа Республика Коми, времена года", color: "emerald", icon: "Trees" },
  { name: "Еда и напитки", slug: "food", description: "Традиционные блюда, продукты", color: "orange", icon: "Utensils" },
  { name: "Путешествия", slug: "travel", description: "Транспорт, направления, город", color: "sky", icon: "MapPin" },
  { name: "Культура", slug: "culture", description: "Праздники, традиции, фольклор", color: "violet", icon: "BookOpen" },
];

// ============================================================
// Achievements
// ============================================================

const ACHIEVEMENTS = [
  { code: "first_lesson", title: "Первые шаги", description: "Завершите свой первый урок", criteriaJson: JSON.stringify({ type: "lessons_completed", count: 1 }), xpReward: 50, icon: "Footprints", category: "learning" },
  { code: "lessons_5", title: "Усердный ученик", description: "Завершите 5 уроков", criteriaJson: JSON.stringify({ type: "lessons_completed", count: 5 }), xpReward: 150, icon: "BookOpen", category: "learning" },
  { code: "lessons_15", title: "Знаток коми", description: "Завершите 15 уроков", criteriaJson: JSON.stringify({ type: "lessons_completed", count: 15 }), xpReward: 400, icon: "GraduationCap", category: "learning" },
  { code: "streak_3", title: "Начало серии", description: "Занимайтесь 3 дня подряд", criteriaJson: JSON.stringify({ type: "streak", count: 3 }), xpReward: 60, icon: "Flame", category: "streak" },
  { code: "streak_7", title: "Неделя без пропусков", description: "Занимайтесь 7 дней подряд", criteriaJson: JSON.stringify({ type: "streak", count: 7 }), xpReward: 200, icon: "Flame", category: "streak" },
  { code: "streak_30", title: "Месяц упорства", description: "Занимайтесь 30 дней подряд", criteriaJson: JSON.stringify({ type: "streak", count: 30 }), xpReward: 1000, icon: "Award", category: "streak" },
  { code: "dialog_first", title: "Первый диалог", description: "Завершите первую тренировку диалога", criteriaJson: JSON.stringify({ type: "dialogs_completed", count: 1 }), xpReward: 80, icon: "MessageCircle", category: "dialog" },
  { code: "dialog_10", title: "Беседун", description: "Завершите 10 диалоговых сессий", criteriaJson: JSON.stringify({ type: "dialogs_completed", count: 10 }), xpReward: 300, icon: "MessagesSquare", category: "dialog" },
  { code: "vocabulary_50", title: "Собиратель слов", description: "Изучите 50 слов из словаря", criteriaJson: JSON.stringify({ type: "vocabulary_learned", count: 50 }), xpReward: 250, icon: "Library", category: "learning" },
  { code: "perfect_lesson", title: "Безупречно", description: "Пройдите урок на 100%", criteriaJson: JSON.stringify({ type: "perfect_score" }), xpReward: 120, icon: "Star", category: "learning" },
  { code: "xp_500", title: "500 XP", description: "Наберите 500 очков опыта", criteriaJson: JSON.stringify({ type: "xp", count: 500 }), xpReward: 0, icon: "Zap", category: "learning" },
  { code: "xp_2000", title: "Мастер коми кыв", description: "Наберите 2000 очков опыта", criteriaJson: JSON.stringify({ type: "xp", count: 2000 }), xpReward: 0, icon: "Crown", category: "learning" },
];

// ============================================================
// Dialog scenarios
// ============================================================

const DIALOG_SCENARIOS = [
  {
    title: "Знакомство",
    description: "Познакомьтесь с собеседником, расскажите о себе на коми языке.",
    level: "beginner",
    icon: "HandHeart",
    scenarioJson: JSON.stringify({
      opening: "Дона друг! Ме тэнсьыд ним тӧда. Менам ним Серёжа. Кыдзи нэм тэнад?",
      context: "Первая встреча. Задача: представиться, назвать имя, спросить как дела.",
      vocabulary: ["дона друг — дорогой друг", "ним — имя", "кыдзи — как", "бур — хорошо"],
      goal: "Спросить имя и как дела, представиться.",
    }),
  },
  {
    title: "В магазине",
    description: "Купите продукты на коми рынке. Торг уместен.",
    level: "beginner",
    icon: "ShoppingBasket",
    scenarioJson: JSON.stringify({
      opening: "Бур лун! Ті мый аддзидны кӧсъяд? Миян эм бур нянь да выль йӧв.",
      context: "Покупка хлеба и молока в магазине. Спросите цену.",
      vocabulary: ["нянь — хлеб", "йӧв — молоко", "дон — цена", "ныв — рубль", "куны — сколько"],
      goal: "Узнать цену, купить хлеб и молоко.",
    }),
  },
  {
    title: "Погода и природа",
    description: "Обсудите погоду и красоту северной природы.",
    level: "intermediate",
    icon: "CloudSun",
    scenarioJson: JSON.stringify({
      opening: "Сегодня ыджыд тӧлыс. Но республикаын лун шоныд. Тэ кыдзи радейтан тӧв?",
      context: "Разговор о временах года. Расскажите, любите ли вы зиму.",
      vocabulary: ["тӧв — зима", "гожӧм — лето", "тӧлыс — ветер", "шоныд — тёплый", "кӧдзыд — холодный"],
      goal: "Рассказать о любимом времени года.",
    }),
  },
  {
    title: "Семья и традиции",
    description: "Расскажите о своей семье и семейных традициях.",
    level: "intermediate",
    icon: "Users",
    scenarioJson: JSON.stringify({
      opening: "Менам эм ыджыд семья: ай, мам, кык вок и чой. Тэнад семья ыджыд-ӧ?",
      context: "Рассказ о семье, родственных связях.",
      vocabulary: ["ай — отец", "мам — мать", "вок — брат", "чой — сестра", "пи — сын", "ныв — дочь"],
      goal: "Рассказать о составе своей семьи.",
    }),
  },
];

// ============================================================
// Modules with lessons, vocabulary, exercises
// ============================================================

type ModuleSeed = {
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  coverColor: string;
  estimatedMin: number;
  categories: string[]; // slugs
  lessons: {
    title: string;
    theoryContent: string;
    passingScore: number;
    vocabulary: {
      wordKomi: string;
      translationRu: string;
      transcription: string;
      exampleKomi?: string;
      exampleRu?: string;
      partOfSpeech?: string;
    }[];
    exercises: {
      type: "translation" | "choice" | "matching" | "fill_blank" | "audio" | "order";
      question: string;
      questionRu?: string;
      optionsJson: string;
      correctAnswer: string;
      hint?: string;
      explanation?: string;
      scoreWeight?: number;
    }[];
  }[];
};

const MODULES: ModuleSeed[] = [
  {
    title: "Знакомство с коми языком",
    description:
      "Первый модуль для начинающих. Вы научитесь приветствовать, представляться, считать до десяти и понимать базовую структуру коми языка.",
    level: "beginner",
    coverColor: "amber",
    estimatedMin: 45,
    categories: ["basics"],
    lessons: [
      {
        title: "Приветствия и базовые фразы",
        theoryContent:
          "Коми язык (коми кыв) — финно-угорский язык, родной для народа коми, проживающего в Республике Коми. Ближайшие родственники — удмуртский и бесермянский языки.\n\nОсновные приветствия:\n• Бур лун — Добрый день\n• Бур асыв — Доброе утро\n• Бур рыт — Добрый вечер\n• Бур вой — Доброй ночи\n• Здравствуйте — Здравствуйте (заимствование)\n\nВопросительные слова:\n• кыдзи — как\n• кытӧн — где\n• кодь — какой\n• мый — что\n• коді — кто\n\nМестоимения:\n• ме — я\n• тэ — ты\n• сійӧ — он/она\n• ми — мы\n• ті — вы\n\nСпряжение глагола «быть» (лоны):\n• ме лоа — я буду\n• тэ лоан — ты будешь\n• сійӧ лоас — он/она будет",
        passingScore: 60,
        vocabulary: [
          { wordKomi: "Бур лун", translationRu: "Добрый день", transcription: "бур лун", exampleKomi: "Бур лун, другӧ!", exampleRu: "Добрый день, друг!", partOfSpeech: "phrase" },
          { wordKomi: "Бур асыв", translationRu: "Доброе утро", transcription: "бур асыв", partOfSpeech: "phrase" },
          { wordKomi: "Бур рыт", translationRu: "Добрый вечер", transcription: "бур рыт", partOfSpeech: "phrase" },
          { wordKomi: "ме", translationRu: "я", transcription: "ме", partOfSpeech: "pronoun" },
          { wordKomi: "тэ", translationRu: "ты", transcription: "тэ", partOfSpeech: "pronoun" },
          { wordKomi: "сійӧ", translationRu: "он/она", transcription: "сійӧ", partOfSpeech: "pronoun" },
          { wordKomi: "ми", translationRu: "мы", transcription: "ми", partOfSpeech: "pronoun" },
          { wordKomi: "ті", translationRu: "вы", transcription: "ті", partOfSpeech: "pronoun" },
          { wordKomi: "мый", translationRu: "что", transcription: "мый", partOfSpeech: "pronoun" },
          { wordKomi: "кыдзи", translationRu: "как", transcription: "кыдзи", partOfSpeech: "adv" },
          { wordKomi: "кытӧн", translationRu: "где", transcription: "кытӧн", partOfSpeech: "adv" },
          { wordKomi: "дона", translationRu: "дорогой", transcription: "дона", partOfSpeech: "adj" },
          { wordKomi: "друг", translationRu: "друг", transcription: "друг", partOfSpeech: "noun" },
        ],
        exercises: [
          {
            type: "choice",
            question: "What does «Бур лун» mean?",
            questionRu: "Что означает «Бур лун»?",
            optionsJson: JSON.stringify(["Добрый день", "Доброе утро", "Добрый вечер", "До свидания"]),
            correctAnswer: "Добрый день",
            hint: "Это приветствие используется днём.",
            explanation: "«Бур» означает «добрый/хороший», «лун» — «день».",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate to Komi: «Добрый вечер»",
            questionRu: "Переведите на коми: «Добрый вечер»",
            optionsJson: "[]",
            correctAnswer: "Бур рыт",
            hint: "Вечер по-коми — «рыт».",
            scoreWeight: 2,
          },
          {
            type: "choice",
            question: "Which pronoun means «I»?",
            questionRu: "Какое местоимение означает «я»?",
            optionsJson: JSON.stringify(["ме", "тэ", "сійӧ", "ми"]),
            correctAnswer: "ме",
            hint: "Самое короткое местоимение.",
            scoreWeight: 1,
          },
          {
            type: "fill_blank",
            question: "Complete: «___ лун!» (Good afternoon!)",
            questionRu: "Допишите: «___ лун!» (Добрый день!)",
            optionsJson: "[]",
            correctAnswer: "Бур",
            hint: "Прилагательное «хороший/добрый».",
            scoreWeight: 2,
          },
          {
            type: "matching",
            question: "Match Komi words with Russian translations",
            questionRu: "Сопоставьте коми слова с переводом",
            optionsJson: JSON.stringify({ pairs: [["ме", "я"], ["тэ", "ты"], ["ми", "мы"], ["ті", "вы"]] }),
            correctAnswer: JSON.stringify({ pairs: [["ме", "я"], ["тэ", "ты"], ["ми", "мы"], ["ті", "вы"]] }),
            hint: "Личные местоимения единственного и множественного числа.",
            scoreWeight: 3,
          },
        ],
      },
      {
        title: "Числительные 1–10",
        theoryContent:
          "Коми числительные от 1 до 10:\n• 1 — ӧтик\n• 2 — кык\n• 3 — куим\n• 4 — нёль\n• 5 — вит\n• 6 — квайт\n• 7 — сизим\n• 8 — кӧкъямыс\n• 9 — ӧкмыс\n• 10 — дас\n\nСоставные числительные:\n• 11 — дас ӧтик (десять-один)\n• 20 — кыкдас (два-десять)\n• 21 — кыкдас ӧтик\n• 100 — сё\n• 1000 — сюрс\n\nПорядковые числительные образуются с помощью суффикса -ӧд:\n• первый — медводдза\n• второй — мӧд\n• третий — коймӧд\n• четвертый — нёльӧд",
        passingScore: 70,
        vocabulary: [
          { wordKomi: "ӧтик", translationRu: "один", transcription: "ӧтик", partOfSpeech: "num" },
          { wordKomi: "кык", translationRu: "два", transcription: "кык", partOfSpeech: "num" },
          { wordKomi: "куим", translationRu: "три", transcription: "куим", partOfSpeech: "num" },
          { wordKomi: "нёль", translationRu: "четыре", transcription: "нёль", partOfSpeech: "num" },
          { wordKomi: "вит", translationRu: "пять", transcription: "вит", partOfSpeech: "num" },
          { wordKomi: "квайт", translationRu: "шесть", transcription: "квайт", partOfSpeech: "num" },
          { wordKomi: "сизим", translationRu: "семь", transcription: "сизим", partOfSpeech: "num" },
          { wordKomi: "кӧкъямыс", translationRu: "восемь", transcription: "кӧкъямыс", partOfSpeech: "num" },
          { wordKomi: "ӧкмыс", translationRu: "девять", transcription: "ӧкмыс", partOfSpeech: "num" },
          { wordKomi: "дас", translationRu: "десять", transcription: "дас", partOfSpeech: "num" },
          { wordKomi: "сюрс", translationRu: "тысяча", transcription: "сюрс", partOfSpeech: "num" },
        ],
        exercises: [
          {
            type: "choice",
            question: "What number is «куим»?",
            questionRu: "Какое число «куим»?",
            optionsJson: JSON.stringify(["2", "3", "4", "5"]),
            correctAnswer: "3",
            hint: "Следует после «кык».",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate: «семь»",
            questionRu: "Переведите: «семь»",
            optionsJson: "[]",
            correctAnswer: "сизим",
            hint: "Начинается с буквы «с».",
            scoreWeight: 2,
          },
          {
            type: "choice",
            question: "How do you say «10» in Komi?",
            questionRu: "Как сказать «10» по-коми?",
            optionsJson: JSON.stringify(["ӧкмыс", "дас", "сюрс", "сё"]),
            correctAnswer: "дас",
            hint: "Основа для составных числительных 11–19.",
            scoreWeight: 1,
          },
          {
            type: "fill_blank",
            question: "Complete the sequence: ӧтик, кык, куим, нёль, ___",
            questionRu: "Продолжите: ӧтик, кык, куим, нёль, ___",
            optionsJson: "[]",
            correctAnswer: "вит",
            hint: "Это число 5.",
            scoreWeight: 2,
          },
          {
            type: "matching",
            question: "Match Komi numerals with numbers",
            questionRu: "Сопоставьте числительные с числами",
            optionsJson: JSON.stringify({ pairs: [["кык", "2"], ["нёль", "4"], ["квайт", "6"], ["кӧкъямыс", "8"]] }),
            correctAnswer: JSON.stringify({ pairs: [["кык", "2"], ["нёль", "4"], ["квайт", "6"], ["кӧкъямыс", "8"]] }),
            scoreWeight: 3,
          },
        ],
      },
      {
        title: "Прощание и вежливые фразы",
        theoryContent:
          "Вежливые фразы:\n• Бура корам — Добро пожаловать\n• Аттӧз — Спасибо\n• Ок, позьӧ — Да, можно / Конечно\n• Ог позь — Нельзя\n• Видза олан — Будь здоров / До свидания (букв. «оставайся жить»)\n• Видза видзӧдлан — До свидания (букв. «оставайся посмотреть»)\n• Водзын аддзылана — До встречи\n• Прошу прощения — Прошу прощения\n\nВопрос «Как дела?»:\n• Кыдзи олан? — Как живёшь? (неформально)\n• Кыдзи овсӧ? — Как дела?\n• Кыдзи вылӧ? — Как дела?\n\nОтветы:\n• Бура — Хорошо\n• Зэв бур — Очень хорошо\n• Абу лёк — Неплохо\n• Лёка — Плохо",
        passingScore: 70,
        vocabulary: [
          { wordKomi: "Аттӧз", translationRu: "Спасибо", transcription: "аттӧз", exampleKomi: "Аттӧз тэныд!", exampleRu: "Спасибо тебе!", partOfSpeech: "phrase" },
          { wordKomi: "Видза олан", translationRu: "До свидания", transcription: "видза олан", partOfSpeech: "phrase" },
          { wordKomi: "Бура корам", translationRu: "Добро пожаловать", transcription: "бура корам", partOfSpeech: "phrase" },
          { wordKomi: "бура", translationRu: "хорошо", transcription: "бура", partOfSpeech: "adv" },
          { wordKomi: "зэв", translationRu: "очень", transcription: "зэв", partOfSpeech: "adv" },
          { wordKomi: "позьӧ", translationRu: "можно", transcription: "позьӧ", partOfSpeech: "verb" },
          { wordKomi: "ог", translationRu: "нет (отрицание)", transcription: "ог", partOfSpeech: "particle" },
          { wordKomi: "лёка", translationRu: "плохо", transcription: "лёка", partOfSpeech: "adv" },
        ],
        exercises: [
          {
            type: "choice",
            question: "«Аттӧз» means:",
            questionRu: "«Аттӧз» означает:",
            optionsJson: JSON.stringify(["Пожалуйста", "Спасибо", "Извините", "Здравствуйте"]),
            correctAnswer: "Спасибо",
            hint: "Самое частое слово после подарка.",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate to Komi: «Goodbye» (informal)",
            questionRu: "Переведите на коми: «До свидания» (неформально)",
            optionsJson: "[]",
            correctAnswer: "Видза олан",
            hint: "Буквально: «оставайся жить».",
            scoreWeight: 2,
          },
          {
            type: "choice",
            question: "«Кыдзи олан?» means:",
            questionRu: "«Кыдзи олан?» означает:",
            optionsJson: JSON.stringify(["Как тебя зовут?", "Как дела?", "Где ты?", "Который час?"]),
            correctAnswer: "Как дела?",
            hint: "Вопрос о состоянии.",
            scoreWeight: 1,
          },
          {
            type: "audio",
            question: "Listen and type the Komi word",
            questionRu: "Прослушайте и напишите коми слово",
            optionsJson: JSON.stringify({ word: "Аттӧз" }),
            correctAnswer: "Аттӧз",
            hint: "Слово благодарности.",
            scoreWeight: 3,
          },
        ],
      },
    ],
  },
  {
    title: "Семья и дом",
    description:
      "Научитесь говорить о семье, родственных отношениях и домашнем быте. Освоите ключевые слова о доме и повседневной жизни.",
    level: "beginner",
    coverColor: "rose",
    estimatedMin: 50,
    categories: ["family", "basics"],
    lessons: [
      {
        title: "Члены семьи",
        theoryContent:
          "Родственные термины в коми языке:\n• ай — отец\n• мам — мать\n• пи — сын\n• ныв — дочь (также: девушка)\n• вок — брат\n• чой — сестра\n• пӧч — бабушка\n• пель — дедушка\n• айка — дядя (старший)\n• мамка — тётя\n• вокни — племянник\n\nСемья — семья (заимствование из русского), в исконном коми используется «родня» или «койм».\n\nПритяжательные суффиксы:\n• айӧй — мой отец\n• мамӧй — моя мать\n• вокӧй — мой брат\n• чойӧй — моя сестра\n• пиӧй — мой сын\n\nПример: «Менам эм куим чойӧй и ӧтик вокӧй.» — У меня есть три сестры и один брат.",
        passingScore: 70,
        vocabulary: [
          { wordKomi: "ай", translationRu: "отец", transcription: "ай", partOfSpeech: "noun" },
          { wordKomi: "мам", translationRu: "мать", transcription: "мам", partOfSpeech: "noun" },
          { wordKomi: "пи", translationRu: "сын", transcription: "пи", partOfSpeech: "noun" },
          { wordKomi: "ныв", translationRu: "дочь, девушка", transcription: "ныв", partOfSpeech: "noun" },
          { wordKomi: "вок", translationRu: "брат", transcription: "вок", partOfSpeech: "noun" },
          { wordKomi: "чой", translationRu: "сестра", transcription: "чой", partOfSpeech: "noun" },
          { wordKomi: "пӧч", translationRu: "бабушка", transcription: "пӧч", partOfSpeech: "noun" },
          { wordKomi: "пель", translationRu: "дедушка", transcription: "пель", partOfSpeech: "noun" },
          { wordKomi: "семья", translationRu: "семья", transcription: "семья", partOfSpeech: "noun" },
        ],
        exercises: [
          {
            type: "choice",
            question: "«ай» means:",
            questionRu: "«ай» означает:",
            optionsJson: JSON.stringify(["мать", "отец", "брат", "дедушка"]),
            correctAnswer: "отец",
            hint: "Короткое слово из двух букв.",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate: «сестра»",
            questionRu: "Переведите: «сестра»",
            optionsJson: "[]",
            correctAnswer: "чой",
            hint: "Три буквы, начинается с «ч».",
            scoreWeight: 2,
          },
          {
            type: "matching",
            question: "Match family members",
            questionRu: "Сопоставьте членов семьи",
            optionsJson: JSON.stringify({ pairs: [["ай", "отец"], ["мам", "мать"], ["вок", "брат"], ["чой", "сестра"]] }),
            correctAnswer: JSON.stringify({ pairs: [["ай", "отец"], ["мам", "мать"], ["вок", "брат"], ["чой", "сестра"]] }),
            scoreWeight: 3,
          },
          {
            type: "fill_blank",
            question: "«___ӧй» means «my mother»",
            questionRu: "«___ӧй» означает «моя мать»",
            optionsJson: "[]",
            correctAnswer: "мам",
            hint: "Притяжательный суффикс -ӧй добавляется к слову «мать».",
            scoreWeight: 2,
          },
        ],
      },
      {
        title: "Дом и предметы быта",
        theoryContent:
          "Дом и быт:\n• керка — дом (деревянный)\n• ӧшинь — окно\n• ӧдзӧс — дверь\n• пачь — печь\n• пызан — стол\n• улӧс — стул\n• вольык — кровать\n• сёртӧд — шкаф\n\nБытовые глаголы:\n• вӧчны — делать\n• сёйны — есть (кушать)\n• юны — пить\n• узьны — спать\n• сулӧдны — вставать\n• пукавны — сидеть\n\nПрилагательные:\n• ыджыд — большой\n• учӧт — маленький\n• мич — красивый\n• бур — хороший\n• лёк — плохой\n• выль — новый",
        passingScore: 70,
        vocabulary: [
          { wordKomi: "керка", translationRu: "дом", transcription: "керка", partOfSpeech: "noun" },
          { wordKomi: "ӧшинь", translationRu: "окно", transcription: "ӧшинь", partOfSpeech: "noun" },
          { wordKomi: "ӧдзӧс", translationRu: "дверь", transcription: "ӧдзӧс", partOfSpeech: "noun" },
          { wordKomi: "пызан", translationRu: "стол", transcription: "пызан", partOfSpeech: "noun" },
          { wordKomi: "улӧс", translationRu: "стул", transcription: "улӧс", partOfSpeech: "noun" },
          { wordKomi: "сёйны", translationRu: "есть, кушать", transcription: "сёйны", partOfSpeech: "verb" },
          { wordKomi: "юны", translationRu: "пить", transcription: "юны", partOfSpeech: "verb" },
          { wordKomi: "узьны", translationRu: "спать", transcription: "узьны", partOfSpeech: "verb" },
          { wordKomi: "ыджыд", translationRu: "большой", transcription: "ыджыд", partOfSpeech: "adj" },
          { wordKomi: "учӧт", translationRu: "маленький", transcription: "учӧт", partOfSpeech: "adj" },
        ],
        exercises: [
          {
            type: "choice",
            question: "«керка» means:",
            questionRu: "«керка» означает:",
            optionsJson: JSON.stringify(["стол", "дом", "дверь", "окно"]),
            correctAnswer: "дом",
            hint: "Традиционное деревянное жилище.",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate: «стул»",
            questionRu: "Переведите: «стул»",
            optionsJson: "[]",
            correctAnswer: "улӧс",
            hint: "Четыре буквы, оканчивается на «ӧс».",
            scoreWeight: 2,
          },
          {
            type: "choice",
            question: "«сёйны» means:",
            questionRu: "«сёйны» означает:",
            optionsJson: JSON.stringify(["спать", "пить", "есть", "сидеть"]),
            correctAnswer: "есть",
            hint: "Связано с приёмом пищи.",
            scoreWeight: 1,
          },
          {
            type: "fill_blank",
            question: "«___» means «big»",
            questionRu: "«___» означает «большой»",
            optionsJson: "[]",
            correctAnswer: "ыджыд",
            hint: "Пять букв, начинается с «ы».",
            scoreWeight: 2,
          },
        ],
      },
    ],
  },
  {
    title: "Природа Республики Коми",
    description:
      "Изучите лексику, связанную с природой севера: тайга, тундра, времена года, животные и растения.",
    level: "intermediate",
    coverColor: "emerald",
    estimatedMin: 55,
    categories: ["nature"],
    lessons: [
      {
        title: "Времена года",
        theoryContent:
          "Четыре времени года в Республике Коми:\n• тӧв — зима (длится с ноября по апрель)\n• тулыс — весна\n• гожӧм — лето\n• ар — осень\n\nМесяцы:\n• тӧвшӧр — январь (букв. «зимы начало»)\n• урац — февраль\n• рака — март\n• ода-кӧк — апрель\n• ода-йӧв — май\n• лӧддза — июнь\n• сора — июль\n• гожӧмшӧр — август\n• косёра — сентябрь\n• йирым — октябрь\n• шыльыд — ноябрь\n• вӧльгым — декабрь\n\nПогода:\n• кӧдзыд — холод\n• шоныд — тепло\n• зэр — дождь\n• лым — снег\n• тӧвзӧ — дует ветер\n• кӧнтӧм — солнечно\n\nТипичная фраза: «Коми муын кузь да кӧдзыд тӧв.» — В Коми краю долгая и холодная зима.",
        passingScore: 75,
        vocabulary: [
          { wordKomi: "тӧв", translationRu: "зима", transcription: "тӧв", partOfSpeech: "noun" },
          { wordKomi: "тулыс", translationRu: "весна", transcription: "тулыс", partOfSpeech: "noun" },
          { wordKomi: "гожӧм", translationRu: "лето", transcription: "гожӧм", partOfSpeech: "noun" },
          { wordKomi: "ар", translationRu: "осень", transcription: "ар", partOfSpeech: "noun" },
          { wordKomi: "кӧдзыд", translationRu: "холод, холодный", transcription: "кӧдзыд", partOfSpeech: "noun/adj" },
          { wordKomi: "шоныд", translationRu: "тепло, тёплый", transcription: "шоныд", partOfSpeech: "noun/adj" },
          { wordKomi: "зэр", translationRu: "дождь", transcription: "зэр", partOfSpeech: "noun" },
          { wordKomi: "лым", translationRu: "снег", transcription: "лым", partOfSpeech: "noun" },
          { wordKomi: "тӧлыс", translationRu: "ветер", transcription: "тӧлыс", partOfSpeech: "noun" },
          { wordKomi: "шонді", translationRu: "солнце", transcription: "шонді", partOfSpeech: "noun" },
        ],
        exercises: [
          {
            type: "choice",
            question: "«тӧв» means:",
            questionRu: "«тӧв» означает:",
            optionsJson: JSON.stringify(["весна", "лето", "зима", "осень"]),
            correctAnswer: "зима",
            hint: "Самое длинное время года в Коми.",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate: «снег»",
            questionRu: "Переведите: «снег»",
            optionsJson: "[]",
            correctAnswer: "лым",
            hint: "Три буквы.",
            scoreWeight: 2,
          },
          {
            type: "matching",
            question: "Match seasons",
            questionRu: "Сопоставьте времена года",
            optionsJson: JSON.stringify({ pairs: [["тӧв", "зима"], ["тулыс", "весна"], ["гожӧм", "лето"], ["ар", "осень"]] }),
            correctAnswer: JSON.stringify({ pairs: [["тӧв", "зима"], ["тулыс", "весна"], ["гожӧм", "лето"], ["ар", "осень"]] }),
            scoreWeight: 3,
          },
          {
            type: "choice",
            question: "«кӧдзыд» means:",
            questionRu: "«кӧдзыд» означает:",
            optionsJson: JSON.stringify(["жара", "тепло", "холод", "ветер"]),
            correctAnswer: "холод",
            hint: "Противоположность «шоныд».",
            scoreWeight: 1,
          },
        ],
      },
      {
        title: "Животные и растения тайги",
        theoryContent:
          "Животные тайги:\n• ур — белка\n• кӧин — волк\n• ош — медведь\n• вӧр — лиса\n• ур — белка\n• тӱрун — заяц\n• сьӧла — рябчик\n• кӧч — заяц\n• чери — рыба\n\nРастения:\n• пу — дерево\n• коз — ель\n• пожӧм — сосна\n• кыдз — берёза\n• пув — ягода\n• тшак — гриб\n• турун — трава\n\nПриродные объекты:\n• вӧр — лес\n• ю — река\n• ты — озеро\n• сёрт — ручей\n• мус — гора\n• нюръя — болото\n\nФраза: «Коми вӧрын уна ош да кӧин.» — В коми лесу много медведей и волков.",
        passingScore: 70,
        vocabulary: [
          { wordKomi: "ош", translationRu: "медведь", transcription: "ош", partOfSpeech: "noun" },
          { wordKomi: "кӧин", translationRu: "волк", transcription: "кӧин", partOfSpeech: "noun" },
          { wordKomi: "вӧр", translationRu: "лиса; лес", transcription: "вӧр", partOfSpeech: "noun" },
          { wordKomi: "ур", translationRu: "белка", transcription: "ур", partOfSpeech: "noun" },
          { wordKomi: "кӧч", translationRu: "заяц", transcription: "кӧч", partOfSpeech: "noun" },
          { wordKomi: "чери", translationRu: "рыба", transcription: "чери", partOfSpeech: "noun" },
          { wordKomi: "пу", translationRu: "дерево", transcription: "пу", partOfSpeech: "noun" },
          { wordKomi: "коз", translationRu: "ель", transcription: "коз", partOfSpeech: "noun" },
          { wordKomi: "пожӧм", translationRu: "сосна", transcription: "пожӧм", partOfSpeech: "noun" },
          { wordKomi: "кыдз", translationRu: "берёза", transcription: "кыдз", partOfSpeech: "noun" },
          { wordKomi: "вӧр", translationRu: "лес", transcription: "вӧр", partOfSpeech: "noun" },
          { wordKomi: "ю", translationRu: "река", transcription: "ю", partOfSpeech: "noun" },
        ],
        exercises: [
          {
            type: "choice",
            question: "«ош» means:",
            questionRu: "«ош» означает:",
            optionsJson: JSON.stringify(["волк", "медведь", "лиса", "заяц"]),
            correctAnswer: "медведь",
            hint: "Хозяин тайги.",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate: «река»",
            questionRu: "Переведите: «река»",
            optionsJson: "[]",
            correctAnswer: "ю",
            hint: "Две буквы.",
            scoreWeight: 2,
          },
          {
            type: "choice",
            question: "«пу» means:",
            questionRu: "«пу» означает:",
            optionsJson: JSON.stringify(["трава", "дерево", "гриб", "ягода"]),
            correctAnswer: "дерево",
            hint: "Высокое, с корой.",
            scoreWeight: 1,
          },
          {
            type: "matching",
            question: "Match animals",
            questionRu: "Сопоставьте животных",
            optionsJson: JSON.stringify({ pairs: [["ош", "медведь"], ["кӧин", "волк"], ["ур", "белка"], ["кӧч", "заяц"]] }),
            correctAnswer: JSON.stringify({ pairs: [["ош", "медведь"], ["кӧин", "волк"], ["ур", "белка"], ["кӧч", "заяц"]] }),
            scoreWeight: 3,
          },
        ],
      },
    ],
  },
  {
    title: "Традиционная кухня коми",
    description:
      "Узнайте о традиционных блюдах: шаньги, черинянь, пельнянь и других. Лексика еды и напитков.",
    level: "beginner",
    coverColor: "orange",
    estimatedMin: 40,
    categories: ["food", "culture"],
    lessons: [
      {
        title: "Продукты и блюда",
        theoryContent:
          "Основные продукты:\n• нянь — хлеб\n• рок — суп\n• йӧв — молоко\n• вый — масло\n• кольк — яйцо\n• сёян — еда\n• шыд — щи/похлёбка\n• чери — рыба\n• яй — мясо\n• ва — вода\n\nТрадиционные блюда:\n• шаньга — лепёшка с начинкой (картофельной, творожной)\n• черинянь — рыбный хлеб/пирог с рыбой\n• пельнянь (пельмени) — «хлебное ухо» (буквальный перевод: пель «ухо» + нянь «хлеб»)\n• шыд — щи с крупой\n• вӧча — кашадок (каша)\n• блинничан — блины\n• чері Sarka — рыбный пирог\n• карчам — квас/березовый сок\n\nФразы:\n• Мый сёян? — Что ешь?\n• Мый юан? — Что пьёшь?\n• Зэв бур сёян! — Очень вкусная еда!\n• Аттӧз сёянӧн — Спасибо за еду",
        passingScore: 70,
        vocabulary: [
          { wordKomi: "нянь", translationRu: "хлеб", transcription: "нянь", partOfSpeech: "noun" },
          { wordKomi: "йӧв", translationRu: "молоко", transcription: "йӧв", partOfSpeech: "noun" },
          { wordKomi: "вый", translationRu: "масло", transcription: "вый", partOfSpeech: "noun" },
          { wordKomi: "кольк", translationRu: "яйцо", transcription: "кольк", partOfSpeech: "noun" },
          { wordKomi: "сёян", translationRu: "еда", transcription: "сёян", partOfSpeech: "noun" },
          { wordKomi: "чери", translationRu: "рыба", transcription: "чери", partOfSpeech: "noun" },
          { wordKomi: "яй", translationRu: "мясо", transcription: "яй", partOfSpeech: "noun" },
          { wordKomi: "ва", translationRu: "вода", transcription: "ва", partOfSpeech: "noun" },
          { wordKomi: "рок", translationRu: "суп", transcription: "рок", partOfSpeech: "noun" },
          { wordKomi: "шаньга", translationRu: "лепёшка с начинкой", transcription: "шаньга", partOfSpeech: "noun" },
          { wordKomi: "пельнянь", translationRu: "пельмени", transcription: "пельнянь", partOfSpeech: "noun" },
        ],
        exercises: [
          {
            type: "choice",
            question: "«нянь» means:",
            questionRu: "«нянь» означает:",
            optionsJson: JSON.stringify(["суп", "хлеб", "молоко", "вода"]),
            correctAnswer: "хлеб",
            hint: "Основа питания коми.",
            scoreWeight: 1,
          },
          {
            type: "translation",
            question: "Translate: «молоко»",
            questionRu: "Переведите: «молоко»",
            optionsJson: "[]",
            correctAnswer: "йӧв",
            hint: "Три буквы.",
            scoreWeight: 2,
          },
          {
            type: "choice",
            question: "«пельнянь» literally means:",
            questionRu: "«пельнянь» буквально означает:",
            optionsJson: JSON.stringify(["хлебное ухо", "ухо хлеба", "мясной пирог", "рыбный суп"]),
            correctAnswer: "хлебное ухо",
            hint: "«пель» — ухо, «нянь» — хлеб.",
            scoreWeight: 2,
          },
          {
            type: "fill_blank",
            question: "«___» — water",
            questionRu: "«___» — вода",
            optionsJson: "[]",
            correctAnswer: "ва",
            hint: "Две буквы.",
            scoreWeight: 2,
          },
        ],
      },
    ],
  },
];

// ============================================================
// Users (admin, teacher, demo student)
// ============================================================

const USERS = [
  {
    email: "admin@komikyv.ru",
    password: "Admin123!",
    fullName: "Администратор системы",
    role: "admin",
  },
  {
    email: "teacher@komikyv.ru",
    password: "Teacher123!",
    fullName: "Преподаватель коми",
    role: "teacher",
  },
  {
    email: "student@komikyv.ru",
    password: "Student123!",
    fullName: "Ученик демо",
    role: "student",
  },
];

// ============================================================
// Seed function
// ============================================================

export async function seedDatabase() {
  console.log("🌱 Seeding Komi Kyv database...");

  // 1. Users
  for (const u of USERS) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const user = await db.user.create({
        data: {
          email: u.email,
          passwordHash: hashPassword(u.password),
          fullName: u.fullName,
          role: u.role,
          isActive: true,
          emailVerified: true, // Demo accounts are pre-verified
          pdConsentAt: new Date(),
        },
      });
      if (u.role === "student") {
        await db.studentProfile.create({
          data: { userId: user.id, level: "beginner", xp: 0 },
        });
      } else if (u.role === "teacher") {
        await db.studentProfile.create({
          data: { userId: user.id, level: "advanced", xp: 1200 },
        });
      } else if (u.role === "admin") {
        await db.studentProfile.create({
          data: { userId: user.id, level: "advanced", xp: 2500 },
        });
      }
      console.log(`  ✓ user: ${u.email} (${u.role})`);
    }
  }

  const teacher = await db.user.findUnique({ where: { email: "teacher@komikyv.ru" } });
  const admin = await db.user.findUnique({ where: { email: "admin@komikyv.ru" } });

  // 2. Categories
  for (const c of CATEGORIES) {
    const existing = await db.category.findUnique({ where: { slug: c.slug } });
    if (!existing) {
      await db.category.create({ data: c });
      console.log(`  ✓ category: ${c.name}`);
    }
  }

  // 3. Achievements
  for (const a of ACHIEVEMENTS) {
    const existing = await db.achievement.findUnique({ where: { code: a.code } });
    if (!existing) {
      await db.achievement.create({ data: a });
      console.log(`  ✓ achievement: ${a.title}`);
    }
  }

  // 4. Dialog scenarios
  for (const d of DIALOG_SCENARIOS) {
    const existing = await db.dialogScenario.findFirst({ where: { title: d.title } });
    if (!existing) {
      await db.dialogScenario.create({ data: d });
      console.log(`  ✓ dialog: ${d.title}`);
    }
  }

  // 5. Modules + lessons + vocabulary + exercises
  for (const m of MODULES) {
    const existing = await db.module.findFirst({ where: { title: m.title, deletedAt: null } });
    if (existing) continue;

    const newModule = await db.module.create({
      data: {
        title: m.title,
        description: m.description,
        level: m.level,
        coverColor: m.coverColor,
        estimatedMin: m.estimatedMin,
        status: "published",
        authorId: teacher?.id,
        publishedAt: new Date(),
      },
    });

    // Categories
    for (const slug of m.categories) {
      const cat = await db.category.findUnique({ where: { slug } });
      if (cat) {
        await db.moduleCategory.create({
          data: { moduleId: newModule.id, categoryId: cat.id },
        });
      }
    }

    // Lessons
    for (let i = 0; i < m.lessons.length; i++) {
      const lesson = m.lessons[i];
      const createdLesson = await db.lesson.create({
        data: {
          moduleId: newModule.id,
          title: lesson.title,
          orderIndex: i + 1,
          theoryContent: lesson.theoryContent,
          passingScore: lesson.passingScore,
        },
      });

      // Vocabulary
      for (const v of lesson.vocabulary) {
        await db.vocabulary.create({
          data: {
            lessonId: createdLesson.id,
            wordKomi: v.wordKomi,
            translationRu: v.translationRu,
            transcription: v.transcription || null,
            exampleKomi: v.exampleKomi || null,
            exampleRu: v.exampleRu || null,
            partOfSpeech: v.partOfSpeech || null,
          },
        });
      }

      // Exercises
      for (const e of lesson.exercises) {
        await db.exercise.create({
          data: {
            lessonId: createdLesson.id,
            type: e.type,
            question: e.question,
            questionRu: e.questionRu || null,
            optionsJson: e.optionsJson,
            correctAnswer: e.correctAnswer,
            hint: e.hint || null,
            explanation: e.explanation || null,
            scoreWeight: e.scoreWeight ?? 1,
          },
        });
      }
    }
    console.log(`  ✓ module: ${m.title} (${m.lessons.length} lessons)`);
  }

  // Give the demo student some initial achievements + xp for nicer dashboard
  const student = await db.user.findUnique({ where: { email: "student@komikyv.ru" } });
  if (student) {
    const firstLessonAch = await db.achievement.findUnique({ where: { code: "first_lesson" } });
    if (firstLessonAch) {
      const has = await db.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId: student.id, achievementId: firstLessonAch.id },
        },
      });
      if (!has) {
        await db.userAchievement.create({
          data: { userId: student.id, achievementId: firstLessonAch.id },
        });
        await db.studentProfile.update({
          where: { userId: student.id },
          data: { xp: { increment: firstLessonAch.xpReward } },
        });
      }
    }
  }

  console.log("🌱 Seed complete.");
}

// Allow running directly: `bun run src/lib/seed.ts`
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
