'use client';
import React, { useState } from 'react';

export function ProductPreview() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="product-preview-sec">
      <style>{`
        .product-preview-sec {
            padding: 100px 0;
            background: #f8fafc;
            font-family: 'Inter', sans-serif;
        }
        .pp-container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 24px;
        }
        .pp-header {
            text-align: center;
            margin-bottom: 60px;
        }
        .pp-header h2 {
            font-size: 42px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 16px;
            letter-spacing: -1px;
        }
        .pp-header p {
            font-size: 18px;
            color: #64748b;
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.6;
        }
        .pp-tabs {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-bottom: 40px;
        }
        .pp-tab-btn {
            padding: 12px 24px;
            border-radius: 99px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: #fff;
            color: #64748b;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }
        .pp-tab-btn.active {
            background: #0f172a;
            color: #fff;
            box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2);
            transform: translateY(-2px);
        }
        .pp-tab-btn:hover:not(.active) {
            background: #f1f5f9;
            color: #334155;
        }
        .pp-mockup-window {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            display: flex;
            height: 750px;
            position: relative;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: left;
        }
        .pp-sidebar {
            width: 250px;
            background: #fdfdfd;
            border-right: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            z-index: 10;
        }
        .pp-brand {
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 700;
            color: #0f172a;
            font-size: 16px;
            border-bottom: 1px solid #f1f5f9;
        }
        .pp-brand-icon {
            width: 28px;
            height: 28px;
            background: #22c55e;
            border-radius: 6px;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 800;
        }
        .pp-nav {
            padding: 20px 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }
        .pp-nav-item {
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .pp-nav-item.active {
            background: #f0fdf4;
            color: #16a34a;
            font-weight: 600;
        }
        .pp-nav-item:hover:not(.active) {
            background: #f8fafc;
            color: #0f172a;
        }
        .pp-content {
            flex: 1;
            background: #fff;
            position: relative;
            overflow-y: auto;
        }
        .pp-view {
            padding: 40px;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px);
            transition: all 0.4s ease;
            box-sizing: border-box;
        }
        .pp-view.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        .pp-h-title {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
            line-height: 1.2;
        }
        .pp-h-sub {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 32px;
        }
        .pp-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 32px;
        }
        .pp-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .pp-card-lbl {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
        }
        .pp-card-val {
            font-size: 36px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
            line-height: 1;
        }
        .pp-card-desc {
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.4;
        }
        .pp-quick-actions {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            background: #fdfbfa;
        }
        .pp-qa-header {
            margin-bottom: 20px;
        }
        .pp-qa-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .pp-list-item {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff;
            transition: border-color 0.2s;
            cursor: pointer;
        }
        .pp-list-item:hover {
            border-color: #cbd5e1;
        }
        .pp-li-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .pp-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: #475569;
            font-size: 14px;
            flex-shrink: 0;
        }
        .pp-li-name {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .pp-li-tag {
            padding: 2px 8px;
            border-radius: 99px;
            font-size: 11px;
            font-weight: 600;
        }
        .pp-tag-lead {
            background: #fff7ed;
            color: #ea580c;
            border: 1px solid #ffedd5;
        }
        .pp-tag-booked {
            background: #f0fdf4;
            color: #16a34a;
            border: 1px solid #dcfce7;
        }
        .pp-tag-nolead {
            background: #f1f5f9;
            color: #64748b;
            border: 1px solid #e2e8f0;
        }
        .pp-li-sub {
            font-size: 13px;
            color: #64748b;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .pp-li-sub span {
            display: block;
        }
        .pp-inv-grid {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 32px;
        }
        .pp-btn-green {
            background: #16a34a;
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            border: none;
            cursor: pointer;
        }
        .pp-btn-white {
            background: #fff;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }
        .pp-user {
            position: absolute;
            bottom: 20px;
            left: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .pp-tr-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            background: #fff;
            margin-bottom: 20px;
        }
        .pp-tr-header {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 16px;
        }
        .pp-tr-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
        }
        .pp-tr-row:last-child {
            border-bottom: none;
        }
        .pp-tr-label {
            color: #64748b;
        }
        .pp-tr-val {
            font-weight: 600;
            color: #0f172a;
            text-align: right;
        }
        .pp-tr-val.green {
            color: #10b981;
        }
        .pp-chat-window {
            background: #1e293b;
            border-radius: 12px;
            overflow: hidden;
            margin-top: 16px;
        }
        .pp-chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #334155;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 500;
        }
        .pp-chat-body {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .pp-msg {
            display: flex;
            gap: 16px;
        }
        .pp-msg-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            flex-shrink: 0;
        }
        .pp-msg-avatar.ai {
            background: #10b981;
            color: #fff;
        }
        .pp-msg-avatar.caller {
            background: #475569;
            color: #e2e8f0;
        }
        .pp-msg-content {
            font-size: 14px;
            line-height: 1.5;
            color: #f8fafc;
        }
        .pp-msg-name {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .pp-msg-name.ai {
            color: #10b981;
        }
        .pp-msg-name.caller {
            color: #94a3b8;
        }
        @media (max-width: 991px) {
            .pp-mockup-window {
                height: auto;
                min-height: 800px;
                flex-direction: column;
            }
            .pp-sidebar {
                width: 100%;
                border-right: none;
                border-bottom: 1px solid #e2e8f0;
                position: relative;
            }
            .pp-user {
                position: static;
                padding: 20px;
                border-top: 1px solid #e2e8f0;
                margin-top: 20px;
            }
            .pp-grid-3,
            .pp-inv-grid {
                grid-template-columns: 1fr;
            }
            .product-preview-sec {
                padding: 60px 0;
            }
        }
      `}</style>

      <div className="pp-container">
        <div className="pp-header">
          <h2>Your entire front office on autopilot</h2>
          <p>
            Manage leads, schedule jobs, process payments, and track the health of your business effortlessly
            from one stunning dashboard.
          </p>
        </div>

        <div className="pp-tabs">
          <button
            className={`pp-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`pp-tab-btn ${activeView === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveView('calls')}
          >
            Incoming Calls
          </button>
          <button
            className={`pp-tab-btn ${activeView === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveView('transcript')}
          >
            AI Transcript
          </button>
          <button
            className={`pp-tab-btn ${activeView === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveView('invoices')}
          >
            Invoices
          </button>
        </div>

        <div className="pp-mockup-window">
          <div className="pp-sidebar">
            <div className="pp-brand">
              <div className="pp-brand-icon">HC</div> Toushe Plumbing
            </div>
            <div className="pp-nav">
              <div
                className={`pp-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveView('dashboard')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Dashboard
              </div>
              <div
                className={`pp-nav-item ${activeView === 'calls' ? 'active' : ''}`}
                onClick={() => setActiveView('calls')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Calls
              </div>
              <div className="pp-nav-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Messages
              </div>
              <div className="pp-nav-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Customers
              </div>
              <div className="pp-nav-item" style={{ marginTop: '20px', opacity: 0.5, fontSize: '11px', textTransform: 'uppercase' }}>
                Company
              </div>
              <div
                className={`pp-nav-item ${activeView === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveView('invoices')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Invoices
              </div>
            </div>
            <div className="pp-user">
              <div className="pp-brand-icon" style={{ background: '#10b981', borderRadius: '50%', width: '32px', height: '32px', fontSize: '12px' }}>
                MH
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                Mohammad H.<br />
                <span style={{ fontWeight: 400, color: '#10b981', fontSize: '11px' }}>Max (Active)</span>
              </div>
            </div>
          </div>

          <div className="pp-content">
            {/* Dashboard View */}
            <div className={`pp-view ${activeView === 'dashboard' ? 'active' : ''}`}>
              <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>
                Dashboard
              </div>
              <div className="pp-h-title">Welcome back, Toushe Plumbing</div>
              <div className="pp-h-sub">Track usage, leads, appointments, revenue, and what needs attention next.</div>

              <div className="pp-grid-3">
                <div className="pp-card">
                  <div className="pp-card-lbl">
                    Minutes Used
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="pp-card-val">47%</div>
                  <div className="pp-card-desc">141 / 300</div>
                </div>
                <div className="pp-card">
                  <div className="pp-card-lbl">
                    Active Leads
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className="pp-card-val">5</div>
                  <div className="pp-card-desc">47 total customers</div>
                </div>
                <div className="pp-card">
                  <div className="pp-card-lbl">
                    Revenue This Month
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div className="pp-card-val">$3,240.00</div>
                  <div className="pp-card-desc">From customer payments</div>
                </div>
              </div>

              <div className="pp-quick-actions">
                <div className="pp-qa-header">
                  <div className="pp-qa-title">Quick actions</div>
                  <div className="pp-card-desc" style={{ color: '#64748b' }}>Prioritized items that need attention right now.</div>
                </div>
                <div className="pp-grid-3" style={{ marginBottom: 0 }}>
                  <div className="pp-card" style={{ boxShadow: 'none', padding: '16px' }}>
                    <div className="pp-qa-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Hot leads ready to book</div>
                    <div className="pp-card-desc" style={{ marginBottom: '12px', minHeight: '40px' }}>3 callers showed strong buying intent and haven't been followed up.</div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '12px', border: '1px solid #10b981', color: '#10b981', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      3
                    </div>
                  </div>
                  <div className="pp-card" style={{ boxShadow: 'none', padding: '16px' }}>
                    <div className="pp-qa-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Appointment tomorrow</div>
                    <div className="pp-card-desc" style={{ marginBottom: '12px', minHeight: '40px' }}>Mike Johnson - water heater replacement at 9 AM.</div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '12px', border: '1px solid #10b981', color: '#10b981', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      1
                    </div>
                  </div>
                  <div className="pp-card" style={{ boxShadow: 'none', padding: '16px' }}>
                    <div className="pp-qa-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Invoice awaiting payment</div>
                    <div className="pp-card-desc" style={{ marginBottom: '12px', minHeight: '40px' }}>Sarah Williams has an open invoice for $285.</div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '12px', border: '1px solid #10b981', color: '#10b981', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      1
                    </div>
                  </div>
                </div>
              </div>

              <div className="pp-quick-actions" style={{ marginTop: '20px', background: '#fff' }}>
                <div className="pp-qa-header">
                  <div className="pp-qa-title" style={{ marginBottom: '8px' }}>Activity feed</div>
                  <div className="pp-card-desc">Latest events across calls, leads, appointments, and payments.</div>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>James Patterson called <span style={{ color: '#64748b', fontWeight: 400 }}>— Re-pipe quote</span></div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>Mar 22, 3:15 PM</div>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Whole-house re-pipe inquiry. Ready to book.</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Appointment booked <span style={{ color: '#64748b', fontWeight: 400 }}>— David Chen</span></div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>Mar 22, 12:15 PM</div>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Annual plumbing maintenance scheduled for Thursday.</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Invoice paid <span style={{ color: '#64748b', fontWeight: 400 }}>— Lisa Rodriguez</span></div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>Mar 21, 5:15 PM</div>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>$420 paid for kitchen faucet + garbage disposal install.</div>
                </div>
              </div>
            </div>

            {/* Calls View */}
            <div className={`pp-view ${activeView === 'calls' ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>Calls</div>
              </div>

              {[
                { initials: 'MH', name: 'Mohammad Hamdallah', tag: 'Completed', tagClass: 'pp-tag-nolead', phone: '+18324041336', date: 'Mar 22, 2026 · 10:49 PM · 1:37' },
                { initials: 'MJ', name: 'Mike Johnson', tag: 'Booked', tagClass: 'pp-tag-booked', phone: '(702) 555-9876', date: 'Mar 22, 2026 · 12:15 PM · 3:03' },
                { initials: 'SW', name: 'Sarah Williams', tag: 'Lead', tagClass: 'pp-tag-lead', phone: '(702) 555-4567', date: 'Mar 21, 2026 · 05:15 PM · 5:12' },
                { initials: 'DC', name: 'David Chen', tag: 'Booked', tagClass: 'pp-tag-booked', phone: '(702) 555-8901', date: 'Mar 20, 2026 · 05:15 PM · 1:35' },
                { initials: '#', name: '(702) 555-3210', tag: 'Lead', tagClass: 'pp-tag-lead', phone: 'Mar 20, 2026 · 03:15 PM · 2:58' },
                { initials: 'LR', name: 'Lisa Rodriguez', tag: 'Booked', tagClass: 'pp-tag-booked', phone: '(702) 555-7890', date: 'Mar 19, 2026 · 05:15 PM · 3:24' },
                { initials: '#', name: '(702) 555-6543', tag: 'No Lead', tagClass: 'pp-tag-nolead', phone: 'Mar 18, 2026 · 05:15 PM · 0:32' }
              ].map((call, idx) => (
                <div key={idx} className="pp-list-item" onClick={() => setActiveView('transcript')}>
                  <div className="pp-li-left">
                    <div className="pp-avatar">{call.initials}</div>
                    <div>
                      <div className="pp-li-name">{call.name} <span className={`pp-li-tag ${call.tagClass}`}>{call.tag}</span></div>
                      <div className="pp-li-sub">
                        {call.phone && call.phone.startsWith('(') ? <span>{call.phone}</span> : null}
                        <span>{call.date || call.phone}</span>
                      </div>
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              ))}
            </div>

            {/* Invoices View */}
            <div className={`pp-view ${activeView === 'invoices' ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                  <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>Billing</div>
                  <div className="pp-h-title" style={{ marginBottom: 0 }}>Invoices</div>
                </div>
                <button className="pp-btn-green">+ New invoice</button>
              </div>
              <div className="pp-h-sub" style={{ marginBottom: '24px' }}>Create and manage invoices for your customers.</div>

              <div className="pp-inv-grid">
                <div className="pp-card">
                  <div className="pp-card-lbl">Total Revenue <span style={{ color: '#10b981', fontWeight: 700 }}>$</span></div>
                  <div className="pp-card-val">$569.00</div>
                  <div className="pp-card-desc">2 paid invoices</div>
                </div>
                <div className="pp-card">
                  <div className="pp-card-lbl">
                    Outstanding
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="pp-card-val">$1,180.00</div>
                  <div className="pp-card-desc">2 unpaid invoices</div>
                </div>
                <div className="pp-card">
                  <div className="pp-card-lbl">
                    Total Invoices
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="pp-card-val">5</div>
                  <div className="pp-card-desc">All time</div>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                {[
                  { inv: 'INV-0041', status: 'SENT', statusTag: { bg: '#eff6ff', color: '#3b82f6' }, name: 'Mike Johnson', date: '3/21/2026', amount: '$895.00', action: 'Mark paid', actionIcon: 'check' },
                  { inv: 'INV-0040', status: 'PAID', statusTag: { bg: '#f0fdf4', color: '#16a34a' }, name: 'Lisa Rodriguez', date: '3/19/2026', amount: '$420.00', action: null, actionIcon: null },
                  { inv: 'INV-0039', status: 'SENT', statusTag: { bg: '#eff6ff', color: '#3b82f6' }, name: 'Sarah Williams', date: '3/20/2026', amount: '$285.00', action: 'Mark paid', actionIcon: 'check' },
                  { inv: 'INV-0038', status: 'PAID', statusTag: { bg: '#f0fdf4', color: '#16a34a' }, name: 'David Chen', date: '3/12/2026', amount: '$149.00', action: null, actionIcon: null },
                  { inv: 'INV-0037', status: 'DRAFT', statusTag: { bg: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }, name: 'James Patterson', date: '3/22/2026', amount: '$0.00', action: 'Send', actionIcon: 'send', btnClass: 'pp-btn-white' }
                ].map((row, i) => (
                  <div key={i} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(i !== 4 ? { borderBottom: '1px solid #e2e8f0' } : {}) }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1 }}>
                        {row.inv} <span style={{ background: row.statusTag.bg, color: row.statusTag.color, border: row.statusTag.border || 'none', fontSize: '11px', padding: '4px 8px', borderRadius: '99px' }}>{row.status}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>{row.name}<br />{row.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{row.amount}</div>
                      {row.action && (
                        <button className={row.btnClass || 'pp-btn-green'} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {row.actionIcon === 'check' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13"></line>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                          )}
                          {' '}{row.action}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transcript View */}
            <div className={`pp-view ${activeView === 'transcript' ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginBottom: '24px' }} onClick={() => setActiveView('calls')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to Calls
              </div>
              <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>Call Details</div>
              <div className="pp-h-title" style={{ fontSize: '32px' }}>+18324041336</div>
              <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Mar 22, 2026, 10:49 PM · 1:37</div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                <span className="pp-li-tag pp-tag-nolead">No Lead</span>
                <span className="pp-li-tag" style={{ border: '1px solid #e2e8f0', color: '#334155', background: '#fff' }}>Completed</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="pp-tr-card" style={{ marginBottom: 0 }}>
                  <div className="pp-tr-header">Captured Information</div>
                  <div className="pp-tr-row">
                    <div className="pp-tr-label">Zip</div>
                    <div className="pp-tr-val">77441</div>
                  </div>
                  <div className="pp-tr-row">
                    <div className="pp-tr-label">Issue Type</div>
                    <div className="pp-tr-val">Leak in bathroom sink</div>
                  </div>
                  <div className="pp-tr-row">
                    <div className="pp-tr-label">Full Name</div>
                    <div className="pp-tr-val">Mohammad Hamdallah.</div>
                  </div>
                  <div className="pp-tr-row">
                    <div className="pp-tr-label">Urgency</div>
                    <div className="pp-tr-val">Urgent</div>
                  </div>
                  <div className="pp-tr-row">
                    <div className="pp-tr-label">Service Address</div>
                    <div className="pp-tr-val green">5026 Bent Tree Drive in Fulshear, Texas.</div>
                  </div>
                </div>

                <div className="pp-tr-card" style={{ marginBottom: 0 }}>
                  <div className="pp-tr-header">Location</div>
                  <div style={{ height: '200px', background: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23cbd5e1\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '15px 15px' }}></div>
                    <div style={{ zIndex: 1, padding: '8px 12px', background: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      5026 Bent Tree Drive
                    </div>
                  </div>
                </div>
              </div>

              <div className="pp-tr-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line><line x1="8" x2="16" y1="22" y2="22"></line></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>Call Recording</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Listen to the complete call.</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>0:00</div>
                  <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: '0', width: '12px', height: '12px', borderRadius: '6px', background: '#3b82f6' }}></div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>1:36</div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                </div>
              </div>

              <div className="pp-tr-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>Full Transcript</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Complete conversation from this call.</div>
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px' }}>15 turns</div>
                </div>

                <div className="pp-chat-window">
                  <div className="pp-chat-header">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#ef4444' }}></div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#eab308' }}></div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#22c55e' }}></div>
                    </div>
                    <div>Transcript</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#10b981' }}></div>
                      Recorded
                    </div>
                  </div>
                  <div className="pp-chat-body">
                    <div className="pp-msg">
                      <div className="pp-msg-avatar ai">H</div>
                      <div>
                        <div className="pp-msg-name ai">HANDYCALL AI</div>
                        <div className="pp-msg-content">Hi there, thanks for calling Toushe Plumbing. How can I help you today?</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar caller">C</div>
                      <div>
                        <div className="pp-msg-name caller">CALLER</div>
                        <div className="pp-msg-content">Yeah, can I book an appointment, please?</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar ai">H</div>
                      <div>
                        <div className="pp-msg-name ai">HANDYCALL AI</div>
                        <div className="pp-msg-content">Of course! I'd be happy to help with that. Could you give me your 5-digit ZIP code?</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar caller">C</div>
                      <div>
                        <div className="pp-msg-name caller">CALLER</div>
                        <div className="pp-msg-content">Yeah, my zip code is 77441.</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar ai">H</div>
                      <div>
                        <div className="pp-msg-name ai">HANDYCALL AI</div>
                        <div className="pp-msg-content">Great, we're available in your area. What is your full name?</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar caller">C</div>
                      <div>
                        <div className="pp-msg-name caller">CALLER</div>
                        <div className="pp-msg-content">My name is Mohammad Hamdallah.</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar ai">H</div>
                      <div>
                        <div className="pp-msg-name ai">HANDYCALL AI</div>
                        <div className="pp-msg-content">Thank you, Mohammed. What plumbing issue are you dealing with today?</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar caller">C</div>
                      <div>
                        <div className="pp-msg-name caller">CALLER</div>
                        <div className="pp-msg-content">Yeah, I'm having a leak in my bathroom.</div>
                      </div>
                    </div>
                    <div className="pp-msg">
                      <div className="pp-msg-avatar ai">H</div>
                      <div>
                        <div className="pp-msg-name ai">HANDYCALL AI</div>
                        <div className="pp-msg-content">Got it. Is this urgent, or is it something that can wait a bit?</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
