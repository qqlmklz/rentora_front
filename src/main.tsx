import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { MainLayout } from './layouts/MainLayout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileFavoritesPage } from './pages/ProfileFavoritesPage'
import { CatalogPage } from './pages/CatalogPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/catalog" element={<MainLayout><CatalogPage /></MainLayout>} />
        <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
        <Route path="/profile/favorites" element={<MainLayout><ProfileFavoritesPage /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
