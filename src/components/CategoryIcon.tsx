import React from 'react';
import {
  Briefcase,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Home,
  Car,
  Coffee,
  HeartPulse,
  GraduationCap,
  CreditCard,
  Sparkles,
  Utensils,
  Smartphone,
  Film,
  Plane,
  Gift,
  Receipt,
  PiggyBank,
  Zap,
  Tag,
  CircleDollarSign,
  LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  Briefcase,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Home,
  Car,
  Coffee,
  HeartPulse,
  GraduationCap,
  CreditCard,
  Sparkles,
  Utensils,
  Smartphone,
  Film,
  Plane,
  Gift,
  Receipt,
  PiggyBank,
  Zap,
  Tag,
  CircleDollarSign,
};

interface CategoryIconProps extends LucideProps {
  name?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  const IconComponent = (name && ICON_MAP[name]) ? ICON_MAP[name] : Tag;
  return <IconComponent {...props} />;
};
