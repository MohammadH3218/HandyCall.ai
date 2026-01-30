type SmsParams = {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
};

export async function sendTwilioSms(
  params: SmsParams
): Promise<{ sid?: string; status?: string; error_code?: number | null; error_message?: string | null }> {
  const { accountSid, authToken, from, to, body } = params;
  const basic = Buffer.from(`${accountSid}:${authToken}`, 'utf8').toString('base64');
  const form = new URLSearchParams();
  form.set('From', from);
  form.set('To', to);
  form.set('Body', body);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    const err: any = new Error(`Twilio SMS ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  let data: any = {};
  try {
    data = text ? (JSON.parse(text) as any) : {};
  } catch {
    data = {};
  }
  return {
    sid: data?.sid,
    status: data?.status,
    error_code: data?.error_code ?? null,
    error_message: data?.error_message ?? null,
  };
}
