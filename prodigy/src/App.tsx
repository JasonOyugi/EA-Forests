import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { useEffect } from 'react'
import { initGTM } from '@/utils/analytics'
import { tweakcnThemes } from '@/config/theme-data'
import { useThemeManager } from '@/hooks/use-theme-manager'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function ProdigyThemeDefault() {
  const { applyRadius, applyTweakcnTheme, isDarkMode } = useThemeManager()

  useEffect(() => {
    const perpetuityTheme = tweakcnThemes.find((theme) => theme.value === "perpetuity")?.preset
    if (!perpetuityTheme) return

    applyTweakcnTheme(perpetuityTheme, isDarkMode)
    applyRadius("1rem")
  }, [applyRadius, applyTweakcnTheme, isDarkMode])

  return null
}

function App() {
  // Initialize GTM on app load
  useEffect(() => {
    initGTM();
  }, []);

  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
      <ThemeProvider defaultTheme="dark" storageKey="prodigy-ui-theme">
        <ProdigyThemeDefault />
        <SidebarConfigProvider>
          <Router basename={basename}>
            <AppRouter />
          </Router>
        </SidebarConfigProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
