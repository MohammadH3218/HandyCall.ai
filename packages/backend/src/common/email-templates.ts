interface EmailTemplateOptions {
  title: string;
  greeting?: string;
  body: string;
  cta?: { label: string; url: string };
  footer?: string;
}

/**
 * Renders a bilingual-ready HTML email for HandyCall.
 * Supports Arabic RTL via inline dir attribute.
 */
export function renderHandycallEmail(opts: EmailTemplateOptions): string {
  const isAr = /[\u0600-\u06FF]/.test(opts.title + opts.body);
  const dir = isAr ? 'rtl' : 'ltr';
  const fontFamily = isAr
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "'Segoe UI', Helvetica, Arial, sans-serif";

  const ctaButton = opts.cta
    ? `
    <div style="text-align:center;margin:32px 0;">
      <a href="${opts.cta.url}"
         style="background:#1a7f5a;color:#ffffff;padding:14px 32px;
                border-radius:6px;text-decoration:none;font-size:16px;
                font-weight:600;display:inline-block;">
        ${opts.cta.label}
      </a>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:${fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a7f5a;padding:24px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                HandyCall
              </span>
              <span style="color:#a8e6cf;font-size:13px;margin-${isAr ? 'right' : 'left'}:8px;">
                خدمات المنزل · Home Services
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;color:#1a1a1a;line-height:1.7;font-size:15px;" dir="${dir}">
              ${opts.greeting ? `<p style="font-size:17px;font-weight:600;margin:0 0 16px;">${opts.greeting}</p>` : ''}
              <p style="margin:0 0 16px;">${opts.body}</p>
              ${ctaButton}
              ${opts.footer ? `<p style="color:#666;font-size:13px;margin:24px 0 0;">${opts.footer}</p>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;text-align:center;
                       border-top:1px solid #eee;color:#999;font-size:12px;">
              HandyCall &mdash; الرياض، المملكة العربية السعودية<br>
              Riyadh, Saudi Arabia &middot;
              <a href="mailto:support@handycall.sa" style="color:#1a7f5a;text-decoration:none;">
                support@handycall.sa
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
