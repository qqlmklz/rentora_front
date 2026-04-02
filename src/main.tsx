import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { MainLayout } from './layouts/MainLayout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileFavoritesPage } from './pages/ProfileFavoritesPage'
import { CatalogPage } from './pages/CatalogPage'
import { PropertyPage } from './pages/PropertyPage'
import { NewPropertyPage } from './pages/NewPropertyPage'
import { ProfilePropertiesPage } from './pages/ProfilePropertiesPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/catalog" element={<MainLayout><CatalogPage /></MainLayout>} />
        <Route path="/properties/new" element={<MainLayout><NewPropertyPage /></MainLayout>} />
        <Route path="/properties/:id/edit" element={<MainLayout><NewPropertyPage /></MainLayout>} />
        <Route path="/properties/:id" element={<MainLayout><PropertyPage /></MainLayout>} />
        <Route path="/new-property" element={<MainLayout><NewPropertyPage /></MainLayout>} />
        <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
        <Route path="/profile/favorites" element={<MainLayout><ProfileFavoritesPage /></MainLayout>} />
        <Route path="/profile/properties" element={<MainLayout><ProfilePropertiesPage /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
