import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, UtensilsCrossed } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { MEAL_META, MEAL_TYPES } from '../../utils/constants';
import {
  addDaysToDateStr,
  formatDisplayDate,
  formatWeekRange,
  getTodayDateStrIST,
} from '../../utils/dateIst';
import { extractApiError } from '../../utils/formatters';

export function WeeklyMenuPage() {
  const [referenceDate, setReferenceDate] = useState(() => getTodayDateStrIST());
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayStr = getTodayDateStrIST();

  const fetchMenu = useCallback(async (dateStr) => {
    setLoading(true);
    setError('');
    try {
      const data = await studentService.getWeeklyMenu(dateStr);
      setMenuData(data);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load weekly menu.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu(referenceDate);
  }, [referenceDate, fetchMenu]);

  const handleShiftWeek = (days) => {
    setReferenceDate((prev) => addDaysToDateStr(prev, days));
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => fetchMenu(referenceDate)} />;
  if (!menuData) return null;

  return (
    <div className="space-y-6">
      {/* Week Controls Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-brand-800 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {formatWeekRange(menuData.weekStartDate, menuData.weekEndDate)}
            </h2>
            <p className="text-xs text-slate-500">
              Monday through Sunday Dining Schedule · Published live by Mess Administration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleShiftWeek(-7)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev Week
          </button>
          <button
            type="button"
            onClick={() => setReferenceDate(todayStr)}
            className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-emerald-100 transition"
          >
            Current Week
          </button>
          <button
            type="button"
            onClick={() => handleShiftWeek(7)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="space-y-4">
        {menuData.days.map((day) => {
          const isToday = day.date === todayStr;
          return (
            <div
              key={day.date}
              className={`bg-white rounded-2xl border shadow-soft overflow-hidden transition ${
                isToday ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200/80'
              }`}
            >
              <div
                className={`px-6 py-3.5 border-b flex items-center justify-between ${
                  isToday ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50/80 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-slate-900">{day.dayName}</span>
                  <span className="text-xs font-medium text-slate-500">
                    {formatDisplayDate(day.date)}
                  </span>
                  {isToday ? (
                    <span className="rounded-full bg-brand-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Today
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {MEAL_TYPES.map((type) => {
                  const mealMenu = day.meals[type];
                  const meta = MEAL_META[type];
                  return (
                    <div key={type} className="p-5 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">{meta.timing}</span>
                      </div>

                      {mealMenu && mealMenu.items?.length > 0 ? (
                        <div className="space-y-2 flex-1">
                          {mealMenu.description ? (
                            <p className="text-xs text-slate-500 mb-2">{mealMenu.description}</p>
                          ) : null}
                          <ul className="space-y-1.5">
                            {mealMenu.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between gap-2 text-sm text-slate-800"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full shrink-0 ${
                                      item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                    title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                  />
                                  <span className="font-medium">{item.name}</span>
                                </span>
                                {item.category ? (
                                  <span className="text-[10px] font-medium text-slate-400 uppercase">
                                    {item.category}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                          <UtensilsCrossed className="h-5 w-5 text-slate-300 mb-1.5" />
                          <span className="text-xs font-medium text-slate-400">
                            Menu not published yet
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
