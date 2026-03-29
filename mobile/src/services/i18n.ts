/**
 * @file Système d'internationalisation (i18n) simplifié.
 *
 * Fournit les traductions statiques pour le français, l'anglais et
 * l'espagnol. La langue choisie est persistée dans AsyncStorage et
 * la fonction `t(key)` retourne la traduction correspondante.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en' | 'es';

const translations: Record<string, Record<string, string>> = {
  fr: {
    // Navigation & tabs
    events: 'Événements',
    profile: 'Profil',
    tickets: 'Mes billets',
    favorites: 'Mes favoris',
    settings: 'Paramètres',
    home: 'Accueil',
    messages: 'Messages',
    friends: 'Amis',

    // Auth
    login: 'Connexion',
    register: 'Inscription',
    forgotPassword: 'Mot de passe oublié',
    welcome: 'Bienvenue',

    // Profile & Settings
    myEvents: 'Mes événements',
    preferences: 'Préférences',
    account: 'Compte',
    about: 'À propos',
    language: 'Langue',
    logout: 'Déconnexion',
    logoutConfirm: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    version: 'Version',
    editProfile: 'Modifier le profil',
    save: 'Enregistrer',
    cancel: 'Annuler',
    name: 'Nom',
    email: 'Email',
    role: 'Rôle',
    participant: 'Participant',
    organizer: 'Organisateur',
    password: 'Mot de passe',
    security: 'Sécurité',
    interests: 'Centres d\'intérêt',
    pushNotifications: 'Notifications Push',
    darkMode: 'Mode sombre',
    publicProfile: 'Profil public',
    privacy: 'Confidentialité',
    blockedUsers: 'Utilisateurs bloqués',
    support: 'Support',
    helpCenter: 'Centre d\'aide',
    aboutApp: 'À propos d\'EventHub',

    // Events
    eventDetails: 'Détails de l\'événement',
    bookMySpot: 'Réserver ma place',
    alreadyRegistered: 'Déjà inscrit ✓',
    confirmRegistration: 'Confirmer l\'inscription',
    registerQuestion: 'Veux-tu t\'inscrire à',
    free: 'Gratuit',
    paid: 'Payant',
    date: 'Date',
    time: 'Heure',
    location: 'Lieu',
    description: 'Description',
    category: 'Catégorie',
    price: 'Prix',
    capacity: 'Capacité',
    participants: 'Participants',
    organizedBy: 'Organisé par',
    seeAll: 'Voir tout',
    noEvents: 'Aucun événement',
    createEvent: 'Créer un événement',
    deleteEvent: 'Supprimer l\'événement',
    deleteEventConfirm: 'Es-tu sûr(e) de vouloir supprimer cet événement ? Cette action est irréversible.',
    share: 'Partager',
    addToCalendar: 'Ajouter au calendrier',
    openInMaps: 'Ouvrir dans Maps',
    trending: 'Tendances',
    upcoming: 'À venir',
    past: 'Passés',
    allEvents: 'Tous les événements',
    featuredEvents: 'Événements à la une',
    nearYou: 'Près de chez toi',
    search: 'Rechercher',
    searchEvents: 'Rechercher des événements...',
    noResults: 'Aucun résultat',
    allCategories: 'Toutes',

    // Tickets
    myTickets: 'Mes Billets',
    ticketCount: 'billet(s)',
    upcomingTickets: 'À venir',
    pastTickets: 'Passés',
    noUpcomingTickets: 'Aucun billet à venir',
    noPastTickets: 'Aucun billet passé',
    noUpcomingTicketsDesc: 'Inscris-toi à un événement pour obtenir ton premier billet !',
    noPastTicketsDesc: 'Tes billets passés apparaîtront ici.',
    browseEvents: 'Voir les événements',
    downloadTicket: 'Télécharger le billet (PDF)',
    cancelReservation: 'Annuler la réservation',
    cancelReservationConfirm: 'Es-tu sûr de vouloir annuler ta réservation ? Ton billet sera supprimé.',
    reservationCancelled: 'Ton billet a été supprimé.',
    ticketUsed: '✓ UTILISÉ',
    ticketValid: '✓ VALIDE',
    showQrCode: 'Présente ce QR code à l\'entrée',
    yourTicket: 'Ton billet 🎫',
    yourTicketDesc: 'Présente ce code ou le QR à l\'entrée. Retrouve-le dans "Mes billets".',
    alreadyUsed: 'Billet déjà utilisé',

    // Favorites
    myFavorites: 'Mes favoris',
    noFavorites: 'Aucun favori',
    noFavoritesDesc: 'Ajoutez des événements à vos favoris pour les retrouver facilement',

    // Friends & Social
    myFriends: 'Mes amis',
    addFriend: 'Ajouter un ami',
    friendRequestSent: 'Demande envoyée',
    alreadyFriends: 'Vous êtes déjà amis',
    requestPending: 'Une demande est déjà en attente',
    follow: 'Suivre',
    following: 'Suivi',

    // Reviews
    reviews: 'Avis',
    addReview: 'Donner un avis',
    noReviews: 'Aucun avis',

    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    close: 'Fermer',
    ok: 'OK',
    yes: 'Oui',
    no: 'Non',
    back: 'Retour',
    next: 'Suivant',
    send: 'Envoyer',
    retry: 'Réessayer',
    seeMore: 'Voir plus',
    seeLess: 'Voir moins',
    loginRequired: 'Connexion requise',
    loginRequiredDesc: 'Tu dois être connecté pour effectuer cette action.',

    // Organizer
    dashboard: 'Tableau de bord',
    scanTicket: 'Scanner un billet',
    myOrganizedEvents: 'Mes événements organisés',
    participantsOverview: 'Vue participants',

    // Payment
    payment: 'Paiement',
  },
  en: {
    // Navigation & tabs
    events: 'Events',
    profile: 'Profile',
    tickets: 'My tickets',
    favorites: 'My favorites',
    settings: 'Settings',
    home: 'Home',
    messages: 'Messages',
    friends: 'Friends',

    // Auth
    login: 'Login',
    register: 'Sign up',
    forgotPassword: 'Forgot password',
    welcome: 'Welcome',

    // Profile & Settings
    myEvents: 'My events',
    preferences: 'Preferences',
    account: 'Account',
    about: 'About',
    language: 'Language',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    version: 'Version',
    editProfile: 'Edit profile',
    save: 'Save',
    cancel: 'Cancel',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    participant: 'Participant',
    organizer: 'Organizer',
    password: 'Password',
    security: 'Security',
    interests: 'Interests',
    pushNotifications: 'Push notifications',
    darkMode: 'Dark mode',
    publicProfile: 'Public profile',
    privacy: 'Privacy',
    blockedUsers: 'Blocked users',
    support: 'Support',
    helpCenter: 'Help center',
    aboutApp: 'About EventHub',

    // Events
    eventDetails: 'Event details',
    bookMySpot: 'Book my spot',
    alreadyRegistered: 'Already registered ✓',
    confirmRegistration: 'Confirm registration',
    registerQuestion: 'Do you want to register for',
    free: 'Free',
    paid: 'Paid',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    description: 'Description',
    category: 'Category',
    price: 'Price',
    capacity: 'Capacity',
    participants: 'Participants',
    organizedBy: 'Organized by',
    seeAll: 'See all',
    noEvents: 'No events',
    createEvent: 'Create event',
    deleteEvent: 'Delete event',
    deleteEventConfirm: 'Are you sure you want to delete this event? This action cannot be undone.',
    share: 'Share',
    addToCalendar: 'Add to calendar',
    openInMaps: 'Open in Maps',
    trending: 'Trending',
    upcoming: 'Upcoming',
    past: 'Past',
    allEvents: 'All events',
    featuredEvents: 'Featured events',
    nearYou: 'Near you',
    search: 'Search',
    searchEvents: 'Search events...',
    noResults: 'No results',
    allCategories: 'All',

    // Tickets
    myTickets: 'My Tickets',
    ticketCount: 'ticket(s)',
    upcomingTickets: 'Upcoming',
    pastTickets: 'Past',
    noUpcomingTickets: 'No upcoming tickets',
    noPastTickets: 'No past tickets',
    noUpcomingTicketsDesc: 'Register for an event to get your first ticket!',
    noPastTicketsDesc: 'Your past tickets will appear here.',
    browseEvents: 'Browse events',
    downloadTicket: 'Download ticket (PDF)',
    cancelReservation: 'Cancel reservation',
    cancelReservationConfirm: 'Are you sure you want to cancel your reservation? Your ticket will be deleted.',
    reservationCancelled: 'Your ticket has been deleted.',
    ticketUsed: '✓ USED',
    ticketValid: '✓ VALID',
    showQrCode: 'Show this QR code at the entrance',
    yourTicket: 'Your ticket 🎫',
    yourTicketDesc: 'Show this code or QR at the entrance. Find it in "My tickets".',
    alreadyUsed: 'Ticket already used',

    // Favorites
    myFavorites: 'My favorites',
    noFavorites: 'No favorites',
    noFavoritesDesc: 'Add events to your favorites to find them easily',

    // Friends & Social
    myFriends: 'My friends',
    addFriend: 'Add friend',
    friendRequestSent: 'Request sent',
    alreadyFriends: 'Already friends',
    requestPending: 'A request is already pending',
    follow: 'Follow',
    following: 'Following',

    // Reviews
    reviews: 'Reviews',
    addReview: 'Add review',
    noReviews: 'No reviews',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    delete: 'Delete',
    close: 'Close',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    send: 'Send',
    retry: 'Retry',
    seeMore: 'See more',
    seeLess: 'See less',
    loginRequired: 'Login required',
    loginRequiredDesc: 'You must be logged in to perform this action.',

    // Organizer
    dashboard: 'Dashboard',
    scanTicket: 'Scan ticket',
    myOrganizedEvents: 'My organized events',
    participantsOverview: 'Participants overview',

    // Payment
    payment: 'Payment',
  },
  es: {
    // Navigation & tabs
    events: 'Eventos',
    profile: 'Perfil',
    tickets: 'Mis entradas',
    favorites: 'Mis favoritos',
    settings: 'Configuración',
    home: 'Inicio',
    messages: 'Mensajes',
    friends: 'Amigos',

    // Auth
    login: 'Iniciar sesión',
    register: 'Registrarse',
    forgotPassword: 'Contraseña olvidada',
    welcome: 'Bienvenido',

    // Profile & Settings
    myEvents: 'Mis eventos',
    preferences: 'Preferencias',
    account: 'Cuenta',
    about: 'Acerca de',
    language: 'Idioma',
    logout: 'Cerrar sesión',
    logoutConfirm: '¿Estás seguro de que quieres cerrar sesión?',
    version: 'Versión',
    editProfile: 'Editar perfil',
    save: 'Guardar',
    cancel: 'Cancelar',
    name: 'Nombre',
    email: 'Email',
    role: 'Rol',
    participant: 'Participante',
    organizer: 'Organizador',
    password: 'Contraseña',
    security: 'Seguridad',
    interests: 'Intereses',
    pushNotifications: 'Notificaciones push',
    darkMode: 'Modo oscuro',
    publicProfile: 'Perfil público',
    privacy: 'Privacidad',
    blockedUsers: 'Usuarios bloqueados',
    support: 'Soporte',
    helpCenter: 'Centro de ayuda',
    aboutApp: 'Acerca de EventHub',

    // Events
    eventDetails: 'Detalles del evento',
    bookMySpot: 'Reservar mi lugar',
    alreadyRegistered: 'Ya inscrito ✓',
    confirmRegistration: 'Confirmar inscripción',
    registerQuestion: '¿Quieres inscribirte en',
    free: 'Gratis',
    paid: 'De pago',
    date: 'Fecha',
    time: 'Hora',
    location: 'Lugar',
    description: 'Descripción',
    category: 'Categoría',
    price: 'Precio',
    capacity: 'Capacidad',
    participants: 'Participantes',
    organizedBy: 'Organizado por',
    seeAll: 'Ver todo',
    noEvents: 'Sin eventos',
    createEvent: 'Crear evento',
    deleteEvent: 'Eliminar evento',
    deleteEventConfirm: '¿Estás seguro de que quieres eliminar este evento? Esta acción es irreversible.',
    share: 'Compartir',
    addToCalendar: 'Añadir al calendario',
    openInMaps: 'Abrir en Maps',
    trending: 'Tendencias',
    upcoming: 'Próximos',
    past: 'Pasados',
    allEvents: 'Todos los eventos',
    featuredEvents: 'Eventos destacados',
    nearYou: 'Cerca de ti',
    search: 'Buscar',
    searchEvents: 'Buscar eventos...',
    noResults: 'Sin resultados',
    allCategories: 'Todas',

    // Tickets
    myTickets: 'Mis Entradas',
    ticketCount: 'entrada(s)',
    upcomingTickets: 'Próximas',
    pastTickets: 'Pasadas',
    noUpcomingTickets: 'Sin entradas próximas',
    noPastTickets: 'Sin entradas pasadas',
    noUpcomingTicketsDesc: '¡Inscríbete en un evento para obtener tu primera entrada!',
    noPastTicketsDesc: 'Tus entradas pasadas aparecerán aquí.',
    browseEvents: 'Ver eventos',
    downloadTicket: 'Descargar entrada (PDF)',
    cancelReservation: 'Cancelar reserva',
    cancelReservationConfirm: '¿Estás seguro de que quieres cancelar tu reserva? Tu entrada será eliminada.',
    reservationCancelled: 'Tu entrada ha sido eliminada.',
    ticketUsed: '✓ UTILIZADA',
    ticketValid: '✓ VÁLIDA',
    showQrCode: 'Muestra este código QR en la entrada',
    yourTicket: 'Tu entrada 🎫',
    yourTicketDesc: 'Muestra este código o QR en la entrada. Encuéntralo en "Mis entradas".',
    alreadyUsed: 'Entrada ya utilizada',

    // Favorites
    myFavorites: 'Mis favoritos',
    noFavorites: 'Sin favoritos',
    noFavoritesDesc: 'Añade eventos a tus favoritos para encontrarlos fácilmente',

    // Friends & Social
    myFriends: 'Mis amigos',
    addFriend: 'Añadir amigo',
    friendRequestSent: 'Solicitud enviada',
    alreadyFriends: 'Ya sois amigos',
    requestPending: 'Ya hay una solicitud pendiente',
    follow: 'Seguir',
    following: 'Siguiendo',

    // Reviews
    reviews: 'Reseñas',
    addReview: 'Dar una reseña',
    noReviews: 'Sin reseñas',

    // Common
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    close: 'Cerrar',
    ok: 'OK',
    yes: 'Sí',
    no: 'No',
    back: 'Volver',
    next: 'Siguiente',
    send: 'Enviar',
    retry: 'Reintentar',
    seeMore: 'Ver más',
    seeLess: 'Ver menos',
    loginRequired: 'Inicio de sesión requerido',
    loginRequiredDesc: 'Debes iniciar sesión para realizar esta acción.',

    // Organizer
    dashboard: 'Panel de control',
    scanTicket: 'Escanear entrada',
    myOrganizedEvents: 'Mis eventos organizados',
    participantsOverview: 'Vista de participantes',

    // Payment
    payment: 'Pago',
  },
};

let currentLanguage: Language = 'fr';

/** Persiste la langue choisie et met à jour la variable en mémoire. */
export const setLanguage = async (lang: Language) => {
  currentLanguage = lang;
  await AsyncStorage.setItem('@eventhub_language', lang);
};

/** Charge la langue depuis AsyncStorage ; retourne `'fr'` par défaut. */
export const getLanguage = async (): Promise<Language> => {
  try {
    const savedLang = await AsyncStorage.getItem('@eventhub_language');
    if (savedLang === 'fr' || savedLang === 'en' || savedLang === 'es') {
      currentLanguage = savedLang;
      return savedLang;
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
  return 'fr';
};

/** Retourne la traduction de `key` pour la langue courante (ou celle spécifiée). */
export const t = (key: string, lang?: Language): string => {
  const langToUse = lang || currentLanguage;
  const translation = translations[langToUse];
  return (translation as any)[key] || key;
};

/** Retourne la langue active sans accès asynchrone au stockage. */
export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};
