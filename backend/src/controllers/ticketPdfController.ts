import { Request, Response } from 'express';
import { firebaseDb } from '../config/firebaseAdmin';
import { generateTicketPDF } from '../services/pdfService';

/**
 * Télécharger un billet en PDF
 */
export const downloadTicketPDF = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Récupérer le billet depuis Firestore
    const ticketRef = firebaseDb.collection('tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketData = ticketDoc.data();

    // Vérifier que le billet appartient à l'utilisateur
    if (ticketData?.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Récupérer les informations de l'utilisateur
    const userRef = firebaseDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const userName = userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : userData?.name || 'Utilisateur';
    const userEmail = userData?.email || '';

    // Récupérer les informations de l'événement
    let eventTitle = ticketData?.eventTitle || 'Événement';
    let eventDate = ticketData?.eventDate || '';
    let eventTime = ticketData?.eventTime || '';
    let eventLocation = ticketData?.eventLocation || '';
    let price = ticketData?.price || 0;

    // Si c'est un événement backend, récupérer plus de détails
    if (ticketData?.eventId && !ticketData.eventId.startsWith('external_') && !ticketData.eventId.startsWith('ticketmaster_')) {
      try {
        const eventRef = firebaseDb.collection('events').doc(ticketData.eventId);
        const eventDoc = await eventRef.get();
        
        if (eventDoc.exists) {
          const eventData = eventDoc.data();
          eventTitle = eventData?.title || eventTitle;
          eventLocation = eventData?.location || eventLocation;
          price = eventData?.price || price;
          
          const dateField = eventData?.startDate ?? eventData?.date;
          if (dateField) {
            const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
            eventDate = date.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            eventTime = date.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
      }
    }

    // Générer le PDF
    const pdfBuffer = await generateTicketPDF({
      ticketId: ticketDoc.id,
      code: ticketData?.code || '',
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      userName,
      userEmail,
      ticketType: ticketData?.ticketType || 'Standard',
      price,
      status: ticketData?.status || 'confirmed'
    });

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="billet-${ticketId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Error generating ticket PDF:', error);
    res.status(500).json({ 
      message: 'Error generating ticket PDF',
      error: error.message 
    });
  }
};

/**
 * Télécharger tous les billets d'un utilisateur en PDF (zip)
 */
export const downloadAllTicketsPDF = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Récupérer tous les billets de l'utilisateur
    const ticketsSnapshot = await firebaseDb.collection('tickets')
      .where('userId', '==', userId)
      .get();

    if (ticketsSnapshot.empty) {
      return res.status(404).json({ message: 'No tickets found' });
    }

    // Pour l'instant, on retourne juste le premier billet
    // TODO: Implémenter un système de zip pour plusieurs billets
    const firstTicket = ticketsSnapshot.docs[0];
    req.params.ticketId = firstTicket.id;
    
    return downloadTicketPDF(req, res);

  } catch (error: any) {
    console.error('Error downloading all tickets:', error);
    res.status(500).json({ 
      message: 'Error downloading tickets',
      error: error.message 
    });
  }
};
