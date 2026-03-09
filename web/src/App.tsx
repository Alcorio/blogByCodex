import { Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import MyPosts from './pages/MyPosts'
import PostDetail from './pages/PostDetail'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Posts from './pages/Posts'
import EditPost from './pages/EditPost'
import Account from './pages/Account'
import ShareCenter from './pages/ShareCenter'
import PublicShare from './pages/PublicShare'
import SharedPostDetail from './pages/SharedPostDetail'
import { useEffect } from 'react'

const App = () => {
  const { pathname } = useLocation()
  const isPublicShareRoute = pathname.startsWith('/u/')

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  return (
    <Layout
      header={isPublicShareRoute ? undefined : <Header />}
      footer={isPublicShareRoute ? undefined : <Footer />}
    >
      <Routes>
        <Route path="/u/:shareSlug" element={<PublicShare />} />
        <Route path="/u/:shareSlug/post/:slug" element={<SharedPostDetail />} />
        <Route path="/" element={<Home />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route path="/post/:slug/edit" element={<EditPost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-posts" element={<MyPosts />} />
        <Route path="/share-center" element={<ShareCenter />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
