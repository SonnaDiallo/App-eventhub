import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Configuration du transporteur email
// Tu devras configurer ces variables d'environnement avec:
// firebase functions:config:set email.user="ton-email@gmail.com" email.pass="ton-app-password"
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || '',
    pass: functions.config().email?.pass || '',
  },
});

interface TicketData {
  code: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  participantName: string;
  participantEmail: string;
  ticketType: string;
  price: number;
}

// Fonction déclenchée automatiquement quand un nouveau ticket est créé
export const sendTicketEmail = functions.firestore
  .document('tickets/{ticketId}')
  .onCreate(async (snap, context) => {
    const ticket = snap.data() as TicketData;

    if (!ticket.participantEmail) {
      console.log('No email found for ticket:', context.params.ticketId);
      return null;
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.code)}`;

    const mailOptions = {
      from: `EventHub <${functions.config().email?.user || 'noreply@eventhub.com'}>`,
      to: ticket.participantEmail,
      subject: `🎫 Ton billet pour ${ticket.eventTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ton billet EventHub</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #050016; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050016; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #0b0620; border-radius: 24px; border: 1px solid rgba(123, 92, 255, 0.25); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #7b5cff 0%, #00e0ff 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900;">🎫 EventHub</h1>
                      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Ton billet est prêt !</p>
                    </td>
                  </tr>

                  <!-- Event Info -->
                  <tr>
                    <td style="padding: 30px;">
                      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 22px; font-weight: 800; text-align: center;">
                        ${ticket.eventTitle}
                      </h2>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid rgba(123, 92, 255, 0.15);">
                            <span style="color: #a0a0c0; font-size: 12px;">📅 Date</span><br>
                            <span style="color: #ffffff; font-size: 16px; font-weight: 600;">${ticket.eventDate}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid rgba(123, 92, 255, 0.15);">
                            <span style="color: #a0a0c0; font-size: 12px;">🕐 Heure</span><br>
                            <span style="color: #ffffff; font-size: 16px; font-weight: 600;">${ticket.eventTime}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid rgba(123, 92, 255, 0.15);">
                            <span style="color: #a0a0c0; font-size: 12px;">📍 Lieu</span><br>
                            <span style="color: #ffffff; font-size: 16px; font-weight: 600;">${ticket.eventLocation}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <span style="color: #a0a0c0; font-size: 12px;">👤 Participant</span><br>
                            <span style="color: #ffffff; font-size: 16px; font-weight: 600;">${ticket.participantName}</span>
                          </td>
                        </tr>
                      </table>

                      <!-- QR Code -->
                      <div style="text-align: center; background-color: #ffffff; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px;">
                        <p style="margin: 15px 0 0; color: #0b0620; font-size: 24px; font-weight: 900; letter-spacing: 4px; font-family: monospace;">
                          ${ticket.code}
                        </p>
                      </div>

                      <p style="text-align: center; color: #a0a0c0; font-size: 13px; margin: 0;">
                        Présente ce QR code à l'entrée de l'événement
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: rgba(123, 92, 255, 0.1); padding: 20px; text-align: center; border-top: 1px solid rgba(123, 92, 255, 0.15);">
                      <p style="margin: 0; color: #7b5cff; font-size: 12px;">
                        Type: <strong>${ticket.ticketType}</strong> | 
                        Prix: <strong>${ticket.price === 0 ? 'Gratuit' : `€${ticket.price}`}</strong>
                      </p>
                      <p style="margin: 10px 0 0; color: #a0a0c0; font-size: 11px;">
                        Ce billet est également disponible dans l'application EventHub
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Ticket email sent to:', ticket.participantEmail);
      
      // Mettre à jour le ticket pour indiquer que l'email a été envoyé
      await snap.ref.update({ emailSent: true, emailSentAt: admin.firestore.FieldValue.serverTimestamp() });
      
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  });
