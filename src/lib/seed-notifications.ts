import { db } from "./db";

// Seed notifications for existing demo users so they have something to see.
export async function seedNotifications() {
  const student = await db.user.findUnique({ where: { email: "student@komikyv.ru" } });
  if (!student) return;
  const count = await db.notification.count({ where: { userId: student.id } });
  if (count > 0) return;

  await db.notification.create({
    data: {
      userId: student.id,
      type: "welcome",
      title: "Добро пожаловать! 🎉",
      message: "Вэллы! Начните обучение с раздела «Учебные модули». Удачи в изучении коми языка!",
      icon: "Sparkles",
      color: "chart-1",
      link: "modules",
    },
  });

  await db.notification.create({
    data: {
      userId: student.id,
      type: "achievement",
      title: "Новое достижение!",
      message: "Вы получили достижение «Первые шаги» (+50 XP)",
      icon: "Footprints",
      color: "chart-2",
      link: "achievements",
    },
  });

  await db.notification.create({
    data: {
      userId: student.id,
      type: "system",
      title: "Совет дня",
      message: "Используйте Cmd+K (или Ctrl+K) для быстрого поиска по платформе.",
      icon: "Lightbulb",
      color: "chart-2",
      link: "vocabulary",
    },
  });

  await db.notification.create({
    data: {
      userId: student.id,
      type: "streak",
      title: "Серия 3 дней!",
      message: "Вы занимаетесь 3 дня подряд. Так держать! 🔥",
      icon: "Flame",
      color: "chart-3",
      link: "progress",
    },
  });

  console.log("  ✓ seeded 4 demo notifications for student");
}

if (require.main === module) {
  seedNotifications()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
