type SmsParams = {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
};

export async function sendTwilioSms(params: SmsParams): Promise<{ sid?: string; status?: string }> {
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
    throw new Error(`Twilio SMS ${res.status}: ${text}`);
  }
  const data = text ? (JSON.parse(text) as any) : {};
  return { sid: data?.sid, status: data?.status };
}
