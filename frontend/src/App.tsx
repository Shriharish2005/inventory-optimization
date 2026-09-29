import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { FilterProvider } from './context/inventory/FilterContext';
import { ProductsProvider } from './context/products/ProductsContext';
import { Toaster } from './components/ui/sonner';
import './css/globals.css';

function App() {
  return (
    <>
      <FilterProvider>
        <ProductsProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </ProductsProvider>
      </FilterProvider>
    </>
  );
}

export default App;
