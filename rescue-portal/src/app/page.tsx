'use client'

import Link from 'next/link'
import { Shield, Bell, MapPin, Users, Phone, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DemoBanner } from '@/components/demo-banner'
import { useSettings } from '@/lib/settings-context'

export default function LandingPage() {
  const { settings } = useSettings()
  const municipalityName = settings.municipalityName
  const hotline = settings.hotline

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      <DemoBanner />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-500" />
            <span className="font-bold text-lg tracking-tight">RescuePortal</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#hotline" className="hover:text-white transition-colors">Emergency</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" render={<Link href="/auth/login" />}>
              Sign In
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" render={<Link href="/auth/login?role=resident" />}>
              Get Help
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, #1e40af 0%, transparent 50%), radial-gradient(circle at 70% 50%, #7e22ce 0%, transparent 50%)'
        }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-600/20 border border-red-500/30 mb-8 mx-auto">
            <Shield className="w-10 h-10 text-red-400" />
          </div>

          <div className="inline-flex items-center gap-2 bg-slate-800/60 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-6 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {municipalityName} — Active Emergency Response
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4">
            Rescue<span className="text-red-500">Portal</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium mb-3">
            Municipal Emergency Response System
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Report emergencies instantly, track rescue operations in real time, and connect with
            municipal rescue teams—all from your phone.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white h-14 px-8 text-base font-semibold shadow-lg shadow-red-900/40" render={<Link href="/auth/login?role=resident" />}>
              <Shield className="w-5 h-5 mr-2" />
              Request Rescue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 h-14 px-8 text-base" render={<Link href="/admin" />}>
              Admin Dashboard
            </Button>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Registered residents get priority response.{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 underline">
              Register now
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Built for Emergency Response</h2>
            <p className="text-slate-400">Everything your municipality needs to respond faster.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Real-Time Alerts</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Instant notifications to dispatchers and rescue teams the moment an emergency is reported.
                  Telegram integration keeps teams connected.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">GPS Tracking</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Automatic location capture on report submission. Live map view shows all active
                  incidents and team positions.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Team Dispatch</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Manage rescue units, assign teams, and track operation status from a single
                  command center dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Emergency Hotline Banner */}
      <section id="hotline" className="py-12 bg-red-950/40 border-y border-red-900/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-red-300 font-medium uppercase tracking-widest mb-2">Emergency Hotline</p>
          <a
            href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
            className="text-4xl md:text-5xl font-black text-white hover:text-red-300 transition-colors flex items-center justify-center gap-3"
          >
            <Phone className="w-8 h-8 md:w-10 md:h-10 text-red-400" />
            {hotline}
          </a>
          <p className="text-slate-400 mt-4 text-sm">
            Available 24 hours a day, 7 days a week · {municipalityName}
          </p>
          {settings.secondaryHotline && (
            <p className="mt-2 text-sm text-slate-300">
              Secondary: <a href={`tel:${settings.secondaryHotline.replace(/[^0-9+]/g, '')}`} className="text-red-300 hover:text-white font-semibold">{settings.secondaryHotline}</a>
            </p>
          )}
          <p className="mt-3 text-xs text-red-400/70 font-medium">
            For life-threatening emergencies, also call 911 (National Emergency Hotline)
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { step: '1', title: 'Register', desc: 'Create your resident account with a valid ID', color: 'blue' },
              { step: '2', title: 'Report', desc: 'Tap SOS and describe your emergency', color: 'red' },
              { step: '3', title: 'Dispatch', desc: 'Nearest team is assigned and dispatched', color: 'amber' },
              { step: '4', title: 'Respond', desc: 'Track the team live until they arrive', color: 'green' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black text-xl mb-3">
                  {step}
                </div>
                <h4 className="font-semibold text-white mb-1">{title}</h4>
                <p className="text-slate-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span>© {new Date().getFullYear()} RescuePortal — {municipalityName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors">Staff Login</Link>
            <Link href="/auth/register" className="hover:text-slate-300 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
