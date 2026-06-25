'use client'

import { useI18n, type Locale } from '@/lib/i18n-context'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
]

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { locale, setLocale } = useI18n()
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0]

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs gap-1"
        onClick={() => setLocale(locale === 'en' ? 'fil' : 'en')}
      >
        <Globe className="w-3.5 h-3.5" />
        {current.flag}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none">
        <Globe className="w-4 h-4" />
        <span className="text-xs">{current.flag} {current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={locale === lang.code ? 'bg-slate-100 font-semibold' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
