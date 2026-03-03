import { Navigate, Route, Routes } from 'react-router-dom'
import { DevicesPage } from './pages/DevicesPage'
function App() {
  return (
    <Routes>
        <Route path="/" element={<Navigate to="/devices" replace />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="*" element={<Navigate to="/devices" replace />} />
    </Routes>
  )
}

export default App
