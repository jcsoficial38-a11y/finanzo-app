import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { Category, CategoryType, Transaction } from '../types/finance';
import { PASTEL_COLORS, AVAILABLE_ICONS } from '../data/initialData';
import { CategoryIcon } from './CategoryIcon';

interface CategoryManagerViewProps {
  incomeCategories: Category[];
  expenseCategories: Category[];
  transactions: Transaction[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string, type: CategoryType) => void;
}

export const CategoryManagerView: React.FC<CategoryManagerViewProps> = ({
  incomeCategories,
  expenseCategories,
  transactions,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Category Form state
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);

  // Delete confirmation
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  const currentCategories = activeTab === 'income' ? incomeCategories : expenseCategories;

  const getUsageCount = (catId: string) => {
    return transactions.filter((t) => t.categoryId === catId).length;
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    onAddCategory({
      name: newCatName.trim(),
      type: activeTab,
      color: selectedColor,
      iconName: selectedIcon,
    });

    setNewCatName('');
    setIsAddingNew(false);
  };

  const confirmDeleteCategory = () => {
    if (catToDelete) {
      onDeleteCategory(catToDelete.id, catToDelete.type);
      setCatToDelete(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Kind Tab Switcher */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
        <button
          onClick={() => {
            setActiveTab('income');
            setIsAddingNew(false);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'income'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          <span>Renda ({incomeCategories.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('expense');
            setIsAddingNew(false);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'expense'
              ? 'bg-white text-rose-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-500" />
          <span>Despesa ({expenseCategories.length})</span>
        </button>
      </div>

      {/* New Category Collapsible Form or Add Button */}
      {isAddingNew ? (
        <form
          onSubmit={handleCreateCategory}
          className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-3.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              Nova Categoria de {activeTab === 'income' ? 'Renda' : 'Despesa'}
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-medium"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Nome da Categoria
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={
                activeTab === 'income'
                  ? 'Ex: Dividendos, Vendas, Bônus'
                  : 'Ex: Delivery, Farmácia, Pets'
              }
              required
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white"
            />
          </div>

          {/* Pastel Color Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              Cor Pastel
            </label>
            <div className="flex flex-wrap gap-2">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    selectedColor === c.hex
                      ? 'scale-110 ring-2 ring-slate-800 shadow-xs'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {selectedColor === c.hex && (
                    <Check className="w-3.5 h-3.5 text-slate-800" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              Ícone da Categoria
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {AVAILABLE_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-white'
                        : 'hover:bg-white text-slate-600'
                    }`}
                  >
                    <CategoryIcon name={iconName} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Salvar Categoria
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAddingNew(true)}
          className="w-full py-3.5 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1.5 bg-white transition-colors"
        >
          <FolderPlus className="w-4 h-4 text-teal-600" />
          <span>Cadastrar Categoria de {activeTab === 'income' ? 'Renda' : 'Despesa'}</span>
        </button>
      )}

      {/* List of existing categories */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 block px-1">
          {activeTab === 'income' ? 'Fontes de Renda' : 'Tipos de Despesa'} Cadastradas ({currentCategories.length})
        </span>

        {currentCategories.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-slate-200/70 text-center">
            <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">
              Nenhuma categoria de {activeTab === 'income' ? 'renda' : 'despesa'} cadastrada.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {currentCategories.map((cat) => {
              const count = getUsageCount(cat.id);
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                      style={{
                        backgroundColor: `${cat.color}45`,
                      }}
                    >
                      <CategoryIcon
                        name={cat.iconName}
                        className="w-4 h-4 text-slate-800"
                      />
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {count} {count === 1 ? 'lançamento vinculado' : 'lançamentos vinculados'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCatToDelete(cat)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title={`Excluir categoria ${cat.name}`}
                    aria-label={`Excluir ${cat.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Category Confirmation Dialog */}
      {catToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setCatToDelete(null)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-slate-800">
                Excluir Categoria?
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir{' '}
              <strong className="text-slate-800">"{catToDelete.name}"</strong>?
              {getUsageCount(catToDelete.id) > 0 && (
                <span className="block text-rose-500 font-medium mt-1">
                  Aviso: existem {getUsageCount(catToDelete.id)} lançamentos
                  vinculados a ela.
                </span>
              )}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
