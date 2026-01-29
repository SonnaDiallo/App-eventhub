import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import Event from '../models/Event';
import { getUserByFirebaseUid } from '../services/userService';
import mongoose from 'mongoose';

// Récupérer les tickets de l'utilisateur connecté
export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    const {
      page = '1',
      limit = '20',
      eventId,
      checkedIn,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Construire la requête
    const query: any = { userId: mongoUser._id };

    if (eventId) {
      query.eventId = new mongoose.Types.ObjectId(eventId as string);
    }

    if (checkedIn !== undefined) {
      query.checkedIn = checkedIn === 'true';
    }

    // Récupérer les tickets avec les informations de l'événement
    const tickets = await Ticket.find(query)
      .populate('eventId', 'title coverImage startDate endDate location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Ticket.countDocuments(query);

    const ticketsData = tickets.map((ticket: any) => ({
      id: ticket._id.toString(),
      code: ticket.code,
      eventId: ticket.eventId._id.toString(),
      event: {
        id: ticket.eventId._id.toString(),
        title: ticket.eventId.title,
        coverImage: ticket.eventId.coverImage,
        startDate: ticket.eventId.startDate,
        endDate: ticket.eventId.endDate,
        location: ticket.eventId.location,
      },
      participantName: ticket.participantName,
      participantEmail: ticket.participantEmail,
      ticketType: ticket.ticketType,
      price: ticket.price,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    return res.status(200).json({
      tickets: ticketsData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get my tickets error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Récupérer un ticket par son code (pour le scan)
export const getTicketByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: 'Ticket code is required' });
    }

    const ticket = await Ticket.findOne({ code: code.toUpperCase() })
      .populate('eventId', 'title startDate endDate location organizerName')
      .populate('userId', 'name email firstName lastName');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketData: any = {
      id: ticket._id.toString(),
      code: ticket.code,
      eventId: ticket.eventId._id.toString(),
      event: {
        id: ticket.eventId._id.toString(),
        title: ticket.eventId.title,
        startDate: ticket.eventId.startDate,
        endDate: ticket.eventId.endDate,
        location: ticket.eventId.location,
        organizerName: ticket.eventId.organizerName,
      },
      user: ticket.userId
        ? {
            id: ticket.userId._id.toString(),
            name: ticket.userId.name || `${ticket.userId.firstName || ''} ${ticket.userId.lastName || ''}`.trim(),
            email: ticket.userId.email,
          }
        : null,
      participantName: ticket.participantName,
      participantEmail: ticket.participantEmail,
      ticketType: ticket.ticketType,
      price: ticket.price,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      createdAt: ticket.createdAt,
    };

    return res.status(200).json({ ticket: ticketData });
  } catch (error: any) {
    console.error('Get ticket by code error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Vérifier un ticket (check-in)
export const verifyTicket = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Vérifier que l'utilisateur a la permission de scanner
    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser || (!mongoUser.canScanTickets && mongoUser.role !== 'organizer' && mongoUser.role !== 'admin')) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to scan tickets' });
    }

    if (!code) {
      return res.status(400).json({ message: 'Ticket code is required' });
    }

    const ticket = await Ticket.findOne({ code: code.toUpperCase() }).populate('eventId');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.checkedIn) {
      return res.status(400).json({
        message: 'Ticket already checked in',
        checkedInAt: ticket.checkedInAt,
      });
    }

    // Marquer le ticket comme vérifié
    ticket.checkedIn = true;
    ticket.checkedInAt = new Date();
    await ticket.save();

    return res.status(200).json({
      message: 'Ticket verified successfully',
      ticket: {
        id: ticket._id.toString(),
        code: ticket.code,
        eventId: ticket.eventId._id.toString(),
        eventTitle: (ticket.eventId as any).title,
        participantName: ticket.participantName,
        checkedIn: ticket.checkedIn,
        checkedInAt: ticket.checkedInAt,
      },
    });
  } catch (error: any) {
    console.error('Verify ticket error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Récupérer les statistiques des tickets pour un événement (organisateur uniquement)
export const getEventTicketStats = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Vérifier que l'utilisateur est l'organisateur de l'événement
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser || event.organizerId.toString() !== mongoUser._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });
    }

    // Statistiques des tickets
    const totalTickets = await Ticket.countDocuments({ eventId: event._id });
    const checkedInTickets = await Ticket.countDocuments({
      eventId: event._id,
      checkedIn: true,
    });
    const pendingTickets = totalTickets - checkedInTickets;

    // Tickets par type
    const ticketsByType = await Ticket.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: '$ticketType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenus totaux (si prix défini)
    const revenueData = await Ticket.aggregate([
      { $match: { eventId: event._id, price: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
        },
      },
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    return res.status(200).json({
      eventId: event._id.toString(),
      eventTitle: event.title,
      stats: {
        totalTickets,
        checkedInTickets,
        pendingTickets,
        checkInRate: totalTickets > 0 ? ((checkedInTickets / totalTickets) * 100).toFixed(2) : '0.00',
        totalRevenue,
        ticketsByType: ticketsByType.map((item) => ({
          type: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get event ticket stats error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
