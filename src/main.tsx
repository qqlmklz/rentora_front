import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MainLayout } from './layouts/MainLayout'
import { HomePage } from './pages/HomePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainLayout>
      <App />
      <HomePage />
    </MainLayout>
  </StrictMode>,
)
