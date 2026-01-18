import { HelmetProvider } from 'react-helmet-async';
import { AppRouter } from './router';
import '../styles/theme.css';
import { useViewportHeightCssVar } from '../hooks/useViewportHeight';

function App() {
  useViewportHeightCssVar();

  return (
    <HelmetProvider>
      <AppRouter />
    </HelmetProvider>
  );
}

export default App;
