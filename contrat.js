// FFPMI - Generation du contrat de partenariat (PDF) a partir d'un dossier accepte.
// Utilise pdfmake (charge dans admin.html). Aucune donnee ne quitte le navigateur.
(function () {
  "use strict";

  var GRIS = "#3E474C", GRIS_CLAIR = "#717E85", ORANGE = "#E25623", LIGNE = "#D9DEE1";

  // Engagements de visibilite que la FFPMI peut prendre
  var ENGAGEMENTS = [
    { cle: "site", libelle: "Page partenaires du site FFPMI", contrepartie: "Page partenaires du site FFPMI",
      texte: "présenter le Partenaire et son offre sur la page partenaires de son site internet ;" },
    { cle: "newsletter", libelle: "Newsletter adhérents", contrepartie: "Newsletter adhérents",
      texte: "relayer l'offre dans la newsletter adressée à ses adhérents, au moins une fois par an ;" },
    { cle: "reseaux", libelle: "Réseaux sociaux FFPMI", contrepartie: "Réseaux sociaux FFPMI",
      texte: "annoncer le partenariat sur ses réseaux sociaux ;" },
    { cle: "pack", libelle: "Mention dans le pack adhérent", contrepartie: null,
      texte: "mentionner le partenariat dans le pack adhérent envoyé au cours de l'année ;" },
    { cle: "verification", libelle: "Outil de vérification d'adhésion", contrepartie: null,
      texte: ["mettre à la disposition du Partenaire la page de vérification ", { text: "https://metiersdelimage.fr/verification-adhesion,", noWrap: true, link: "https://metiersdelimage.fr/verification-adhesion" }, " qui permet de vérifier qu'un client est adhérent à partir de son nom, de son numéro de téléphone ou de son adresse email ; cette vérification se limite à confirmer ou non la qualité d'adhérent à jour de cotisation ;"] },
    { cle: "badge", libelle: "Badge « Partenaire FFPMI »", contrepartie: null,
      texte: "remettre au Partenaire, à la signature, le badge « Partenaire FFPMI » de l'année en cours, renouvelé chaque année tant que le contrat est en vigueur." }
  ];
  var EVENEMENTIELS = ["Présence au Congrès FFPMI", "Événements régionaux", "Webinaire ou intervention"];

  function aujourdHui() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateLongue(iso) {
    if (!iso) return "";
    return new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  function dureeTexte(n) {
    return ({ 1: "un (1) an", 2: "deux (2) ans", 3: "trois (3) ans" })[n] || (n + " ans");
  }
  function siretFr(s) { return (s || "").replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4"); }

  function avantagesParDefaut(d) {
    var l = [];
    l.push("Offre : " + (d.offre_titre || ""));
    l.push("Avantage : " + [d.avantage_type, d.avantage_valeur].filter(Boolean).join(" - "));
    if (d.offre_description) l.push("\nDescription :\n" + d.offre_description);
    if (d.offre_conditions) l.push("\nConditions et exclusions :\n" + d.offre_conditions);
    if (d.offre_modalites) l.push("\nModalités d'accès :\n" + d.offre_modalites);
    return l.join("\n");
  }

  function defauts(d, F) {
    var ctr = d.contreparties || [];
    var eng = {};
    ENGAGEMENTS.forEach(function (e) {
      eng[e.cle] = e.contrepartie ? (e.cle === "site" || ctr.indexOf(e.contrepartie) !== -1) : true;
    });
    return {
      signataire: [d.contact_prenom, d.contact_nom].filter(Boolean).join(" "),
      qualite: d.contact_fonction || "",
      immatriculation: "",
      date_effet: aujourdHui(),
      duree: 1,
      avantages: avantagesParDefaut(d),
      engagements: eng,
      lieu: (F && F.lieu) || "Toulouse",
      date_signature: "",
      echeance: "anniversaire",
      reconduction: true,
      date_fin: ""
    };
  }

  function reference(d, c) {
    return "FFPMI-P-" + (c.date_effet || aujourdHui()).slice(0, 4) + "-" + String(d.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  }

  /* ---------- Construction du document ---------- */
  function construire(d, c, F, logoFfpmi, logoPartenaire) {
    var nomP = d.raison_sociale;
    var ref = reference(d, c);

    function p(t, extra) { var o = { text: t, style: "corps" }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
    function art(n, t) { return { text: "Article " + n + " - " + t, style: "article", headlineLevel: 1 }; }
    function sous(t) { return { text: t, style: "sous", headlineLevel: 2 }; }
    function puces(items) { return { ul: items.map(function (i) { return { text: i, style: "corps", margin: [0, 0, 0, 3] }; }), margin: [10, 0, 0, 8] }; }

    var adresseP = [d.adresse, [d.code_postal, d.ville].filter(Boolean).join(" "), d.pays && d.pays !== "France" ? d.pays : ""].filter(Boolean).join(", ");
    var immat = [d.siret ? "SIRET " + siretFr(d.siret) : "", c.immatriculation || ""].filter(Boolean).join(", ");
    var identP = nomP + (d.forme_juridique ? ", " + d.forme_juridique : "") +
      (d.nom_commercial && d.nom_commercial !== nomP ? ", exploitant la marque " + d.nom_commercial : "") +
      (immat ? ", immatriculée sous le numéro " + immat : "") +
      (adresseP ? ", dont le siège est situé " + adresseP : "") +
      ", représentée par " + (c.signataire || "....................") +
      (c.qualite ? ", agissant en qualité de " + c.qualite : "") +
      ", dûment habilité(e) aux fins des présentes,";

    var engagementsChoisis = ENGAGEMENTS.filter(function (e) { return c.engagements && c.engagements[e.cle]; });
    var evenementsDemandes = (d.contreparties || []).filter(function (x) { return EVENEMENTIELS.indexOf(x) !== -1; });

    var contenu = [];

    // En-tete
    var entete = { columns: [], margin: [0, 0, 0, 24] };
    if (logoFfpmi) entete.columns.push({ image: logoFfpmi, width: 120 });
    else entete.columns.push({ text: "FFPMI", bold: true, fontSize: 20, color: GRIS });
    entete.columns.push({ text: "" });
    if (logoPartenaire) entete.columns.push({ image: logoPartenaire, fit: [120, 48], alignment: "right" });
    contenu.push(entete);

    contenu.push({ text: "CONTRAT DE PARTENARIAT", style: "titre" });
    contenu.push({ text: "Offre réservée aux adhérents de la FFPMI", style: "soustitre" });
    contenu.push({ text: "Référence " + ref, style: "ref" });
    contenu.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: ORANGE }], margin: [0, 6, 0, 18] });

    contenu.push({ text: "ENTRE LES SOUSSIGNÉS :", style: "entre" });
    contenu.push(p([
      { text: "La Fédération Française de la Photographie et des Métiers de l'Image (FFPMI)", bold: true },
      ", SIRET " + F.siret + ", dont le siège est situé " + F.adresse + ", représentée par " + F.signataire +
      ", agissant en qualité de " + F.qualite + ", dûment habilitée aux fins des présentes,"
    ]));
    contenu.push(p("ci-après dénommée « la FFPMI », d'une part,", { italics: true }));
    contenu.push({ text: "ET", style: "entre", margin: [0, 6, 0, 6] });
    contenu.push(p([{ text: nomP, bold: true }, identP.slice(nomP.length)]));
    contenu.push(p("ci-après dénommée « le Partenaire », d'autre part,", { italics: true }));
    contenu.push(p("ci-après dénommées ensemble « les Parties ».", { margin: [0, 6, 0, 0] }));
    contenu.push({ text: "IL EST CONVENU ET ARRÊTÉ CE QUI SUIT :", style: "entre", margin: [0, 14, 0, 4] });

    contenu.push({ text: "Préambule", style: "article", headlineLevel: 1 });
    contenu.push(p("La FFPMI fédère des photographes et des professionnels des métiers de l'image. Elle propose à ses adhérents des avantages négociés auprès d'entreprises partenaires, dans le cadre de son action au service de la profession."));
    contenu.push(p("Le Partenaire exerce son activité dans le secteur suivant : " + (d.secteur || "").toLowerCase() + ". Il a déposé le " + dateLongue(d.created_at) + " un dossier de candidature au partenariat, accepté par la FFPMI."));
    contenu.push(p("Les Parties, qui ont un intérêt commun au développement de leurs activités et de leur notoriété auprès des professionnels de l'image, conviennent de mettre en place un partenariat, sans contrepartie financière, permettant aux adhérents de la FFPMI de bénéficier de remises et d'avantages consentis par le Partenaire."));

    contenu.push(art(1, "Objet"));
    contenu.push(p("Le présent contrat définit les conditions dans lesquelles :"));
    contenu.push(puces([
      "le Partenaire consent aux adhérents de la FFPMI les avantages décrits à l'article 3 et à l'annexe 1 ;",
      "la FFPMI assure la promotion de ces avantages auprès de ses adhérents, dans les conditions de l'article 4."
    ]));
    contenu.push(p("Le partenariat est conclu sans contrepartie financière de part et d'autre."));

    contenu.push(art(2, "Indépendance des Parties et nature des engagements"));
    contenu.push(p("Les Parties sont et demeurent, pendant toute la durée du contrat, des partenaires professionnels indépendants. Le présent contrat ne crée entre elles aucun mandat, aucune société, aucun lien de subordination ni aucune agence. Aucune Partie ne peut engager l'autre ni s'exprimer en son nom."));
    contenu.push(p("Les engagements de la FFPMI sont des obligations de moyens. La FFPMI ne garantit aucun volume de ventes, nombre de contacts ou résultat commercial, ce que le Partenaire reconnaît et accepte. Le Partenaire conserve, dans le respect du présent contrat et de l'obligation de bonne foi prévue à l'article 1104 du Code civil, une totale indépendance économique et sa liberté d'action."));
    contenu.push(p("Le partenariat n'est pas exclusif : la FFPMI reste libre de conclure d'autres partenariats, y compris avec des entreprises du même secteur."));
    contenu.push(p("Le partenariat ne constitue ni un label, ni une certification, ni une recommandation par la FFPMI des produits ou services du Partenaire."));

    contenu.push(art(3, "Engagements du Partenaire"));
    contenu.push(sous("3.1 Avantages consentis aux adhérents"));
    contenu.push(p(["Le Partenaire consent aux adhérents de la FFPMI l'offre suivante : ", { text: "« " + d.offre_titre + " »", bold: true }, ". Le contenu de l'offre, ses conditions et ses modalités d'accès sont décrits à l'annexe 1, qui fait partie intégrante du présent contrat."]));
    contenu.push(sous("3.2 Bénéficiaires"));
    contenu.push(p("Ces avantages sont réservés aux adhérents de la FFPMI à jour de leur cotisation. Ils durent tant que les bénéficiaires restent adhérents, dans la limite de la durée du présent contrat. Le Partenaire peut vérifier la qualité d'adhérent dans les conditions prévues à l'article 4."));
    contenu.push(sous("3.3 Maintien des conditions"));
    contenu.push(p("Le Partenaire s'engage à maintenir l'offre pendant toute la durée du contrat et à ne pas appliquer aux adhérents des conditions moins favorables que celles qu'il propose au public. Toute modification de l'offre est notifiée par écrit à la FFPMI au moins deux (2) mois avant son entrée en vigueur et fait l'objet d'un avenant."));
    contenu.push(sous("3.4 Interlocuteur et service aux adhérents"));
    contenu.push(p("Le Partenaire désigne comme interlocuteur de la FFPMI " + [d.contact_prenom, d.contact_nom].filter(Boolean).join(" ") + (d.contact_fonction ? " (" + d.contact_fonction + ")" : "") + (d.contact_email ? ", joignable à l'adresse " + d.contact_email : "") + ". Il traite les demandes et les réclamations des adhérents relatives à l'offre dans des délais raisonnables et informe la FFPMI de toute difficulté."));
    contenu.push(sous("3.5 Éléments de communication"));
    contenu.push(p("Le Partenaire fournit à la FFPMI les éléments nécessaires à la communication sur le partenariat (logo, visuels, textes) et garantit qu'il détient les droits permettant leur utilisation par la FFPMI."));

    contenu.push(art(4, "Engagements de la FFPMI"));
    if (engagementsChoisis.length) {
      contenu.push(p("La FFPMI s'engage à :"));
      contenu.push(puces(engagementsChoisis.map(function (e) { return e.texte; })));
    }
    contenu.push(p("La FFPMI décide du calendrier, de la forme et du contenu de ses communications."));
    contenu.push(p("Toute présence du Partenaire au Congrès national de la FFPMI, lors d'événements régionaux ou sous forme d'intervention (webinaire, atelier, conférence) fait l'objet d'une convention distincte, qui en précise les conditions, notamment financières." +
      (evenementsDemandes.length ? " Le Partenaire a fait part de son intérêt pour : " + evenementsDemandes.join(", ") + "." : "")));

    contenu.push(art(5, "Présence et promotion lors des événements de la FFPMI"));
    contenu.push(p("Le présent partenariat ne confère au Partenaire aucun droit de présence, d'exposition ou de promotion sur les stands, salons, congrès, assemblées générales, formations, réunions régionales ou tout autre événement organisé par la FFPMI ou auquel elle participe."));
    contenu.push(p("Sont en particulier soumis à l'autorisation préalable et écrite de la FFPMI :"));
    contenu.push(puces([
      "la distribution ou le dépôt de tracts, flyers, catalogues, cartes, échantillons ou objets publicitaires ;",
      "l'affichage, l'installation de kakémonos, de présentoirs ou de toute signalétique ;",
      "les démonstrations, ventes, prises de commandes et la sollicitation des participants ;",
      "les prises de vue et captations à des fins promotionnelles."
    ]));
    contenu.push(p("L'autorisation, lorsqu'elle est accordée, précise le lieu, la durée, les supports autorisés et, le cas échéant, les conditions financières (stand, parrainage). À défaut d'autorisation, la FFPMI peut faire retirer sans délai les supports concernés et demander au Partenaire de cesser immédiatement toute action promotionnelle sur place."));

    contenu.push(art(6, "Communication et utilisation des marques"));
    contenu.push(p("6.1 La FFPMI autorise le Partenaire, pour la seule durée du contrat, à faire état du partenariat et à utiliser le nom, le logo de la FFPMI et le badge « Partenaire FFPMI », dans la version fournie par la FFPMI et sans modification."));
    contenu.push(p("6.2 Tout support du Partenaire mentionnant la FFPMI (site internet, réseaux sociaux, publicité, emailing, documents commerciaux) est soumis à la validation préalable et écrite de la FFPMI."));
    contenu.push(p("6.3 Le Partenaire ne peut présenter le partenariat comme une recommandation, un label ou une certification de ses produits ou services par la FFPMI, ni laisser entendre qu'il agit au nom de la FFPMI."));
    contenu.push(p("6.4 Le Partenaire autorise la FFPMI à utiliser sa dénomination, son logo et les éléments qu'il lui a transmis pour les seuls besoins de la communication sur le partenariat."));
    contenu.push(p("6.5 À la fin du contrat, chaque Partie cesse d'utiliser le nom et les signes distinctifs de l'autre dans un délai de trente (30) jours."));

    contenu.push(art(7, "Relations avec les adhérents et données personnelles"));
    contenu.push(p("7.1 La FFPMI ne communique pas au Partenaire le fichier de ses adhérents. Le Partenaire s'interdit toute prospection des adhérents au nom de la FFPMI ou par ses canaux (listes de diffusion, groupes, annuaires, événements), sauf accord préalable et écrit."));
    contenu.push(p("7.2 L'outil de vérification d'adhésion ne peut être utilisé qu'afin d'appliquer les avantages prévus au présent contrat."));
    contenu.push(p("7.3 Chaque Partie est responsable des traitements de données personnelles qu'elle met en œuvre et s'engage à respecter la réglementation applicable, notamment le Règlement (UE) 2016/679 (RGPD). Les données que le Partenaire collecte auprès des adhérents dans le cadre de leurs relations commerciales relèvent de sa seule responsabilité."));

    contenu.push(art(8, "Durée"));
    contenu.push(p("Le présent contrat prend effet le " + dateLongue(c.date_effet) + " pour une durée de " + dureeTexte(parseInt(c.duree, 10) || 1) + ". Il se renouvelle ensuite par tacite reconduction pour des périodes identiques, sauf dénonciation par l'une des Parties, par lettre recommandée avec accusé de réception, au moins trente (30) jours avant la date d'échéance."));
    contenu.push(p("Il peut être complété ou modifié par avenant signé par les Parties."));

    contenu.push(art(9, "Suivi du partenariat"));
    contenu.push(p("Les Parties dressent chaque année un bilan des actions menées et de leur impact, et étudient les perspectives d'évolution du partenariat."));

    contenu.push(art(10, "Responsabilité"));
    contenu.push(p("Chaque Partie est responsable de la bonne exécution de ses obligations et se porte fort de leur respect par ses dirigeants, salariés, préposés, sociétés affiliées et sous-traitants."));
    contenu.push(p("Le Partenaire est seul responsable des produits et services qu'il fournit aux adhérents et de ses relations commerciales avec eux. La responsabilité de la FFPMI ne peut en aucun cas être recherchée à ce titre. Le Partenaire fait son affaire de toute demande, réclamation ou condamnation qui trouverait son origine dans ses produits ou prestations, et garantit la FFPMI contre tout recours de ce fait."));

    contenu.push(art(11, "Confidentialité"));
    contenu.push(p("Chaque Partie s'engage à garder strictement confidentiels les documents, informations et données non publics qui lui sont communiqués par l'autre Partie dans le cadre du présent contrat, à ne pas les divulguer et à ne pas les reproduire sans autorisation préalable et écrite. Cette obligation s'applique pendant toute la durée du contrat et pendant cinq (5) ans après sa fin."));

    contenu.push(art(12, "Force majeure"));
    contenu.push(p("Aucune Partie ne peut être tenue responsable d'un manquement à ses obligations dû à un cas de force majeure au sens de l'article 1218 du Code civil. La Partie concernée en informe l'autre dans les meilleurs délais et met tout en œuvre pour reprendre l'exécution de ses obligations dès que possible. Si la force majeure se prolonge au-delà de trente (30) jours, chaque Partie peut résilier le contrat avec effet immédiat, par lettre recommandée avec accusé de réception."));

    contenu.push(art(13, "Résiliation"));
    contenu.push(p("En cas de manquement de l'une des Parties à ses obligations, l'autre Partie peut résilier le contrat de plein droit quinze (15) jours après l'envoi d'une mise en demeure par lettre recommandée avec accusé de réception restée sans effet, sans préjudice de tous dommages et intérêts."));
    contenu.push(p("Par exception, en cas de manquement du Partenaire aux articles 5, 6 ou 7, ou de comportement de nature à porter atteinte à l'image de la FFPMI ou de la profession, la FFPMI peut résilier le contrat de plein droit huit (8) jours après une mise en demeure restée sans effet."));
    contenu.push(p("Chaque Partie peut également résilier le contrat à tout moment, en cas de désaccord persistant constaté entre les Parties, quinze (15) jours après l'envoi d'une lettre recommandée avec accusé de réception."));
    contenu.push(p("La fin du contrat, quelle qu'en soit la cause, met fin aux avantages consentis aux adhérents, sous réserve des commandes et contrats déjà conclus entre le Partenaire et les adhérents."));

    var art14 = [art(14, "Loi applicable et litiges"), p("Le présent contrat est soumis au droit français. Les Parties s'efforcent de résoudre à l'amiable tout différend relatif à sa validité, son interprétation, son exécution ou sa résiliation. À défaut d'accord dans un délai de trente (30) jours, le litige est porté devant la juridiction compétente.")];

    // Signatures, sur la meme page que le dernier article
    var dateSign = c.date_signature ? dateLongue(c.date_signature) : "........................................";
    contenu.push({
      stack: art14.concat([
        p("Fait à " + (c.lieu || "....................") + ", le " + dateSign + ", en deux exemplaires originaux.", { margin: [0, 18, 0, 16] }),
        {
          columns: [
            { stack: [
              { text: "Pour la FFPMI", bold: true, color: GRIS, fontSize: 10 },
              { text: F.signataire + ", " + F.qualite, fontSize: 9.5, margin: [0, 2, 0, 0] },
              { text: "Mention « Lu et approuvé », signature", fontSize: 8, color: GRIS_CLAIR, margin: [0, 6, 0, 0] },
              { canvas: [{ type: "rect", x: 0, y: 0, w: 240, h: 90, r: 4, lineColor: LIGNE }], margin: [0, 4, 0, 0] }
            ] },
            { stack: [
              { text: "Pour " + nomP, bold: true, color: GRIS, fontSize: 10 },
              { text: (c.signataire || "....................") + (c.qualite ? ", " + c.qualite : ""), fontSize: 9.5, margin: [0, 2, 0, 0] },
              { text: "Mention « Lu et approuvé », signature et cachet", fontSize: 8, color: GRIS_CLAIR, margin: [0, 6, 0, 0] },
              { canvas: [{ type: "rect", x: 0, y: 0, w: 240, h: 90, r: 4, lineColor: LIGNE }], margin: [0, 4, 0, 0] }
            ] }
          ],
          columnGap: 35
        }
      ]),
      unbreakable: true
    });

    // Annexe 1
    var validite = (d.offre_debut || d.offre_fin)
      ? "Du " + (dateLongue(d.offre_debut) || "début du contrat") + " au " + (dateLongue(d.offre_fin) || "terme du contrat")
      : "Pendant toute la durée du contrat";
    contenu.push({ text: "ANNEXE 1", style: "titre", pageBreak: "before", fontSize: 16 });
    contenu.push({ text: "Offre réservée aux adhérents de la FFPMI", style: "soustitre" });
    contenu.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: ORANGE }], margin: [0, 6, 0, 16] });
    contenu.push({
      table: {
        widths: [130, "*"],
        body: [
          ["Partenaire", nomP],
          ["Catégorie", d.offre_categorie || ""],
          ["Validité de l'offre", validite],
          ["Exclusivité", d.offre_exclusive ? "Offre exclusive aux adhérents de la FFPMI" : "Offre non exclusive"]
        ].map(function (r) { return [{ text: r[0], style: "cellTitre" }, { text: r[1], style: "cell" }]; })
      },
      layout: { hLineColor: function () { return LIGNE; }, vLineColor: function () { return LIGNE; }, paddingTop: function () { return 6; }, paddingBottom: function () { return 6; }, paddingLeft: function () { return 8; }, paddingRight: function () { return 8; } },
      margin: [0, 0, 0, 16]
    });
    contenu.push({ text: "Détail de l'offre", style: "sous" });
    contenu.push(p(c.avantages || avantagesParDefaut(d)));
    contenu.push(p(["Ces avantages sont réservés aux adhérents à jour de leur cotisation, sur justificatif ou après vérification sur ", { text: "https://metiersdelimage.fr/verification-adhesion", noWrap: true, link: "https://metiersdelimage.fr/verification-adhesion" }, "."], { italics: true, color: GRIS_CLAIR, margin: [0, 10, 0, 0] }));

    // Un titre ne reste jamais seul en bas de page : il est lie au paragraphe qui le suit
    var regroupe = [];
    for (var i = 0; i < contenu.length; i++) {
      var n = contenu[i];
      if (n && n.headlineLevel && contenu[i + 1]) {
        var suite = [n, contenu[i + 1]];
        i++;
        while (contenu[i] && contenu[i].headlineLevel && contenu[i + 1]) { suite.push(contenu[i + 1]); i++; }
        regroupe.push({ stack: suite, unbreakable: true });
      } else regroupe.push(n);
    }
    contenu = regroupe;

    return {
      pageSize: "A4",
      pageMargins: [40, 46, 40, 56],
      info: { title: "Contrat de partenariat FFPMI - " + nomP, author: "FFPMI", subject: ref },
      content: contenu,
      footer: function (page, total) {
        return {
          columns: [
            { text: "Contrat de partenariat FFPMI - " + nomP + " - " + ref, fontSize: 7.5, color: GRIS_CLAIR },
            { text: "Paraphes : ........  ........     Page " + page + " / " + total, fontSize: 7.5, color: GRIS_CLAIR, alignment: "right" }
          ],
          margin: [40, 18, 40, 0]
        };
      },
      defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.25, color: "#2B3236" },
      styles: {
        titre: { fontSize: 20, bold: true, color: GRIS, characterSpacing: 0.5 },
        soustitre: { fontSize: 11, color: ORANGE, bold: true, margin: [0, 3, 0, 0] },
        ref: { fontSize: 8.5, color: GRIS_CLAIR, margin: [0, 3, 0, 0] },
        entre: { fontSize: 9.5, bold: true, color: GRIS, margin: [0, 0, 0, 6] },
        article: { fontSize: 11, bold: true, color: GRIS, margin: [0, 14, 0, 6] },
        sous: { fontSize: 9.5, bold: true, color: GRIS, margin: [0, 6, 0, 3] },
        corps: { alignment: "justify", margin: [0, 0, 0, 6] },
        cellTitre: { bold: true, color: GRIS, fontSize: 9 },
        cell: { fontSize: 9 }
      }
    };
  }

  window.FFPMI_CONTRAT = {
    ENGAGEMENTS: ENGAGEMENTS,
    defauts: defauts,
    reference: reference,
    construire: construire
  };
})();
