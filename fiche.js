// FFPMI - Fiche PDF d'un dossier de candidature, a remettre au conseil d'administration.
// Utilise pdfmake (charge dans admin.html). Aucune donnee ne quitte le navigateur.
(function () {
  "use strict";

  var GRIS = "#3E474C", GRIS_CLAIR = "#717E85", ORANGE = "#E25623", LIGNE = "#D9DEE1", FOND = "#F3F5F6";

  function dateFr(iso) {
    if (!iso) return "";
    var d = new Date(String(iso).length === 10 ? iso + "T12:00:00" : iso);
    return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  function siretFr(s) { return (s || "").replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4"); }
  function vide(v) { return v == null || v === "" || (Array.isArray(v) && !v.length); }

  // Tableau "libelle / valeur" ; les lignes vides sont ignorees
  function tableau(lignes) {
    var body = lignes.filter(function (l) { return !vide(l[1]); }).map(function (l) {
      return [{ text: l[0], style: "cellTitre" }, typeof l[1] === "object" && !Array.isArray(l[1]) ? l[1] : { text: String(l[1]), style: "cell" }];
    });
    if (!body.length) return null;
    return {
      table: { widths: [120, "*"], body: body, dontBreakRows: true },
      layout: {
        hLineColor: function () { return LIGNE; }, vLineColor: function () { return LIGNE; },
        hLineWidth: function () { return 0.6; }, vLineWidth: function (i, node) { return i === 0 || i === node.table.widths.length ? 0.6 : 0; },
        fillColor: function (r, node, c) { return c === 0 ? FOND : null; },
        paddingTop: function () { return 5; }, paddingBottom: function () { return 5; },
        paddingLeft: function () { return 7; }, paddingRight: function () { return 7; }
      },
      margin: [0, 0, 0, 12]
    };
  }

  function section(titre, contenu) {
    if (!contenu) return null;
    return { stack: [{ text: titre.toUpperCase(), style: "section" }, contenu], unbreakable: false };
  }

  function caseACocher(libelle) {
    return {
      columns: [
        { canvas: [{ type: "rect", x: 0, y: 1, w: 9, h: 9, lineWidth: 0.8, lineColor: GRIS }], width: 16 },
        { text: libelle, style: "cell" }
      ],
      columnGap: 0, width: "auto"
    };
  }

  function couleurs(d) {
    var cs = [d.couleur_principale, d.couleur_secondaire].filter(function (c) { return /^#[0-9a-f]{6}$/i.test(c || ""); });
    if (!cs.length) return null;
    var cols = [];
    cs.forEach(function (c) {
      cols.push({ canvas: [{ type: "rect", x: 0, y: 1, w: 10, h: 10, color: c, lineColor: LIGNE, lineWidth: 0.5 }], width: 15 });
      cols.push({ text: c.toUpperCase(), style: "cell", width: 70 });
    });
    return { columns: cols, columnGap: 0 };
  }

  /**
   * d : dossier ; opts : { logoFfpmi, logoPartenaire, contreparties: [libelles], notes: bool }
   */
  function construire(d, opts) {
    opts = opts || {};
    var nom = d.nom_commercial || d.raison_sociale || "Partenaire";
    var contenu = [];

    // En-tete
    var entete = { columns: [], margin: [0, 0, 0, 18] };
    if (opts.logoFfpmi) entete.columns.push({ image: opts.logoFfpmi, width: 110 });
    else entete.columns.push({ text: "FFPMI", bold: true, fontSize: 20, color: GRIS });
    entete.columns.push({ text: "" });
    if (opts.logoPartenaire) entete.columns.push({ image: opts.logoPartenaire, fit: [130, 55], alignment: "right" });
    contenu.push(entete);

    contenu.push({ text: "DOSSIER DE CANDIDATURE AU PARTENARIAT", style: "surtitre" });
    contenu.push({ text: nom, style: "titre" });
    if (d.nom_commercial && d.raison_sociale && d.nom_commercial !== d.raison_sociale) contenu.push({ text: d.raison_sociale, style: "soustitre" });
    contenu.push({
      text: (d.source === "import" ? "Partenaire existant" : "Dossier déposé le " + dateFr(d.created_at)) +
        "  -  Fiche éditée le " + dateFr(new Date().toISOString()) + " pour le conseil d'administration",
      style: "ref"
    });
    contenu.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: ORANGE }], margin: [0, 8, 0, 14] });

    // Encadre : l'offre en un coup d'oeil
    var avantage = [d.avantage_type, d.avantage_valeur].filter(Boolean).join(" : ");
    contenu.push({
      table: {
        widths: ["*"],
        body: [[{
          stack: [
            { text: "OFFRE PROPOSÉE AUX ADHÉRENTS", fontSize: 8, bold: true, color: ORANGE, characterSpacing: 0.6 },
            { text: d.offre_titre || "Non renseignée", fontSize: 14, bold: true, color: GRIS, margin: [0, 3, 0, 3] },
            { text: [avantage, d.offre_categorie, d.offre_exclusive ? "Exclusive FFPMI" : null].filter(Boolean).join("   |   "), fontSize: 9, color: GRIS_CLAIR }
          ],
          margin: [10, 9, 10, 9]
        }]]
      },
      layout: { hLineWidth: function () { return 0; }, vLineWidth: function (i) { return i === 0 ? 3 : 0; }, vLineColor: function () { return ORANGE; }, fillColor: function () { return FOND; } },
      margin: [0, 0, 0, 16]
    });

    var validite = (d.offre_debut || d.offre_fin)
      ? "Du " + (dateFr(d.offre_debut) || "...") + " au " + (dateFr(d.offre_fin) || "...")
      : "Permanente";

    contenu.push(section("L'offre", tableau([
      ["Catégorie", d.offre_categorie],
      ["Avantage", avantage],
      ["Description", d.offre_description],
      ["Conditions", d.offre_conditions],
      ["Validité", validite],
      ["Modalités d'accès", d.offre_modalites],
      ["Exclusive FFPMI", d.offre_exclusive ? "Oui" : "Non"]
    ])));

    contenu.push(section("L'entreprise", tableau([
      ["Raison sociale", d.raison_sociale],
      ["Nom commercial", d.nom_commercial && d.nom_commercial !== d.raison_sociale ? d.nom_commercial : ""],
      ["Forme juridique", d.forme_juridique],
      ["SIRET", siretFr(d.siret)],
      ["Adresse", [d.adresse, [d.code_postal, d.ville].filter(Boolean).join(" "), d.pays && d.pays !== "France" ? d.pays : ""].filter(Boolean).join("\n")],
      ["Site internet", d.site_web ? { text: d.site_web, link: /^https?:/i.test(d.site_web) ? d.site_web : "https://" + d.site_web, color: ORANGE, style: "cell" } : ""],
      ["Secteur", d.secteur],
      ["Année de création", d.annee_creation],
      ["Effectif", d.effectif]
    ])));

    var contacts = [[
      "Contact principal",
      [[d.contact_prenom, d.contact_nom].filter(Boolean).join(" "), d.contact_fonction, d.contact_email, d.contact_telephone].filter(Boolean).join("\n")
    ]];
    (d.autres_contacts || []).forEach(function (c) {
      contacts.push(["Autre contact", [[c.prenom, c.nom].filter(Boolean).join(" "), c.fonction, c.email, c.telephone].filter(Boolean).join("\n")]);
    });
    contenu.push(section("Contacts", tableau(contacts)));

    contenu.push(section("Présentation", tableau([
      ["Activité", d.presentation],
      ["Lien avec les métiers de l'image", d.lien_metiers_image],
      ["Références", d.references_clients]
    ])));

    var reseaux = [["Instagram", d.reseau_instagram], ["Facebook", d.reseau_facebook], ["LinkedIn", d.reseau_linkedin], ["YouTube", d.reseau_youtube]]
      .filter(function (x) { return x[1]; }).map(function (x) { return x[0] + " : " + x[1]; }).join("\n");
    var pieces = [d.logo_path ? "Logo" : null, d.plaquette_path ? "Plaquette de présentation (à télécharger dans l'espace FFPMI)" : null].filter(Boolean).join("\n");
    contenu.push(section("Identité et communication", tableau([
      ["Accroche", d.slogan],
      ["Couleurs", couleurs(d)],
      ["Réseaux sociaux", reseaux],
      ["Pièces fournies", pieces]
    ])));

    var souhaits = (d.contreparties || []).join("\n");
    contenu.push(section("Visibilité", tableau([
      ["Contreparties habituelles de la FFPMI", (opts.contreparties || []).map(function (c) { return "- " + c; }).join("\n")],
      ["Souhaits du partenaire", souhaits]
    ])));

    if (opts.notes && d.notes_internes) {
      contenu.push(section("Notes de l'équipe partenariats", tableau([["Notes", d.notes_internes]])));
    }

    // Avis du conseil d'administration
    var lignesVides = [];
    for (var i = 0; i < 3; i++) lignesVides.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: LIGNE }], margin: [0, 16, 0, 0] });
    contenu.push({
      stack: [
        { text: "AVIS DU CONSEIL D'ADMINISTRATION", style: "section" },
        {
          table: {
            widths: ["*"],
            body: [[{
              stack: [
                { columns: [caseACocher("Favorable"), caseACocher("Défavorable"), caseACocher("À revoir avec le partenaire")], columnGap: 28, margin: [0, 2, 0, 6] },
                { text: "Date de la décision : ............................................", style: "cell", margin: [0, 6, 0, 0] },
                { text: "Commentaires :", style: "cell", margin: [0, 10, 0, 0] }
              ].concat(lignesVides),
              margin: [10, 10, 10, 14]
            }]]
          },
          layout: { hLineColor: function () { return LIGNE; }, vLineColor: function () { return LIGNE; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } }
        }
      ],
      unbreakable: true,
      margin: [0, 6, 0, 0]
    });

    // Un titre de section ne reste jamais seul en bas de page
    contenu = contenu.filter(Boolean).map(function (n) {
      if (n.stack && n.stack[0] && n.stack[0].style === "section" && n.stack[1] && n.stack[1].table && n.stack[1].table.body.length <= 3) n.unbreakable = true;
      return n;
    });

    return {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 50],
      info: { title: "Dossier partenaire FFPMI - " + nom, author: "FFPMI" },
      content: contenu,
      footer: function (page, total) {
        return {
          columns: [
            { text: "FFPMI - Dossier partenaire " + nom + " - Document interne, réservé au conseil d'administration", fontSize: 7.5, color: GRIS_CLAIR },
            { text: "Page " + page + " / " + total, fontSize: 7.5, color: GRIS_CLAIR, alignment: "right", width: 60 }
          ],
          margin: [40, 18, 40, 0]
        };
      },
      defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.2, color: "#2B3236" },
      styles: {
        surtitre: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 0.8 },
        titre: { fontSize: 22, bold: true, color: GRIS, margin: [0, 2, 0, 0] },
        soustitre: { fontSize: 10.5, color: GRIS_CLAIR, margin: [0, 2, 0, 0] },
        ref: { fontSize: 8.5, color: GRIS_CLAIR, margin: [0, 6, 0, 0] },
        section: { fontSize: 9, bold: true, color: GRIS, characterSpacing: 0.8, margin: [0, 4, 0, 6] },
        cellTitre: { bold: true, color: GRIS, fontSize: 8.5 },
        cell: { fontSize: 9 }
      }
    };
  }

  window.FFPMI_FICHE = { construire: construire };
})();
