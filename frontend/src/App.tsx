import { CssBaseline, ThemeProvider } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import theme from './theme';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import Conversation from './pages/Conversation';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversation/:id" element={<Conversation />} />
          <Route path="/conversation/new" element={<Conversation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
};

export default App;