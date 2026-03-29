import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Compass,
  Crown,
  GraduationCap,
  Mail,
  ShieldCheck,
  Users,
  X,
  BarChart3,
  FileText
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  {
    key: 'STUDENT',
    label: 'Student',
    icon: GraduationCap,
    subtitle: 'Track eligibility, register, and monitor progress.'
  },
  {
    key: 'STAFF',
    label: 'Staff',
    icon: Briefcase,
    subtitle: 'Monitor drives and student registrations.'
  },
  {
    key: 'COORDINATOR',
    label: 'Coordinator',
    icon: Users,
    subtitle: 'Filter students and manage attendance.'
  },
  {
    key: 'HEAD',
    label: 'Head',
    icon: Crown,
    subtitle: 'Create drives and oversee operations.'
  }
]

export default function LandingPage() {
  const nav = useNavigate()
  const { login } = useAuth()

  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedRoleLabel = useMemo(() => {
    const role = ROLES.find((r) => r.key === selectedRole)
    return role ? role.label : ''
  }, [selectedRole])

  const anyModalOpen = showRoleModal || showLoginModal

  function openRoleModal() {
    setShowRoleModal(true)
    setShowLoginModal(false)
  }

  function closeAllModals() {
    setShowRoleModal(false)
    setShowLoginModal(false)
  }

  function continueToLogin() {
    if (!selectedRole) return
    setShowRoleModal(false)
    setShowLoginModal(true)
  }

  async function submitLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      if (selectedRole && user.role !== selectedRole) {
        alert(`Selected role is ${selectedRoleLabel}, but this account belongs to ${user.role}.`)
        setLoading(false)
        return
      }

      if (user.role === 'STUDENT') nav('/student')
      else if (user.role === 'STAFF') nav('/staff')
      else if (user.role === 'COORDINATOR') nav('/coordinator')
      else if (user.role === 'HEAD') nav('/head')
    } catch (err) {
      alert('Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.2),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(15,23,42,0.95),transparent_45%)]" />

      <div className={`relative z-10 transition-all duration-300 ${anyModalOpen ? 'blur-sm' : 'blur-0'}`}>
        {/* Header */}
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-300/30">
              <ShieldCheck className="h-5 w-5 text-blue-300" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-slate-200">Placement Portal</span>
          </div>
        </header>

        {/* Hero Section */}
        <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-20">
          <section className="w-full max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-200">
              Internal Access Only
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Placement Portal
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
              Internal system for managing campus placements
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={openRoleModal}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-500 sm:w-auto"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600/70 bg-slate-800/45 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-slate-400 hover:bg-slate-800/70 sm:w-auto">
                <Compass className="h-4 w-4" />
                Explore
              </button>
            </div>
          </section>
        </main>

        {/* About Section */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white md:text-4xl">About the Portal</h2>
              <p className="mt-6 leading-relaxed text-slate-300">
                The Placement Portal is an internal platform designed to streamline campus recruitment processes. It enables students, staff, and coordinators to manage placements efficiently and track progress in real time.
              </p>
            </div>
          </div>
        </section>

        {/* What You Can Do Section */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto w-full max-w-7xl px-6">
            <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">What You Can Do</h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Student Card */}
              <div className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 transition group-hover:bg-blue-500/30">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Students</h3>
                <p className="mt-2 text-sm text-slate-400">Apply for jobs, track applications, and view results</p>
              </div>

              {/* Staff Card */}
              <div className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-green-400/50 hover:bg-green-500/10 hover:shadow-lg hover:shadow-green-500/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20 text-green-300 transition group-hover:bg-green-500/30">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Staff</h3>
                <p className="mt-2 text-sm text-slate-400">Manage student data and eligibility</p>
              </div>

              {/* Coordinator Card */}
              <div className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-purple-400/50 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 transition group-hover:bg-purple-500/30">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Coordinators</h3>
                <p className="mt-2 text-sm text-slate-400">Oversee placement drives and workflows</p>
              </div>

              {/* Admin Card */}
              <div className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-orange-400/50 hover:bg-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20 text-orange-300 transition group-hover:bg-orange-500/30">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Administration</h3>
                <p className="mt-2 text-sm text-slate-400">Monitor performance and analytics</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white md:text-4xl">Our Mission</h2>
              <p className="mt-6 leading-relaxed text-slate-300">
                Our mission is to simplify placement management and create a transparent, efficient system for all stakeholders.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl px-6 py-12">
            <div className="grid gap-8 md:grid-cols-3">
              {/* Left Column */}
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 ring-1 ring-blue-300/30">
                    <ShieldCheck className="h-4 w-4 text-blue-300" />
                  </div>
                  <span className="text-sm font-semibold text-white">Placement Portal</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Internal Access Only</p>
              </div>

              {/* Center Column */}
              <div>
                <h4 className="mb-4 text-sm font-semibold text-slate-200">Navigation</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-xs text-slate-400 transition hover:text-slide-200">
                      Home
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={openRoleModal}
                      className="text-xs text-slate-400 transition hover:text-slate-200"
                    >
                      Login
                    </button>
                  </li>
                  <li>
                    <a href="mailto:placement@college.edu" className="text-xs text-slate-400 transition hover:text-slate-200">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>

              {/* Right Column */}
              <div>
                <h4 className="mb-4 text-sm font-semibold text-slate-200">Contact</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    <a href="mailto:placement@college.edu" className="hover:text-slate-200">
                      placement@college.edu
                    </a>
                  </div>
                  <p className="text-xs text-slate-500">Campus Placement Office</p>
                </div>
              </div>
            </div>

            {/* Bottom Copyright */}
            <div className="mt-8 border-t border-white/5 pt-8 text-center text-xs text-slate-500">
              © 2026 Placement Portal. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* Role Selection Modal */}
      <div
        className={`fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${showRoleModal ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowRoleModal(false)
        }}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 text-slate-100 shadow-2xl transition-all duration-300 ${showRoleModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">Select Your Role</h2>
                <p className="mt-1 text-sm text-slate-300">Choose how you want to continue.</p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLES.map((role) => {
                const Icon = role.icon
                const active = selectedRole === role.key
                return (
                  <button
                    key={role.key}
                    onClick={() => setSelectedRole(role.key)}
                    className={`rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${active
                      ? 'border-blue-400 bg-blue-900/20 shadow-md shadow-blue-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${active ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">{role.label}</p>
                        <p className="mt-1 text-xs text-slate-300">{role.subtitle}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={continueToLogin}
                disabled={!selectedRole}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/55 backdrop-blur transition-opacity duration-300 ${showLoginModal ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowLoginModal(false)
        }}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border border-white/20 bg-white/15 p-6 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 ${showLoginModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Secure Login</p>
                <h3 className="mt-1 text-xl font-bold">Logging in as {selectedRoleLabel || 'User'}</h3>
              </div>
              <button
                onClick={closeAllModals}
                className="rounded-lg p-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  placeholder="you@college.edu"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
