export interface ChildItem {
  id?: number | string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  badgeContent?: string;
  isActive?: boolean;
  external?: boolean;
  isPro?: boolean
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: LucideIcon;
  id?: number;
  to?: string;
  item?: MenuItem[];
  items?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  badgeContent?: string;
  isActive?: boolean;
  isPro?: boolean
}

import { uniqueId } from "lodash";

import {
  LucideIcon,
  LayoutDashboard,
  AlertTriangle,
  Boxes,
  Globe2,
  TrendingUp,
  ClipboardList,
  Sliders,
  Home,
  Package,
  PlusCircle,
  Search,
  Trash2,
  HeartPulse,
  BarChart3,
  DollarSign,
  Target,
  Truck,
  Building2,
  CalendarRange,
  ListChecks,
  Lightbulb,
} from "lucide-react"

// Sidebar navigation for the Inventory Planning app. The original template
// shipped many additional demo sections (Dashboard/Modern, Pages, Apps, UI
// Elements, Form Elements, Widgets, Icons, Auth, Tables, Charts, PRO Pages)
// that aren't part of this product -- removed so the sidebar lists exactly
// the features that exist here. The Modern demo dashboard itself is still
// reachable at /dashboards/modern; it's just not linked from the sidebar.
const SidebarContent: MenuItem[] = [
  {
    heading: "Inventory Planning",
    items: [
      { id: uniqueId(), name: "Overview", icon: LayoutDashboard, url: "/inventory" },
      { id: uniqueId(), name: "Order Now", icon: AlertTriangle, url: "/inventory/order-now" },
      { id: uniqueId(), name: "Catalogue", icon: Boxes, url: "/inventory/catalogue" },
      { id: uniqueId(), name: "Geography", icon: Globe2, url: "/inventory/geography" },
      { id: uniqueId(), name: "Forecasts", icon: TrendingUp, url: "/inventory/forecasts" },
      { id: uniqueId(), name: "Policy", icon: ClipboardList, url: "/inventory/policy" },
      { id: uniqueId(), name: "What-if", icon: Sliders, url: "/inventory/what-if" },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { id: uniqueId(), name: "Stock Health", icon: HeartPulse, url: "/analytics/stock-health" },
      { id: uniqueId(), name: "Demand Analysis", icon: BarChart3, url: "/analytics/demand" },
      { id: uniqueId(), name: "Cost Analysis", icon: DollarSign, url: "/analytics/cost" },
      { id: uniqueId(), name: "KPI & Performance", icon: Target, url: "/analytics/kpi" },
      { id: uniqueId(), name: "Supplier Analysis", icon: Truck, url: "/analytics/supplier" },
      { id: uniqueId(), name: "Warehouse Analysis", icon: Building2, url: "/analytics/warehouse" },
      { id: uniqueId(), name: "Demand Forecast", icon: CalendarRange, url: "/analytics/forecast" },
      { id: uniqueId(), name: "ABC Analysis", icon: ListChecks, url: "/analytics/abc" },
      { id: uniqueId(), name: "Insights", icon: Lightbulb, url: "/analytics/insights" },
    ],
  },
  {
    heading: "Product Catalog",
    items: [
      { id: uniqueId(), name: "Home", icon: Home, url: "/apps/products" },
      { id: uniqueId(), name: "Products", icon: Package, url: "/apps/products/list" },
      { id: uniqueId(), name: "Add Product", icon: PlusCircle, url: "/apps/products/add" },
      { id: uniqueId(), name: "Search Product", icon: Search, url: "/apps/products/search" },
      { id: uniqueId(), name: "Remove Product", icon: Trash2, url: "/apps/products/remove" },
    ],
  },
];

export default SidebarContent;
