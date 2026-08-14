export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, email, company, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'audit@corevectorsystems.com',
        to: 'Kennedy@CoreVectorSystems.com',
        subject: 'Your China-AI Exposure Audit',
        html: `
          <h2>Your China-AI Exposure Audit Submission Received</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || 'N/A'}</p>
          <p><strong>Role:</strong> ${role || 'N/A'}</p>
          <p>Thank you for completing the audit. Your personalized assessment will be sent to you shortly.</p>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to send email' });
    }

    // Return a simple thank-you page (HTML)
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thank you</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 2rem; }
          </style>
        </head>
        <body>
          <h1>Thank you!</h1>
          <p>Your audit has been received. Please check your email for the results.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
