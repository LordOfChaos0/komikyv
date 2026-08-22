import { NextResponse } from "next/server";

// GET /api/alphabet — returns Komi alphabet data for interactive practice
export async function GET() {
  return NextResponse.json({
    letters: ALPHABET_LETTERS,
    vowels: ["а", "о", "у", "ы", "э", "і", "ӧ"],
    special: ["ӧ", "ї", "ы", "і"],
    consonants: ["б", "в", "г", "д", "ж", "з", "й", "к", "л", "м", "н", "п", "р", "с", "т", "ф", "х", "ц", "ч", "ш", "щ"],
  });
}

interface AlphabetLetter {
  letter: string;
  upper: string;
  name: string; // Russian name of the letter
  sound: string; // IPA transcription
  example: string; // Komi word starting with this letter
  translation: string; // Russian translation of the example
  isVowel: boolean;
  isSpecial: boolean; // ӧ, ї — special Komi letters
  isConsonant: boolean;
  description?: string;
}

const ALPHABET_LETTERS: AlphabetLetter[] = [
  { letter: "а", upper: "А", name: "а", sound: "a", example: "ай", translation: "отец", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "б", upper: "Б", name: "бэ", sound: "b", example: "бур", translation: "добрый", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "в", upper: "В", name: "вэ", sound: "v", example: "ва", translation: "вода", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "г", upper: "Г", name: "гэ", sound: "ɡ", example: "гожӧм", translation: "лето", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "д", upper: "Д", name: "дэ", sound: "d", example: "дона", translation: "дорогой", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "е", upper: "Е", name: "йэ", sound: "je", example: "ег", translation: "не (вспом. глагол)", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "ё", upper: "Ё", name: "йо", sound: "jo", example: "ёнджыка", translation: "сильнее", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "ж", upper: "Ж", name: "жэ", sound: "ʐ", example: "жиг", translation: "живой (заимств.)", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "з", upper: "З", name: "зэ", sound: "z", example: "зэр", translation: "дождь", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "і", upper: "І", name: "і", sound: "i", example: "тір", translation: "смола", isVowel: true, isSpecial: true, isConsonant: false, description: "Особая буква коми алфавита. Используется для звука [i], в отличие от русской «и»." },
  { letter: "и", upper: "И", name: "и", sound: "i", example: "ива", translation: "ива", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "й", upper: "Й", name: "й краткое", sound: "j", example: "йӧв", translation: "молоко (редко)", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "к", upper: "К", name: "ка", sound: "k", example: "керка", translation: "дом", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "л", upper: "Л", name: "эль", sound: "l", example: "лун", translation: "день", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "м", upper: "М", name: "эм", sound: "m", example: "мам", translation: "мать", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "н", upper: "Н", name: "эн", sound: "n", example: "нянь", translation: "хлеб", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "о", upper: "О", name: "о", sound: "o", example: "ош", translation: "медведь", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "ӧ", upper: "Ӧ", name: "ӧ", sound: "ɵ", example: "кӧдзыд", translation: "холод", isVowel: true, isSpecial: true, isConsonant: false, description: "Особая буква коми алфавита. Звук средний между «о» и «ё», как в шведском u. Отсутствует в русском." },
  { letter: "п", upper: "П", name: "пэ", sound: "p", example: "пу", translation: "дерево", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "р", upper: "Р", name: "эр", sound: "r", example: "рок", translation: "суп", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "с", upper: "С", name: "эс", sound: "s", example: "сёян", translation: "еда", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "т", upper: "Т", name: "тэ", sound: "t", example: "тэ", translation: "ты", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "у", upper: "У", name: "у", sound: "u", example: "ур", translation: "белка", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "ф", upper: "Ф", name: "эф", sound: "f", example: "факт", translation: "факт (заимств.)", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "х", upper: "Х", name: "ха", sound: "x", example: "хозяин", translation: "хозяин (заимств.)", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "ц", upper: "Ц", name: "цэ", sound: "ts", example: "церкӧв", translation: "церковь (заимств.)", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "ч", upper: "Ч", name: "чэ", sound: "tɕ", example: "чери", translation: "рыба", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "ш", upper: "Ш", name: "ша", sound: "ʂ", example: "шаньга", translation: "лепёшка", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "щ", upper: "Щ", name: "ща", sound: "ɕː", example: "щенок", translation: "щенок (заимств.)", isVowel: false, isSpecial: false, isConsonant: true },
  { letter: "ъ", upper: "Ъ", name: "твёрдый знак", sound: "", example: "—", translation: "разделительный знак", isVowel: false, isSpecial: false, isConsonant: false },
  { letter: "ы", upper: "Ы", name: "ы", sound: "ɨ", example: "ыджыд", translation: "большой", isVowel: true, isSpecial: true, isConsonant: false, description: "Звук, средний между «и» и «у». Встречается в русском, но в коми используется чаще." },
  { letter: "ь", upper: "Ь", name: "мягкий знак", sound: "", example: "—", translation: "мягчающий знак", isVowel: false, isSpecial: false, isConsonant: false },
  { letter: "э", upper: "Э", name: "э", sound: "e", example: "эштӧд", translation: "окончивший", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "ю", upper: "Ю", name: "йу", sound: "ju", example: "юны", translation: "пить", isVowel: true, isSpecial: false, isConsonant: false },
  { letter: "я", upper: "Я", name: "йа", sound: "ja", example: "яй", translation: "мясо", isVowel: true, isSpecial: false, isConsonant: false },
];
