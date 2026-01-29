// Script de test pour vérifier l'API Ticketmaster
require('dotenv').config();
const axios = require('axios');

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

if (!TICKETMASTER_API_KEY) {
  console.error('❌ TICKETMASTER_API_KEY manquante dans .env');
  console.log('💡 Ajoutez TICKETMASTER_API_KEY=votre_cle dans backend/.env');
  process.exit(1);
}

console.log('🔍 Test de l\'API Ticketmaster...\n');
console.log('Clé API:', TICKETMASTER_API_KEY.substring(0, 10) + '...' + TICKETMASTER_API_KEY.substring(TICKETMASTER_API_KEY.length - 5));
console.log('');

async function testTicketmasterAPI() {
  try {
    // Formater la date au format attendu par Ticketmaster (YYYY-MM-DDTHH:mm:ssZ sans millisecondes)
    const formatDateForTicketmaster = (date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    };

    const url = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const params = {
      apikey: TICKETMASTER_API_KEY,
      city: 'Paris',
      countryCode: 'FR',
      size: 10,
      sort: 'date,asc',
      locale: 'fr-fr',
      startDateTime: formatDateForTicketmaster(new Date()),
    };

    console.log('📡 Envoi de la requête...');
    console.log('   URL:', url);
    console.log('   Paramètres:', {
      ...params,
      apikey: '***' + TICKETMASTER_API_KEY.substring(TICKETMASTER_API_KEY.length - 5),
    });
    console.log('');

    const response = await axios.get(url, { 
      params,
      timeout: 15000,
    });

    console.log('✅ Réponse reçue !');
    console.log('   Status:', response.status);
    console.log('   Total d\'événements disponibles:', response.data?.page?.totalElements || 0);
    console.log('   Nombre d\'événements dans cette page:', response.data?._embedded?.events?.length || 0);
    console.log('');

    const events = response.data?._embedded?.events || [];

    if (events.length === 0) {
      console.log('⚠️  Aucun événement trouvé pour Paris, France');
      console.log('   Cela peut être normal si aucun événement n\'est prévu dans les prochains jours.');
      return;
    }

    console.log('📅 Événements trouvés:');
    console.log('');

    events.slice(0, 5).forEach((event, index) => {
      console.log(`${index + 1}. ${event.name || 'Sans titre'}`);
      console.log(`   📍 Lieu: ${event._embedded?.venues?.[0]?.name || 'Non spécifié'}`);
      console.log(`   📅 Date: ${event.dates?.start?.localDate || 'Non spécifiée'} ${event.dates?.start?.localTime || ''}`);
      console.log(`   💰 Prix: ${event.priceRanges?.[0]?.min ? event.priceRanges[0].min + '€' : 'Gratuit'}`);
      console.log(`   🖼️  Image: ${event.images?.[0]?.url ? 'Oui' : 'Non'}`);
      console.log('');
    });

    if (events.length > 5) {
      console.log(`   ... et ${events.length - 5} autres événements`);
      console.log('');
    }

    console.log('✅ Test réussi ! L\'API Ticketmaster fonctionne correctement.');
    console.log('');
    console.log('💡 Vous pouvez maintenant utiliser l\'API dans votre application.');
    console.log('   Les événements seront récupérés automatiquement dans HomeParticipantScreen.');

  } catch (error) {
    console.error('❌ Erreur lors du test:');
    console.error('   Message:', error?.message);
    
    if (error?.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('');
        console.error('⚠️  Problème d\'authentification !');
        console.error('   Vérifiez que votre clé API Ticketmaster est correcte.');
        console.error('   Obtenez une nouvelle clé sur: https://developer.ticketmaster.com/');
      }
    } else if (error?.request) {
      console.error('   Aucune réponse du serveur');
      console.error('   Vérifiez votre connexion internet');
    }
    
    process.exit(1);
  }
}

testTicketmasterAPI();
