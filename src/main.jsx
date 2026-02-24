import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App_Final.jsx'

window.__VITE_DISABLE_FIRESTORE_LISTENERS = import.meta.env.VITE_DISABLE_FIRESTORE_LISTENERS


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
