// magneticmark-page: strona statyczna (assets) + wysylka maili przez Resend pod /api/send-email.
// Wczesniej wysylka byla osobnym workerem email-sender-magneticmark, przeniesiona tutaj (2026-10-26).
// Sekret RESEND_API_KEY ustawiony na tym workerze (wrangler secret put RESEND_API_KEY).

const SITE_ORIGINS = ["https://magneticmarkdj.com", "https://www.magneticmarkdj.com"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendEmail(request, env) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }
  // tylko formularz z wlasnej strony (mailsend.html), bez CORS dla obcych domen
  const origin = request.headers.get("Origin");
  if (origin && !SITE_ORIGINS.includes(origin)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }
  if (!env.RESEND_API_KEY) {
    return json({ success: false, error: "Brak sekretu RESEND_API_KEY na workerze" }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, error: "Niepoprawny JSON" }, 400);
  }
  const { to, subject, body, footer } = payload;
  if (!to || !subject || !body) {
    return json({ success: false, error: "Brak pola to, subject albo body" }, 400);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Management <management@magneticmarkdj.com>",
      to,
      subject,
      text: body,
      html: footer,
      bcc: "management@magneticmarkdj.com",
    }),
  });
  const data = await res.json();
  return json({ success: res.ok, data, error: res.ok ? undefined : data?.message }, res.ok ? 200 : 500);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/send-email") {
      return sendEmail(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
