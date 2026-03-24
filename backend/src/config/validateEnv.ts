/**
 * @module config/validateEnv
 * @description Validation des variables d'environnement au démarrage du serveur.
 *
 * Appelé une seule fois dans server.ts après le chargement de dotenv.
 * Émet un avertissement (sans crash) si des variables obligatoires sont absentes,
 * afin de permettre un diagnostic rapide des erreurs de configuration
 * sans empêcher le serveur de démarrer en mode dégradé.
 *
 * @exports validateEnv - Fonction de vérification à appeler au boot
 */

/**
 * Vérifie la présence des variables d'environnement essentielles.
 * Ne lève pas d'erreur pour rester permissif en développement local,
 * mais logue un avertissement clair listant les variables manquantes.
 */
export const validateEnv = () => {
  const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    console.warn(
      `⚠️  Warning: Missing environment variables: ${missingEnvVars.join(', ')}`
    );
  }

  console.log(`🔧 Config: PORT=${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV}`);
};
