import { Routes, Route } from 'react-router-dom'
import { MainApp } from './pages/main-app'
import { ShareView } from './pages/share-view'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/share/:token" element={<ShareView />} />
    </Routes>
  )
}

export default App
