import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './context/ToastContext'
import { PermissionProvider } from './context/PermissionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </ToastProvider>
  </StrictMode>,
)

