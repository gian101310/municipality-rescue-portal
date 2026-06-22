'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

const slides = [
  // Slide 0: Title
  {
    id: 'title',
    content: `
      <div style="text-align:center;padding:40px 20px;">
        <h1 style="font-size:36px;font-weight:800;background:linear-gradient(135deg,#ef4444,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px;">RescuePortal.ph</h1>
        <p style="font-size:16px;color:#94a3b8;max-width:500px;margin:0 auto;line-height:1.5;">Complete Workflow Guide — From Registration to Case Closure</p>
        <div style="margin-top:16px;display:inline-block;padding:5px 14px;background:#1e293b;border:1px solid #334155;border-radius:20px;font-size:11px;color:#64748b;">With Screenshots, Field Highlights & Important Notes</div>
        <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
          <span style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:600;background:#1e3a5f;color:#60a5fa;border:1px solid #1d4ed8;">11 Slides</span>
          <span style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:600;background:#3d2e0f;color:#fbbf24;border:1px solid #92400e;">5 Roles</span>
          <span style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:600;background:#0f3d1e;color:#4ade80;border:1px solid #166534;">8 Status Stages</span>
        </div>
      </div>
    `,
  },
  // Slide 1: System Overview
  {
    id: 'overview',
    content: `
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#334155;color:#94a3b8;margin-bottom:8px;">OVERVIEW</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">5 Roles, 1 Unified Platform</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;max-width:700px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">👤</div>
          <div style="font-size:12px;font-weight:700;color:#f1f5f9;">Resident</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Registers & submits SOS with GPS</div>
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">👑</div>
          <div style="font-size:12px;font-weight:700;color:#f1f5f9;">Super Admin</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Manages tenants & staff accounts</div>
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">🖥️</div>
          <div style="font-size:12px;font-weight:700;color:#f1f5f9;">Admin</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Verifies residents & monitors map</div>
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">📡</div>
          <div style="font-size:12px;font-weight:700;color:#f1f5f9;">Dispatch Ops</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Dispatches & closes cases</div>
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">🚒</div>
          <div style="font-size:12px;font-weight:700;color:#f1f5f9;">Rescue Team</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Responds, arrives & completes</div>
        </div>
      </div>
    `,
  },
  // Slide 2: Registration
  {
    id: 'registration',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#1e3a5f;color:#60a5fa;margin-bottom:8px;">STEP 1</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Resident Registration</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;">
            <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div>
            <div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div>
            <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div>
            <span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/auth/register</span>
          </div>
          <div style="padding:14px;display:flex;flex-direction:column;gap:8px;">
            <div style="text-align:center;margin-bottom:6px;"><span style="font-size:12px;font-weight:700;color:#f1f5f9;">🛡️ Create Your Account</span></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Full Name *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">Juan Dela Cruz</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Phone *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">+63 9XX XXX XXXX</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Email *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">juan@email.com</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Password *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">••••••••</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Government ID Type *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">PhilSys National ID</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">ID Number *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">PSN-XXXX-XXXXX-X</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Region / Municipality / Barangay *</label><div style="padding:6px 8px;background:#0f172a;border:1px solid #334155;border-radius:4px;font-size:9px;color:#94a3b8;">Region IV-A › Laguna › San Pablo › San Lucas</div></div>
            <div style="padding:8px;background:#dc2626;border-radius:6px;color:white;font-size:11px;font-weight:700;text-align:center;margin-top:4px;">Register →</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;"><div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div><span style="font-size:10px;color:#94a3b8;">= Required / Highlighted Field</span></div>
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">All fields with * are required.</strong> Registration won't proceed if blank.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">📋</span><span><strong style="color:#38bdf8;">Accepted IDs:</strong> PhilSys, Driver's License, Passport, PhilHealth, SSS, GSIS, Voter's, Postal, Barangay, Senior Citizen, PWD</span></div>
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🔑</span><span><strong style="color:#fbbf24;">Password:</strong> Min 8 chars, uppercase + lowercase + number + special character</span></div>
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🚫</span><span><strong style="color:#f87171;">False Alert Agreement</strong> must be checked. Fake emergencies = suspension.</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">After registration:</strong> Status = "Submitted." You cannot log in until an admin approves your account.</span></div>
        </div>
      </div>
    `,
  },
  // Slide 3: Admin Approval
  {
    id: 'approval',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#3b1d5e;color:#c084fc;margin-bottom:8px;">STEP 2</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Admin Approves Resident</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;">
            <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div><div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div>
            <span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/admin</span>
          </div>
          <div style="padding:14px;">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#0f172a;border-bottom:1px solid #334155;margin:-14px -14px 12px -14px;"><div style="width:20px;height:20px;border-radius:5px;background:#3b1d5e;display:flex;align-items:center;justify-content:center;font-size:10px;">👑</div><span style="font-size:11px;font-weight:700;color:#f1f5f9;">Admin Dashboard</span><span style="font-size:8px;padding:2px 5px;border-radius:6px;background:#3b1d5e;color:#c084fc;font-weight:600;">Admin</span></div>
            <div style="font-size:10px;font-weight:700;color:#f1f5f9;margin-bottom:8px;">📋 Pending Residents</div>
            <div style="background:#0f172a;border:1px solid #92400e;border-radius:8px;padding:10px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><div style="width:24px;height:24px;border-radius:5px;background:#3d2e0f;display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div><div><div style="font-size:11px;font-weight:600;color:#e2e8f0;">Juan Dela Cruz</div><div style="font-size:9px;color:#64748b;">+63 917 XXX XXXX · PhilSys ID</div></div><span style="margin-left:auto;padding:2px 6px;border-radius:8px;font-size:8px;font-weight:600;background:#3d2e0f;color:#fbbf24;border:1px solid #92400e;">Pending</span></div>
              <div style="font-size:9px;color:#64748b;">Brgy. San Lucas, San Pablo City</div>
              <div style="display:flex;gap:4px;margin-top:6px;"><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;background:#166534;color:#4ade80;">✓ Approve</div><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;background:#3b1010;color:#f87171;">✗ Reject</div></div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Verify identity before approving.</strong> Cross-check ID type/number. Call if suspicious.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">📞</span><span><strong style="color:#38bdf8;">Direct call button</strong> available next to phone number for quick verification.</span></div>
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🚫</span><span><strong style="color:#f87171;">Rejecting = permanent block.</strong> Only reject confirmed fake/duplicate registrations.</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">Once approved:</strong> Resident can log in and submit SOS alerts immediately.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🔒</span><span><strong style="color:#38bdf8;">Only Admin & Super Admin</strong> can approve residents. Other roles cannot access this.</span></div>
        </div>
      </div>
    `,
  },
  // Slide 4: Login
  {
    id: 'login',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#1e3a5f;color:#60a5fa;margin-bottom:8px;">STEP 3</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Login & Role-Based Routing</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div><div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div><span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/auth/login</span></div>
          <div style="padding:14px;display:flex;flex-direction:column;gap:10px;">
            <div style="text-align:center;"><span style="font-size:14px;">🛡️</span><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Welcome back</div><div style="font-size:9px;color:#64748b;">Sign in to Emergency Rescue Portal</div></div>
            <div style="display:flex;gap:3px;background:#0f172a;border-radius:6px;padding:3px;border:1px solid #334155;"><div style="flex:1;padding:5px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;color:#64748b;">Resident</div><div style="flex:1;padding:5px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;background:#1e293b;color:#f1f5f9;">Staff / Admin</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Email *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">dispatcher@municipality.gov.ph</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Password *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">••••••••</div></div>
            <div style="padding:8px;background:#dc2626;border-radius:6px;color:white;font-size:11px;font-weight:700;text-align:center;">🔐 Sign In</div>
            <div style="padding:8px;background:#0f172a;border-radius:6px;border:1px solid #334155;"><div style="font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:4px;">After login, redirects to:</div><div style="display:flex;flex-wrap:wrap;gap:3px;"><span style="padding:2px 6px;border-radius:6px;font-size:8px;font-weight:600;background:#1e3a5f;color:#60a5fa;">Resident → /resident</span><span style="padding:2px 6px;border-radius:6px;font-size:8px;font-weight:600;background:#3b1d5e;color:#c084fc;">Admin → /admin</span><span style="padding:2px 6px;border-radius:6px;font-size:8px;font-weight:600;background:#0f2d3d;color:#38bdf8;">Dispatch → /dispatch</span><span style="padding:2px 6px;border-radius:6px;font-size:8px;font-weight:600;background:#3b1010;color:#f87171;">Rescue → /rescue-team</span><span style="padding:2px 6px;border-radius:6px;font-size:8px;font-weight:600;background:#1e293b;color:#94a3b8;">Staff → /staff-portal</span></div></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Must be "approved" to log in.</strong> Pending/rejected accounts see an error.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🔀</span><span><strong style="color:#38bdf8;">Two login tabs:</strong> "Resident" for community, "Staff / Admin" for all operational roles.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🔐</span><span><strong style="color:#38bdf8;">Staff credentials created by Super Admin.</strong> Staff do NOT self-register.</span></div>
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🚫</span><span><strong style="color:#f87171;">Suspended accounts</strong> blocked with: "This account is suspended."</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">Each role gets a dedicated dashboard.</strong> Auth guards prevent unauthorized access.</span></div>
        </div>
      </div>
    `,
  },
  // Slide 5: SOS Submission
  {
    id: 'sos',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#3b1010;color:#f87171;margin-bottom:8px;">STEP 4</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Resident Submits SOS</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div><div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div><span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/resident</span></div>
          <div style="padding:14px;display:flex;flex-direction:column;gap:8px;">
            <div style="text-align:center;padding:10px;background:#3b1010;border:1px solid #991b1b;border-radius:10px;"><div style="font-size:20px;">🆘</div><div style="font-size:12px;font-weight:700;color:#f87171;">Request Rescue</div><div style="font-size:9px;color:#fca5a5;">Tap to send emergency alert</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Emergency Type *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">🔥 Fire</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Description *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:9px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">House fire, 2 people trapped on 2nd floor...</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">Severity *</label><div style="padding:6px 8px;background:#0f172a;border:2px solid #f59e0b;border-radius:4px;font-size:10px;color:#e2e8f0;box-shadow:0 0 0 2px rgba(245,158,11,0.15);">🔴 Critical</div></div>
            <div><label style="font-size:9px;color:#94a3b8;font-weight:600;">📍 GPS Location</label><div style="padding:6px 8px;background:#0f172a;border:1px solid #166534;border-radius:4px;font-size:9px;color:#4ade80;">14.0689° N, 121.3254° E (auto-detected)</div></div>
            <div style="padding:8px;background:#dc2626;border-radius:6px;color:white;font-size:11px;font-weight:700;text-align:center;">🚨 SEND SOS ALERT</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🚨</span><span><strong style="color:#f87171;">GPS must be enabled!</strong> Browser asks for location permission. Critical for dispatch accuracy.</span></div>
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Emergency types:</strong> Fire, Flood, Medical, Earthquake, Vehicular Accident, Crime, Typhoon, Landslide, etc.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">📝</span><span><strong style="color:#38bdf8;">Be specific in description:</strong> How many people, floor/location, hazards present.</span></div>
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Severity:</strong> Low (non-urgent) → Medium → High (urgent) → Critical (life-threatening)</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">After submission:</strong> Reference number generated (INC-20260621-0042). Track progress in real time.</span></div>
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🚫</span><span><strong style="color:#f87171;">FALSE ALERTS = immediate suspension.</strong> Wastes critical rescue resources.</span></div>
        </div>
      </div>
    `,
  },
  // Slide 6: Admin Map & Verify
  {
    id: 'verify',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#3b1d5e;color:#c084fc;margin-bottom:8px;">STEP 5</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Admin Verifies on Map</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div><div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div><span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/admin (Map)</span></div>
          <div style="height:120px;background:linear-gradient(135deg,#1a2e1a,#0f2d3d);position:relative;border-bottom:1px solid #334155;">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:8px;color:#64748b;">Google Maps — Live Alert Pins</div>
            <div style="position:absolute;top:25%;left:28%;width:14px;height:14px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 6px #ef4444;"></div>
            <div style="position:absolute;top:55%;left:65%;width:10px;height:10px;background:#f59e0b;border-radius:50% 50% 50% 0;transform:rotate(-45deg);"></div>
            <div style="position:absolute;top:40%;left:48%;width:10px;height:10px;background:#22c55e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);"></div>
          </div>
          <div style="padding:12px;">
            <div style="font-size:9px;font-weight:700;color:#f87171;margin-bottom:6px;">🔴 New Alert — Requires Verification</div>
            <div style="background:#0f172a;border:1px solid #991b1b;border-radius:6px;padding:8px;">
              <div style="font-size:10px;font-weight:600;color:#f87171;">🔥 Fire — CRITICAL</div>
              <div style="font-size:9px;color:#94a3b8;margin:2px 0;">Juan Dela Cruz · Brgy. San Lucas</div>
              <div style="display:flex;gap:4px;margin-top:6px;"><div style="padding:3px 6px;border-radius:4px;font-size:8px;font-weight:600;background:#166534;color:#4ade80;">✓ Verify</div><div style="padding:3px 6px;border-radius:4px;font-size:8px;font-weight:600;background:#1e3a5f;color:#60a5fa;">📞 Call</div><div style="padding:3px 6px;border-radius:4px;font-size:8px;font-weight:600;background:#0f2d3d;color:#38bdf8;">🚀 Assign Unit</div></div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Verify before dispatching!</strong> Call reporter to confirm. Check GPS pin location makes sense.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🗺️</span><span><strong style="color:#38bdf8;">Pin colors:</strong> 🔴 Critical/New, 🟡 Active, 🟢 Resolved. Click any pin for details.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">👥</span><span><strong style="color:#38bdf8;">Assign Unit:</strong> Select rescue team to dispatch. Notifies them immediately.</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">Status flow:</strong> submitted → received → verified → assigned</span></div>
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">📊</span><span><strong style="color:#fbbf24;">All actions logged</strong> with timestamps in audit trail.</span></div>
        </div>
      </div>
    `,
  },
  // Slide 7: Dispatch
  {
    id: 'dispatch',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#0f2d3d;color:#38bdf8;margin-bottom:8px;">STEP 6</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Dispatch Ops — Send Mission</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div><div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div><span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/dispatch</span></div>
          <div style="padding:14px;">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#0f172a;border-bottom:1px solid #334155;margin:-14px -14px 12px -14px;"><div style="width:20px;height:20px;border-radius:5px;background:#0f2d3d;display:flex;align-items:center;justify-content:center;font-size:10px;">📡</div><span style="font-size:11px;font-weight:700;color:#f1f5f9;">Dispatch Ops</span><span style="font-size:8px;padding:2px 5px;border-radius:6px;background:#0f2d3d;color:#38bdf8;font-weight:600;">Dispatcher</span></div>
            <div style="display:flex;gap:6px;margin-bottom:10px;"><div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:6px;text-align:center;"><div style="font-size:16px;font-weight:700;color:#f59e0b;">3</div><div style="font-size:8px;color:#64748b;">PENDING</div></div><div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:6px;text-align:center;"><div style="font-size:16px;font-weight:700;color:#38bdf8;">2</div><div style="font-size:8px;color:#64748b;">DISPATCHED</div></div><div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:6px;text-align:center;"><div style="font-size:16px;font-weight:700;color:#c084fc;">1</div><div style="font-size:8px;color:#64748b;">TO CLOSE</div></div></div>
            <div style="display:flex;gap:3px;background:#0f172a;border-radius:6px;padding:2px;border:1px solid #334155;margin-bottom:10px;"><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;background:#1e293b;color:#f1f5f9;">Pending</div><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;color:#64748b;">Active</div><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;color:#64748b;">To Close</div><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;color:#64748b;">Closed</div></div>
            <div style="background:#0f172a;border:1px solid #92400e;border-radius:6px;padding:8px;">
              <div style="display:flex;align-items:center;gap:6px;"><div style="width:22px;height:22px;border-radius:4px;background:#3b1010;display:flex;align-items:center;justify-content:center;font-size:11px;">🔥</div><div><div style="font-size:10px;font-weight:600;color:#e2e8f0;">Fire — Critical</div><div style="font-size:8px;color:#64748b;">Brgy. San Lucas · 2m ago</div></div></div>
              <div style="font-size:8px;color:#94a3b8;margin:4px 0;">Verified by Admin · Unit: Alpha Team</div>
              <div style="padding:5px;text-align:center;border-radius:4px;font-size:10px;font-weight:700;background:#0f2d3d;color:#38bdf8;margin-top:6px;">🚀 Dispatch Now</div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">"Dispatch Now"</strong> sends mission. Rescue Team is notified immediately.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">📋</span><span><strong style="color:#38bdf8;">4 Tabs:</strong> Pending (awaiting dispatch) → Active (monitoring) → To Close (resolved, confirm) → Closed (archive)</span></div>
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">❗</span><span><strong style="color:#f87171;">Only verified incidents</strong> appear in Pending. Never dispatch unverified.</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">Final job:</strong> After rescue marks "resolved" → case appears in "To Close" → click "Confirm & Close Case."</span></div>
        </div>
      </div>
    `,
  },
  // Slide 8: Rescue Team
  {
    id: 'rescue',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#3b1010;color:#f87171;margin-bottom:8px;">STEP 7</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Rescue Team — Field Response</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="height:28px;background:#0f172a;display:flex;align-items:center;padding:0 10px;gap:4px;border-bottom:1px solid #334155;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></div><div style="width:6px;height:6px;border-radius:50%;background:#eab308;"></div><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div><span style="flex:1;text-align:center;font-size:9px;color:#64748b;font-family:monospace;">rescueportal.ph/rescue-team</span></div>
          <div style="padding:14px;">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#0f172a;border-bottom:1px solid #334155;margin:-14px -14px 12px -14px;"><div style="width:20px;height:20px;border-radius:5px;background:#3b1010;display:flex;align-items:center;justify-content:center;font-size:10px;">🚒</div><span style="font-size:11px;font-weight:700;color:#f1f5f9;">Rescue Portal</span><span style="font-size:8px;padding:2px 5px;border-radius:6px;background:#0f2d3d;color:#22d3ee;font-weight:600;">Responder</span></div>
            <div style="font-size:9px;font-weight:700;color:#f59e0b;margin-bottom:6px;">🔔 INCOMING SOS</div>
            <div style="background:#1a1000;border:1px solid #92400e;border-radius:6px;padding:8px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:6px;"><div style="width:22px;height:22px;border-radius:4px;background:#3b1010;display:flex;align-items:center;justify-content:center;font-size:11px;">🔥</div><div><div style="font-size:10px;font-weight:600;color:#e2e8f0;">Fire — Critical</div><div style="font-size:8px;color:#64748b;">Brgy. San Lucas · Just now</div></div><span style="padding:2px 5px;border-radius:6px;font-size:7px;font-weight:600;background:#3b1010;color:#f87171;border:1px solid #991b1b;">NEW</span></div>
              <div style="display:flex;gap:4px;margin-top:6px;"><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;background:#166534;color:#4ade80;">👍 Approve</div><div style="flex:1;padding:4px;text-align:center;border-radius:4px;font-size:9px;font-weight:600;background:#3b1010;color:#f87171;">✗ Reject</div></div>
            </div>
            <div style="font-size:9px;font-weight:700;color:#f87171;margin-bottom:6px;">🚨 Active Mission</div>
            <div style="background:#0f172a;border:1px solid #1d4ed8;border-radius:6px;padding:8px;">
              <div style="display:flex;align-items:center;gap:6px;"><div style="width:22px;height:22px;border-radius:4px;background:#1e3a5f;display:flex;align-items:center;justify-content:center;font-size:11px;">🏥</div><div><div style="font-size:10px;font-weight:600;color:#e2e8f0;">Medical — High</div><div style="font-size:8px;color:#64748b;">Brgy. Del Remedio</div></div><span style="padding:2px 5px;border-radius:6px;font-size:7px;font-weight:600;background:#1e3a5f;color:#60a5fa;border:1px solid #1d4ed8;">On the Way</span></div>
              <div style="display:flex;gap:3px;margin-top:6px;"><div style="padding:3px 5px;border-radius:3px;font-size:8px;font-weight:600;background:#1e3a5f;color:#60a5fa;">📌 Arrived</div><div style="padding:3px 5px;border-radius:3px;font-size:8px;font-weight:600;background:#0f3d1e;color:#4ade80;">✅ Complete</div><div style="padding:3px 5px;border-radius:3px;font-size:8px;font-weight:600;background:#1e3a5f;color:#60a5fa;">📞 Call</div><div style="padding:3px 5px;border-radius:3px;font-size:8px;font-weight:600;background:#0f3d1e;color:#4ade80;">🗺️ Nav</div></div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🔔</span><span><strong style="color:#f87171;">SOS toast notification</strong> pops up when new incidents detected (polls every 10 seconds).</span></div>
          <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Buttons by status:</strong><br>• Assigned → Approve/Reject<br>• Accepted → On the Way<br>• On the Way → Arrived<br>• Arrived → Complete</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">📞</span><span><strong style="color:#38bdf8;">Call</strong> dials reporter. <strong>Nav</strong> opens Google Maps with turn-by-turn directions.</span></div>
          <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">👁️</span><span><strong style="color:#38bdf8;">READ-ONLY for editing.</strong> Can only change status via action buttons. Cannot modify details.</span></div>
          <div style="background:#0f3d1e;border:1px solid #166534;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">✓</span><span><strong style="color:#4ade80;">After "Complete":</strong> Status → "resolved." Case moves to Dispatch Ops for closure.</span></div>
        </div>
      </div>
    `,
  },
  // Slide 9: Status Lifecycle
  {
    id: 'lifecycle',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#334155;color:#94a3b8;margin-bottom:8px;">REFERENCE</span>
        <h2 style="font-size:24px;font-weight:700;color:#f1f5f9;">Complete Status Lifecycle</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:700px;margin:0 auto 12px;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">📨</div><div style="font-size:10px;font-weight:700;color:#fbbf24;margin-top:2px;">Submitted</div><div style="font-size:8px;color:#64748b;">Resident</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">📥</div><div style="font-size:10px;font-weight:700;color:#60a5fa;margin-top:2px;">Received</div><div style="font-size:8px;color:#64748b;">System</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">✓</div><div style="font-size:10px;font-weight:700;color:#c084fc;margin-top:2px;">Verified</div><div style="font-size:8px;color:#64748b;">Admin</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">🚀</div><div style="font-size:10px;font-weight:700;color:#38bdf8;margin-top:2px;">Dispatched</div><div style="font-size:8px;color:#64748b;">Dispatch</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:700px;margin:0 auto 20px;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">👍</div><div style="font-size:10px;font-weight:700;color:#f87171;margin-top:2px;">Accepted</div><div style="font-size:8px;color:#64748b;">Rescue</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">🚗</div><div style="font-size:10px;font-weight:700;color:#fbbf24;margin-top:2px;">On the Way</div><div style="font-size:8px;color:#64748b;">Rescue</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">📌</div><div style="font-size:10px;font-weight:700;color:#60a5fa;margin-top:2px;">Arrived</div><div style="font-size:8px;color:#64748b;">Rescue</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;">✅</div><div style="font-size:10px;font-weight:700;color:#4ade80;margin-top:2px;">Resolved → Closed</div><div style="font-size:8px;color:#64748b;">Dispatch</div></div>
      </div>
      <div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:8px;">
        <div style="background:#3d2e0f;border:1px solid #92400e;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">⚠️</span><span><strong style="color:#fbbf24;">Chain:</strong> Resident → Admin → Dispatch → Rescue → Dispatch (close). No single role handles everything.</span></div>
        <div style="background:#0f2d3d;border:1px solid #0369a1;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🔄</span><span><strong style="color:#38bdf8;">Real-time polling:</strong> Rescue 10s, Dispatch 15s, Staff 30s. Changes visible within seconds.</span></div>
        <div style="background:#3b1010;border:1px solid #991b1b;border-radius:8px;padding:10px;font-size:11px;line-height:1.4;display:flex;gap:8px;"><span style="font-size:12px;">🚫</span><span><strong style="color:#f87171;">No skipping steps.</strong> System enforces sequential flow via API validation.</span></div>
      </div>
    `,
  },
  // Slide 10: Key Reminders
  {
    id: 'reminders',
    content: `
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#ef4444,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Key Reminders</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;max-width:800px;margin:0 auto;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">🔐</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Staff Accounts</div><div style="font-size:10px;color:#64748b;margin-top:2px;">Created by Super Admin only</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">📍</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">GPS Required</div><div style="font-size:10px;color:#64748b;margin-top:2px;">Enable location for accurate dispatch</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">✅</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Verify First</div><div style="font-size:10px;color:#64748b;margin-top:2px;">Never dispatch without verifying</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">🔒</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Role Guards</div><div style="font-size:10px;color:#64748b;margin-top:2px;">Each dashboard locked to its role</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">📊</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Full Audit Trail</div><div style="font-size:10px;color:#64748b;margin-top:2px;">Every action logged with timestamp</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">🚫</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">False Alerts</div><div style="font-size:10px;color:#64748b;margin-top:2px;">= Immediate suspension</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">📞</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Direct Calls</div><div style="font-size:10px;color:#64748b;margin-top:2px;">One-tap call on Admin & Rescue</div></div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;margin-bottom:6px;">🗺️</div><div style="font-size:12px;font-weight:700;color:#f1f5f9;">Navigation</div><div style="font-size:10px;color:#64748b;margin-top:2px;">Google Maps for rescue teams</div></div>
      </div>
      <div style="text-align:center;margin-top:24px;"><span style="display:inline-block;padding:5px 14px;background:#1e293b;border:1px solid #334155;border-radius:20px;font-size:11px;color:#64748b;">RescuePortal.ph © 2026</span></div>
    `,
  },
]

export default function HowItWorksPage() {
  const [current, setCurrent] = useState(0)
  const total = slides.length

  function goTo(i: number) { setCurrent(Math.max(0, Math.min(total - 1, i))) }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold">How It Works</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{current + 1} / {total}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="h-7 px-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(current + 1)}
            disabled={current === total - 1}
            className="h-7 px-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="h-0.5 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
          style={{ width: `${(current / (total - 1)) * 100}%` }}
        />
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 py-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-red-500' : 'w-2 bg-slate-700 hover:bg-slate-500'}`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="min-h-[calc(100vh-7.5rem)] flex items-start justify-center px-4 pb-20 pt-4">
        <div
          className="w-full max-w-[900px] animate-in fade-in slide-in-from-bottom-2 duration-300"
          key={current}
          dangerouslySetInnerHTML={{ __html: slides[current].content }}
        />
      </div>

      {/* Keyboard nav hint */}
      <div className="fixed bottom-4 right-4 text-xs text-slate-600">
        ← → arrow keys to navigate
      </div>
    </main>
  )
}
