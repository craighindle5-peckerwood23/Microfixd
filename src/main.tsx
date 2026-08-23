import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import OperationsConsole from './OperationsConsole.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OperationsConsole />
  </StrictMode>,
);
