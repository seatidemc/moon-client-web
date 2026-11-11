import { useEffect } from 'react'
import {
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { ForumProvider } from '@/lib/forum-store'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SearchPage } from '@/pages/SearchPage'
import { ThreadPage } from '@/pages/ThreadPage'
import { TopicPage } from '@/pages/TopicPage'
import { UserPage } from '@/pages/UserPage'

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1))
      if (target) {
        target.scrollIntoView()
        return
      }
    }

    window.scrollTo(0, 0)
  }, [location.pathname, location.search, location.hash])

  return null
}

export default function App() {
  return (
    <ForumProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="topic/:id" element={<TopicPage />} />
          <Route path="thread/:id" element={<ThreadPage />} />
          <Route path="user/:id" element={<UserPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ForumProvider>
  )
}
