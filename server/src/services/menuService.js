const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');
const { MEAL_TYPES } = require('../utils/constants');
const {
  formatDateStringIST,
  getWeekBoundsForDateStr,
  getWeekDates,
  getDayNameFromDateStr,
  getShortDayNameFromDateStr,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
} = require('../utils/dateIst');

function formatMenuRecord(menu) {
  if (!menu) return null;
  return {
    id: menu.id,
    date: toDateStrFromUTCDate(menu.date),
    mealType: menu.mealType,
    description: menu.description,
    updatedAt: menu.updatedAt,
    createdAt: menu.createdAt,
    updatedBy: menu.updatedBy
      ? {
          id: menu.updatedBy.id,
          fullName: menu.updatedBy.fullName,
          email: menu.updatedBy.email,
        }
      : null,
    items: (menu.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      isVeg: item.isVeg,
      sortOrder: item.sortOrder,
    })),
  };
}

async function getWeeklyMenu(referenceDateStr = null) {
  const refDate = referenceDateStr || formatDateStringIST(new Date());
  const { weekStartStr, weekEndStr } = getWeekBoundsForDateStr(refDate);
  const weekDates = getWeekDates(weekStartStr);

  const menus = await prisma.menu.findMany({
    where: {
      date: {
        gte: parseDateOnlyUTC(weekStartStr),
        lte: parseDateOnlyUTC(weekEndStr),
      },
    },
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      updatedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
  });

  const menuMap = new Map();
  for (const menu of menus) {
    const key = `${toDateStrFromUTCDate(menu.date)}|${menu.mealType}`;
    menuMap.set(key, formatMenuRecord(menu));
  }

  const days = weekDates.map((dateStr) => {
    const meals = {};
    for (const mealType of MEAL_TYPES) {
      meals[mealType] = menuMap.get(`${dateStr}|${mealType}`) || null;
    }
    return {
      date: dateStr,
      dayName: getDayNameFromDateStr(dateStr),
      shortDay: getShortDayNameFromDateStr(dateStr),
      meals,
    };
  });

  return {
    weekStartDate: weekStartStr,
    weekEndDate: weekEndStr,
    days,
  };
}

async function getDailyMenu(dateStr) {
  const dt = parseDateOnlyUTC(dateStr);
  const menus = await prisma.menu.findMany({
    where: { date: dt },
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      updatedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  const meals = { BREAKFAST: null, LUNCH: null, DINNER: null };
  for (const menu of menus) {
    meals[menu.mealType] = formatMenuRecord(menu);
  }

  return {
    date: dateStr,
    dayName: getDayNameFromDateStr(dateStr),
    meals,
  };
}

async function upsertMenu({ date, mealType, description, items, userId }) {
  const dateObj = parseDateOnlyUTC(date);

  const menu = await prisma.$transaction(async (tx) => {
    const existing = await tx.menu.findUnique({
      where: {
        date_mealType: {
          date: dateObj,
          mealType,
        },
      },
    });

    let targetMenu;
    if (existing) {
      await tx.menuItem.deleteMany({
        where: { menuId: existing.id },
      });
      targetMenu = await tx.menu.update({
        where: { id: existing.id },
        data: {
          description: description || null,
          updatedById: userId,
          items: {
            create: items.map((item, idx) => ({
              name: item.name.trim(),
              category: item.category ? item.category.trim() : null,
              isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
              sortOrder: idx,
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          updatedBy: { select: { id: true, fullName: true, email: true } },
        },
      });
    } else {
      targetMenu = await tx.menu.create({
        data: {
          date: dateObj,
          mealType,
          description: description || null,
          updatedById: userId,
          items: {
            create: items.map((item, idx) => ({
              name: item.name.trim(),
              category: item.category ? item.category.trim() : null,
              isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
              sortOrder: idx,
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          updatedBy: { select: { id: true, fullName: true, email: true } },
        },
      });
    }

    return targetMenu;
  });

  return formatMenuRecord(menu);
}

async function deleteMenu(menuId) {
  const existing = await prisma.menu.findUnique({ where: { id: menuId } });
  if (!existing) {
    throw new ApiError(404, 'Menu entry not found.');
  }

  await prisma.menu.delete({ where: { id: menuId } });
  return { deletedId: menuId };
}

module.exports = {
  formatMenuRecord,
  getWeeklyMenu,
  getDailyMenu,
  upsertMenu,
  deleteMenu,
};
