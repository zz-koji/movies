import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MovieDashboard } from './components/MovieDashboard'

const queryClient = new QueryClient()

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<MovieDashboard />
		</QueryClientProvider>
	)
}

export default App
