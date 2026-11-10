const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');
const env = require('../src/config/env');
const {
  getBookingWindowIST,
  getWeekDates,
  parseDateOnlyUTC,
} = require('../src/utils/dateIst');

const WEEKLY_MENU_TEMPLATES = [
  // Monday
  {
    BREAKFAST: {
      description: 'Light & energizing Monday breakfast',
      items: [
        { name: 'Idli & Medu Vada', category: 'Main', isVeg: true },
        { name: 'Sambar & Coconut Chutney', category: 'Accompaniment', isVeg: true },
        { name: 'Boiled Egg / Banana', category: 'Protein', isVeg: false },
        { name: 'Masala Tea & Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Traditional Odisha & North Indian homestyle lunch',
      items: [
        { name: 'Steamed Rice & Phulka Roti', category: 'Staple', isVeg: true },
        { name: 'Odisha Dalma', category: 'Lentils', isVeg: true },
        { name: 'Aloo Gobhi Matar', category: 'Dry Sabzi', isVeg: true },
        { name: 'Fresh Curd & Papad', category: 'Side', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Comforting Monday dinner',
      items: [
        { name: 'Tawa Roti & Jeera Rice', category: 'Staple', isVeg: true },
        { name: 'Dal Tadka', category: 'Lentils', isVeg: true },
        { name: 'Kadai Paneer', category: 'Special', isVeg: true },
        { name: 'Green Salad', category: 'Side', isVeg: true },
      ],
    },
  },
  // Tuesday
  {
    BREAKFAST: {
      description: 'Hearty Tuesday morning spread',
      items: [
        { name: 'Aloo Paratha', category: 'Main', isVeg: true },
        { name: 'Plain Curd & Mango Pickle', category: 'Accompaniment', isVeg: true },
        { name: 'Sprouts & Cornflakes', category: 'Healthy', isVeg: true },
        { name: 'Milk / Tea / Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Balanced afternoon meal',
      items: [
        { name: 'Steamed Rice & Chapati', category: 'Staple', isVeg: true },
        { name: 'Yellow Moong Dal', category: 'Lentils', isVeg: true },
        { name: 'Rajma Masala', category: 'Curry', isVeg: true },
        { name: 'Bhindi Fry & Boondi Raita', category: 'Side', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Homestyle Tuesday dinner',
      items: [
        { name: 'Phulka & Plain Rice', category: 'Staple', isVeg: true },
        { name: 'Chana Dal', category: 'Lentils', isVeg: true },
        { name: 'Mix Veg Korma', category: 'Curry', isVeg: true },
        { name: 'Suji Halwa', category: 'Dessert', isVeg: true },
      ],
    },
  },
  // Wednesday
  {
    BREAKFAST: {
      description: 'South Indian mid-week favorite',
      items: [
        { name: 'Masala Dosa', category: 'Main', isVeg: true },
        { name: 'Tomato Chutney & Sambar', category: 'Accompaniment', isVeg: true },
        { name: 'Bread Butter & Jam', category: 'Side', isVeg: true },
        { name: 'Tea / Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Mid-week special lunch',
      items: [
        { name: 'Jeera Rice & Roti', category: 'Staple', isVeg: true },
        { name: 'Masoor Dal', category: 'Lentils', isVeg: true },
        { name: 'Chicken Curry / Paneer Butter Masala', category: 'Special', isVeg: false },
        { name: 'Cucumber Onion Salad', category: 'Side', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Light Wednesday dinner',
      items: [
        { name: 'Chapati & Steamed Rice', category: 'Staple', isVeg: true },
        { name: 'Dal Fry', category: 'Lentils', isVeg: true },
        { name: 'Egg Bhurji / Matar Paneer', category: 'Main', isVeg: false },
        { name: 'Pickle & Papad', category: 'Side', isVeg: true },
      ],
    },
  },
  // Thursday
  {
    BREAKFAST: {
      description: 'Quick & wholesome Thursday breakfast',
      items: [
        { name: 'Kanda Poha & Sev', category: 'Main', isVeg: true },
        { name: 'Jalebi (2 pcs)', category: 'Sweet', isVeg: true },
        { name: 'Boiled Egg / Sprouts', category: 'Protein', isVeg: false },
        { name: 'Ginger Tea & Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Classic Thursday thali',
      items: [
        { name: 'Steamed Rice & Roti', category: 'Staple', isVeg: true },
        { name: 'Arhar Dal', category: 'Lentils', isVeg: true },
        { name: 'Baingan Bharta', category: 'Dry Sabzi', isVeg: true },
        { name: 'Kadi Pakora & Fryums', category: 'Special', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Vegetarian special dinner',
      items: [
        { name: 'Butter Roti & Veg Pulao', category: 'Staple', isVeg: true },
        { name: 'Dal Makhani', category: 'Lentils', isVeg: true },
        { name: 'Malai Kofta', category: 'Curry', isVeg: true },
        { name: 'Kheer', category: 'Dessert', isVeg: true },
      ],
    },
  },
  // Friday
  {
    BREAKFAST: {
      description: 'Campus favorite Friday breakfast',
      items: [
        { name: 'Puri & Aloo Sabzi', category: 'Main', isVeg: true },
        { name: 'Banana & Milk', category: 'Healthy', isVeg: true },
        { name: 'Tea / Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Friday special spread',
      items: [
        { name: 'Steamed Rice & Chapati', category: 'Staple', isVeg: true },
        { name: 'Dal Panchmel', category: 'Lentils', isVeg: true },
        { name: 'Fish Curry / Chilli Paneer', category: 'Special', isVeg: false },
        { name: 'Dahi Kachumber', category: 'Side', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Indo-Chinese & homestyle fusion night',
      items: [
        { name: 'Veg Fried Rice & Roti', category: 'Staple', isVeg: true },
        { name: 'Veg Manchurian Gravy', category: 'Main', isVeg: true },
        { name: 'Yellow Dal Tadka', category: 'Lentils', isVeg: true },
        { name: 'Ice Cream Cup', category: 'Dessert', isVeg: true },
      ],
    },
  },
  // Saturday
  {
    BREAKFAST: {
      description: 'Weekend starter breakfast',
      items: [
        { name: 'Chole Bhature', category: 'Main', isVeg: true },
        { name: 'Onion Pickle & Mint Chutney', category: 'Accompaniment', isVeg: true },
        { name: 'Tea / Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Saturday comfort lunch',
      items: [
        { name: 'Khichdi / Steamed Rice & Roti', category: 'Staple', isVeg: true },
        { name: 'Aloo Chokha & Beguni', category: 'Side', isVeg: true },
        { name: 'Soya Chunk Curry', category: 'Curry', isVeg: true },
        { name: 'Curd & Papad', category: 'Side', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Saturday evening meal',
      items: [
        { name: 'Chapati & Jeera Rice', category: 'Staple', isVeg: true },
        { name: 'Toor Dal Fry', category: 'Lentils', isVeg: true },
        { name: 'Palak Paneer', category: 'Curry', isVeg: true },
        { name: 'Salad', category: 'Side', isVeg: true },
      ],
    },
  },
  // Sunday
  {
    BREAKFAST: {
      description: 'Relaxed Sunday morning breakfast',
      items: [
        { name: 'Uttapam & Bread Omelette', category: 'Main', isVeg: false },
        { name: 'Sambar & Chutney', category: 'Accompaniment', isVeg: true },
        { name: 'Fruit Salad & Tea/Coffee', category: 'Beverage', isVeg: true },
      ],
    },
    LUNCH: {
      description: 'Sunday Grand Mess Feast',
      items: [
        { name: 'Chicken Dum Biryani / Veg Dum Biryani', category: 'Special', isVeg: false },
        { name: 'Mirchi Ka Salan & Boondi Raita', category: 'Accompaniment', isVeg: true },
        { name: 'Paneer Tikka Masala', category: 'Curry', isVeg: true },
        { name: 'Gulab Jamun (2 pcs)', category: 'Dessert', isVeg: true },
      ],
    },
    DINNER: {
      description: 'Light Sunday night dinner',
      items: [
        { name: 'Roti & Steamed Rice', category: 'Staple', isVeg: true },
        { name: 'Moong Dal Tadka', category: 'Lentils', isVeg: true },
        { name: 'Aloo Matar', category: 'Curry', isVeg: true },
        { name: 'Hot Milk / Salad', category: 'Side', isVeg: true },
      ],
    },
  },
];

async function seedMessAccount() {
  const existing = await prisma.user.findUnique({
    where: { email: env.messEmail },
  });

  if (existing) {
    console.log(`Mess account already exists (${env.messEmail}) — preserving existing password.`);
    return existing;
  }

  // If a previous mess account used the deprecated domain, migrate its email cleanly
  const legacyMess = await prisma.user.findFirst({
    where: { role: 'MESS' },
  });

  if (legacyMess) {
    const migrated = await prisma.user.update({
      where: { id: legacyMess.id },
      data: { email: env.messEmail },
    });
    console.log(`Migrated existing MESS account email to ${migrated.email}.`);
    return migrated;
  }

  const passwordHash = await bcrypt.hash(env.messInitialPassword, 12);
  const messUser = await prisma.user.create({
    data: {
      fullName: 'IIIT Bhubaneswar Mess Administration',
      email: env.messEmail,
      studentId: null,
      passwordHash,
      role: 'MESS',
    },
  });

  console.log(`Seeded pre-generated MESS account: ${messUser.email}`);
  return messUser;
}

async function seedWeekMenus(weekStartStr, daysCount, messUserId) {
  const dates = getWeekDates(weekStartStr).slice(0, daysCount);
  let createdCount = 0;

  for (let i = 0; i < dates.length; i += 1) {
    const dateStr = dates[i];
    const dateObj = parseDateOnlyUTC(dateStr);
    const dayTemplate = WEEKLY_MENU_TEMPLATES[i];

    for (const mealType of ['BREAKFAST', 'LUNCH', 'DINNER']) {
      const existing = await prisma.menu.findUnique({
        where: {
          date_mealType: {
            date: dateObj,
            mealType,
          },
        },
      });

      if (!existing) {
        const template = dayTemplate[mealType];
        await prisma.menu.create({
          data: {
            date: dateObj,
            mealType,
            description: template.description,
            updatedById: messUserId,
            items: {
              create: template.items.map((item, idx) => ({
                name: item.name,
                category: item.category,
                isVeg: item.isVeg,
                sortOrder: idx,
              })),
            },
          },
        });
        createdCount += 1;
      }
    }
  }

  return createdCount;
}

async function main() {
  const messUser = await seedMessAccount();
  const window = getBookingWindowIST(new Date());

  // Seed full current week (7 days) and Mon-Fri of upcoming week (leaving Sat-Sun unpublished as real state demo)
  const currentCreated = await seedWeekMenus(window.currentWeekStartStr, 7, messUser.id);
  const upcomingCreated = await seedWeekMenus(window.targetWeekStartStr, 5, messUser.id);

  console.log(
    `Seed complete: created ${currentCreated} menus for current week (${window.currentWeekStartStr}) and ${upcomingCreated} menus for upcoming week (${window.targetWeekStartStr}).`
  );
}

main()
  .catch((err) => {
    console.error('Database seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
