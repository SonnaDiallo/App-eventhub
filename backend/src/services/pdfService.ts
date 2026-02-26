import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

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
export const generateTicketPDF = (ticketData: TicketData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête avec gradient simulé
      doc.rect(0, 0, 612, 150).fill('#6366f1');
      
      // Logo/Titre EventHub
      doc.fontSize(32)
        .fillColor('#ffffff')
        .text('EventHub', 50, 50, { align: 'left' });
      
      doc.fontSize(16)
        .fillColor('#e0e7ff')
        .text('Votre billet électronique', 50, 90);

      // Ligne de séparation
      doc.moveTo(50, 170)
        .lineTo(562, 170)
        .strokeColor('#e5e7eb')
        .lineWidth(2)
        .stroke();

      // Informations de l'événement
      doc.fontSize(24)
        .fillColor('#111827')
        .text(ticketData.eventTitle, 50, 200, { width: 512 });

      // Icônes et détails (simulées avec des symboles)
      const detailsY = 260;
      const lineHeight = 30;

      // Date
      doc.fontSize(12)
        .fillColor('#6b7280')
        .text('📅', 50, detailsY);
      doc.fontSize(14)
        .fillColor('#374151')
        .text(`Date: ${ticketData.eventDate}`, 80, detailsY);

      // Heure
      doc.fontSize(12)
        .fillColor('#6b7280')
        .text('🕐', 50, detailsY + lineHeight);
      doc.fontSize(14)
        .fillColor('#374151')
        .text(`Heure: ${ticketData.eventTime}`, 80, detailsY + lineHeight);

      // Lieu
      doc.fontSize(12)
        .fillColor('#6b7280')
        .text('📍', 50, detailsY + lineHeight * 2);
      doc.fontSize(14)
        .fillColor('#374151')
        .text(`Lieu: ${ticketData.eventLocation}`, 80, detailsY + lineHeight * 2, { width: 482 });

      // Type de billet
      doc.fontSize(12)
        .fillColor('#6b7280')
        .text('🎫', 50, detailsY + lineHeight * 3);
      doc.fontSize(14)
        .fillColor('#374151')
        .text(`Type: ${ticketData.ticketType}`, 80, detailsY + lineHeight * 3);

      // Prix (si payant)
      if (ticketData.price && ticketData.price > 0) {
        doc.fontSize(12)
          .fillColor('#6b7280')
          .text('💰', 50, detailsY + lineHeight * 4);
        doc.fontSize(14)
          .fillColor('#374151')
          .text(`Prix: ${ticketData.price.toFixed(2)} €`, 80, detailsY + lineHeight * 4);
      }

      // Ligne de séparation
      doc.moveTo(50, 450)
        .lineTo(562, 450)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke();

      // Informations du participant
      doc.fontSize(16)
        .fillColor('#111827')
        .text('Informations du participant', 50, 470);

      doc.fontSize(14)
        .fillColor('#374151')
        .text(`Nom: ${ticketData.userName}`, 50, 500);

      doc.fontSize(14)
        .fillColor('#374151')
        .text(`Email: ${ticketData.userEmail}`, 50, 525);

      // Code du billet (QR Code textuel)
      doc.fontSize(16)
        .fillColor('#111827')
        .text('Code du billet', 50, 570);

      doc.fontSize(12)
        .fillColor('#6b7280')
        .text('Présentez ce code à l\'entrée ou scannez le QR code dans l\'application mobile', 50, 595, { width: 512 });

      // Code en gros
      doc.fontSize(20)
        .fillColor('#6366f1')
        .font('Courier')
        .text(ticketData.code, 50, 630);

      // Statut
      const statusColor = ticketData.status === 'confirmed' ? '#10b981' : '#f59e0b';
      const statusText = ticketData.status === 'confirmed' ? 'CONFIRMÉ' : 'EN ATTENTE';
      
      doc.fontSize(14)
        .fillColor(statusColor)
        .font('Helvetica-Bold')
        .text(`Statut: ${statusText}`, 50, 670);

      // Pied de page
      doc.fontSize(10)
        .fillColor('#9ca3af')
        .font('Helvetica')
        .text(
          'Ce billet est personnel et non transférable. Conservez-le précieusement.',
          50,
          750,
          { align: 'center', width: 512 }
        );

      doc.fontSize(8)
        .fillColor('#d1d5db')
        .text(
          `Billet généré le ${new Date().toLocaleDateString('fr-FR')} - ID: ${ticketData.ticketId}`,
          50,
          780,
          { align: 'center', width: 512 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
