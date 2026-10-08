import React from 'react';
import { X, Tag } from 'lucide-react';
import { Category, CategoryType, Transaction } from '../types/finance';
import { CategoryManagerView } from './CategoryManagerView';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeCategories: Category[];
  expenseCategories: Category[];
  transactions: Transaction[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory?: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string, type: CategoryType) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  incomeCategories,
  expenseCategories,
  transactions,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <Tag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Gerenciar Categorias</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <CategoryManagerView
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            transactions={transactions}
            onAddCategory={onAddCategory}
            onUpdateCategory={onUpdateCategory}
            onDeleteCategory={onDeleteCategory}
          />
        </div>
      </div>
    </div>
  );
};
