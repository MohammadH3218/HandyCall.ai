'use client';

import React, { useState } from 'react';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import {
  IconSearch,
  IconUser,
  IconCircleCheck,
  IconBolt,
  IconMessage,
} from '@tabler/icons-react';

const SEARCH_RESULTS = [
  {
    name: 'Khalid Al-Rashidi',
    service: { en: 'AC & HVAC Repair', ar: 'تصليح وصيانة التكييف' },
    location: { en: 'Al-Malqa, Riyadh', ar: 'الملقا، الرياض' },
    rating: '4.9',
    reviews: 142,
    price: { en: 'From SAR 150', ar: 'ابتداءً من 150 ريال' },
    badge: { en: 'Top Pro', ar: 'محترف مميز' },
    badgeColor: '#10b981',
    avatar: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=56&h=56&fit=crop&q=80',
  },
  {
    name: 'Mohammed Al-Ghamdi',
    service: { en: 'AC & HVAC Repair', ar: 'تصليح وصيانة التكييف' },
    location: { en: 'Al-Rawdah, Riyadh', ar: 'الروضة، الرياض' },
    rating: '4.7',
    reviews: 88,
    price: { en: 'From SAR 120', ar: 'ابتداءً من 120 ريال' },
    badge: { en: 'Verified', ar: 'موثق' },
    badgeColor: '#3b82f6',
    avatar: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=56&h=56&fit=crop&q=80',
  },
  {
    name: 'Abdullah Al-Otaibi',
    service: { en: 'AC & HVAC Repair', ar: 'تصليح وصيانة التكييف' },
    location: { en: 'Al-Nakheel, Riyadh', ar: 'النخيل، الرياض' },
    rating: '4.8',
    reviews: 65,
    price: { en: 'From SAR 180', ar: 'ابتداءً من 180 ريال' },
    badge: { en: '', ar: '' },
    badgeColor: '',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=56&h=56&fit=crop&q=80',
  },
];

const PROFILE_REVIEWS = [
  {
    text: {
      en: 'Fixed our unit in under an hour. Fast and professional.',
      ar: 'تم إصلاح الوحدة خلال أقل من ساعة. خدمة سريعة واحترافية.',
    },
    author: 'Abdullah M.',
    stars: 5,
  },
  {
    text: {
      en: 'Arrived on time, fair pricing, would book again.',
      ar: 'وصل في الموعد المحدد، والأسعار كانت عادلة. سأحجز معه مرة أخرى.',
    },
    author: 'Hessa K.',
    stars: 5,
  },
  {
    text: {
      en: 'Good work overall, explained everything clearly.',
      ar: 'العمل كان ممتازًا بشكل عام، وشرح كل شيء بوضوح.',
    },
    author: 'Tariq F.',
    stars: 4,
  },
];

