import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MovieDashboard } from './components/MovieDashboard'
import { AuthProvider } from './context/AuthContext'

const queryClient = new QueryClient()

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <MovieDashboard />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
