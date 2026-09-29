// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));


// dashboards

const ModernDashboard = Loadable(lazy(() => import('../views/dashboards/modern')));

// inventory planning
const InventoryOverview = Loadable(lazy(() => import('../views/dashboards/inventory/overview')));
const InventoryOrderNow = Loadable(lazy(() => import('../views/dashboards/inventory/order-now')));
const InventoryCatalogue = Loadable(lazy(() => import('../views/dashboards/inventory/catalogue')));
const InventoryGeography = Loadable(lazy(() => import('../views/dashboards/inventory/geography')));
const InventoryForecasts = Loadable(lazy(() => import('../views/dashboards/inventory/forecasts')));
const InventoryPolicy = Loadable(lazy(() => import('../views/dashboards/inventory/policy')));
const InventoryWhatIf = Loadable(lazy(() => import('../views/dashboards/inventory/what-if')));

// analytics
const AnalyticsStockHealth = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/stock-health')));
const AnalyticsDemand = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/demand')));
const AnalyticsCost = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/cost')));
const AnalyticsKpi = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/kpi')));
const AnalyticsSupplier = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/supplier')));
const AnalyticsWarehouse = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/warehouse')));
const AnalyticsForecastDemand = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/forecast-demand')));
const AnalyticsAbc = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/abc-analysis')));
const AnalyticsInsights = Loadable(lazy(() => import('../views/dashboards/inventory/analytics/insights')));

const Error = Loadable(lazy(() => import('../views/auth/error')));

//apps
const Blog = Loadable(lazy(() => import('../views/apps/blog/post')));
const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/detail')));
const BlogAdd = Loadable(lazy(() => import('../views/apps/blog/create')));
const BlogEdit = Loadable(lazy(() => import('../views/apps/blog/edit')));
const BlogTable = Loadable(lazy(() => import('../views/apps/blog/manage-blog')));

const Notes = Loadable(lazy(() => import('../views/apps/notes')));

// product catalog
const ProductsHome = Loadable(lazy(() => import('../views/apps/products/home')));
const ProductsList = Loadable(lazy(() => import('../views/apps/products/list')));
const ProductsAdd = Loadable(lazy(() => import('../views/apps/products/add')));
const ProductsSearch = Loadable(lazy(() => import('../views/apps/products/search')));
const ProductsRemove = Loadable(lazy(() => import('../views/apps/products/remove')));

const Tickets = Loadable(lazy(() => import('../views/apps/tickets')));
const TicketCreate = Loadable(lazy(() => import('../views/apps/tickets/create')));

// pages
const TablesPage = Loadable(lazy(() => import('../views/pages/tables')));
const FormPage = Loadable(lazy(() => import('../views/pages/form')));
const UserProfilePage = Loadable(lazy(() => import('../views/pages/user-profile')));

//icons
const SolarIcon = Loadable(lazy(() => import('../views/icons/iconify')));

// authentication

const Login2 = Loadable(lazy(() => import('../views/auth/auth2/login')));

const Register2 = Loadable(lazy(() => import('../views/auth/auth2/register')));

const ForgotPassword2 = Loadable(lazy(() => import('../views/auth/auth2/forgot-password')));

const TwoSteps2 = Loadable(lazy(() => import('../views/auth/auth2/two-steps')));

const Maintainance = Loadable(lazy(() => import('../views/auth/maintenance')));

const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <InventoryOverview /> },
      { path: '/inventory', element: <InventoryOverview /> },
      { path: '/inventory/order-now', element: <InventoryOrderNow /> },
      { path: '/inventory/catalogue', element: <InventoryCatalogue /> },
      { path: '/inventory/geography', element: <InventoryGeography /> },
      { path: '/inventory/forecasts', element: <InventoryForecasts /> },
      { path: '/inventory/policy', element: <InventoryPolicy /> },
      { path: '/inventory/what-if', element: <InventoryWhatIf /> },

      { path: '/analytics/stock-health', element: <AnalyticsStockHealth /> },
      { path: '/analytics/demand', element: <AnalyticsDemand /> },
      { path: '/analytics/cost', element: <AnalyticsCost /> },
      { path: '/analytics/kpi', element: <AnalyticsKpi /> },
      { path: '/analytics/supplier', element: <AnalyticsSupplier /> },
      { path: '/analytics/warehouse', element: <AnalyticsWarehouse /> },
      { path: '/analytics/forecast', element: <AnalyticsForecastDemand /> },
      { path: '/analytics/abc', element: <AnalyticsAbc /> },
      { path: '/analytics/insights', element: <AnalyticsInsights /> },

      { path: '/dashboards/modern', element: <ModernDashboard /> },

      { path: '/apps/blog/post', element: <Blog /> },
      { path: '/apps/blog/detail/:id', element: <BlogDetail /> },
      { path: '/apps/blog/create', element: <BlogAdd /> },
      { path: '/apps/blog/edit', element: <BlogEdit /> },
      { path: '/apps/blog/manage-blog', element: <BlogTable /> },

      { path: '/apps/notes', element: <Notes /> },

      { path: '/apps/products', element: <ProductsHome /> },
      { path: '/apps/products/list', element: <ProductsList /> },
      { path: '/apps/products/add', element: <ProductsAdd /> },
      { path: '/apps/products/search', element: <ProductsSearch /> },
      { path: '/apps/products/remove', element: <ProductsRemove /> },

      { path: '/apps/tickets', element: <Tickets /> },
      { path: '/apps/tickets/create', element: <TicketCreate /> },

      { path: '/pages/tables', element: <TablesPage /> },
      { path: '/pages/form', element: <FormPage /> },
      { path: '/pages/user-profile', element: <UserProfilePage /> },

      { path: '/icons/iconify', element: <SolarIcon /> },

    
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/auth2/login', element: <Login2 /> },

      { path: '/auth/auth2/register', element: <Register2 /> },

      { path: '/auth/auth2/forgot-password', element: <ForgotPassword2 /> },

      { path: '/auth/auth2/two-steps', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintainance /> },
      { path: '404', element: <Error /> },
      { path: '/auth/404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];

const router = createBrowserRouter(Router);

export default router;
