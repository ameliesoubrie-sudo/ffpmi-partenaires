// FFPMI - Onglet « Partenaires événementiels » de l'espace admin :
// exposants, sponsors et intervenants des congrès et événements, sans offre adhérents.
(function () {
  "use strict";

  var A, sb, el, $;
  var CATEGORIES = [
    "Matériel photo et vidéo", "Laboratoire et impression", "Albums et produits photo", "Logiciels et services en ligne",
    "Décors, fonds et accessoires", "Encadrement", "Distribution et magasins", "Formation et organismes",
    "Assurance, banque et conseil", "Médias et communication", "Studios et photographes", "Autre"
  ];
  var STATUTS = [
    { v: "propose", l: "Proposé" }, { v: "reserve", l: "Réservé" }, { v: "signe", l: "Contrat signé" },
    { v: "facture", l: "Facturé" }, { v: "paye", l: "Payé" }, { v: "annule", l: "Annulé" }
  ];
  var TYPES_DOC = ["Bon de réservation", "Contrat", "Devis", "Facture d'acompte", "Facture finale", "Facture", "Avoir", "Justificatif de paiement", "Courrier", "Plan ou fiche technique", "Autre"];
  function typeDevine(nom) {
    var n = (nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/reservation|stand_|bon de commande/.test(n)) return "Bon de réservation";
    if (/avoir/.test(n)) return "Avoir";
    if (/acompte/.test(n) && /facture/.test(n)) return "Facture d'acompte";
    if (/(solde|finale?)/.test(n) && /facture/.test(n)) return "Facture finale";
    if (/facture|invoice/.test(n)) return "Facture";
    if (/devis|quote/.test(n)) return "Devis";
    if (/contrat|convention/.test(n)) return "Contrat";
    if (/courrier|lettre|resiliation/.test(n)) return "Courrier";
    if (/virement|paiement|recu|justificatif/.test(n)) return "Justificatif de paiement";
    if (/plan|technique/.test(n)) return "Plan ou fiche technique";
    return "Autre";
  }
  function typeDoc(dd) { return dd.type || typeDevine(dd.nom); }
  var FORMULES = ["Stand", "Sponsoring", "Intervention", "Encart publicitaire", "Lot ou dotation", "Autre"];
  var TYPES_EVT = [["congres", "Congrès"], ["salon", "Salon"], ["regional", "Rencontre régionale"], ["webinaire", "Webinaire"], ["autre", "Autre"]];
  var CH_CONTACT = [["prenom", "Prénom"], ["nom", "Nom"], ["fonction", "Fonction"], ["email", "Email"], ["telephone", "Téléphone"], ["note", "Note"]];

  var S = { logos: {}, charge: false, ents: [], evts: [], parts: [], vue: "entreprises", cat: "", q: "", choisi: null, retourEvt: null, racine: null };

  function init() {
    if (A) return;
    A = window.FFPMI_ADMIN; sb = A.sb; el = A.el; $ = A.$;
  }

  /* ---------- Outils ---------- */
  function libStatut(v) { for (var i = 0; i < STATUTS.length; i++) if (STATUTS[i].v === v) return STATUTS[i].l; return v; }
  function euros(n) {
    if (n == null || n === "" || isNaN(Number(n))) return "";
    return Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  }
  function dateCourte(d) { return d ? A.dateFr(d) : ""; }
  function datesEvt(v) {
    if (!v.date_debut) return "";
    if (!v.date_fin || v.date_fin === v.date_debut) return dateCourte(v.date_debut);
    return "du " + dateCourte(v.date_debut) + " au " + dateCourte(v.date_fin);
  }
  // Contact a afficher pour un evenement : celui de la reservation s'il est connu, sinon le contact principal
  function contactEvt(e) {
    var cs = e.contacts || [];
    return cs.filter(function (c) { return /réservation/i.test(c.note || ""); })[0] || cs[0] || {};
  }
  function evt(id) { return S.evts.filter(function (v) { return v.id === id; })[0]; }
  function ent(id) { return S.ents.filter(function (e) { return e.id === id; })[0]; }
  function partsDe(eId) {
    return S.parts.filter(function (p) { return p.entreprise_id === eId; })
      .sort(function (a, b) { return String((evt(b.evenement_id) || {}).date_debut || "").localeCompare(String((evt(a.evenement_id) || {}).date_debut || "")); });
  }
  function selectDe(options, valeur, attrs) {
    var s = el("select", attrs);
    options.forEach(function (o) {
      var v = Array.isArray(o) ? o[0] : (o.v !== undefined ? o.v : o);
      var l = Array.isArray(o) ? o[1] : (o.l !== undefined ? o.l : o);
      var op = el("option", { value: v, texte: l });
      if (String(v) === String(valeur == null ? "" : valeur)) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function champ(libelle, input, plein, aide) {
    var id = "evt-ch-" + Math.random().toString(36).slice(2, 9);
    input.id = id;
    var enfants = [el("label", { for: id, texte: libelle }), input];
    if (aide) enfants.push(el("p", { classe: "aide", texte: aide }));
    return el("div", { classe: "champ" + (plein ? " plein" : "") }, enfants);
  }
  function texte(v, type, ph) { var i = el("input", { type: type || "text" }); i.value = v == null ? "" : v; if (ph) i.placeholder = ph; return i; }
  function zone(v, ph) { var t = el("textarea"); t.value = v || ""; if (ph) t.placeholder = ph; return t; }
  function emailOk(m) { return !m || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m); }
  function lienSite(u) {
    if (!u) return null;
    var href = /^https?:\/\//i.test(u) ? u : "https://" + u;
    return el("a", { href: href, target: "_blank", rel: "noopener", texte: u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") });
  }
  function remplacer(liste, ligne) { for (var i = 0; i < liste.length; i++) if (liste[i].id === ligne.id) { liste[i] = ligne; return; } liste.push(ligne); }
  function correspond(e) {
    if (S.cat && e.categorie !== S.cat) return false;
    if (!S.q) return true;
    var t = [e.nom, e.activite, e.ville, e.pays, e.categorie, e.notes].concat((e.contacts || []).map(function (c) { return [c.prenom, c.nom, c.email, c.fonction].join(" "); })).join(" ").toLowerCase();
    return t.indexOf(S.q) !== -1;
  }

  /* ---------- Chargement ---------- */
  async function charger() {
    S.racine.textContent = "";
    S.racine.appendChild(el("div", { classe: "carte attente", texte: "Chargement des partenaires événementiels..." }));
    var r = await Promise.all([
      sb.from("entreprises").select("*").order("nom", { ascending: true }),
      sb.from("evenements").select("*").order("date_debut", { ascending: false }),
      sb.from("participations").select("*").order("created_at", { ascending: true })
    ]);
    var err = r.filter(function (x) { return x.error; })[0];
    if (err) {
      S.racine.textContent = "";
      S.racine.appendChild(el("div", { classe: "alerte alerte-erreur", texte: "Chargement impossible : " + err.error.message + ". Vérifiez que le fichier evenementiel.sql a bien été lancé dans Supabase." }));
      return;
    }
    S.ents = r[0].data || []; S.evts = r[1].data || []; S.parts = r[2].data || [];
    S.charge = true;
    await chargerLogos();
    rendre();
  }

  async function chargerLogos() {
    var manquants = S.ents.map(function (e) { return e.logo_path; }).filter(function (p) { return p && !S.logos[p]; });
    if (!manquants.length) return;
    var r = await sb.storage.from(A.BUCKET).createSignedUrls(manquants, 3600);
    ((r && r.data) || []).forEach(function (x) { if (x.signedUrl) S.logos[x.path] = x.signedUrl; });
  }
  function vignette(e, classe) {
    var v = el("span", { classe: classe });
    if (e.logo_path && S.logos[e.logo_path]) v.appendChild(el("img", { src: S.logos[e.logo_path], alt: "" }));
    else v.textContent = A.initiales(e.nom || "?");
    return v;
  }

  /* ---------- Structure de l'onglet ---------- */
  function rendre() {
    var R = S.racine;
    R.textContent = "";

    var vue = selectDe([["entreprises", "Toutes les entreprises"]].concat(S.evts.map(function (v) { return [v.id, v.nom]; })), S.vue, { "aria-label": "Vue" });
    vue.className = "evt-select-vue";
    vue.addEventListener("change", function () { S.vue = vue.value; S.choisi = null; S.retourEvt = null; rendre(); });

    var bNouv = el("button", { type: "button", classe: "btn btn-primaire btn-petit", texte: "Nouvelle entreprise" });
    bNouv.addEventListener("click", function () { S.vue = "entreprises"; S.choisi = "nouveau"; rendre(); });
    var bExpC = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Exporter les contacts" });
    bExpC.addEventListener("click", exporterContacts);
    var bExpL = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: S.vue === "entreprises" ? "Exporter la liste" : "Exporter les participants" });
    bExpL.addEventListener("click", exporterListe);
    var bAct = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Actualiser" });
    bAct.addEventListener("click", charger);

    R.appendChild(el("div", { classe: "evt-entete" }, [
      el("div", { classe: "evt-vue" }, [el("label", { classe: "label", texte: "Afficher" }), vue]),
      el("div", { classe: "evt-actions" }, [bNouv, bExpC, bExpL, bAct])
    ]));

    R.appendChild(sectionEvenements());
    R.appendChild(sectionLot());

    var cat = selectDe([["", "Toutes les catégories"]].concat(CATEGORIES.map(function (c) { return [c, c]; })), S.cat, { "aria-label": "Catégorie" });
    cat.className = "evt-select";
    cat.addEventListener("change", function () { S.cat = cat.value; rafraichir(); });
    var rech = el("input", { type: "search", placeholder: "Rechercher une entreprise, un contact, une ville...", "aria-label": "Rechercher" });
    rech.value = S.q;
    rech.addEventListener("input", function () { S.q = rech.value.trim().toLowerCase(); rafraichir(); });
    R.appendChild(el("div", { classe: "barre" }, [cat, el("div", { classe: "recherche" }, [rech])]));

    if (S.vue === "entreprises") {
      R.appendChild(el("div", { classe: "espace" + (S.choisi ? " detail-ouvert" : ""), id: "evt-espace" }, [
        el("div", { classe: "liste", id: "evt-liste" }),
        el("div", { classe: "detail", id: "evt-detail" })
      ]));
      rendreListe();
      rendreDetail();
    } else {
      R.appendChild(el("div", { id: "evt-vue-evenement" }));
      rendreEvenement();
    }
  }
  function rafraichir() { if (S.vue === "entreprises") rendreListe(); else rendreEvenement(); }

  /* ---------- Gestion des evenements ---------- */
  function sectionEvenements() {
    var det = el("details", { classe: "import-lot evt-gestion" });
    if (!S.evts.length) det.open = true;
    det.appendChild(el("summary", { texte: "Gérer les événements (" + S.evts.length + ")" }));
    det.appendChild(el("p", { texte: "Congrès, salons, rencontres régionales : créez l'événement ici, puis ajoutez-y les entreprises participantes." }));
    var liste = el("div", { classe: "evt-liste-evts" });
    S.evts.forEach(function (v) { liste.appendChild(ligneEvenement(v)); });
    liste.appendChild(ligneEvenement(null));
    det.appendChild(liste);
    return det;
  }
  function ligneEvenement(v) {
    var nouveau = !v; v = v || { nom: "", type: "congres", lieu: "", date_debut: "", date_fin: "" };
    var nom = texte(v.nom, "text", nouveau ? "Nom du nouvel événement, ex. : Salon de la Photo 2026" : "");
    var type = selectDe(TYPES_EVT, v.type);
    var lieu = texte(v.lieu, "text", "Lieu");
    var d1 = texte(v.date_debut, "date"), d2 = texte(v.date_fin, "date");
    var etat = el("span", { classe: "etat" });
    var b = el("button", { type: "button", classe: "btn btn-petit " + (nouveau ? "btn-primaire" : "btn-secondaire"), texte: nouveau ? "Créer l'événement" : "Enregistrer" });
    b.addEventListener("click", async function () {
      if (!nom.value.trim()) { nom.focus(); etat.textContent = "Indiquez le nom."; return; }
      var data = { nom: nom.value.trim(), type: type.value, lieu: lieu.value.trim() || null, date_debut: d1.value || null, date_fin: d2.value || null };
      b.disabled = true; etat.textContent = "Enregistrement...";
      var r = nouveau ? await sb.from("evenements").insert(data).select().single()
                      : await sb.from("evenements").update(data).eq("id", v.id).select().single();
      b.disabled = false;
      if (r.error) { etat.textContent = "Erreur : " + r.error.message; return; }
      remplacer(S.evts, r.data);
      S.evts.sort(function (a, c) { return String(c.date_debut || "").localeCompare(String(a.date_debut || "")); });
      if (nouveau) { S.vue = r.data.id; S.choisi = null; }
      rendre();
    });
    var enfants = [
      champ("Événement", nom), champ("Type", type), champ("Lieu", lieu), champ("Début", d1), champ("Fin", d2),
      el("div", { classe: "evt-ligne-actions" }, [b])
    ];
    if (!nouveau) {
      var n = S.parts.filter(function (p) { return p.evenement_id === v.id; }).length;
      var bs = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Supprimer" });
      bs.addEventListener("click", function () {
        etat.textContent = "";
        var ok = el("button", { type: "button", classe: "btn btn-danger btn-petit", texte: "Confirmer" });
        var non = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Annuler" });
        var msg = el("span", { classe: "alerte-suppression", texte: "Supprimer « " + v.nom + " »" + (n ? " et ses " + n + " participation" + (n > 1 ? "s" : "") : "") + " ? " });
        etat.appendChild(msg); etat.appendChild(ok); etat.appendChild(non);
        non.addEventListener("click", function () { etat.textContent = ""; });
        ok.addEventListener("click", async function () {
          ok.disabled = true;
          var r = await sb.from("evenements").delete().eq("id", v.id);
          if (r && r.error) { etat.textContent = "Erreur : " + r.error.message; return; }
          S.evts = S.evts.filter(function (x) { return x.id !== v.id; });
          S.parts = S.parts.filter(function (p) { return p.evenement_id !== v.id; });
          if (S.vue === v.id) S.vue = "entreprises";
          rendre();
        });
      });
      enfants[5].appendChild(bs);
    }
    enfants.push(etat);
    return el("div", { classe: "evt-ligne-evt" + (nouveau ? " nouveau" : "") }, enfants);
  }

  /* ---------- Liste des entreprises ---------- */
  function rendreListe() {
    var l = $("evt-liste"); if (!l) return;
    l.textContent = "";
    var vs = S.ents.filter(correspond);
    l.appendChild(el("div", { classe: "evt-compte", texte: vs.length + " entreprise" + (vs.length > 1 ? "s" : "") + (vs.length !== S.ents.length ? " sur " + S.ents.length : "") }));
    if (!vs.length) { l.appendChild(el("div", { classe: "vide", texte: S.ents.length ? "Aucune entreprise ne correspond." : "Aucune entreprise pour l'instant. Cliquez sur « Nouvelle entreprise »." })); return; }
    vs.forEach(function (e) {
      var meta = el("span", { classe: "meta" });
      if (e.categorie) meta.appendChild(el("span", { texte: e.categorie }));
      var nb = (e.contacts || []).length;
      meta.appendChild(el("span", { texte: nb + " contact" + (nb > 1 ? "s" : "") }));
      var ps = partsDe(e.id).filter(function (p) { return p.statut !== "annule"; });
      if (ps.length) {
        var v0 = evt(ps[0].evenement_id);
        meta.appendChild(el("span", { classe: "badge evt-b-" + ps[0].statut, texte: (v0 ? v0.nom.replace(/^Congrès national FFPMI/, "Congrès") : "") + " : " + libStatut(ps[0].statut) }));
      }
      if (e.dossier_id) meta.appendChild(el("span", { classe: "badge evt-b-offre", texte: "Offre adhérents" }));
      if ((e.a_verifier || []).length) meta.appendChild(el("span", { classe: "badge evt-b-verif", texte: "À vérifier" }));
      var b = el("button", { type: "button", classe: "item" + (S.choisi === e.id ? " choisi" : "") }, [
        vignette(e, "vignette"),
        el("span", null, [el("span", { classe: "nom", texte: e.nom }), meta])
      ]);
      b.addEventListener("click", function () { S.choisi = e.id; S.retourEvt = null; rendreListe(); rendreDetail(); });
      l.appendChild(b);
    });
  }

  /* ---------- Fiche entreprise ---------- */
  function rendreDetail(message) {
    var zoneD = $("evt-detail"); if (!zoneD) return;
    var esp = $("evt-espace");
    zoneD.textContent = "";
    if (!S.choisi) { esp.classList.remove("detail-ouvert"); zoneD.appendChild(el("div", { classe: "carte attente", texte: "Sélectionnez une entreprise pour afficher sa fiche." })); return; }
    esp.classList.add("detail-ouvert");
    var nouveau = S.choisi === "nouveau";
    var e = nouveau ? { nom: "", categorie: "", activite: "", site_web: "", ville: "", pays: "France", contacts: [], notes: "", documents: [], a_verifier: [] } : ent(S.choisi);
    if (!e) { S.choisi = null; rendreDetail(); return; }

    var retour = el("button", { type: "button", classe: "btn btn-secondaire btn-petit retour", texte: S.retourEvt ? "Retour à « " + ((evt(S.retourEvt) || {}).nom || "l'événement") + " »" : "Retour à la liste" });
    if (S.retourEvt) retour.classList.add("toujours");
    retour.addEventListener("click", function () {
      if (S.retourEvt) { S.vue = S.retourEvt; S.retourEvt = null; S.choisi = null; rendre(); return; }
      S.choisi = null; rendreListe(); rendreDetail();
    });
    zoneD.appendChild(retour);

    var carte = el("div", { classe: "carte" });
    var sousTitre = [e.categorie, [e.ville, e.pays && e.pays !== "France" ? e.pays : ""].filter(Boolean).join(", ")].filter(Boolean).join(" - ");
    var lignesEntete = [el("h2", { texte: nouveau ? "Nouvelle entreprise" : e.nom }), sousTitre ? el("div", { classe: "offre", texte: sousTitre }) : null];
    if (e.site_web) lignesEntete.push(el("div", { classe: "date" }, [lienSite(e.site_web)]));
    if (e.dossier_id) {
      var d = A.dossiers().filter(function (x) { return x.id === e.dossier_id; })[0];
      var lien = el("button", { type: "button", classe: "lien-offre", texte: "Aussi partenaire avec offre adhérents" + (d ? " : " + (d.offre_titre || A.nomAffiche(d)) : "") + " - voir le dossier" });
      lien.addEventListener("click", function () { A.ouvrirDossier(e.dossier_id); });
      lignesEntete.push(lien);
    }
        var boiteLogo = el("div", { classe: "evt-logo-boite" }, [vignette(e, "logo")]);
    if (!nouveau) {
      var inLogo = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/svg+xml", hidden: "hidden", id: "evt-logo-fichier" });
      var bLogo = el("label", { classe: "evt-logo-btn", for: "evt-logo-fichier", texte: e.logo_path ? "Changer le logo" : "Ajouter un logo" });
      inLogo.addEventListener("change", async function () {
        var fi = inLogo.files[0]; if (!fi) return;
        bLogo.textContent = "Envoi...";
        var err = await poserLogo(e, fi);
        if (err) { bLogo.textContent = "Erreur : " + err; return; }
        rendreListe(); rendreDetail("Logo mis à jour.");
      });
      boiteLogo.appendChild(inLogo); boiteLogo.appendChild(bLogo);
    }
    carte.appendChild(el("div", { classe: "entete-dossier" }, [boiteLogo, el("div", null, lignesEntete)]));

    // Informations
    var f = {
      nom: texte(e.nom), categorie: selectDe([["", "Choisir..."]].concat(CATEGORIES.map(function (c) { return [c, c]; })), e.categorie),
      activite: zone(e.activite, "Ce que fait l'entreprise, ses produits ou services"), site_web: texte(e.site_web, "url", "https://"),
      ville: texte(e.ville), pays: texte(e.pays), notes: zone(e.notes, "Historique, préférences, points d'attention... visible uniquement par l'équipe FFPMI")
    };
    var verifie = null;
    var infos = el("div", { classe: "evt-infos" });
    if ((e.a_verifier || []).length) {
      verifie = el("input", { type: "checkbox", id: "evt-verifie" });
      infos.appendChild(el("div", { classe: "info-import evt-verif" }, [
        el("div", { texte: "À vérifier :\n- " + e.a_verifier.join("\n- ") }),
        el("label", { classe: "evt-verif-ok", for: "evt-verifie" }, [verifie, el("span", { texte: " C'est vérifié, retirer ces remarques à l'enregistrement" })])
      ]));
    }
    infos.appendChild(el("div", { classe: "grille" }, [
      champ("Nom de l'entreprise", f.nom), champ("Catégorie", f.categorie),
      champ("Activité", f.activite, true),
      champ("Site internet", f.site_web), champ("Ville", f.ville), champ("Pays", f.pays),
      champ("Notes internes", f.notes, true)
    ]));
    carte.appendChild(infos);

    // Contacts
    var boxC = el("div", { classe: "contacts" });
    boxC.appendChild(el("h3", { texte: "Contacts" }));
    var zc = el("div"); boxC.appendChild(zc);
    var lignes = [];
    function ajouterContact(c) {
      var ligne = el("div", { classe: "ligne-contact" });
      ligne.appendChild(el("div", { classe: "role", texte: lignes.length === 0 ? "Contact principal" : "Autre contact" }));
      var inputs = {};
      CH_CONTACT.forEach(function (ch) {
        var id = "evtc-" + Math.random().toString(36).slice(2, 9);
        var inp = el("input", { type: ch[0] === "email" ? "email" : (ch[0] === "telephone" ? "tel" : "text"), id: id, placeholder: "À compléter" });
        inp.value = (c && c[ch[0]]) || "";
        inputs[ch[0]] = inp;
        ligne.appendChild(el("div", { classe: "info" }, [el("label", { for: id, texte: ch[1] }), inp]));
      });
      var s = el("button", { type: "button", classe: "suppr", title: "Retirer ce contact", "aria-label": "Retirer ce contact", texte: "×" });
      s.addEventListener("click", function () {
        ligne.remove(); lignes = lignes.filter(function (x) { return x.ligne !== ligne; });
        lignes.forEach(function (x, i) { x.ligne.querySelector(".role").textContent = i === 0 ? "Contact principal" : "Autre contact"; });
      });
      ligne.appendChild(s);
      zc.appendChild(ligne);
      lignes.push({ ligne: ligne, inputs: inputs });
    }
    (e.contacts || []).forEach(ajouterContact);
    if (!lignes.length) ajouterContact({});
    var bAjout = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Ajouter un contact" });
    bAjout.addEventListener("click", function () { ajouterContact({}); });
    boxC.appendChild(el("div", { classe: "actions" }, [bAjout]));
    carte.appendChild(boxC);

    // Enregistrement
    var etat = el("span", { classe: "etat", texte: message || "" });
    var bEnr = el("button", { type: "button", classe: "btn btn-primaire", texte: nouveau ? "Créer la fiche" : "Enregistrer la fiche" });
    bEnr.addEventListener("click", async function () {
      if (!f.nom.value.trim()) { f.nom.focus(); etat.textContent = "Indiquez le nom de l'entreprise."; return; }
      var contacts = lignes.map(function (l) { var o = {}; CH_CONTACT.forEach(function (ch) { o[ch[0]] = l.inputs[ch[0]].value.trim(); }); return o; })
        .filter(function (o) { return o.prenom || o.nom || o.email || o.telephone; });
      var mauvais = contacts.filter(function (o) { return !emailOk(o.email); })[0];
      if (mauvais) { etat.textContent = "Adresse email invalide : " + mauvais.email; return; }
      var data = {
        nom: f.nom.value.trim(), categorie: f.categorie.value || null, activite: f.activite.value.trim() || null,
        site_web: f.site_web.value.trim() || null, ville: f.ville.value.trim() || null, pays: f.pays.value.trim() || null,
        notes: f.notes.value.trim() || null, contacts: contacts
      };
      if (verifie && verifie.checked) data.a_verifier = [];
      bEnr.disabled = true; etat.textContent = "Enregistrement...";
      var r = nouveau ? await sb.from("entreprises").insert(data).select().single()
                      : await sb.from("entreprises").update(data).eq("id", e.id).select().single();
      bEnr.disabled = false;
      if (r.error) { etat.textContent = "Erreur : " + r.error.message; return; }
      remplacer(S.ents, r.data);
      S.ents.sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });
      S.choisi = r.data.id;
      rendreListe(); rendreDetail(nouveau ? "Fiche créée. Vous pouvez maintenant ajouter ses participations et documents." : "Enregistré.");
    });
    carte.appendChild(el("div", { classe: "evt-enregistrer" }, [bEnr, etat]));

    if (!nouveau) {
      carte.appendChild(sectionParticipations(e));
      carte.appendChild(sectionDocuments(e));
      carte.appendChild(sectionSuppression(e));
    }
    zoneD.appendChild(carte);
    if (window.innerWidth <= 860 || S.retourEvt) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Logo ---------- */
  function nomPropre(n) { return n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80); }
  async function poserLogo(e, fi) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(fi.type)) return "format non accepté (PNG, JPG, WEBP ou SVG)";
    if (fi.size > 5 * 1024 * 1024) return "fichier trop lourd (5 Mo maximum)";
    var path = e.id + "/documents/logo-" + nomPropre(fi.name);
    var up = await sb.storage.from(A.BUCKET).upload(path, fi, { contentType: fi.type, upsert: true });
    if (up.error) return up.error.message;
    var r = await sb.from("entreprises").update({ logo_path: path }).eq("id", e.id).select().single();
    if (r.error) return r.error.message;
    if (e.logo_path && e.logo_path !== path) await sb.storage.from(A.BUCKET).remove([e.logo_path]);
    delete S.logos[path];
    remplacer(S.ents, r.data);
    await chargerLogos();
    if (window.FFPMI_DEMO && !S.logos[path]) S.logos[path] = URL.createObjectURL(fi);
    return null;
  }

  /* ---------- Rangement de fichiers en lot ---------- */
  function sectionLot() {
    var det = el("details", { classe: "import-lot" });
    det.appendChild(el("summary", { texte: "Ranger des fichiers en lot (bons de réservation, contrats, logos)" }));
    det.appendChild(el("p", { texte: "Sélectionnez les fichiers du dossier « Import appli ». Chaque nom contient entre crochets un identifiant, par exemple « Sony France - réservation stand Congrès 2027 [43a23c7c].pdf » : le fichier est rangé tout seul dans la bonne fiche, et rattaché à la bonne participation. Les images dont le nom contient « logo » deviennent le logo de l'entreprise. Un fichier déjà rangé n'est pas ajouté une deuxième fois." }));
    var inp = el("input", { type: "file", multiple: "multiple", accept: "application/pdf,image/png,image/jpeg,image/webp,image/svg+xml", "aria-label": "Fichiers à ranger" });
    var etat = el("span", { classe: "etat" });
    var rapport = el("ul", { hidden: "hidden" });
    var b = el("button", { type: "button", classe: "btn btn-primaire btn-petit", texte: "Ranger les fichiers" });
    b.addEventListener("click", async function () {
      var fichiers = Array.prototype.slice.call(inp.files || []);
      if (!fichiers.length) { etat.textContent = "Sélectionnez d'abord les fichiers."; return; }
      b.disabled = true; rapport.textContent = ""; rapport.hidden = false;
      var ok = 0, deja = 0, erreurs = 0;
      for (var i = 0; i < fichiers.length; i++) {
        var fi = fichiers[i];
        etat.textContent = "Fichier " + (i + 1) + " sur " + fichiers.length + "...";
        var m = fi.name.match(/\[([0-9a-f]{8})\]/i);
        var ligne = function (t) { rapport.appendChild(el("li", { texte: fi.name + " : " + t })); };
        if (!m) { erreurs++; ligne("pas d'identifiant entre crochets, ignoré"); continue; }
        var cle = m[1].toLowerCase();
        var p = S.parts.filter(function (x) { return x.id.slice(0, 8) === cle; })[0];
        var e = p ? ent(p.entreprise_id) : S.ents.filter(function (x) { return x.id.slice(0, 8) === cle; })[0];
        if (!e) { erreurs++; ligne("aucune fiche ne correspond"); continue; }
        if (!p && /logo/i.test(fi.name) && /^image\//.test(fi.type)) {
          if (e.logo_path && e.logo_path === e.id + "/documents/logo-" + nomPropre(fi.name)) { deja++; ligne("logo déjà en place"); continue; }
          var err = await poserLogo(e, fi);
          if (err) { erreurs++; ligne("erreur : " + err); } else { ok++; ligne("logo de " + e.nom); }
          continue;
        }
        if ((e.documents || []).some(function (dd) { return dd.nom === fi.name; })) { deja++; ligne("déjà rangé"); continue; }
        if (fi.size > 25 * 1024 * 1024) { erreurs++; ligne("fichier trop lourd (25 Mo maximum)"); continue; }
        var path = e.id + "/documents/" + Date.now() + "-" + nomPropre(fi.name);
        var up = await sb.storage.from(A.BUCKET).upload(path, fi, { contentType: fi.type || "application/pdf", upsert: false });
        if (up.error) { erreurs++; ligne("erreur : " + up.error.message); continue; }
        var doc = { path: path, nom: fi.name, taille: fi.size, ajoute_le: new Date().toISOString(), type: typeDevine(fi.name) };
        if (p) doc.participation_id = p.id;
        var r = await sb.from("entreprises").update({ documents: (e.documents || []).concat([doc]) }).eq("id", e.id).select().single();
        if (r.error) { erreurs++; ligne("erreur : " + r.error.message); continue; }
        remplacer(S.ents, r.data); ok++;
        ligne(p ? "rattaché à la participation de " + e.nom : "ajouté aux documents de " + e.nom);
      }
      b.disabled = false; inp.value = "";
      etat.textContent = ok + " rangé" + (ok > 1 ? "s" : "") + (deja ? ", " + deja + " déjà présent" + (deja > 1 ? "s" : "") : "") + (erreurs ? ", " + erreurs + " à vérifier" : "") + ".";
      rafraichir(); if (S.vue === "entreprises") rendreDetail();
    });
    det.appendChild(el("div", { classe: "ligne-import" }, [inp, b, etat]));
    det.appendChild(rapport);
    return det;
  }

  /* ---------- Suivi des paiements ---------- */
  var ETAPES = [
    { cle: "facture_acompte_le", court: "1", libelle: "Facture d'acompte envoyée", montant: function (p) { return acompteDe(p); }, quand: function () { return "à la réservation"; } },
    { cle: "acompte_recu_le", court: "2", libelle: "Acompte reçu", montant: function (p) { return acompteDe(p); }, quand: function () { return "à la réservation"; } },
    { cle: "facture_solde_le", court: "3", libelle: "Facture finale envoyée", montant: function (p) { return soldeDe(p); }, quand: function (p) { var d = echeanceSolde(p); return d ? "avant le " + A.dateFr(d) : ""; } },
    { cle: "solde_recu_le", court: "4", libelle: "Paiement final reçu", montant: function (p) { return soldeDe(p); }, quand: function (p) { var d = echeanceSolde(p); return d ? "échéance le " + A.dateFr(d) : ""; } }
  ];
  // Conditions du bon de reservation : 50 % a la reservation, 50 % une semaine avant l'evenement
  function acompteDe(p) { return p.acompte != null ? Number(p.acompte) : (p.montant != null ? Math.round(Number(p.montant) * 50) / 100 : 0); }
  function echeanceSolde(p) {
    var v = evt(p.evenement_id); if (!v || !v.date_debut) return null;
    var d = new Date(v.date_debut + "T12:00:00"); d.setDate(d.getDate() - 7);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function soldeEnRetard(p) { var d = echeanceSolde(p); return !!(d && !p.solde_recu_le && p.statut !== "annule" && d < aujourdhuiIso()); }
  function soldeDe(p) { return Math.round(((Number(p.montant) || 0) - acompteDe(p)) * 100) / 100; }
  function encaisse(p) {
    if (p.statut === "annule") return 0;
    if (p.solde_recu_le) return Number(p.montant) || 0;
    if (p.acompte_recu_le) return acompteDe(p);
    if (p.statut === "paye") return Number(p.montant) || 0;
    return 0;
  }
  function aujourdhuiIso() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  // Le suivi avance tout seul avec les paiements (jamais en arriere, jamais si annule)
  function statutSuivant(p, data) {
    var x = Object.assign({}, p, data);
    if (x.statut === "annule") return x.statut;
    var rang = { propose: 0, reserve: 1, signe: 2, facture: 3, paye: 4 };
    var vise = x.solde_recu_le ? "paye" : (x.facture_acompte_le || x.acompte_recu_le || x.facture_solde_le ? "facture" : x.statut);
    return rang[vise] > rang[x.statut] ? vise : x.statut;
  }
  async function majEtape(p, cle, valeur, etat) {
    var data = {}; data[cle] = valeur || null;
    data.statut = statutSuivant(p, data);
    return await majParticipation(p, data, etat);
  }
  function blocPaiement(p, apres) {
    var box = el("div", { classe: "evt-paiement" });
    var etat = el("span", { classe: "etat" });
    var acompte = texte(p.acompte != null ? p.acompte : "", "number", String(acompteDe(p))); acompte.step = "0.01"; acompte.min = "0";
    acompte.addEventListener("change", async function () {
      var n = await majParticipation(p, { acompte: acompte.value === "" ? null : Number(acompte.value) }, etat);
      if (n) { p = n; apres(n); }
    });
    box.appendChild(el("div", { classe: "evt-paiement-tete" }, [
      el("strong", { texte: "Paiement" }),
      el("span", { classe: "meta-doc", texte: "Total " + (euros(p.montant) || "0 €") + " TTC" }),
      el("span", { classe: "evt-paiement-champs" }, [el("label", { classe: "evt-acompte" }, [el("span", { texte: "Acompte (€)" }), acompte])])
    ]));
    box.appendChild(el("p", { classe: "evt-echeancier" + (soldeEnRetard(p) ? " retard" : ""), texte: "Conditions du bon de réservation : acompte de " + euros(acompteDe(p)) + " (50 %) à la réservation, solde de " + euros(soldeDe(p)) + " (50 %) une semaine avant l'événement" + (echeanceSolde(p) ? ", soit le " + A.dateFr(echeanceSolde(p)) : "") + "." + (soldeEnRetard(p) ? " Le paiement final est en retard." : "") }));
    var liste = el("div", { classe: "evt-etapes" });
    ETAPES.forEach(function (et) {
      var id = "et-" + p.id.slice(0, 8) + "-" + et.court;
      var cb = el("input", { type: "checkbox", id: id }); cb.checked = !!p[et.cle];
      var dt = el("input", { type: "date", "aria-label": "Date : " + et.libelle }); dt.value = p[et.cle] || "";
      cb.addEventListener("change", async function () {
        var v = cb.checked ? (dt.value || aujourdhuiIso()) : null;
        var n = await majEtape(p, et.cle, v, etat); if (n) { p = n; apres(n); }
      });
      dt.addEventListener("change", async function () {
        var n = await majEtape(p, et.cle, dt.value || null, etat); if (n) { p = n; apres(n); }
      });
      liste.appendChild(el("div", { classe: "evt-etape" + (p[et.cle] ? " faite" : "") }, [
        el("label", { for: id }, [cb, el("span", { texte: et.court + ". " + et.libelle }), el("span", { classe: "evt-etape-montant", texte: euros(et.montant(p)) + (et.quand(p) && !p[et.cle] ? " - " + et.quand(p) : "") })]),
        dt
      ]));
    });
    box.appendChild(liste);
    box.appendChild(etat);
    return box;
  }
  function pastillesPaiement(p, apres) {
    var w = el("span", { classe: "evt-pastilles" });
    ETAPES.forEach(function (et) {
      var fait = !!p[et.cle];
      var b = el("button", { type: "button", classe: "evt-pastille" + (fait ? " faite" : ""), texte: et.court,
        title: et.libelle + " (" + euros(et.montant(p)) + (et.quand(p) ? ", " + et.quand(p) : "") + ")" + (fait ? " : fait le " + A.dateFr(p[et.cle]) + ". Cliquer pour annuler." : ". Cliquer pour valider aujourd'hui.") });
      if (!fait && et.court === "4" && soldeEnRetard(p)) b.classList.add("retard");
      b.addEventListener("click", async function () {
        b.disabled = true;
        var n = await majEtape(p, et.cle, fait ? null : aujourdhuiIso(), el("span"));
        if (n) apres(n); else b.disabled = false;
      });
      w.appendChild(b);
    });
    return w;
  }

  /* ---------- Participations ---------- */
  async function majParticipation(p, data, etat) {
    etat.textContent = "Enregistrement...";
    var r = await sb.from("participations").update(data).eq("id", p.id).select().single();
    if (r.error) { etat.textContent = "Erreur : " + r.error.message; return null; }
    remplacer(S.parts, r.data);
    etat.textContent = "Enregistré.";
    setTimeout(function () { if (etat.textContent === "Enregistré.") etat.textContent = ""; }, 2500);
    return r.data;
  }
  async function ajouterParticipation(eId, vId, formule) {
    var r = await sb.from("participations").insert({ entreprise_id: eId, evenement_id: vId, formule: formule || "Stand", statut: "propose" }).select().single();
    if (r.error) return r.error.message;
    S.parts.push(r.data);
    return null;
  }
  function sectionParticipations(e) {
    var box = el("div", { classe: "documents evt-parts" });
    box.appendChild(el("h3", { texte: "Participations aux événements" }));
    var ps = partsDe(e.id);
    if (!ps.length) box.appendChild(el("p", { classe: "vide-doc", texte: "Aucune participation enregistrée." }));
    ps.forEach(function (p) {
      var v = evt(p.evenement_id) || { nom: "Événement supprimé" };
      var etat = el("span", { classe: "etat" });
      var formule = selectDe(FORMULES.indexOf(p.formule) === -1 && p.formule ? FORMULES.concat([p.formule]) : FORMULES, p.formule);
      var detail = texte(p.detail, "text", "Ex. : stand de 9 m², emplacement n° 12");
      var montant = texte(p.montant, "number"); montant.step = "0.01"; montant.min = "0";
      var statut = selectDe(STATUTS, p.statut);
      var notes = zone(p.notes, "Notes sur cette participation"); notes.rows = 4;
      function lire() { return { formule: formule.value, detail: detail.value.trim() || null, montant: montant.value === "" ? null : Number(montant.value), statut: statut.value, notes: notes.value.trim() || null }; }
      [formule, statut].forEach(function (x) { x.addEventListener("change", function () { majParticipation(p, lire(), etat).then(function (n) { if (n) { p = n; rendreListe(); } }); }); });
      [detail, notes].forEach(function (x) { x.addEventListener("change", function () { majParticipation(p, lire(), etat).then(function (n) { if (n) p = n; }); }); });
      montant.addEventListener("change", function () { majParticipation(p, lire(), etat).then(function (n) { if (n) rendreDetail(); }); });

      var docs = (e.documents || []).filter(function (dd) { return dd.participation_id === p.id; });
      var docsL = el("div", { classe: "evt-docs-part" });
      docs.forEach(function (dd) { docsL.appendChild(boutonTelecharger(dd, typeDoc(dd) + " : " + dd.nom)); });
      if (!docs.length) docsL.appendChild(el("span", { classe: "meta-doc", texte: "Aucun document joint à cette participation. Ajoutez-le dans « Documents » ci-dessous." }));
      var paiement = blocPaiement(p, function () { rendreListe(); rendreDetail(); });

      var bRet = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Retirer" });
      bRet.addEventListener("click", function () {
        etat.textContent = "";
        var ok = el("button", { type: "button", classe: "btn btn-danger btn-petit", texte: "Confirmer" });
        var non = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Annuler" });
        etat.appendChild(el("span", { classe: "alerte-suppression", texte: "Retirer cette participation ? " })); etat.appendChild(ok); etat.appendChild(non);
        non.addEventListener("click", function () { etat.textContent = ""; });
        ok.addEventListener("click", async function () {
          var r = await sb.from("participations").delete().eq("id", p.id);
          if (r && r.error) { etat.textContent = "Erreur : " + r.error.message; return; }
          S.parts = S.parts.filter(function (x) { return x.id !== p.id; });
          rendreListe(); rendreDetail();
        });
      });

      box.appendChild(el("div", { classe: "evt-part" }, [
        el("div", { classe: "evt-part-titre" }, [el("strong", { texte: v.nom }), el("span", { classe: "meta-doc", texte: [datesEvt(v), v.lieu].filter(Boolean).join(" - ") })]),
        el("div", { classe: "evt-part-grille" }, [champ("Formule", formule), champ("Détail", detail), champ("Montant TTC (€)", montant), champ("Suivi", statut), champ("Notes", notes, true)]),
        docsL,
        p.statut === "annule" ? null : paiement,
        el("div", { classe: "evt-part-actions" }, [bRet, etat])
      ]));
    });

    if (S.evts.length) {
      var selE = selectDe(S.evts.map(function (v) { return [v.id, v.nom]; }), S.evts[0].id, { "aria-label": "Événement" });
      var selF = selectDe(FORMULES, "Stand", { "aria-label": "Formule" });
      var etatA = el("span", { classe: "etat" });
      var bA = el("button", { type: "button", classe: "btn btn-primaire btn-petit", texte: "Ajouter la participation" });
      bA.addEventListener("click", async function () {
        bA.disabled = true;
        var err = await ajouterParticipation(e.id, selE.value, selF.value);
        bA.disabled = false;
        if (err) { etatA.textContent = "Erreur : " + err; return; }
        rendreListe(); rendreDetail();
      });
      box.appendChild(el("div", { classe: "ajout-doc" }, [selE, selF, bA, etatA]));
    } else {
      box.appendChild(el("p", { classe: "vide-doc", texte: "Créez d'abord un événement dans « Gérer les événements », en haut de l'onglet." }));
    }
    return box;
  }

  /* ---------- Documents ---------- */
  function boutonTelecharger(dd, libelle) {
    var b = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: libelle || "Télécharger" });
    b.addEventListener("click", async function () {
      var r = await sb.storage.from(A.BUCKET).createSignedUrl(dd.path, 300, { download: dd.nom });
      if (r.data && r.data.signedUrl) { var a = el("a", { href: r.data.signedUrl }); document.body.appendChild(a); a.click(); a.remove(); }
    });
    return b;
  }
  function sectionDocuments(e) {
    var box = el("div", { classe: "documents" });
    box.appendChild(el("h3", { texte: "Documents" }));
    var docs = e.documents || [];
    var liste = el("div");
    if (!docs.length) liste.appendChild(el("p", { classe: "vide-doc", texte: "Aucun document. Ajoutez ici les bons de réservation, contrats, factures, courriers..." }));
    docs.slice().sort(function (a, b) { return String(b.ajoute_le || "").localeCompare(String(a.ajoute_le || "")); }).forEach(function (dd) {
      var p = dd.participation_id ? S.parts.filter(function (x) { return x.id === dd.participation_id; })[0] : null;
      var v = p ? evt(p.evenement_id) : null;
      var actions = el("span", { classe: "actions-doc" }, [boutonTelecharger(dd)]);
      var bS = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Supprimer" });
      bS.addEventListener("click", function () {
        actions.textContent = "";
        var ok = el("button", { type: "button", classe: "btn btn-danger btn-petit", texte: "Confirmer la suppression" });
        var non = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Annuler" });
        actions.appendChild(ok); actions.appendChild(non);
        non.addEventListener("click", function () { rendreDetail(); });
        ok.addEventListener("click", async function () {
          ok.disabled = true;
          await sb.storage.from(A.BUCKET).remove([dd.path]);
          var reste = (e.documents || []).filter(function (x) { return x.path !== dd.path; });
          var r = await sb.from("entreprises").update({ documents: reste }).eq("id", e.id).select().single();
          if (r.error) { rendreDetail("Erreur : " + r.error.message); return; }
          remplacer(S.ents, r.data); rendreDetail();
        });
      });
      actions.appendChild(bS);
      var selType = selectDe(TYPES_DOC.indexOf(typeDoc(dd)) === -1 ? TYPES_DOC.concat([typeDoc(dd)]) : TYPES_DOC, typeDoc(dd), { "aria-label": "Type de document", title: "Type de document" });
      selType.className = "evt-type-doc";
      selType.addEventListener("change", async function () {
        var docs2 = (e.documents || []).map(function (x) { return x.path === dd.path ? Object.assign({}, x, { type: selType.value }) : x; });
        var r = await sb.from("entreprises").update({ documents: docs2 }).eq("id", e.id).select().single();
        if (r.error) { rendreDetail("Erreur : " + r.error.message); return; }
        remplacer(S.ents, r.data); e = r.data;
      });
      liste.appendChild(el("div", { classe: "doc" }, [
        selType,
        v ? el("span", { classe: "type-doc signe", texte: v.nom.replace(/^Congrès national FFPMI/, "Congrès") }) : null,
        el("span", { classe: "nom-doc", texte: dd.nom }),
        el("span", { classe: "meta-doc", texte: [dd.taille ? Math.max(1, Math.round(dd.taille / 1024)) + " Ko" : "", dd.ajoute_le ? "ajouté le " + A.dateFr(dd.ajoute_le) : ""].filter(Boolean).join(" - ") }),
        actions
      ]));
    });
    box.appendChild(liste);

    var ps = partsDe(e.id);
    var rattache = selectDe([["", "Non rattaché à un événement"]].concat(ps.map(function (p) { var v = evt(p.evenement_id); return [p.id, "Pour : " + (v ? v.nom : "") + " (" + p.formule + ")"]; })), ps[0] ? ps[0].id : "", { "aria-label": "Rattacher à" });
    var fichier = el("input", { type: "file", accept: "application/pdf,image/png,image/jpeg", "aria-label": "Fichier" });
    var typeNouveau = selectDe(TYPES_DOC, "Bon de réservation", { "aria-label": "Type de document" });
    fichier.addEventListener("change", function () { if (fichier.files[0]) typeNouveau.value = typeDevine(fichier.files[0].name) === "Autre" ? typeNouveau.value : typeDevine(fichier.files[0].name); });
    var etat = el("span", { classe: "etat" });
    var bA = el("button", { type: "button", classe: "btn btn-primaire btn-petit", texte: "Ajouter" });
    bA.addEventListener("click", async function () {
      var fi = fichier.files[0];
      if (!fi) { etat.textContent = "Choisissez d'abord un fichier."; return; }
      if (fi.size > 25 * 1024 * 1024) { etat.textContent = "Fichier trop lourd (25 Mo maximum)."; return; }
      bA.disabled = true; etat.textContent = "Envoi...";
      var propre = fi.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
      var path = e.id + "/documents/" + Date.now() + "-" + propre;
      var up = await sb.storage.from(A.BUCKET).upload(path, fi, { contentType: fi.type || "application/pdf", upsert: false });
      if (up.error) { bA.disabled = false; etat.textContent = "Erreur : " + up.error.message; return; }
      var doc = { path: path, nom: fi.name, taille: fi.size, ajoute_le: new Date().toISOString(), type: typeNouveau.value };
      if (rattache.value) doc.participation_id = rattache.value;
      var r = await sb.from("entreprises").update({ documents: (e.documents || []).concat([doc]) }).eq("id", e.id).select().single();
      bA.disabled = false;
      if (r.error) { etat.textContent = "Erreur : " + r.error.message; return; }
      remplacer(S.ents, r.data); rendreDetail("Document ajouté.");
    });
    box.appendChild(el("div", { classe: "ajout-doc" }, [typeNouveau, rattache, fichier, bA, etat]));
    return box;
  }

  /* ---------- Suppression ---------- */
  function sectionSuppression(e) {
    var box = el("div", { classe: "suppression" });
    var zoneB = el("div", { classe: "actions" });
    var b = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Supprimer cette entreprise" });
    zoneB.appendChild(b); box.appendChild(zoneB);
    b.addEventListener("click", function () {
      zoneB.textContent = "";
      var nP = partsDe(e.id).length, nD = (e.documents || []).length;
      var extra = [nP ? nP + " participation" + (nP > 1 ? "s" : "") : "", nD ? nD + " document" + (nD > 1 ? "s" : "") : ""].filter(Boolean).join(" et ");
      zoneB.appendChild(el("p", { classe: "alerte-suppression", texte: "Supprimer définitivement « " + e.nom + " »" + (extra ? ", avec ses " + extra : "") + " ? Cette action est irréversible." }));
      var ok = el("button", { type: "button", classe: "btn btn-danger btn-petit", texte: "Confirmer la suppression" });
      var non = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Annuler" });
      var etat = el("span", { classe: "etat" });
      zoneB.appendChild(ok); zoneB.appendChild(non); zoneB.appendChild(etat);
      non.addEventListener("click", function () { box.replaceWith(sectionSuppression(e)); });
      ok.addEventListener("click", async function () {
        ok.disabled = true; non.disabled = true; etat.textContent = "Suppression...";
        var fichiers = (e.documents || []).map(function (x) { return x.path; }).filter(Boolean);
        if (fichiers.length) await sb.storage.from(A.BUCKET).remove(fichiers);
        var r = await sb.from("entreprises").delete().eq("id", e.id);
        if (r && r.error) { etat.textContent = "Erreur : " + r.error.message; ok.disabled = false; non.disabled = false; return; }
        S.ents = S.ents.filter(function (x) { return x.id !== e.id; });
        S.parts = S.parts.filter(function (x) { return x.entreprise_id !== e.id; });
        S.choisi = null; rendreListe(); rendreDetail();
      });
    });
    return box;
  }

  /* ---------- Vue evenement ---------- */
  function rendreEvenement() {
    var R = $("evt-vue-evenement"); if (!R) return;
    R.textContent = "";
    var v = evt(S.vue);
    if (!v) { S.vue = "entreprises"; rendre(); return; }
    var toutes = S.parts.filter(function (p) { return p.evenement_id === v.id; });
    var actives = toutes.filter(function (p) { return p.statut !== "annule"; });
    var signees = actives.filter(function (p) { return ["signe", "facture", "paye"].indexOf(p.statut) !== -1; });
    var totalEnc = actives.reduce(function (t, p) { return t + encaisse(p); }, 0);
    var aFacturer = actives.filter(function (p) { return !p.facture_acompte_le && !p.solde_recu_le; }).length;
    var acomptesAttendus = actives.filter(function (p) { return p.facture_acompte_le && !p.acompte_recu_le && !p.solde_recu_le; }).length;
    var somme = function (l) { return l.reduce(function (s, p) { return s + (Number(p.montant) || 0); }, 0); };
    var nbEnt = {}; actives.forEach(function (p) { nbEnt[p.entreprise_id] = 1; });

    R.appendChild(el("div", { classe: "evt-titre-evt" }, [
      el("h2", { texte: v.nom }),
      el("div", { classe: "sous", texte: [datesEvt(v), v.lieu].filter(Boolean).join(" - ") })
    ]));
    var pill = function (n, t) { return el("span", { classe: "pastille-resume" }, [el("strong", { texte: String(n) }), t]); };
    R.appendChild(el("div", { classe: "resume-contrats" }, [
      pill(Object.keys(nbEnt).length, "entreprises participantes"),
      pill(signees.length, "contrats signés"),
      pill(actives.length - signees.length, "en attente de signature"),
      pill(euros(somme(actives)) || "0 €", "réservés"),
      pill(euros(totalEnc) || "0 €", "encaissés"),
      pill(euros(somme(actives) - totalEnc) || "0 €", "restant à encaisser"),
      pill(aFacturer, "facture" + (aFacturer > 1 ? "s" : "") + " d'acompte à envoyer"),
      pill(acomptesAttendus, "acompte" + (acomptesAttendus > 1 ? "s" : "") + " en attente")
    ]));
    var zoneAjout = el("div", { classe: "evt-ajout" });
    R.appendChild(zoneAjout);

    var lignes = toutes.map(function (p) { return { p: p, e: ent(p.entreprise_id) }; })
      .filter(function (x) { return x.e && correspond(x.e); })
      .sort(function (a, b) { return a.e.nom.localeCompare(b.e.nom, "fr"); });

    var t = el("table");
    t.appendChild(el("thead", null, [el("tr", null, ["Entreprise", "Formule", "Détail", "Montant TTC", "Suivi", "Paiement", "Bon / contrat", "Contact", ""].map(function (h) { return el("th", { texte: h }); }))]));
    var tb = el("tbody");
    if (!lignes.length) tb.appendChild(el("tr", null, [el("td", { colspan: "9", classe: "vide-table", texte: toutes.length ? "Aucune participation ne correspond aux filtres." : "Aucune entreprise pour cet événement. Ajoutez-en une avec le bloc ci-dessus." })]));
    lignes.forEach(function (x) {
      var p = x.p, e = x.e;
      var etat = el("span", { classe: "relance" });
      var nom = el("button", { type: "button", classe: "lien-fiche", texte: e.nom });
      nom.addEventListener("click", function () { S.retourEvt = v.id; S.vue = "entreprises"; S.choisi = e.id; rendre(); });
      var formule = selectDe(FORMULES.indexOf(p.formule) === -1 && p.formule ? FORMULES.concat([p.formule]) : FORMULES, p.formule, { "aria-label": "Formule" });
      var detail = texte(p.detail, "text", "-"); detail.setAttribute("aria-label", "Détail");
      var montant = texte(p.montant, "number"); montant.step = "0.01"; montant.min = "0"; montant.setAttribute("aria-label", "Montant");
      var statut = selectDe(STATUTS, p.statut, { "aria-label": "Suivi" });
      statut.className = "evt-statut evt-s-" + p.statut;
      function lire() { return { formule: formule.value, detail: detail.value.trim() || null, montant: montant.value === "" ? null : Number(montant.value), statut: statut.value }; }
      [formule, detail, montant, statut].forEach(function (c) {
        c.addEventListener("change", function () {
          majParticipation(p, lire(), etat).then(function (n) { if (n) { p = n; if (c === statut || c === montant) rendreEvenement(); } });
        });
      });
      var docs = (e.documents || []).filter(function (dd) { return dd.participation_id === p.id; });
      var cellDoc = el("td");
      var principaux = docs.filter(function (dd) { return /^(Bon de réservation|Contrat)$/.test(typeDoc(dd)); });
      if (principaux.length || docs.length) cellDoc.appendChild(boutonTelecharger((principaux.length ? principaux : docs)[(principaux.length ? principaux : docs).length - 1], "Voir"));
      else cellDoc.appendChild(el("span", { classe: "petit", texte: "Non joint" }));
      var c0 = contactEvt(e);
      tb.appendChild(el("tr", { classe: p.statut === "annule" ? "annule" : "" }, [
        el("td", null, [nom, el("span", { classe: "petit", texte: e.categorie || "" })]),
        el("td", null, [formule]), el("td", null, [detail]), el("td", { classe: "num" }, [montant]),
        el("td", null, [statut, etat]),
        el("td", { classe: "evt-cell-paiement" }, [pastillesPaiement(p, function () { rendreEvenement(); }), el("span", { classe: "petit", texte: (euros(encaisse(p)) || "0 €") + " encaissés" })]),
        cellDoc,
        el("td", null, [el("span", { texte: [c0.prenom, c0.nom].filter(Boolean).join(" ") }), el("span", { classe: "petit", texte: [c0.email, c0.telephone].filter(Boolean).join(" - ") })]),
        celluleRetirer(p, e)
      ]));
    });
    t.appendChild(tb);
    R.appendChild(el("div", { classe: "table-contrats evt-table" }, [t]));

    // Ajout d'une entreprise a l'evenement
    var dejaLa = {}; toutes.forEach(function (p) { dejaLa[p.entreprise_id] = 1; });
    var choix = S.ents.filter(function (e) { return !dejaLa[e.id]; });
    var selE = selectDe([["", "Choisir une entreprise..."]].concat(choix.map(function (e) { return [e.id, e.nom]; })), "", { "aria-label": "Entreprise" });
    var selF = selectDe(FORMULES, "Stand", { "aria-label": "Formule" });
    var etatA = el("span", { classe: "etat" });
    var bA = el("button", { type: "button", classe: "btn btn-primaire btn-petit", texte: "Ajouter à l'événement" });
    bA.addEventListener("click", async function () {
      if (!selE.value) { etatA.textContent = "Choisissez une entreprise."; return; }
      bA.disabled = true;
      var err = await ajouterParticipation(selE.value, v.id, selF.value);
      bA.disabled = false;
      if (err) { etatA.textContent = "Erreur : " + err; return; }
      rendreEvenement();
    });
    zoneAjout.appendChild(el("div", { classe: "evt-ajout-titre", texte: "Ajouter un stand ou une participation" }));
    zoneAjout.appendChild(el("div", { classe: "ajout-doc" }, [selE, selF, bA, etatA]));
    zoneAjout.appendChild(el("p", { classe: "evt-aide-ajout", texte: "L'entreprise n'est pas dans la liste ? Créez d'abord sa fiche avec « Nouvelle entreprise »." }));
    R.appendChild(el("p", { classe: "aide evt-aide", texte: "Le suivi, la formule et le montant se modifient directement dans le tableau. En cas d'annulation, passez le suivi à « Annulé » pour garder une trace, ou cliquez sur « Retirer » pour supprimer la ligne (ajout par erreur). Pour joindre le contrat signé ou le bon de réservation, ouvrez la fiche de l'entreprise (clic sur son nom), rubrique « Documents »." }));
  }

  function celluleRetirer(p, e) {
    var td = el("td", { classe: "evt-retirer" });
    function initial() {
      td.textContent = "";
      var b = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Retirer", title: "Retirer " + e.nom + " de l'événement" });
      b.addEventListener("click", function () {
        td.textContent = "";
        var ok = el("button", { type: "button", classe: "btn btn-danger btn-petit", texte: "Confirmer" });
        var non = el("button", { type: "button", classe: "btn btn-secondaire btn-petit", texte: "Annuler" });
        td.appendChild(el("span", { classe: "petit", texte: "Retirer " + e.nom + " ?" }));
        td.appendChild(el("span", { classe: "evt-retirer-actions" }, [ok, non]));
        non.addEventListener("click", initial);
        ok.addEventListener("click", async function () {
          ok.disabled = true; non.disabled = true;
          var r = await sb.from("participations").delete().eq("id", p.id);
          if (r && r.error) { td.textContent = "Erreur : " + r.error.message; return; }
          S.parts = S.parts.filter(function (x) { return x.id !== p.id; });
          rendreEvenement();
        });
      });
      td.appendChild(b);
    }
    initial();
    return td;
  }

  /* ---------- Exports ---------- */
  function participationsTexte(e) {
    return partsDe(e.id).map(function (p) { var v = evt(p.evenement_id); return (v ? v.nom : "") + " (" + p.formule + ", " + libStatut(p.statut) + ")"; }).join(" ; ");
  }
  function entreprisesVisibles() {
    if (S.vue === "entreprises") return S.ents.filter(correspond);
    var ids = {}; S.parts.forEach(function (p) { if (p.evenement_id === S.vue && p.statut !== "annule") ids[p.entreprise_id] = 1; });
    return S.ents.filter(function (e) { return ids[e.id] && correspond(e); });
  }
  function exporterContacts() {
    var entetes = ["Entreprise", "Catégorie", "Rôle", "Prénom", "Nom", "Fonction", "Email", "Téléphone", "Note", "Site", "Ville", "Pays", "Participations"];
    var lignes = [];
    entreprisesVisibles().forEach(function (e) {
      (e.contacts || []).forEach(function (c, i) {
        lignes.push([e.nom, e.categorie || "", i === 0 ? "Contact principal" : "Autre contact", c.prenom || "", c.nom || "", c.fonction || "", c.email || "", c.telephone || "", c.note || "", e.site_web || "", e.ville || "", e.pays || "", participationsTexte(e)]);
      });
    });
    if (!lignes.length) { A.alerteExport("Aucun contact à exporter avec ces filtres."); return; }
    var suffixe = S.vue === "entreprises" ? "" : "-" + (evt(S.vue) || { nom: "" }).nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
    A.telechargerCsv("contacts-partenaires-evenementiels" + suffixe + "-" + A.jourIso() + ".csv", entetes, lignes);
  }
  function exporterListe() {
    if (S.vue === "entreprises") {
      var entetes = ["Entreprise", "Catégorie", "Activité", "Site", "Ville", "Pays", "Contacts", "Contact principal", "Email", "Téléphone", "Participations", "Partenaire offre adhérents", "Notes", "À vérifier"];
      var lignes = S.ents.filter(correspond).map(function (e) {
        var c = (e.contacts || [])[0] || {};
        return [e.nom, e.categorie || "", e.activite || "", e.site_web || "", e.ville || "", e.pays || "", (e.contacts || []).length,
          [c.prenom, c.nom].filter(Boolean).join(" "), c.email || "", c.telephone || "", participationsTexte(e), e.dossier_id ? "Oui" : "Non", e.notes || "", (e.a_verifier || []).join(" ; ")];
      });
      if (!lignes.length) { A.alerteExport("Aucune entreprise à exporter avec ces filtres."); return; }
      A.telechargerCsv("partenaires-evenementiels-" + A.jourIso() + ".csv", entetes, lignes);
      return;
    }
    var v = evt(S.vue);
    var ent2 = ["Entreprise", "Catégorie", "Formule", "Détail", "Montant TTC", "Acompte", "Solde", "Facture d'acompte envoyée le", "Acompte reçu le", "Facture finale envoyée le", "Paiement final reçu le", "Encaissé", "Suivi", "Contrat joint", "Contact", "Email", "Téléphone", "Notes"];
    var l2 = S.parts.filter(function (p) { return p.evenement_id === v.id; }).map(function (p) { return { p: p, e: ent(p.entreprise_id) }; })
      .filter(function (x) { return x.e && correspond(x.e); })
      .sort(function (a, b) { return a.e.nom.localeCompare(b.e.nom, "fr"); })
      .map(function (x) {
        var c = contactEvt(x.e);
        var joint = (x.e.documents || []).some(function (dd) { return dd.participation_id === x.p.id; });
        return [x.e.nom, x.e.categorie || "", x.p.formule, x.p.detail || "", x.p.montant == null ? "" : String(x.p.montant).replace(".", ","), String(acompteDe(x.p)).replace(".", ","), String(soldeDe(x.p)).replace(".", ","),
          x.p.facture_acompte_le ? A.dateFr(x.p.facture_acompte_le) : "", x.p.acompte_recu_le ? A.dateFr(x.p.acompte_recu_le) : "", x.p.facture_solde_le ? A.dateFr(x.p.facture_solde_le) : "", x.p.solde_recu_le ? A.dateFr(x.p.solde_recu_le) : "",
          String(encaisse(x.p)).replace(".", ","), libStatut(x.p.statut), joint ? "Oui" : "Non",
          [c.prenom, c.nom].filter(Boolean).join(" "), c.email || "", c.telephone || "", x.p.notes || ""];
      });
    if (!l2.length) { A.alerteExport("Aucun participant à exporter pour cet événement."); return; }
    A.telechargerCsv("participants-" + v.nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") + "-" + A.jourIso() + ".csv", ent2, l2);
  }

  window.FFPMI_EVT = {
    ouvrir: function (racine) { init(); S.racine = racine; if (!S.charge) charger(); else rendre(); }
  };
})();
