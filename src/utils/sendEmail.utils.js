const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Pinscore Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    if (error.code === 'EAUTH') {
      console.error("Authentication failed. Please check EMAIL_USER and EMAIL_PASS.");
    }
    throw new Error(`Could not send email: ${error.message}`);
  }
};

module.exports = sendEmail;
