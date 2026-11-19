import { Toast } from '@heroui/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import '@/index.css'

import { AdminApp } from './AdminApp'
import { AdminProvider } from './store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AdminProvider>
        <AdminApp />
        <Toast.Provider placement="top" />
      </AdminProvider>
    </HashRouter>
  </StrictMode>,
)