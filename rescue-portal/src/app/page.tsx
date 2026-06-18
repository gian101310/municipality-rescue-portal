'use client'

import Link from 'next/link'
import { Shield, Bell, MapPin, Users, Phone, ArrowRight, Check, BarChart3, Lock, Globe, Zap, Headphones, ChevronRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'

const PLANS = [
  {
    name: 'Starter',
    price: '₱2,999',
    period: '/month',
    description: 'For small municipalities getting started',
    features: [
      'Up to 500 residents',
      '1 admin account',
      'GPS emergency reporting',
      'Real-time alert dashboard',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    price: '₱5,999',
    period: '/month',
    description: 'For active municipalities with rescue teams',
    features: [
      'Up to 5,000 residents',
      '10 admin accounts',
      'Everything in Starter, plus:',
      'Rescue team dispatch & shifts',
      'SMS notifications (Twilio)',
      'QR code poster system',
      'Advanced analytics & reports',
      'Priority support',
    ],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₱9,999',
    period: '/month',
    description: 'For provinces or city-level operations',
    features: [
      'Unlimited residents',
      'Unlimited admin accounts',
      'Everything in Professional, plus:',
      'Multi-barangay management',
      'Google Maps integration',
      'Voice SOS activation',
      'Browser push notifications',
      'Custom branding & subdomain',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const ONE_TIME = {
  price: '₱149,999',
  label: 'One-Time Purchase',
  description: 'Own the full platform outright. Self-host or we deploy for you. Includes 1 year of updates & support.',
}

const FEATURES = [
  { icon: Bell, title: 'Real-Time Emergency Alerts', desc: 'Instant notifications to dispatchers and rescue teams the moment a report is filed. Never miss a critical alert.', color: 'red' },
  { icon: MapPin, title: 'GPS Location Tracking', desc: 'Automatic GPS capture on every report. Live map view shows all active incidents and team positions.', color: 'blue' },
  { icon: Users, title: 'Rescue Team Dispatch', desc: 'Manage units, assign teams, track status. Shift scheduling keeps your roster organized 24/7.', color: 'green' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Incident trends, response times, severity scoring. Export CSV/PDF reports for LGU compliance.', color: 'purple' },
  { icon: Lock, title: 'Province-Locked Security', desc: 'Each municipality is locked to their registered province and barangays. Data is fully isolated between tenants.', color: 'amber' },
  { icon: Globe, title: 'Filipino & English', desc: 'Full bilingual support. Residents and admins can switch between Filipino and English at any time.', color: 'cyan' },
  { icon: Zap, title: 'Voice SOS & Offline Mode', desc: 'Voice-activated emergency trigger. PWA works even with poor connectivity — reports queue and sync.', color: 'orange' },
  { icon: Headphones, title: 'Direct Call Integration', desc: 'One-tap hotline calling from the app. Admin can call reporters directly from the dashboard.', color: 'pink' },
]

const TESTIMONIALS = [
  { name: 'Mayor Elena Santos', role: 'Municipality of San Rafael, Bulacan', text: 'RescuePortal cut our emergency response time by 40%. The GPS tracking alone is worth every peso.' },
  { name: 'MDRRMO Chief Reyes', role: 'Municipality of Rosario, Batangas', text: 'We deployed during typhoon season and it was a game-changer. Real-time alerts saved lives.' },
  { name: 'Kap. Diwata Cruz', role: 'Barangay Poblacion, Laguna', text: 'Even our senior residents can use the QR code posters. Simple, fast, and reliable.' },
]

export default function SaaSLandingPage() {
  const [billing, setBilling] = useState<'monthly' | 'one-time'>('monthly')

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-500" />
            <span className="font-bold text-lg tracking-tight">RescuePortal</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" render={<Link href="/auth/login" />}>
              Sign In
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" render={<Link href="/onboard" />}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-28 lg:py-36">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, #1e40af 0%, transparent 50%), radial-gradient(circle at 70% 50%, #7e22ce 0%, transparent 50%)'
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-8 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Trusted by LGUs across the Philippines
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
            Emergency Response<br />
            <span className="text-red-500">Made Simple</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium mb-4">
            The complete rescue coordination platform for Philippine municipalities
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            GPS-powered emergency reporting, real-time dispatch, team management, and analytics —
            deployed in minutes, not months. Give your MDRRMO the tools they deserve.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white h-14 px-8 text-base font-semibold shadow-lg shadow-red-900/40" render={<Link href="/onboard" />}>
              Start 14-Day Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 h-14 px-8 text-base" render={<Link href="/demo" />}>
              View Live Demo
            </Button>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            No credit card required · Setup in under 5 minutes · Cancel anytime
          </p>
        </div>
      </section>

      {/* Trusted By Bar */}
      <section className="py-8 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Built for Philippine Local Government Units</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-600 text-sm font-medium">
            <span>DILG Ready</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>NDRRMC Compliant</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>DOST Standards</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>LGU Tested</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Everything Your MDRRMO Needs</h2>
            <p className="text-slate-400 max-w-xl mx-auto">From the moment a resident reports an emergency to the final resolution — RescuePortal covers every step.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-${color}-600/20 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${color}-400`} />
                  </div>
                  <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Deploy in 3 Steps</h2>
            <p className="text-slate-400">Get your municipality online in under 5 minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Sign Up & Configure', desc: 'Register your municipality, set your province, barangays, and emergency hotline.' },
              { step: '2', title: 'Distribute QR Posters', desc: 'Print and post QR codes in barangay halls. Residents scan to report emergencies instantly.' },
              { step: '3', title: 'Respond & Track', desc: 'Your MDRRMO team receives real-time alerts, dispatches rescue units, and tracks everything.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-2xl mb-4 mx-auto">
                  {step}
                </div>
                <h4 className="font-semibold text-white text-lg mb-2">{title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 mb-6">Choose monthly subscription or buy the whole platform outright</p>
            <div className="inline-flex items-center bg-slate-800 rounded-full p-1 border border-slate-700">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  billing === 'monthly' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('one-time')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  billing === 'one-time' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                One-Time Purchase
              </button>
            </div>
          </div>

          {billing === 'monthly' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative bg-slate-800/50 border-slate-700 ${plan.popular ? 'border-red-500 ring-1 ring-red-500/50' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  <CardContent className="p-6 pt-8">
                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-black text-white">{plan.price}</span>
                      <span className="text-slate-400 text-sm">{plan.period}</span>
                    </div>
                    <Button
                      className={`w-full mb-6 ${plan.popular ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                      render={<Link href="/onboard" />}
                    >
                      {plan.cta}
                    </Button>
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <Card className="bg-slate-800/50 border-amber-500/50 ring-1 ring-amber-500/30">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 border border-amber-500/20">
                    FULL OWNERSHIP
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{ONE_TIME.label}</h3>
                  <p className="text-slate-400 text-sm mb-6">{ONE_TIME.description}</p>
                  <div className="flex items-baseline justify-center gap-1 mb-6">
                    <span className="text-5xl font-black text-white">{ONE_TIME.price}</span>
                    <span className="text-slate-400 text-sm">one-time</span>
                  </div>
                  <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white h-14 px-10 text-base font-semibold" render={<Link href="/onboard?plan=enterprise-one-time" />}>
                    Purchase Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {[
                      'Full source code access',
                      'Self-host or we deploy',
                      'Unlimited municipalities',
                      'Unlimited users & admins',
                      'All features included',
                      '1 year updates & support',
                      'White-label / rebrand OK',
                      'Priority email & chat support',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Trusted by Local Leaders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Can we use this without internet?', a: 'Yes. RescuePortal is a PWA (Progressive Web App). Residents can submit reports offline — they queue and sync when connectivity returns.' },
              { q: 'How is our data kept separate from other municipalities?', a: 'Every municipality is a separate tenant. All data is isolated at the database level using Row Level Security. No municipality can ever see another\'s data.' },
              { q: 'Can we change our province or coverage area?', a: 'Province and municipality assignments are locked by the platform administrator for security. Contact us to request changes.' },
              { q: 'Do residents need to download an app?', a: 'No app download needed. RescuePortal works in any mobile browser. Residents simply scan a QR code or visit your portal link.' },
              { q: 'Is this DILG/NDRRMC compliant?', a: 'RescuePortal is designed to align with Philippine DRRM standards. Reports include timestamps, GPS, severity scoring, and full audit trails required for compliance.' },
              { q: 'Can I buy the whole platform and resell it?', a: 'Yes! Our one-time purchase option gives you full source code. You can white-label, rebrand, and resell to other LGUs.' },
            ].map(({ q, a }) => (
              <details key={q} className="group bg-slate-800/50 border border-slate-700 rounded-lg">
                <summary className="flex items-center justify-between cursor-pointer p-5 text-white font-medium text-sm">
                  {q}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-red-950 via-slate-900 to-blue-950">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Modernize Your Emergency Response?
          </h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Join municipalities across the Philippines already using RescuePortal.
            Start your 14-day free trial — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white h-14 px-10 text-base font-semibold shadow-lg" render={<Link href="/onboard" />}>
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-slate-500 text-slate-200 hover:bg-slate-800/50 h-14 px-8 text-base">
              <Phone className="w-4 h-4 mr-2" />
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="font-bold text-white">RescuePortal</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                The complete emergency response platform for Philippine municipalities.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Live Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="mailto:support@rescueportal.ph" className="hover:text-white transition-colors">Email Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} RescuePortal. All rights reserved.</span>
            <span>Made in the Philippines 🇵🇭</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
