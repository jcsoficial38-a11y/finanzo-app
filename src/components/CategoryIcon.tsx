import React from 'react';
import {
  ShoppingCart,
  ShoppingBag,
  Store,
  Pill,
  IceCream,
  Pizza,
  Utensils,
  Sandwich,
  Coffee,
  Car,
  Fuel,
  Bike,
  Truck,
  Droplets,
  Droplet,
  Zap,
  Lightbulb,
  Wifi,
  Smartphone,
  Phone,
  Flame,
  Package,
  Tv,
  Film,
  HeartPulse,
  Stethoscope,
  Home,
  Briefcase,
  Laptop,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Receipt,
  Sparkles,
  Gift,
  GraduationCap,
  Tag,
  CircleDollarSign,
  Plane,
  LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  // Retail & Groceries
  ShoppingCart,
  ShoppingBag,
  Store,
  Package,

  // Health
  Pill,
  HeartPulse,
  Stethoscope,

  // Food & Dining
  IceCream,
  Pizza,
  Utensils,
  Sandwich,
  Coffee,

  // Transport & Auto
  Car,
  Fuel,
  Bike,
  Truck,
  Plane,

  // Utilities & Home
  Droplets,
  Droplet,
  Zap,
  Lightbulb,
  Flame,
  Home,

  // Telecom & Media
  Wifi,
  Smartphone,
  Phone,
  Tv,
  Film,

  // Work & Finance
  Briefcase,
  Laptop,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Receipt,
  CircleDollarSign,

  // General
  Sparkles,
  Gift,
  GraduationCap,
  Tag,
};

interface CategoryIconProps extends LucideProps {
  name?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  const IconComponent = (name && ICON_MAP[name]) ? ICON_MAP[name] : Tag;
  return <IconComponent {...props} />;
};

export function getAvailableIconNames(): string[] {
  return Object.keys(ICON_MAP);
}
