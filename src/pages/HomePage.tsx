import { HomeHero } from '../components/HomeHero/HomeHero'
import { SearchBar } from '../components/SearchBar/SearchBar'
import { QuickLinks } from '../components/QuickLinks/QuickLinks'
import { RecommendationsSection } from '../components/Recommendations/RecommendationsSection'
import { FrequentSearches } from '../components/FrequentSearches/FrequentSearches'

export function HomePage() {
  return (
    <>
      <HomeHero />
      <SearchBar />
      <QuickLinks />
      <RecommendationsSection />
      <FrequentSearches />
    </>
  )
}

