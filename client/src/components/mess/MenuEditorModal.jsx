import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { MEAL_META } from '../../utils/constants';
import { formatDisplayDate, getDayNameFromDateStr } from '../../utils/dateIst';

export function MenuEditorModal({
  open,
  onClose,
  date,
  mealType,
  existingMenu,
  onSave,
  onDelete,
  saving = false,
}) {
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([{ name: '', category: 'Main', isVeg: true }]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (existingMenu) {
      setDescription(existingMenu.description || '');
      setItems(
        existingMenu.items?.length
          ? existingMenu.items.map((it) => ({
              name: it.name,
              category: it.category || '',
              isVeg: it.isVeg !== undefined ? it.isVeg : true,
            }))
          : [{ name: '', category: 'Main', isVeg: true }]
      );
    } else {
      setDescription('');
      setItems([{ name: '', category: 'Main', isVeg: true }]);
    }
  }, [open, existingMenu, date, mealType]);

  if (!date || !mealType) return null;

  const addItemRow = () => {
    setItems((prev) => [...prev, { name: '', category: '', isVeg: true }]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanedItems = items
      .map((it) => ({
        name: it.name.trim(),
        category: it.category.trim() || null,
        isVeg: Boolean(it.isVeg),
      }))
      .filter((it) => it.name.length > 0);

    if (cleanedItems.length === 0) {
      setError('Please enter at least one food item.');
      return;
    }

    await onSave({
      date,
      mealType,
      description: description.trim() || null,
      items: cleanedItems,
    });
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={`${existingMenu ? 'Edit' : 'Publish'} ${MEAL_META[mealType]?.label || mealType} Menu`}
      subtitle={`${getDayNameFromDateStr(date)}, ${formatDisplayDate(date)}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Meal Note / Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Homestyle Odisha Special Lunch"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">
              Food Items ({items.length})
            </label>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-emerald-100 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Dish
            </button>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  placeholder={`Dish #${idx + 1} (e.g. Dalma, Paneer)`}
                  className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                />
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => updateItem(idx, 'category', e.target.value)}
                  placeholder="Category"
                  className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateItem(idx, 'isVeg', !item.isVeg)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition ${
                    item.isVeg
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-700'
                  }`}
                  title="Toggle Veg / Non-Veg"
                >
                  {item.isVeg ? 'VEG' : 'NON-VEG'}
                </button>
                <button
                  type="button"
                  onClick={() => removeItemRow(idx)}
                  disabled={items.length <= 1}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          {existingMenu && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(existingMenu)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Menu
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Menu'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
