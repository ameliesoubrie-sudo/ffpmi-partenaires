// Parametres de connexion a Supabase.
// A remplir avec les valeurs de Supabase > Project Settings > API.
// La cle "anon" est faite pour etre publique : la securite repose sur les regles de la base.
window.FFPMI_CONFIG = {
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE-CLE-ANON",
  BUCKET: "partenaires",
  CONTACT_EMAIL: "partenaires@ffpmi.eu",

  // Identite de la FFPMI reprise dans les contrats de partenariat.
  // A verifier : le SIRET d'etablissement change quand le siege change d'adresse.
  FFPMI: {
    siret: "319 403 697 00075",
    adresse: "6 impasse Marthe Condat, 31200 Toulouse",
    signataire: "Madame Amélie Soubrié",
    qualite: "Présidente",
    lieu: "Toulouse"
  }
};
