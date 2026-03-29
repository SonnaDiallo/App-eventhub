/**
 * Script de seed : crée des événements de test pour les organisateurs définis.
 * Usage : npx tsx scripts/seedEvents.ts
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Firebase Admin init ──────────────────────────────────────────────────────
const backendDir = path.join(__dirname, '..');
const files = fs.readdirSync(backendDir);
const serviceAccountFile = files.find(
  (f) => f.startsWith('eventhub-') && f.includes('firebase-adminsdk') && f.endsWith('.json')
);
if (!serviceAccountFile) {
  console.error('❌ Fichier service account Firebase introuvable dans backend/');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(backendDir, serviceAccountFile), 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const auth = admin.auth();
const db = admin.firestore();

// ── Config ───────────────────────────────────────────────────────────────────
const ORGANIZERS = [
  { email: 'kanoutecoumba00@gmail.com', name: 'Coumba Kanouté' },
  { email: 'saransacko0309@gmail.com',  name: 'Saran Sacko' },
];

// Dates futures (avril → juin 2026)
const d = (y: number, m: number, day: number, h = 0, min = 0) =>
  new Date(y, m - 1, day, h, min);

// ── Événements par organisateur ───────────────────────────────────────────────
function buildEvents(uid: string, name: string) {
  return [
    // ── Organisateur 1 : Coumba Kanouté ────────────────────────────────────
    ...(name === 'Coumba Kanouté'
      ? [
          {
            title: 'Festival de Musique Africaine',
            description:
              'Venez célébrer la richesse de la musique africaine avec des artistes de renom venus du Sénégal, du Mali et du Cameroun. Une soirée inoubliable sous les étoiles avec danse, rythmes et couleurs.',
            category: 'music',
            location: 'Parc de la Villette, Paris',
            startDate: d(2026, 4, 18, 19, 0),
            endDate:   d(2026, 4, 18, 23, 30),
            isFree: true,
            capacity: 500,
            coverImage:
              'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: "Exposition : L'Art Contemporain d'Afrique",
            description:
              'Une exposition exceptionnelle réunissant 30 artistes contemporains africains. Peintures, sculptures, photographies et installations artistiques qui interrogent l\'identité, la mémoire et l\'avenir du continent.',
            category: 'arts',
            location: 'Palais de Tokyo, Paris 16e',
            startDate: d(2026, 5, 10, 10, 0),
            endDate:   d(2026, 5, 10, 19, 0),
            isFree: false,
            price: 12,
            capacity: 200,
            coverImage:
              'https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Atelier Danse Afro-Contemporaine',
            description:
              'Initiez-vous aux mouvements de la danse afro-contemporaine avec notre instructrice certifiée. Cet atelier mêle techniques traditionnelles et contemporaines pour tous les niveaux.',
            category: 'arts',
            location: 'Studio Harmonia, Lyon 6e',
            startDate: d(2026, 6, 6, 14, 0),
            endDate:   d(2026, 6, 6, 17, 0),
            isFree: false,
            price: 25,
            capacity: 30,
            coverImage:
              'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
        ]
      : []),

    // ── Organisateur 2 : Saran Sacko ─────────────────────────────────────
    ...(name === 'Saran Sacko'
      ? [
          {
            title: 'Tournoi de Football Communautaire',
            description:
              'Grand tournoi de football en 5 contre 5 ouvert à tous. Des équipes de toute l\'Île-de-France s\'affrontent dans une ambiance festive et conviviale. Inscription par équipe de 5 à 7 joueurs.',
            category: 'sports',
            location: 'Stade Léo Lagrange, Paris 13e',
            startDate: d(2026, 4, 25, 9, 0),
            endDate:   d(2026, 4, 25, 18, 0),
            isFree: true,
            capacity: 150,
            coverImage:
              'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Soirée Gastronomie Africaine',
            description:
              'Découvrez les saveurs authentiques de l\'Afrique de l\'Ouest à travers un repas gastronomique concocté par nos chefs. Au menu : thiéboudienne, mafé, yassa poulet, et bien d\'autres spécialités.',
            category: 'food',
            location: 'Restaurant Le Dakar, Marseille 6e',
            startDate: d(2026, 5, 22, 19, 30),
            endDate:   d(2026, 5, 22, 23, 0),
            isFree: false,
            price: 45,
            capacity: 80,
            coverImage:
              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Concert Gospel & Soul — Une Nuit Étoilée',
            description:
              'Une nuit magique avec les meilleurs chœurs gospel et artistes soul. Venez vibrer au rythme de la musique qui fait battre les cœurs. Chorale à 60 voix, soloistes invités et orchestre live.',
            category: 'music',
            location: 'Zénith de Bordeaux, Bordeaux',
            startDate: d(2026, 6, 13, 20, 0),
            endDate:   d(2026, 6, 13, 23, 30),
            isFree: false,
            price: 35,
            capacity: 1200,
            coverImage:
              'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Journée Sport & Bien-être en Famille',
            description:
              'Une journée dédiée au sport et au bien-être pour toute la famille. Yoga, zumba, initiations sportives pour enfants, stands nutrition et massage. Entrée libre, ambiance détendue garantie.',
            category: 'family',
            location: 'Parc de Bercy, Paris 12e',
            startDate: d(2026, 4, 12, 10, 0),
            endDate:   d(2026, 4, 12, 18, 0),
            isFree: true,
            capacity: 300,
            coverImage:
              'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Run for Africa — Course Solidaire 10km',
            description:
              'Participez à notre course solidaire de 10 km en soutien aux enfants défavorisés d\'Afrique. Parcours le long des quais de la Seine, ambiance festive, t-shirt offert. Tous les bénéfices reversés à l\'association.',
            category: 'sports',
            location: 'Quai de la Tournelle, Paris 5e',
            startDate: d(2026, 5, 3, 8, 30),
            endDate:   d(2026, 5, 3, 12, 0),
            isFree: false,
            price: 15,
            capacity: 500,
            coverImage:
              'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Soirée DJ Afrobeats & Amapiano',
            description:
              'La plus grande soirée Afrobeats & Amapiano de Paris ! 3 DJs internationaux, 2 salles de danse, bar afrobeat. Dress code : coloré et festif. Ouverture des portes à 22h.',
            category: 'music',
            location: 'Le Rex Club, Paris 2e',
            startDate: d(2026, 5, 30, 22, 0),
            endDate:   d(2026, 5, 31, 5, 0),
            isFree: false,
            price: 20,
            capacity: 600,
            coverImage:
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Marché Africain & Artisanat',
            description:
              'Grand marché artisanal africain réunissant 80 exposants venus de 15 pays. Vêtements, bijoux, art, épices, cosmétiques naturels. Animations musicales et stands de streetfood africaine tout au long de la journée.',
            category: 'other',
            location: 'Grande Halle de la Villette, Paris 19e',
            startDate: d(2026, 6, 20, 10, 0),
            endDate:   d(2026, 6, 21, 19, 0),
            isFree: true,
            capacity: 2000,
            coverImage:
              'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Tournoi de Basketball 3×3',
            description:
              'Tournoi officiel de basketball 3×3 homologué FFBB. Catégories : U18, seniors hommes et femmes. Inscription par équipe de 4 joueurs minimum. Lots à gagner pour les équipes finalistes.',
            category: 'sports',
            location: 'Gymnase Jacques Chirac, Lyon 8e',
            startDate: d(2026, 7, 4, 9, 0),
            endDate:   d(2026, 7, 4, 20, 0),
            isFree: false,
            price: 10,
            capacity: 120,
            coverImage:
              'https://images.unsplash.com/photo-1546519638405-a9f5ece34f58?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
        ]
      : []),
    // ── Événements communs aux deux organisateurs (Coumba) ────────────────
    ...(name === 'Coumba Kanouté'
      ? [
          {
            title: 'Théâtre Africain — "Les Voix d\'Ici"',
            description:
              'Pièce de théâtre contemporaine mettant en scène la vie des diasporas africaines en France. Un spectacle touchant sur l\'identité, la famille et l\'intégration. Texte original, mise en scène moderne.',
            category: 'arts',
            location: 'Théâtre du Châtelet, Paris 1er',
            startDate: d(2026, 4, 17, 20, 30),
            endDate:   d(2026, 4, 17, 23, 0),
            isFree: false,
            price: 22,
            capacity: 400,
            coverImage:
              'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Conférence : Entrepreneuriat & Innovation en Afrique',
            description:
              'Rencontrez des entrepreneurs africains qui façonnent l\'économie de demain. Table ronde, pitchs de startups, networking, et témoignages inspirants de fondateurs de scale-ups africaines.',
            category: 'other',
            location: 'Station F, Paris 13e',
            startDate: d(2026, 4, 30, 9, 0),
            endDate:   d(2026, 4, 30, 18, 0),
            isFree: false,
            price: 30,
            capacity: 250,
            coverImage:
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Cinéma en Plein Air — Films Africains',
            description:
              'Projection de 3 films africains primés sous les étoiles. Films sous-titrés en français. Pique-nique encouragé, buvette sur place. Ouverture du parc à 19h, projections à partir de 21h.',
            category: 'arts',
            location: 'Parc Floral de Vincennes, Paris 12e',
            startDate: d(2026, 7, 11, 19, 0),
            endDate:   d(2026, 7, 11, 23, 59),
            isFree: true,
            capacity: 800,
            coverImage:
              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Cours de Cuisine Sénégalaise — Niveau Débutant',
            description:
              'Apprenez à cuisiner les grands classiques de la cuisine sénégalaise avec notre chef professionnelle. Thiéboudienne, yassa et thiou au programme. Matières premières fournies, tablier inclus.',
            category: 'food',
            location: 'Atelier des Chefs, Lyon 2e',
            startDate: d(2026, 5, 16, 14, 0),
            endDate:   d(2026, 5, 16, 18, 0),
            isFree: false,
            price: 55,
            capacity: 16,
            coverImage:
              'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Gala de Bienfaisance — Solidarité Afrique',
            description:
              'Soirée gala de prestige au profit des écoles rurales en Afrique subsaharienne. Dîner gastronomique 4 services, vente aux enchères d\'œuvres d\'art, concert live. Tenue de soirée exigée.',
            category: 'other',
            location: 'Hôtel de Crillon, Paris 8e',
            startDate: d(2026, 6, 27, 19, 0),
            endDate:   d(2026, 6, 27, 23, 30),
            isFree: false,
            price: 120,
            capacity: 200,
            coverImage:
              'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Atelier Peinture — Portraits Afro',
            description:
              'Atelier de peinture acrylique autour des portraits afro-contemporains. Guidé par l\'artiste Aminata Kouyaté. Matériel fourni, aucune expérience requise. 12 participants max pour un suivi personnalisé.',
            category: 'arts',
            location: 'Galerie Koya, Toulouse',
            startDate: d(2026, 5, 9, 10, 0),
            endDate:   d(2026, 5, 9, 13, 0),
            isFree: false,
            price: 35,
            capacity: 12,
            coverImage:
              'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Festival Afro Kids — Journée Enfants',
            description:
              'Une journée magique pour les enfants de 3 à 12 ans : contes africains, percussion, maquillage, jeux traditionnels, animations costumées. Gratuit pour les enfants accompagnés d\'un adulte payant.',
            category: 'family',
            location: 'Centre Culturel de Nantes, Nantes',
            startDate: d(2026, 4, 5, 10, 0),
            endDate:   d(2026, 4, 5, 18, 0),
            isFree: false,
            price: 8,
            capacity: 200,
            coverImage:
              'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Nuit de la Mode Africaine',
            description:
              'Défilé haute couture 100% créateurs africains. 20 stylistes, 60 looks exclusifs. Soirée cocktail, exposition photos, vente de créations. Une célébration de l\'élégance et du savoir-faire africain.',
            category: 'arts',
            location: 'Palais Brongniart, Paris 2e',
            startDate: d(2026, 6, 5, 19, 0),
            endDate:   d(2026, 6, 5, 23, 0),
            isFree: false,
            price: 50,
            capacity: 350,
            coverImage:
              'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
          {
            title: 'Brunch Networking — Diaspora Business',
            description:
              'Brunch mensuel réunissant entrepreneurs, freelances et professionnels de la diaspora africaine. Format informel, présentations de 2 min, échanges libres. Café & viennoiseries inclus.',
            category: 'food',
            location: 'WeWork Nation, Paris 11e',
            startDate: d(2026, 4, 19, 10, 0),
            endDate:   d(2026, 4, 19, 13, 0),
            isFree: false,
            price: 18,
            capacity: 60,
            coverImage:
              'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
            organizerId: uid,
            organizerName: name,
          },
        ]
      : []),
  ];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Démarrage du seed des événements...\n');

  for (const organizer of ORGANIZERS) {
    // Récupérer l'UID Firebase par email
    let uid: string;
    try {
      const userRecord = await auth.getUserByEmail(organizer.email);
      uid = userRecord.uid;
      console.log(`✅ ${organizer.email} → UID: ${uid}`);
    } catch {
      console.error(`❌ Utilisateur introuvable: ${organizer.email} — vérifiez qu'il existe dans Firebase Auth`);
      continue;
    }

    // Mettre à jour le rôle Firestore en "organizer" si nécessaire
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const data = userSnap.data()!;
      if (data.role !== 'organizer' && data.role !== 'admin') {
        await userRef.update({ role: 'organizer' });
        console.log(`   🔄 Rôle mis à jour → organizer`);
      }
    }

    const events = buildEvents(uid, organizer.name);

    for (const event of events) {
      const payload = {
        ...event,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const ref = await db.collection('events').add(payload);
      console.log(`   📅 Créé : "${event.title}" (${ref.id})`);
    }

    console.log(`   ✅ ${events.length} événements créés pour ${organizer.name}\n`);
  }

  console.log('🎉 Seed terminé !');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur seed :', err);
  process.exit(1);
});
