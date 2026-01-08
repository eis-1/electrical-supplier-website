import { HelmetProvider } from 'react-helmet-async';
import { AppRouter } from './router';
import '../styles/theme.css';

function App() {
  return (
    <HelmetProvider>
      <AppRouter />
    </HelmetProvider>
  );
}

export default App;
