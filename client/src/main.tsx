import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MantineProvider
        theme={{
          defaultRadius: 'lg',
          primaryColor: 'cyan',
          fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          headings: {
            fontFamily: "'Clash Display', 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
          }
        }}
        withCssVariables
        forceColorScheme="dark"
      >
        <Notifications position="top-right" />
        <App />
      </MantineProvider>
    </ErrorBoundary>
  </StrictMode>,
)
