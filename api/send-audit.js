export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Vercel automatically parses urlencoded and JSON bodies into req.body
  let { name, email, company, role } = req.body || {};
  if (typeof name !== 'string') name = '';
  if (typeof email !== 'string') email = '';
  if (typeof company !== 'string') company = '';
  if (typeof role !== 'string') role = '';

  // Trim
  name = name.trim();
  email = email.trim();
  company = company.trim();
  role = role.trim();

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
    // ---------- Generate PDF audit ----------
    const PDFDocument = require('pdfkit');
    async function generateAuditPDF(data) {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        return pdfBuffer;
      });

      // Header
      doc.fontSize(20).text('China‑AI Exposure Audit', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Prepared for: ${data.name}`);
      doc.text(`Company: ${data.company || 'N/A'}`);
      doc.text(`Role: ${data.role || 'N/A'}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // 80‑point checklist (you can replace with your actual list)
      const points = [
        '1. Data‑localisation risk assessment',
        '2. Cross‑border data flow mapping',
        '3. Vendor onboarding compliance check',
        '4. Cloud storage region verification',
        '5. Model training data provenance',
        '6. Third‑party API data transfers',
        '7. Encryption‑at‑rest for sensitive data',
        '8. Encryption‑in‑transit (TLS) enforcement',
        '9. Access control and IAM review',
        '10. Audit logging and retention',
        '11. Incident response plan for data breaches',
        '12. Data minimization practices',
        '13. Consent management for personal information',
        '14. Data subject rights fulfillment process',
        '15. Cross‑border transfer mechanisms (SCCs, BCRs)',
        '16. Localization of AI model inference',
        '17. Edge computing data flow analysis',
        '18. Vendor security questionnaires',
        '19. Supply chain risk assessment',
        '20. Data inventory and classification',
        '21. Regular penetration testing schedule',
        '22. Vulnerability management process',
        '23. Security awareness training frequency',
        '24. Multi‑factor authentication enforcement',
        '25. Privileged access management',
        '26. Network segmentation review',
        '27. Firewall and intrusion detection settings',
        '28. Endpoint protection deployment',
        '29. Mobile device management policy',
        '30. Secure software development lifecycle',
        '31. Code scanning and dependency checks',
        '32. Open‑source license compliance',
        '33. Container image scanning',
        '34. Kubernetes security configurations',
        '35. Serverless function permissions',
        '36. API gateway rate limiting and throttling',
        '37. Web application firewall (WAF) rules',
        '38. DDoS mitigation strategy',
        '39. Backup and disaster recovery plan',
        '40. Recovery time objective (RTO) testing',
        '41. Recovery point objective (RPO) validation',
        '42. Data encryption key management',
        '43. Hardware security module (HSM) usage',
        '44. Secure boot and firmware integrity',
        '45. Logging and monitoring centralization',
        '46. SIEM integration and alerting',
        '47. Anomalous behavior detection',
        '48. User activity logging',
        '49. Privileged session recording',
        '50. Third‑party security assessments',
        '51. Penetration test reports review',
        '52. Red team / blue team exercises',
        '53. Security metrics and KPIs tracking',
        '54. Regulatory change monitoring process',
        '55. Internal audit frequency',
        '56. External audit and certification status',
        '57. Data protection impact assessment (DPIA)',
        '58. Privacy by design implementation',
        '59. Privacy by default settings',
        '60. Data retention and disposal policy',
        '61. Secure data deletion methods',
        '62. Media sanitization procedures',
        '63. Physical security of data centers',
        '64. Environmental controls monitoring',
        '65. Power and cooling redundancy',
        '66. Fire suppression systems',
        '67. Access logs for physical facilities',
        '68. Visitor management and escort policies',
        '69. Equipment disposal and recycling',
        '70. Vendor lock‑in risk assessment',
        '71. Multi‑cloud strategy evaluation',
        '72. Data portability and export capabilities',
        '73. API versioning and deprecation policy',
        '74. Backward compatibility testing',
        '75. Service level agreement (SLA) review',
        '76. Performance benchmarks and baselines',
        '77. Latency and throughput measurements',
        '78. Cost optimization and rightsizing',
        '79. Reserved instance and savings plan usage',
        '80. Ongoing monitoring & alerting plan'
      ];

      points.forEach((p, i) => {
        doc.text(`${i + 1}. ${p}`);
        if ((i + 1) % 20 === 0) doc.moveDown(); // slight spacing every 20 points
      });

      doc.end();
      // Wait for the stream to finish
      return new Promise((resolve, reject) => {
        const buf = [];
        doc.on('data', d => buf.push(d));
        doc.on('end', () => resolve(Buffer.concat(buf)));
        doc.on('error', reject);
      });
    }

    const pdfBuffer = await generateAuditPDF({name, email, company, role});
    const pdfBase64 = pdfBuffer.toString('base64');

    // ---------- Send email via Mailgun ----------
    const formData = new FormData();
    formData.append('from', `Audit CoreVector <audit@${domain}>`);
    formData.append('to', 'Kennedy@CoreVectorSystems.com');
    formData.append('subject', 'Your China‑AI Exposure Audit Submission Received');
    formData.append('html', `
      <h2>Your China‑Ai Exposure Audit Submission Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company || 'N/A'}</p>
      <p><strong>Role:</strong> ${role || 'N/A'}</p>
      <p>Thank you for completing the audit. Your personalized 80‑point assessment is attached to this email.</p>
      <p>We’ll follow up shortly with any additional insights.</p>
    `);
    // Attach PDF
    formData.append('attachment', [
      {
        filename: 'China-AI-Exposure-Audit.pdf',
        content: pdfBase64,
        content_type: 'application/pdf'
      }
    ]);

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

    // Redirect to Formspree thank-you page (maintains same UX)
    return res.redirect(302, 'https://formspree.io/f/xeajkble/thanks');
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}