import { Toaster } from 'sonner';
import { Routing } from './router/Routing';

function App() {
  return (
    <>
      <Routing />
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4500}
        visibleToasts={5}
        toastOptions={{
          className: 'font-sans',
          style: { borderRadius: '0.875rem' },
        }}
      />
    </>
  );
}

export default App;
