export type ThemePreference = 'system' | 'dark' | 'dim'

const THEME_STORAGE_KEY = 'postpilot.theme-preference'

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const getSystemTheme = () => {
  if (!isBrowser()) {
    return 'dark' as const
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dim'
}

export const getStoredThemePreference = (): ThemePreference => {
  if (!isBrowser()) {
    return 'dark'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'system' || stored === 'dark' || stored === 'dim') {
    return stored
  }

  return 'dark'
}

export const resolveThemePreference = (theme: ThemePreference) => (theme === 'system' ? getSystemTheme() : theme)

export const applyThemePreference = (theme: ThemePreference) => {
  if (!isBrowser()) {
    return
  }

  const resolvedTheme = resolveThemePreference(theme)
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = 'dark'
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