export function ProductPreview() {
  const [activeView, setActiveView] = useState<'search' | 'profile' | 'booking'>('search');
  const { language, isArabic } = useMarketingLanguage();

  const copy = isArabic
    ? {
        heading: 'منزلك في أيدٍ أمينة.',
        description: 'تصفح آلاف المحترفين الموثقين في السعودية، من تصليح المكيفات إلى التنظيف العميق. قارن وتواصل واحجز خلال دقائق.',
        tabSearch: 'نتائج البحث',
        tabProfile: 'ملف المحترف',
        tabBooking: 'تم تأكيد الحجز',
        country: 'السعودية',
        search: 'البحث',
        searchSummary: 'تصليح مكيفات · الرياض',
        prosFound: 'تم العثور على 3 محترفين',
        filters: 'الفلاتر',
        topProOnly: 'المحترفون المميزون فقط',
        availableToday: 'متاح اليوم',
        under200: 'أقل من 200 ريال',
        sort: 'الترتيب',
        bestMatch: 'الأفضل تطابقًا',
        results: '3 نتائج',
        quote: 'عرض سعر',
        clickPrompt: 'اضغط على أي محترف لعرض الملف الكامل ←',
        backToResults: '← العودة إلى النتائج',
        profileTitle: 'أخصائي تكييف وتبريد',
        reviews: 'تقييم',
        repliesIn: 'يرد خلال 15 دقيقة',
        message: 'مراسلة',
        getQuote: 'احصل على عرض سعر →',
        about: 'نبذة',
        aboutText: 'أكثر من 12 سنة خبرة في صيانة جميع ماركات المكيفات الرئيسية في الرياض. فني مرخص وجميع الأعمال مضمونة ومتاح طوال الأسبوع.',
        servicesPricing: 'الخدمات والأسعار',
        recentReviews: 'أحدث التقييمات',
        bookingConfirmed: 'تم تأكيد الحجز!',
        service: 'الخدمة',
        pro: 'المحترف',
        date: 'التاريخ',
        time: 'الوقت',
        location: 'الموقع',
        estimate: 'التقدير السعري',
        payment: 'الدفع',
        paymentValue: 'في الموقع (نقدًا/بطاقة)',
        bookingNote: 'تم إرسال رسالة تأكيد إلى رقمك. ستصلك تذكرة تذكير قبل الموعد بساعة.',
        bookAnother: 'احجز خدمة أخرى',
        viewBooking: 'عرض الحجز',
      }
    : {
        heading: 'Your home, in good hands.',
        description: 'Browse thousands of verified pros across Saudi Arabia, from AC repair to deep cleaning. Compare, message, and book in minutes.',
        tabSearch: 'Search Results',
        tabProfile: 'Provider Profile',
        tabBooking: 'Booking Confirmed',
        country: 'Saudi Arabia',
        search: 'Search',
        searchSummary: 'AC Repair · Riyadh',
        prosFound: '3 pros found',
        filters: 'Filters',
        topProOnly: 'Top Pro only',
        availableToday: 'Available today',
        under200: 'Under SAR 200',
        sort: 'Sort',
        bestMatch: 'Best Match',
        results: '3 results',
        quote: 'Quote',
        clickPrompt: 'Click a pro to view their full profile →',
        backToResults: '← Back to results',
        profileTitle: 'AC & HVAC Specialist',
        reviews: 'reviews',
        repliesIn: 'Replies in about 15 min',
        message: 'Message',
        getQuote: 'Get a Quote →',
        about: 'About',
        aboutText: '12 years of experience servicing all major AC brands in Riyadh. Licensed technician, all work guaranteed, and available 7 days a week.',
        servicesPricing: 'Services & Pricing',
        recentReviews: 'Recent Reviews',
        bookingConfirmed: 'Booking Confirmed!',
        service: 'Service',
        pro: 'Pro',
        date: 'Date',
        time: 'Time',
        location: 'Location',
        estimate: 'Price estimate',
        payment: 'Payment',
        paymentValue: 'On-site (cash/card)',
        bookingNote: "A confirmation SMS has been sent to your number. You'll receive a reminder 1 hour before your appointment.",
        bookAnother: 'Book Another',
        viewBooking: 'View Booking',
      };

  const tabs: { key: 'search' | 'profile' | 'booking'; icon: React.ReactNode; label: string }[] = [
    { key: 'search', icon: <IconSearch size={14} stroke={2} />, label: copy.tabSearch },
    { key: 'profile', icon: <IconUser size={14} stroke={2} />, label: copy.tabProfile },
    { key: 'booking', icon: <IconCircleCheck size={14} stroke={2} />, label: copy.tabBooking },
  ];

  return (
    <div className="product-preview-sec" dir={isArabic ? 'rtl' : 'ltr'}>
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
          margin-bottom: 12px;
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
          gap: 12px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .pp-tab-btn {
          padding: 10px 22px;
          border-radius: 99px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: #fff;
          color: #64748b;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        .pp-tab-btn.active {
          background: #0f172a;
          color: #fff;
          box-shadow: 0 10px 15px -3px rgba(15,23,42,0.2);
          transform: translateY(-2px);
        }
        .pp-tab-btn:hover:not(.active) {
          background: #f1f5f9;
          color: #334155;
        }
        .pp-mockup-window {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          display: flex;
          min-height: 600px;
          position: relative;
          text-align: left;
        }
        .pp-sidebar {
          width: 220px;
          background: #fdfdfd;
          border-right: 1px solid #f1f5f9;
          padding: 20px 0;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pp-sidebar-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          padding: 6px 20px;
          margin-top: 12px;
        }
        .pp-sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 20px;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          border-radius: 0;
        }
        .pp-sidebar-item.active {
          background: #ecfdf5;
          color: #059669;
          font-weight: 600;
          border-right: 3px solid #10b981;
        }
        .pp-content {
          flex: 1;
          overflow-y: auto;
          background: #ffffff;
        }
        .pp-topbar {
          padding: 14px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
        }
        .pp-topbar-search {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pp-result-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s;
        }
        .pp-result-row:hover {
          background: #f8fafc;
        }
        .pp-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          object-fit: cover;
          flex-shrink: 0;
          background: #e2e8f0;
        }
        .pp-result-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }
        .pp-result-sub {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .pp-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          color: #fff;
          flex-shrink: 0;
        }
        .pp-rating {
          font-size: 12px;
          color: #f59e0b;
          font-weight: 700;
        }
        .pp-price {
          font-size: 12px;
          font-weight: 600;
          color: #059669;
          white-space: nowrap;
        }
        .pp-quote-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          background: #10b981;
          color: #fff;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .pp-profile-header {
          padding: 24px 24px 16px;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9;
        }
        .pp-profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .pp-profile-name {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }
        .pp-profile-title {
          font-size: 13px;
          color: #64748b;
          margin-top: 2px;
        }
        .pp-profile-meta {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 12px;
          color: #64748b;
          flex-wrap: wrap;
        }
        .pp-profile-body {
          padding: 18px 24px;
        }
        .pp-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 10px;
          margin-top: 16px;
        }
        .pp-service-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 0;
          border-bottom: 1px solid #f8fafc;
          font-size: 13px;
        }
        .pp-review-card {
          padding: 10px 14px;
          background: #f8fafc;
          border-radius: 10px;
          margin-bottom: 8px;
        }
        .pp-review-stars {
          color: #f59e0b;
          font-size: 12px;
        }
        .pp-review-text {
          font-size: 12px;
          color: #334155;
          margin-top: 4px;
          line-height: 1.5;
        }
        .pp-review-author {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }
        .pp-cta-row {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        .pp-btn-primary {
          flex: 1;
          background: #10b981;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .pp-btn-secondary {
          flex: 1;
          background: #f1f5f9;
          color: #0f172a;
          border: none;
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .pp-booking-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          min-height: 500px;
        }
        .pp-booking-check {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 20px;
        }
        .pp-booking-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 24px;
        }
        .pp-booking-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px 24px;
          width: 100%;
          max-width: 380px;
          text-align: left;
        }
        .pp-booking-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pp-booking-row:last-child {
          border-bottom: none;
        }
        .pp-booking-label {
          color: #94a3b8;
          font-weight: 500;
        }
        .pp-booking-value {
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }
        .pp-booking-total {
          font-size: 15px;
          font-weight: 700;
          color: #059669;
        }
        .pp-booking-note {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 16px;
          max-width: 360px;
        }
        @media (max-width: 768px) {
          .pp-sidebar { display: none; }
          .pp-header h2 { font-size: 28px; }
        }
      `}</style>

      <div className="pp-container">
        <div className="pp-header">
          <h2>{copy.heading}</h2>
          <p>{copy.description}</p>
        </div>

        <div className="pp-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`pp-tab-btn ${activeView === tab.key ? 'active' : ''}`}
              onClick={() => setActiveView(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pp-mockup-window">
          <div className="pp-sidebar">
            <div style={{ padding: '0 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>HandyCall</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{copy.country}</div>
            </div>

            <div className="pp-sidebar-label">{copy.search}</div>
            <div
              className={`pp-sidebar-item ${activeView === 'search' ? 'active' : ''}`}
              onClick={() => setActiveView('search')}
              style={{ cursor: 'pointer' }}
            >
              <IconSearch size={13} stroke={2} style={{ flexShrink: 0 }} />
              {copy.searchSummary}
            </div>
            <div style={{ padding: '6px 20px', fontSize: 11, color: '#cbd5e1' }}>{copy.prosFound}</div>

            <div className="pp-sidebar-label">{copy.filters}</div>
            <div style={{ padding: '4px 20px', fontSize: 12, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#10b981' }} />
                {copy.topProOnly}
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#10b981' }} />
                {copy.availableToday}
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#10b981' }} />
                {copy.under200}
              </label>
            </div>

            <div className="pp-sidebar-label" style={{ marginTop: 'auto' }}>{copy.sort}</div>
            <div style={{ padding: '4px 20px', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>
              {copy.bestMatch} ▾
            </div>
          </div>

          <div className="pp-content">
            {activeView === 'search' && (
              <>
                <div className="pp-topbar">
                  <div className="pp-topbar-search">
                    <IconSearch size={13} stroke={2} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <span style={{ color: '#64748b' }}>{copy.searchSummary}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{copy.results}</span>
                </div>

                {SEARCH_RESULTS.map((result, i) => (
                  <div
                    key={i}
                    className="pp-result-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveView('profile')}
                  >
                    <img src={result.avatar} alt={result.name} className="pp-avatar" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="pp-result-name">{result.name}</span>
                        {result.badge[language] && (
                          <span className="pp-badge" style={{ background: result.badgeColor }}>
                            {result.badge[language]}
                          </span>
                        )}
                      </div>
                      <div className="pp-result-sub">
                        {result.service[language]} · {result.location[language]}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span className="pp-rating">★ {result.rating}</span>
                      <span style={{ fontSize: 11, color: '#cbd5e1' }}>({result.reviews})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span className="pp-price">{result.price[language]}</span>
                      <button className="pp-quote-btn">{copy.quote}</button>
                    </div>
                  </div>
                ))}

                <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{copy.clickPrompt}</span>
                </div>
              </>
            )}

            {activeView === 'profile' && (
              <>
                <div
                  style={{ padding: '12px 24px', fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setActiveView('search')}
                >
                  {copy.backToResults}
                </div>

                <div className="pp-profile-header">
                  <img src={SEARCH_RESULTS[0].avatar} alt="Khalid" className="pp-profile-avatar" />
                  <div style={{ flex: 1 }}>
                    <div className="pp-profile-name">Khalid Al-Rashidi</div>
                    <div className="pp-profile-title">
                      {copy.profileTitle} · {isArabic ? 'الرياض' : 'Riyadh'}
                    </div>
                    <div className="pp-profile-meta">
                      <span>★ 4.9 · 142 {copy.reviews}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{SEARCH_RESULTS[0].badge[language]}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconBolt size={12} stroke={2} style={{ color: '#f59e0b' }} />{copy.repliesIn}</span>
                    </div>
                    <div className="pp-cta-row" style={{ marginTop: 14 }}>
                      <button className="pp-btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><IconMessage size={14} stroke={2} />{copy.message}</button>
                      <button className="pp-btn-primary" onClick={() => setActiveView('booking')}>
                        {copy.getQuote}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pp-profile-body">
                  <div className="pp-section-title">{copy.about}</div>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{copy.aboutText}</p>

                  <div className="pp-section-title">{copy.servicesPricing}</div>
                  {[
                    { en: 'AC installation', ar: 'تركيب مكيف', priceEn: 'SAR 350+', priceAr: '350+ ريال' },
                    { en: 'AC repair & maintenance', ar: 'تصليح وصيانة مكيف', priceEn: 'SAR 150+', priceAr: '150+ ريال' },
                    { en: 'Duct cleaning', ar: 'تنظيف مجاري الهواء', priceEn: 'SAR 200+', priceAr: '200+ ريال' },
                  ].map((item, i) => (
                    <div key={i} className="pp-service-row">
                      <span style={{ color: '#334155', fontWeight: 500 }}>{isArabic ? item.ar : item.en}</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>{isArabic ? item.priceAr : item.priceEn}</span>
                    </div>
                  ))}

                  <div className="pp-section-title">{copy.recentReviews}</div>
                  {PROFILE_REVIEWS.map((review, i) => (
                    <div key={i} className="pp-review-card">
                      <div className="pp-review-stars">{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</div>
                      <div className="pp-review-text">"{review.text[language]}"</div>
                      <div className="pp-review-author">- {review.author}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeView === 'booking' && (
              <div className="pp-booking-wrap">
                <div className="pp-booking-check">
                  <IconCircleCheck size={32} stroke={1.8} style={{ color: '#10b981' }} />
                </div>
                <div className="pp-booking-title">{copy.bookingConfirmed}</div>

                <div className="pp-booking-card">
                  {[
                    { label: copy.service, value: isArabic ? 'تصليح وصيانة التكييف' : 'AC Repair & Maintenance' },
                    { label: copy.pro, value: 'Khalid Al-Rashidi' },
                    { label: copy.date, value: isArabic ? 'الأربعاء 26 مارس 2026' : 'Wed, 26 March 2026' },
                    { label: copy.time, value: '10:00 AM' },
                    { label: copy.location, value: isArabic ? 'الملقا، الرياض' : 'Al-Malqa, Riyadh' },
                    { label: copy.estimate, value: isArabic ? '180 ريال' : 'SAR 180', valueClass: 'pp-booking-total' },
                    { label: copy.payment, value: copy.paymentValue },
                  ].map((row, i) => (
                    <div key={i} className="pp-booking-row">
                      <span className="pp-booking-label">{row.label}</span>
                      <span className={`pp-booking-value ${row.valueClass || ''}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <p className="pp-booking-note">{copy.bookingNote}</p>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button
                    className="pp-btn-secondary"
                    style={{ padding: '10px 20px', fontSize: 13, borderRadius: 10, cursor: 'pointer', background: '#f1f5f9', border: 'none', fontWeight: 600 }}
                    onClick={() => setActiveView('search')}
                  >
                    {copy.bookAnother}
                  </button>
                  <button
                    className="pp-btn-primary"
                    style={{ padding: '10px 20px', fontSize: 13, borderRadius: 10, cursor: 'pointer', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700 }}
                    onClick={() => setActiveView('profile')}
                  >
                    {copy.viewBooking}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
