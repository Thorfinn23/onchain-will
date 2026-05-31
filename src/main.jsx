import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error: error.message }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: 'white', padding: 40, fontFamily: 'monospace', background: '#0a0a0a', minHeight: '100vh' }}>
          <h2 style={{ color: '#e74c3c' }}>⚠️ App Error</h2>
          <pre style={{ color: '#f39c12', whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
          <p style={{ color: '#aaa', marginTop: 20 }}>Check browser console (F12) for full details.</p>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
