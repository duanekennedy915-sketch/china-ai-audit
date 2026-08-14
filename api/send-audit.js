export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, email, company, role } = req.body;

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