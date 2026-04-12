import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BootjeGame from './BootjeGame.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BootjeGame />
  </StrictMode>,
)
