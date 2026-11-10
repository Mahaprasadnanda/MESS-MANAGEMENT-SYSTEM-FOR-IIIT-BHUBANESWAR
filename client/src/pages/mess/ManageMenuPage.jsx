import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { messService } from '../../services/messService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MenuEditorModal } from '../../components/mess/MenuEditorModal';
import { MEAL_META, MEAL_TYPES } from '../../utils/constants';
import {
  addDaysToDateStr,
  formatDisplayDate,
  formatISTDateTime,
  formatWeekRange,
  getTodayDateStrIST,
} from '../../utils/dateIst';
import { extractApiError } from '../../utils/formatters';

export function ManageMenuPage() {
  const [referenceDate, setReferenceDate] = useState(() => getTodayDateStrIST());
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editorState, setEditorState] = useState({
    open: false,
    date: null,
    mealType: null,
    existingMenu: null,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadWeeklyMenu = useCallback(async (dateStr) => {
    setLoading(true);
    setError('');
    try {
      const res = await messService.getWeeklyMenu(dateStr);
      setMenuData(res);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load menu calendar.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeeklyMenu(referenceDate);
  }, [referenceDate, loadWeeklyMenu]);

  const handleSaveMenu = async (payload) => {
    setSaving(true);
    try {
      await messService.upsertMenu(payload);
      toast.success(`Saved ${MEAL_META[payload.mealType]?.label} menu for ${payload.date}`);
      setEditorState({ open: false, date: null, mealType: null, existingMenu: null });
      await loadWeeklyMenu(referenceDate);
    } catch (err) {
      toast.error(extractApiError(err, 'Failed to save menu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await messService.deleteMenu(deleteTarget.id);
      toast.success('Menu removed successfully.');
      setDeleteTarget(null);
      setEditorState({ open: false, date: null, mealType: null, existingMenu: null });
      await loadWeeklyMenu(referenceDate);
    } catch (err) {
      toast.error(extractApiError(err, 'Failed to delete menu.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => loadWeeklyMenu(referenceDate)} />;
  if (!menuData) return null;

  return (
    <div className="space-y-6">
      {/* Week Calendar Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-brand-800 flex items-center justify-center shrink-0">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Manage Menu · {formatWeekRange(menuData.weekStartDate, menuData.weekEndDate)}
            </h2>
            <p className="text-xs text-slate-500">
              Create, update, or remove Breakfast, Lunch, and Dinner items for any day
            </p>
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
            onClick={() => setReferenceDate(getTodayDateStrIST())}
            className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-emerald-100"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setReferenceDate((p) => addDaysToDateStr(p, 7))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => e.target.value && setReferenceDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Weekly Calendar Cards */}
      <div className="space-y-4">
        {menuData.days.map((day) => (
          <div
            key={day.date}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden"
          >
            <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-900">{day.dayName}</span>
                <span className="text-xs font-medium text-slate-500">
                  {formatDisplayDate(day.date)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {MEAL_TYPES.map((type) => {
                const mealMenu = day.meals[type];
                const meta = MEAL_META[type];
                return (
                  <div key={type} className="p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-bold uppercase ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditorState({
                              open: true,
                              date: day.date,
                              mealType: type,
                              existingMenu: mealMenu,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-emerald-50 transition"
                        >
                          {mealMenu ? (
                            <>
                              <Pencil className="h-3 w-3" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Publish
                            </>
                          )}
                        </button>
                      </div>

                      {mealMenu && mealMenu.items?.length > 0 ? (
                        <div className="space-y-2">
                          {mealMenu.description ? (
                            <p className="text-xs text-slate-500">{mealMenu.description}</p>
                          ) : null}
                          <ul className="space-y-1">
                            {mealMenu.items.map((item) => (
                              <li key={item.id} className="flex items-center gap-2 text-xs text-slate-800">
                                <span
                                  className={`h-2 w-2 rounded-full shrink-0 ${
                                    item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                <span className="font-medium">{item.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="py-5 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
                          Not published yet
                        </div>
                      )}
                    </div>

                    {mealMenu ? (
                      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                        Updated {formatISTDateTime(mealMenu.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <MenuEditorModal
        open={editorState.open}
        date={editorState.date}
        mealType={editorState.mealType}
        existingMenu={editorState.existingMenu}
        onClose={() => setEditorState({ open: false, date: null, mealType: null, existingMenu: null })}
        onSave={handleSaveMenu}
        onDelete={(menu) => setDeleteTarget(menu)}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Published Menu"
        description={`Are you sure you want to remove the ${deleteTarget?.mealType} menu for ${deleteTarget?.date}? Students will immediately see "Menu not published yet".`}
        confirmLabel="Delete Menu"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
