import { Routes, Route, useLocation } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import Home from './pages/Home'
import ProjectDetail from './pages/ProjectDetail'
import PageTransition from './components/PageTransition'
import CustomCursor from './components/CustomCursor'
import Noise from './components/Noise'

export default function App() {
  const location = useLocation()

  return (
    <>
      <CustomCursor />
      <Noise />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/project/:id" element={<PageTransition><ProjectDetail /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
