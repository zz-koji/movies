import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MovieDashboard } from './components/MovieDashboard'
import { AuthProvider } from './context/AuthContext'
import { RequestedMoviesProvider } from './context/RequestedMoviesContext'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

function App() {
  return (
    <AuthProvider>
      <RequestedMoviesProvider>
        <QueryClientProvider client={queryClient}>
          <MovieDashboard />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1A1B1E',
                color: '#C1C2C5',
                border: '1px solid #373A40',
              },
              success: {
                iconTheme: {
                  primary: '#51CF66',
                  secondary: '#1A1B1E',
                },
              },
              error: {
                iconTheme: {
                  primary: '#FF6B6B',
                  secondary: '#1A1B1E',
                },
              },
            }}
          />
        </QueryClientProvider>
      </RequestedMoviesProvider>
    </AuthProvider>
  )
}

export default App
