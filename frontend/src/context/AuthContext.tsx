import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { applyThemePreference, getStoredThemePreference, type ThemePreference } from '../utils/theme'

type User = {
  id: string
  name: string
  email: string
  avatar?: string
  isActive?: boolean
}

type AuthContextValue = {
  user: User | null
  token: string | null
  login: (user: User, token?: string) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    applyThemePreference(getStoredThemePreference())
  }, [])

  useEffect(() => {
    let ignore = false

    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        })

        if (!ignore) {
          if (response.ok) {
            const data = await response.json()
            setUser(data.user ?? null)
            setToken(null)
          } else {
            setUser(null)
            setToken(null)
          }
        }
      } catch {
        if (!ignore) {
          setUser(null)
          setToken(null)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      ignore = true
    }
  }, [])

  const login = (nextUser: User, nextToken?: string) => {
    setToken(nextToken ?? null)
    setUser(nextUser)
  }

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignore logout failures and clear the client state
    }

    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    if (!user) {
      return
    }

    let ignore = false

    const loadSettingsTheme = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/settings`, {
          credentials: 'include',
        })

        if (!ignore && response.ok) {
          const data = (await response.json().catch(() => ({}))) as { settings?: { theme?: ThemePreference } }
          const themePreference = data.settings?.theme

          if (themePreference === 'system' || themePreference === 'dark' || themePreference === 'dim') {
            applyThemePreference(themePreference)
          }
        }
      } catch {
        // Keep the locally applied theme if the settings fetch fails.
      }
    }

    void loadSettingsTheme()

    return () => {
      ignore = true
    }
  }, [user])

  useEffect(() => {
    if (!window.matchMedia) {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (getStoredThemePreference() === 'system') {
        applyThemePreference('system')
      }
    }

    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(user),
      isLoading,
    }),
    [isLoading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
