/**
 * @module types/express
 * @description Augmentation alternative du type Request d'Express (version simplifiée).
 *
 * Ce fichier fournit une déclaration minimale de req.user avec uniquement
 * userId et role. Il coexiste avec express.d.ts qui utilise le type AuthUser
 * complet. En pratique, TypeScript fusionne (merge) les deux déclarations,
 * mais cette version sert de fallback léger pour les contextes où le
 * middleware d'auth complet n'est pas encore chargé.
 *
 * @see ./express.d.ts - Déclaration principale avec le type AuthUser complet
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        /** Identifiant Firebase de l'utilisateur */
        userId: string;
        /** Rôle applicatif (participant, organizer, admin) */
        role?: string;
      };
    }
  }
}

export {};
