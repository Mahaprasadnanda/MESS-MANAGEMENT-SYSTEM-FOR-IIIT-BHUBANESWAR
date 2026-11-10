import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, UtensilsCrossed, Pencil } from 'lucide-react';
import { messService } from '../../services/messService';
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

export function MessWeeklyMenuPage() {
  const [referenceDate, setReferenceDate] = useState(() => getTodayDateStrIST());
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayStr = getTodayDateStrIST();

  const fetchMenu = useCallback(async (dateStr) => {
    setLoading(true);
    setError('');
    try {
      const data = await messService.getWeeklyMenu(dateStr);
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

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => fetchMenu(referenceDate)} />;
  if (!menuData) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-brand-800 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {formatWeekRange(menuData.weekStartDate, menuData.weekEndDate)}
            </h2>
            <p className="text-xs text-slate-500">Live student-facing weekly dining schedule</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReferenceDate((p) => addDaysToDateStr(p, -7))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev Week
          </button>
          <button
            type="button"
            onClick={() => setReferenceDate(todayStr)}
            className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-emerald-100"
          >
            Current Week
          </button>
          <button
            type="button"
            onClick={() => setReferenceDate((p) => addDaysToDateStr(p, 7))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            to="/mess/manage-menu"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Menus
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {menuData.days.map((day) => (
          <div
            key={day.date}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden"
          >
            <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2.5">
              <span className="text-base font-bold text-slate-900">{day.dayName}</span>
              <span className="text-xs font-medium text-slate-500">
                {formatDisplayDate(day.date)}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {MEAL_TYPES.map((type) => {
                const mealMenu = day.meals[type];
                const meta = MEAL_META[type];
                return (
                  <div key={type} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-bold uppercase ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-slate-400">{meta.timing}</span>
                    </div>
                    {mealMenu && mealMenu.items?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {mealMenu.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-sm text-slate-800">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            <span className="font-medium">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-5 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <UtensilsCrossed className="h-4 w-4 text-slate-300 mx-auto mb-1" />
                        <span className="text-xs text-slate-400">Menu not published yet</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
