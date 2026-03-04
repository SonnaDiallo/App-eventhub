import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface TicketData {
  ticketId: string;
  code: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  userName: string;
  userEmail: string;
  ticketType: string;
  price?: number;
  status: string;
}

/**
 * Génère un PDF de billet
 */
export const generateTicketPDF = async (ticketData: TicketData): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Page blanche minimaliste, sans bandeau coloré
      const pageWidth = doc.page.width;
      const contentX = 50;
      let currentY = 60;
      const lineSpacing = 20;

      // Fonction utilitaire pour une ligne "libellé : valeur"
      const printField = (label: string, value: string) => {
        if (!value) return;
        doc
          .fontSize(9)
          .fillColor('#6b7280')
          .font('Helvetica')
          .text(label.toUpperCase(), contentX, currentY);
        doc
          .fontSize(12)
          .fillColor('#111827')
          .font('Helvetica')
          .text(value, contentX, currentY + 10, { width: 280 });
        currentY += lineSpacing + 10;
      };

      // Titre de l'événement centré
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(ticketData.eventTitle, contentX, currentY, {
          width: pageWidth - contentX * 2,
          align: 'center',
        });

      currentY += 40;

      // Petit résumé (date / heure / lieu) sous le titre
      const metaY = currentY + 35;
      if (ticketData.eventDate || ticketData.eventTime) {
        printField('Date', `${ticketData.eventDate} ${ticketData.eventTime || ''}`.trim());
      }
      if (ticketData.eventLocation) {
        printField('Lieu', ticketData.eventLocation);
      }

      // QR géant au centre de la page
      const qrSize = 260;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 220;

      const qrDataUrl = await QRCode.toDataURL(ticketData.code.toUpperCase(), {
        margin: 1,
        width: qrSize,
        errorCorrectionLevel: 'H',
      });
      const qrBase64 = qrDataUrl.split(',')[1];
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      // QR code très visible
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Code en texte sous le QR
      doc
        .fontSize(16)
        .fillColor('#4f46e5')
        .font('Courier-Bold')
        .text(ticketData.code.toUpperCase(), 50, qrY + qrSize + 20, {
          width: pageWidth - 100,
          align: 'center',
        });

      // Statut du billet en dessous
      const statusColor = ticketData.status === 'confirmed' ? '#10b981' : '#f59e0b';
      const statusText = ticketData.status === 'confirmed' ? 'CONFIRMÉ' : 'EN ATTENTE';
      doc
        .fontSize(11)
        .fillColor(statusColor)
        .font('Helvetica-Bold')
        .text(`Statut : ${statusText}`, 50, qrY + qrSize + 44, {
          width: pageWidth - 100,
          align: 'center',
        });

      // Mentions légales / pied de page
      doc
        .fontSize(9)
        .fillColor('#6b7280')
        .font('Helvetica')
        .text(
          'Ce billet est personnel et non transférable. Conservez-le précieusement et présentez-le à l’entrée.',
          50,
          qrY + qrSize + 70,
          { width: pageWidth - 100, align: 'center' },
        );

      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .font('Helvetica')
        .text(
          `Billet généré le ${new Date().toLocaleDateString('fr-FR')} - ID: ${ticketData.ticketId}`,
          50,
          doc.page.height - 40,
          { width: pageWidth - 100, align: 'center' },
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
