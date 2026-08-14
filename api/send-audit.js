export default async function handler(req, res) {
  // Log for debugging
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Method:', req.method);

  let name = '', email = '', company = '', role = '';
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    let rawBody = '';
    try {
      rawBody = await req.text();
    } catch (e) {
      console.error('Failed to get raw body:', e);
      // fallback to req.body if it's already parsed
      if (req.body && typeof req.body === 'object') {
        name = req.body.name || '';
        email = req.body.email || '';
        company = req.body.company || '';
        role = req.body.role || '';
      }
    }

    if (rawBody) {
      if (contentType.includes('application/json')) {
        try {
          const data = JSON.parse(rawBody);
          name = data.name || '';
          email = data.email || '';
          company = data.company || '';
          role = data.role || '';
        } catch (e) {
          console.error('Failed to parse JSON:', e);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody);
        name = params.get('name') || '';
        email = params.get('email') || '';
        company = params.get('company') || '';
        role = params.get('role') || '';
      } else {
        // Try to parse as URLSearchParams anyway (some clients send multipart but we ignore files)
        try {
          const params = new URLSearchParams(rawBody);
          name = params.get('name') || '';
          email = params.get('email') || '';
          company = params.get('company') || '';
          role = params.get('role') || '';
        } catch (e) {
          console.error('Failed to parse as URLSearchParams:', e);
        }
      }
    }
  }

  console.log('Parsed:', { name, email, company, role });

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  
  if (!apiKey || !domain) {
    return res.status(500).json({ error: 'Server misconfigured: Mailgun credentials missing' });
  }

  try {
    const formData = new FormData();
    formData.append('from', `Audit CoreVector <audit@${domain}>`);
    formData.append('to', 'Kennedy@CoreVectorSystems.com');
    formData.append('subject', 'Your China-AI Exposure Audit Submission Received');
    formData.append('html', `
      <h2>Your China-Ai Exposure Audit Submission Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company || 'N/A'}</p>
      <p><strong>Role:</strong> ${role || 'N/A'}</p>
      <p>Thank you for completing the audit. Your personalized assessment will be sent to you shortly.</p>
    `);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to send email' });
    }

    // Redirect to Formspree thank-you page (or we could create our own)
    return res.redirect(302, 'https://formspree.io/f/xeajkble/thanks');
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}