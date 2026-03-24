/**
 * @module pdfService
 * @description Service de génération de billets PDF pour les participants.
 *
 * Produit un document A4 professionnel contenant toutes les informations
 * nécessaires à l'entrée de l'événement : détails de l'événement, informations
 * du participant, QR code scannable et code alphanumérique lisible.
 * Le PDF est généré entièrement en mémoire (Buffer) afin de pouvoir être
 * renvoyé directement en réponse HTTP ou envoyé par email sans écriture disque.
 *
 * Le design suit la charte graphique EventHub (violet `#7B5CFF`) et inclut
 * un en-tête coloré, des sections clairement délimitées et un pied de page
 * horodaté.
 *
 * @datasource Aucune source de données externe ; reçoit un objet `TicketData` en entrée
 * @dependencies pdfkit (génération PDF), qrcode (génération QR code en base64)
 *
 * @exports generateTicketPDF — génère le buffer PDF complet d'un billet
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Données nécessaires à la génération d'un billet PDF.
 * Toutes les informations affichées sur le billet sont regroupées ici
 * afin de découpler la logique de génération de la source des données
 * (Firestore, cache, etc.).
 */
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

const PRIMARY_COLOR = '#7B5CFF';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#6b7280';
const TEXT_LIGHT = '#9ca3af';
const SUCCESS_COLOR = '#10b981';

/**
 * Génère un billet PDF professionnel au format A4 avec QR code intégré.
 *
 * Le document est construit séquentiellement section par section :
 * 1. En-tête violet avec le logo EventHub
 * 2. Détails de l'événement (titre, date, heure, lieu, type)
 * 3. Informations du participant (nom, email)
 * 4. Zone de validation : QR code + code alphanumérique côte à côte
 * 5. Statut du billet (confirmé / en attente)
 * 6. Mention légale et pied de page horodaté
 *
 * Le QR code encode le code du billet en majuscules avec un niveau de
 * correction d'erreur élevé (`H`) pour rester lisible même imprimé en petit.
 *
 * @param {TicketData} ticketData — ensemble des données à afficher sur le billet
 * @returns {Promise<Buffer>} Buffer PDF prêt à être envoyé en réponse HTTP ou par email
 * @throws {Error} En cas d'échec de génération du QR code ou du document PDF
 */
export const generateTicketPDF = async (ticketData: TicketData): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 40, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const contentX = 50;
      const contentWidth = pageWidth - 100;
      let currentY = 0;

      // ========== HEADER BANDEAU VIOLET ==========
      const headerHeight = 85;
      doc
        .fillColor(PRIMARY_COLOR)
        .rect(0, 0, pageWidth, headerHeight)
        .fill();

      currentY = 25;
      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('EventHub', 0, currentY, { width: pageWidth, align: 'center' });

      currentY += 38;
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('rgba(255, 255, 255, 0.95)')
        .text('Votre billet électronique', 0, currentY, { width: pageWidth, align: 'center' });

      // ========== CONTENU (fond blanc) ==========
      currentY = headerHeight + 35;

      // Titre de l'événement (gros, gras, majuscules)
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(TEXT_DARK)
        .text((ticketData.eventTitle || 'Événement').toUpperCase(), contentX, currentY, {
          width: contentWidth,
          align: 'left',
        });
      currentY += 35;

      // Détails événement (liste claire)
      const detailLineHeight = 22;
      const printDetail = (label: string, value: string) => {
        if (!value) return;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(TEXT_MUTED)
          .text(label, contentX, currentY);
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(TEXT_DARK)
          .text(value, contentX + 80, currentY - 2);
        currentY += detailLineHeight;
      };

      printDetail('Date:', ticketData.eventDate || '-');
      printDetail('Heure:', ticketData.eventTime || '-');
      printDetail('Lieu:', ticketData.eventLocation || '-');
      printDetail('Type:', ticketData.ticketType || 'Standard');

      currentY += 20;

      // ========== INFORMATIONS DU PARTICIPANT ==========
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(TEXT_DARK)
        .text('Informations du participant', contentX, currentY);
      currentY += 22;

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(TEXT_MUTED)
        .text('Nom', contentX, currentY);
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(TEXT_DARK)
        .text(ticketData.userName || 'Utilisateur', contentX + 80, currentY - 2);
      currentY += detailLineHeight;

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(TEXT_MUTED)
        .text('Email', contentX, currentY);
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(TEXT_DARK)
        .text(ticketData.userEmail || '-', contentX + 80, currentY - 2);
      currentY += 35;

      // ========== CODE DU BILLET + QR CODE (côte à côte) ==========
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(TEXT_DARK)
        .text('Code du billet', contentX, currentY);
      currentY += 18;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(TEXT_MUTED)
        .text(
          "Présentez ce code à l'entrée ou scannez le QR code dans l'application mobile.",
          contentX,
          currentY,
          { width: contentWidth }
        );
      currentY += 22;

      // QR code et code texte côte à côte
      const qrSize = 100;
      const qrX = pageWidth - contentX - qrSize;
      const qrY = currentY - 5;

      const qrDataUrl = await QRCode.toDataURL(ticketData.code.toUpperCase(), {
        margin: 1,
        width: qrSize,
        errorCorrectionLevel: 'H',
      });
      const qrBase64 = qrDataUrl.split(',')[1];
      const qrBuffer = Buffer.from(qrBase64!, 'base64');

      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Code en violet, à gauche du QR
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(PRIMARY_COLOR)
        .text(ticketData.code.toUpperCase(), contentX, qrY + (qrSize - 20) / 2, {
          width: qrX - contentX - 20,
          align: 'left',
        });

      currentY = qrY + qrSize + 25;

      // ========== STATUT ==========
      const statusColor = ticketData.status === 'confirmed' ? SUCCESS_COLOR : '#f59e0b';
      const statusText = ticketData.status === 'confirmed' ? 'CONFIRMÉ' : 'EN ATTENTE';
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(statusColor)
        .text(`Statut: ${statusText}`, contentX, currentY);
      currentY += 28;

      // ========== MENTION LÉGALE ==========
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(TEXT_LIGHT)
        .text(
          'Ce billet est personnel et non transférable. Conservez-le précieusement.',
          contentX,
          currentY,
          { width: contentWidth }
        );
      currentY += 20;

      // ========== PIED DE PAGE ==========
      const genDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(TEXT_LIGHT)
        .text(
          `Billet généré le ${genDate} - ID: ${ticketData.ticketId}`,
          contentX,
          doc.page.height - 40,
          { width: contentWidth, align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
