import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { renderHandycallEmail } from '../../common/email-templates';
import { Booking, Customer, Pro } from '@handycall/shared';

// Data transfer to Saudi payment/identity APIs must be documented per PDPL Article 29
// SES emails stay in me-central-1 region; no cross-border transfer for transactional emails.

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private ses: SESv2Client;
  private fromEmail: string;
  private fromName: string;
  private isConsoleMode: boolean;

  constructor(private config: ConfigService) {
    this.fromEmail = config.get<string>('SES_FROM_EMAIL') ?? 'hello@handycall.org';
    this.fromName = config.get<string>('SES_FROM_NAME') ?? 'HandyCall';
    this.isConsoleMode = config.get('EMAIL_PROVIDER') === 'console';

    this.ses = new SESv2Client({
      region: config.get<string>('SES_REGION') ?? config.get<string>('AWS_REGION') ?? 'me-central-1',
    });
  }

  // ─── Transactional Emails ──────────────────────────────────────────────────

  async sendCustomerVerification(
    email: string,
    token: string,
    firstName: string,
    lang: 'ar' | 'en' = 'en',
    callbackUrl = '/customer/onboarding?callbackUrl=%2Fcustomer%2Fdashboard',
  ) {
    const verifyUrl = new URL(
      `${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001'}/verify-email`,
    );
    verifyUrl.searchParams.set('token', token);
    verifyUrl.searchParams.set('audience', 'customer');
    verifyUrl.searchParams.set('callbackUrl', callbackUrl);
    const isAr = lang === 'ar';

    await this.send({
      to: email,
      subject: isAr ? 'تحقق من بريدك الإلكتروني — HandyCall' : 'Verify your email — HandyCall',
      html: renderHandycallEmail({
        title: isAr ? 'تحقق من بريدك الإلكتروني' : 'Verify your email',
        greeting: isAr ? `مرحباً ${firstName}،` : `Hi ${firstName},`,
        body: isAr
          ? 'شكراً لتسجيلك في HandyCall. انقر على الزر أدناه للتحقق من بريدك الإلكتروني. الرابط صالح لمدة 24 ساعة.'
          : 'Thanks for signing up with HandyCall. Click the button below to verify your email. This link is valid for 24 hours.',
        cta: { label: isAr ? 'تحقق من البريد الإلكتروني' : 'Verify Email', url: verifyUrl.toString() },
        footer: isAr
          ? 'إذا لم تنشئ حساباً، يمكنك تجاهل هذا البريد.'
          : "If you didn't create an account, you can safely ignore this email.",
      }),
    });
  }

  async sendProVerification(
    email: string,
    token: string,
    firstName: string,
    callbackUrl = '/onboarding/account-setup',
  ) {
    const verifyUrl = new URL(
      `${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001'}/verify-email`,
    );
    verifyUrl.searchParams.set('token', token);
    verifyUrl.searchParams.set('audience', 'pro');
    verifyUrl.searchParams.set('callbackUrl', callbackUrl);

    await this.send({
      to: email,
      subject: 'Verify your email — HandyCall',
      html: renderHandycallEmail({
        title: 'Verify your email',
        greeting: `Hi ${firstName},`,
        body: 'Thanks for joining HandyCall. Click the button below to verify your email before completing your pro setup. This link is valid for 24 hours.',
        cta: { label: 'Verify Email', url: verifyUrl.toString() },
        footer: "If you didn't create an account, you can safely ignore this email.",
      }),
    });
  }

  async sendPasswordReset(
    email: string,
    token: string,
    firstName: string,
    userType: 'CUSTOMER' | 'PRO',
    lang: 'ar' | 'en' = 'en',
  ) {
    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3001')}/reset-password?token=${token}`;
    const isAr = lang === 'ar';

    await this.send({
      to: email,
      subject: isAr ? 'إعادة تعيين كلمة المرور — HandyCall' : 'Reset your password — HandyCall',
      html: renderHandycallEmail({
        title: isAr ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
        greeting: isAr ? `مرحباً ${firstName}،` : `Hi ${firstName},`,
        body: isAr
          ? 'تلقينا طلباً لإعادة تعيين كلمة مرور حسابك. انقر أدناه. الرابط صالح لساعة واحدة فقط.'
          : 'We received a request to reset your password. Click below — this link expires in 1 hour.',
        cta: { label: isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password', url: resetUrl },
        footer: isAr
          ? 'إذا لم تطلب ذلك، تجاهل هذا البريد. كلمة مرورك لم تتغير.'
          : "If you didn't request this, ignore this email. Your password won't change.",
      }),
    });
  }

  async sendBookingConfirmationCustomer(
    booking: Booking,
    customer: Customer,
    pro: Pro,
  ) {
    const lang = customer.preferred_language ?? 'en';
    const isAr = lang === 'ar';
    const date = new Date(booking.scheduled_start).toLocaleString(
      isAr ? 'ar-SA' : 'en-SA',
      { timeZone: 'Asia/Riyadh' },
    );

    await this.send({
      to: customer.email,
      subject: isAr ? 'تأكيد طلب الحجز — HandyCall' : 'Booking request sent — HandyCall',
      html: renderHandycallEmail({
        title: isAr ? 'تم إرسال طلب الحجز' : 'Booking Request Sent',
        greeting: isAr ? `مرحباً ${customer.first_name}،` : `Hi ${customer.first_name},`,
        body: isAr
          ? `تم إرسال طلب حجزك إلى ${pro.first_name}. سيتم تأكيد الحجز قريباً.<br><br>الموعد: ${date}<br>الحي: ${booking.address_district}<br>السعر: ${(booking.service_price_sar / 100).toFixed(2)} ر.س`
          : `Your booking request has been sent to ${pro.first_name}. They will confirm shortly.<br><br>Scheduled: ${date}<br>District: ${booking.address_district}<br>Price: SAR ${(booking.service_price_sar / 100).toFixed(2)}`,
      }),
    });
  }

  async sendNewBookingNotificationPro(booking: Booking, customer: Customer, pro: Pro) {
    const date = new Date(booking.scheduled_start).toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
    });

    await this.send({
      to: pro.email,
      subject: 'طلب حجز جديد — HandyCall',
      html: renderHandycallEmail({
        title: 'طلب حجز جديد',
        greeting: `مرحباً ${pro.first_name}،`,
        body: `لديك طلب حجز جديد من ${customer.first_name} ${customer.last_name}.<br><br>الموعد: ${date}<br>الحي: ${booking.address_district}<br>سعر الخدمة: ${(booking.service_price_sar / 100).toFixed(2)} ر.س<br>أرباحك: ${(booking.pro_payout_sar / 100).toFixed(2)} ر.س`,
        cta: {
          label: 'عرض تفاصيل الحجز',
          url: `${this.config.get('FRONTEND_URL', 'http://localhost:3001')}/pro/bookings/${booking.booking_id}`,
        },
      }),
    });
  }

  async sendBookingConfirmedCustomer(booking: Booking, customer: Customer, pro: Pro) {
    const lang = customer.preferred_language ?? 'en';
    const isAr = lang === 'ar';

    await this.send({
      to: customer.email,
      subject: isAr ? 'تم تأكيد حجزك — HandyCall' : 'Booking confirmed — HandyCall',
      html: renderHandycallEmail({
        title: isAr ? 'تم تأكيد حجزك' : 'Booking Confirmed',
        greeting: isAr ? `مرحباً ${customer.first_name}،` : `Hi ${customer.first_name},`,
        body: isAr
          ? `قبل ${pro.first_name} طلب حجزك. نراك قريباً!`
          : `${pro.first_name} has confirmed your booking. See you soon!`,
      }),
    });
  }

  async sendBookingCancelled(
    booking: Booking,
    recipient: Customer | Pro,
    cancelledBy: 'CUSTOMER' | 'PRO' | 'PLATFORM',
  ) {
    const email = 'customer_id' in recipient ? recipient.email : recipient.email;
    const firstName = recipient.first_name;

    await this.send({
      to: email,
      subject: 'Booking Cancelled — HandyCall',
      html: renderHandycallEmail({
        title: 'Booking Cancelled',
        greeting: `Hi ${firstName},`,
        body: `Your booking (ID: ${booking.booking_id}) has been cancelled${booking.cancellation_reason ? `: ${booking.cancellation_reason}` : '.'}<br><br>If a payment was made, a refund will be processed within 5–7 business days.`,
      }),
    });
  }

  async sendBookingCompletedAndReviewPrompt(booking: Booking, customer: Customer) {
    const lang = customer.preferred_language ?? 'en';
    const isAr = lang === 'ar';
    const reviewUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3001')}/bookings/${booking.booking_id}/review`;

    await this.send({
      to: customer.email,
      subject: isAr ? 'كيف كانت تجربتك؟ — HandyCall' : 'How was your experience? — HandyCall',
      html: renderHandycallEmail({
        title: isAr ? 'اكتملت الخدمة — شاركنا رأيك' : 'Service Complete — Share Your Feedback',
        greeting: isAr ? `مرحباً ${customer.first_name}،` : `Hi ${customer.first_name},`,
        body: isAr
          ? 'نأمل أنك راضٍ عن الخدمة. يرجى تقييم تجربتك، فذلك يساعد المحترفين الجيدين على النمو.'
          : 'We hope you were happy with the service. Please take a moment to leave a review — it helps great pros grow.',
        cta: { label: isAr ? 'اترك تقييماً' : 'Leave a Review', url: reviewUrl },
      }),
    });
  }

  async sendPayoutNotificationPro(booking: Booking, pro: Pro) {
    await this.send({
      to: pro.email,
      subject: 'تم إرسال مدفوعاتك — HandyCall',
      html: renderHandycallEmail({
        title: 'تم إرسال المبلغ',
        greeting: `مرحباً ${pro.first_name}،`,
        body: `تمت معالجة دفعتك للحجز رقم ${booking.booking_id}.<br><br>المبلغ: ${(booking.pro_payout_sar / 100).toFixed(2)} ر.س<br>سيتم إيداع المبلغ في حسابك المصرفي خلال 3–5 أيام عمل.`,
      }),
    });
  }

  async sendProApproved(pro: Pro) {
    const dashboardUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3001')}/dashboard`;

    await this.send({
      to: pro.email,
      subject: 'Your HandyCall pro profile has been approved',
      html: renderHandycallEmail({
        title: 'You are approved',
        greeting: `Hi ${pro.first_name},`,
        body: 'Your HandyCall marketplace profile has been reviewed and approved. You can now access your dashboard, manage incoming requests, and appear in marketplace results.',
        cta: {
          label: 'Open your dashboard',
          url: dashboardUrl,
        },
        footer: 'Thank you for completing your profile. We are excited to have you on HandyCall.',
      }),
    });
  }

  async sendProRejected(pro: Pro, reason?: string) {
    const onboardingUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3001')}/onboarding/account-setup`;
    const reasonCopy = reason
      ? `<br><br><strong>Why it was not approved:</strong><br>${reason}`
      : '';

    await this.send({
      to: pro.email,
      subject: 'Your HandyCall pro profile needs changes before approval',
      html: renderHandycallEmail({
        title: 'Profile review update',
        greeting: `Hi ${pro.first_name},`,
        body: `We reviewed your HandyCall marketplace profile and it was not approved yet.${reasonCopy}<br><br>You can sign back in, update the required details, and submit again for review.`,
        cta: {
          label: 'Review your profile',
          url: onboardingUrl,
        },
        footer: 'If anything is unclear, please contact the HandyCall team.',
      }),
    });
  }

  // ─── Core Send ─────────────────────────────────────────────────────────────

  private async send(params: { to: string; subject: string; html: string }) {
    if (this.isConsoleMode || process.env['DISABLE_EMAIL_DELIVERY'] === 'true') {
      this.logger.log(`[EMAIL CONSOLE MODE] To: ${params.to} | Subject: ${params.subject}`);
      this.logger.debug(params.html);
      return;
    }

    try {
      await this.ses.send(
        new SendEmailCommand({
          FromEmailAddress: `${this.fromName} <${this.fromEmail}>`,
          Destination: { ToAddresses: [params.to] },
          Content: {
            Simple: {
              Subject: { Data: params.subject, Charset: 'UTF-8' },
              Body: { Html: { Data: params.html, Charset: 'UTF-8' } },
            },
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to send email to ${params.to}: ${(err as Error).message}`);
      throw err;
    }
  }
}
