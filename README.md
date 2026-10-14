# FFPMI - Dossiers partenaires

Application de dépôt des dossiers de partenariat pour les entreprises qui souhaitent proposer une offre aux adhérents de la FFPMI.

- `index.html` : le formulaire public, en 5 étapes (société, présentation, offre adhérents, identité, envoi)
- `admin.html` : l'espace FFPMI, protégé par mot de passe (liste, fiche détaillée, statut, notes internes, export CSV)
- `style.css` : la charte graphique FFPMI (Montserrat, gris #717E85, orange #E25623 pour les actions)
- `config.js` : les deux codes de connexion à Supabase, à renseigner, et les coordonnées de la FFPMI pour les contrats
- `contrat.js` : le modèle du contrat de partenariat, généré en PDF depuis l'espace FFPMI
- `supabase/schema.sql` : la base de données et ses règles de sécurité
- `logo-ffpmi.png` : le logo FFPMI, déjà inclus

Il faut compter environ 45 minutes pour la mise en ligne complète.

---

## Étape 1 - Créer la base de données (Supabase)

1. Sur supabase.com, cliquez sur **New project**.
   - Nom : `ffpmi-partenaires`
   - Région : **West EU (Paris)**, pour garder les données en France
   - Notez le mot de passe de la base dans un endroit sûr
2. Une fois le projet créé, ouvrez **SQL Editor** puis **New query**.
3. Copiez tout le contenu du fichier `supabase/schema.sql`, collez-le et cliquez sur **Run**. Le message « Success » doit s'afficher.
   Ce script crée la table des dossiers, le stockage privé des logos et plaquettes, et les règles de sécurité :
   - le public peut seulement **déposer** un dossier, jamais en lire un ;
   - seules les 5 adresses de l'équipe FFPMI (voir étape 2) peuvent consulter et modifier les dossiers.
4. Ouvrez **Project Settings > API** et copiez :
   - **Project URL** (du type `https://abcd1234.supabase.co`)
   - la clé **anon public**
5. Collez-les dans `config.js` à la place de `VOTRE-PROJET` et `VOTRE-CLE-ANON`.

La clé « anon » est faite pour être publique. La clé « service_role » ne doit **jamais** être mise dans ces fichiers.

### Importer les partenaires existants

Le fichier `supabase/import_partenaires_existants.sql` contient les 37 partenaires repris des contrats signés du dossier PARTENARIATS et du tableau « Partenariat_Bilan & Contacts » (33 en cours, 3 résiliés, 1 à l'étude).

1. Vérifiez d'abord le tableau « Import appli partenaires - à vérifier.xlsx », rangé dans le dossier PARTENARIATS.
2. Dans **SQL Editor > New query**, collez tout le contenu de `import_partenaires_existants.sql` et cliquez sur **Run**, après `schema.sql`.
3. Le résultat affiche le nombre de partenaires par statut. Le script peut être relancé sans créer de doublons.

Les points à vérifier s'affichent ensuite en haut de chaque fiche concernée.

## Étape 2 - Créer les accès de l'espace FFPMI

Cinq personnes ont accès à l'espace FFPMI. Leurs adresses sont déjà autorisées par `schema.sql` :

| Personne | Email de connexion |
|---|---|
| Amélie | amelie.soubrie@ffpmi.eu |
| Commission partenariats | partenaires@ffpmi.eu |
| Maritchu | evenementiel@ffpmi.eu |
| Hélène | secretaire@ffpmi.eu |
| Pauline | communication@ffpmi.eu |

Pour chaque adresse :

1. Dans Supabase, ouvrez **Authentication > Users > Add user > Create new user**.
2. Saisissez l'email, un mot de passe provisoire (au moins 10 caractères), et cochez **Auto Confirm User**.
3. Cliquez sur **Create user**.

Puis, une seule fois : dans **Authentication > Sign In / Providers**, **désactivez « Allow new users to sign up »**. Personne d'autre ne pourra se créer un compte.

Une fois l'appli en ligne (étape 3), chaque personne choisit son propre mot de passe : sur la page de connexion de l'espace FFPMI, elle saisit son email puis clique sur **Mot de passe oublié**, et suit le lien reçu par mail. Vous n'avez donc pas à transmettre les mots de passe provisoires.

Pour ajouter plus tard une autre personne : créez son utilisateur comme ci-dessus, puis dans **SQL Editor** lancez :

```sql
insert into public.admins (email) values ('prenom.nom@ffpmi.eu');
```

Pour retirer un accès : supprimez l'utilisateur dans **Authentication > Users**, puis lancez :

```sql
delete from public.admins where email = 'prenom.nom@ffpmi.eu';
```

## Étape 3 - Mettre en ligne (GitHub Pages)

1. Sur GitHub, créez un dépôt **public** nommé `ffpmi-partenaires`.
2. Cliquez sur **Add file > Upload files** et déposez tous les fichiers du dossier (en gardant le sous-dossier `supabase`), avec votre `logo-ffpmi.png` et le `config.js` complété.
3. Ouvrez **Settings > Pages**, choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Après une à deux minutes, l'appli est en ligne :
   - formulaire : `https://partenaires.ffpmi.eu/`
   - espace FFPMI : `https://partenaires.ffpmi.eu/admin.html`
   (en attendant le domaine : `https://VOTRE-COMPTE.github.io/ffpmi-partenaires/`)
5. Retour dans Supabase, **Authentication > URL Configuration** :
   - **Site URL** : `https://partenaires.ffpmi.eu/admin.html`
   - **Redirect URLs** : ajoutez `https://partenaires.ffpmi.eu/admin.html` et, en attendant que le domaine fonctionne, `https://VOTRE-COMPTE.github.io/ffpmi-partenaires/admin.html` (elles servent au lien « Mot de passe oublié »)

**Adresse partenaires.ffpmi.eu**

1. Déposez aussi le fichier `CNAME` dans le dépôt (il contient `partenaires.ffpmi.eu`).
2. Chez l'hébergeur du domaine ffpmi.eu, dans la zone DNS, ajoutez un enregistrement **CNAME** : nom (ou sous-domaine) `partenaires`, cible `VOTRE-COMPTE.github.io.` (avec le point final si l'hébergeur le demande). Cet ajout ne touche ni aux emails ni aux autres adresses en ffpmi.eu.
3. Dans GitHub, **Settings > Pages > Custom domain**, saisissez `partenaires.ffpmi.eu` et cliquez sur **Save**. GitHub vérifie le DNS (de quelques minutes à quelques heures).
4. Quand la vérification est verte, cochez **Enforce HTTPS**.
5. Recommandé : dans les réglages de votre compte GitHub (**Settings > Pages > Add a domain**), vérifiez le domaine `ffpmi.eu` en ajoutant l'enregistrement TXT indiqué. Personne d'autre ne pourra alors utiliser une adresse en ffpmi.eu sur GitHub.

## Étape 4 - Les emails automatiques (Make)

À chaque nouveau dossier, Supabase prévient Make, qui envoie deux emails : une alerte à la FFPMI et un accusé de réception à l'entreprise.

### 4.1 Dans Make

1. Créez un scénario **FFPMI - Nouveau dossier partenaire**.
2. Premier module : **Webhooks > Custom webhook**, puis **Add** et nommez-le `ffpmi-partenaires`. Copiez l'adresse du webhook.
3. Laissez Make en attente (**Run once**) pendant l'étape 4.2.

### 4.2 Dans Supabase

1. Dans le menu de gauche, ouvrez **Integrations**, cherchez **Database Webhooks**, cliquez sur **Enable webhooks** (la première fois), puis sur **Create a new hook**.
2. Nom : `nouveau_dossier`. Table : `dossiers`. Événement : **Insert** uniquement.
3. Type : **HTTP Request**, méthode **POST**, URL : l'adresse du webhook Make.
4. Dans **HTTP Headers**, ajoutez `x-ffpmi-cle` avec une valeur secrète de votre choix (par exemple une suite de 30 caractères).
5. Enregistrez, puis déposez un dossier de test depuis le formulaire. Make reçoit les données et détermine leur structure.

Le webhook part du serveur Supabase : son adresse n'apparaît jamais dans le formulaire public.

### 4.3 Suite du scénario Make

Les données du dossier sont dans `record`, par exemple `{{1.record.raison_sociale}}`.

1. Optionnel, mais conseillé : dans les réglages du webhook, activez **Get request headers**, puis ajoutez un **filtre** après le module 1 qui ne laisse passer que si l'en-tête `x-ffpmi-cle` vaut votre valeur secrète.
2. **Gmail > Send an email** (depuis le compte FFPMI) pour l'alerte interne :
   - **À** : `amelie.soubrie@ffpmi.eu` et `partenaires@ffpmi.eu`
   - **Répondre à** : `{{1.record.contact_email}}`
   - **Objet** : `Nouveau dossier partenaire : {{1.record.raison_sociale}}`
   - **Contenu** :

```
Un nouveau dossier de partenariat vient d'être déposé.

Société : {{1.record.raison_sociale}} ({{1.record.secteur}})
Offre : {{1.record.offre_titre}}
Avantage : {{1.record.avantage_type}} - {{1.record.avantage_valeur}}
Contact : {{1.record.contact_prenom}} {{1.record.contact_nom}} - {{1.record.contact_email}} - {{1.record.contact_telephone}}

Consulter le dossier complet dans l'espace FFPMI :
https://partenaires.ffpmi.eu/admin.html
```

3. **Gmail > Send an email** pour l'accusé de réception :
   - **À** : `{{1.record.contact_email}}`
   - **Répondre à** : `partenaires@ffpmi.eu`
   - **Objet** : `FFPMI - Nous avons bien reçu votre proposition de partenariat`
   - **Contenu** :

```
Bonjour {{1.record.contact_prenom}},

Nous vous remercions pour la proposition de partenariat de {{1.record.raison_sociale}} à destination des adhérents de la FFPMI.

Votre dossier a bien été reçu. La commission partenariats va l'étudier et reviendra vers vous dans les meilleurs délais.

Pour toute question, vous pouvez nous écrire à partenaires@ffpmi.eu.

Bien cordialement,

La commission partenariats
FFPMI - Fédération Française de la Photographie et des Métiers de l'Image
```

4. Activez le scénario (bouton **ON**) et réglez-le sur **Immediately**.

---

## Étape 5 - La relance automatique avant échéance (Make)

Chaque matin, Make vérifie les contrats dont l'échéance tombe dans les 60 jours. Il envoie au partenaire un mail lui demandant s'il souhaite poursuivre, avec la commission partenariats en copie. Chaque partenaire n'est relancé qu'une fois par échéance. La date d'envoi s'affiche dans le tableau des échéances (« Relance envoyée le ... »).

Le délai de 60 jours laisse au partenaire 30 jours pour répondre avant la date limite de dénonciation, fixée 30 jours avant l'échéance.

### 5.1 Récupérer la clé de service

Dans Supabase, **Project Settings > API**, copiez la clé **service_role**. Elle donne tous les droits sur la base : elle ne doit être collée que dans Make, jamais dans `config.js` ni sur le site.

### 5.2 Créer le scénario dans Make

Créez un scénario **FFPMI - Relances partenaires** :

1. **Déclencheur** : réglez la planification sur **Every day**, à 8:00.
2. **HTTP > Make a request** (module 2) :
   - URL : `https://VOTRE-PROJET.supabase.co/rest/v1/rpc/relances_a_envoyer`
   - Méthode : **POST**
   - En-têtes : `apikey` = la clé service_role ; `Authorization` = `Bearer ` suivi de la clé service_role ; `Content-Type` = `application/json`
   - Body type : **Raw**, contenu : `{"jours": 60}`
   - **Parse response** : Oui
3. **Flow Control > Iterator** (module 3) : Array = `{{2.data}}`.
4. **Gmail > Send an email** (module 4), depuis le compte partenaires@ffpmi.eu :
   - **À** : `{{3.email}}`
   - **Cc** : `partenaires@ffpmi.eu`
   - **Objet** : `Votre partenariat avec la FFPMI - échéance du {{3.echeance_fr}}`
   - **Contenu** :

```
Bonjour {{3.prenom}},

Le contrat de partenariat qui lie {{3.partenaire}} à la FFPMI arrive à échéance le {{3.echeance_fr}}.

Nous espérons que ce partenariat vous apporte satisfaction et souhaitions savoir si vous désirez le poursuivre. Sans retour de votre part, il sera reconduit pour un an, aux mêmes conditions.

C'est aussi l'occasion de faire le point sur l'offre réservée à nos adhérents ({{3.offre}}) : est-elle toujours d'actualité, ou souhaitez-vous la faire évoluer ?

Il vous suffit de répondre à ce mail. Nous pouvons aussi organiser un court échange en visio si vous le souhaitez.

Bien cordialement,

La commission partenariats
FFPMI - Fédération Française de la Photographie et des Métiers de l'Image
partenaires@ffpmi.eu
```

5. **HTTP > Make a request** (module 5), qui enregistre la relance :
   - URL : `https://VOTRE-PROJET.supabase.co/rest/v1/rpc/marquer_relance`
   - Méthode **POST**, mêmes en-têtes qu'au module 2
   - Body **Raw** : `{"p_id": "{{3.id}}", "p_echeance": "{{3.echeance}}"}`

Activez le scénario (bouton **ON**).

**Attention au premier lancement** : il relancera d'un coup tous les partenaires dont l'échéance tombe dans les 60 jours, soit 8 partenaires à la date de l'import, dont Album Teller et Koylab (échéance le 21 octobre 2026). Pour voir la liste sans rien envoyer, lancez seulement le module 2 avec **Run this module only**. Si vous préférez contacter vous-même ces partenaires, marquez-les comme relancés avant d'activer le scénario, dans **SQL Editor** :

```sql
select public.marquer_relance(id, echeance) from public.relances_a_envoyer(60);
```

Seules les échéances suivantes déclencheront alors un mail.

Les partenaires sans email, ou sans date d'effet, ne sont jamais relancés. Complétez leur fiche pour qu'ils le soient.

## Utilisation au quotidien

- Les nouveaux dossiers arrivent avec le statut **Reçu**. Les statuts possibles sont **Reçu**, **À l'étude**, **Accepté** et **Refusé**.
- Les notes internes ne sont visibles que par l'espace FFPMI, jamais par l'entreprise.
- Le logo et la plaquette se téléchargent depuis la fiche du dossier (liens valables une heure, régénérés à chaque ouverture).
- **Exporter en CSV** produit un fichier lisible dans Excel, avec les dossiers affichés (selon le filtre et la recherche en cours).
- Le formulaire garde un brouillon dans le navigateur de l'entreprise : si elle ferme la page, elle retrouve ses textes (mais doit redéposer ses fichiers).

## Contrats et échéances

L'onglet **Contrats et échéances** liste tous les partenaires acceptés ou résiliés, triés par urgence :

- **Date d'effet à renseigner** : la date se saisit directement dans le tableau ;
- **Échéance dans X jours** : échéance dans les 60 jours, avec la date limite pour dénoncer le contrat (30 jours avant l'échéance) ;
- **En cours**, puis **Terminé** ou **Résilié**.

La prochaine échéance est calculée à partir de la date d'effet, de la durée et de la reconduction tacite. Pour les contrats qui suivent l'année civile (anciens contrats Lumys et Matisseo), choisissez « Au 31 décembre » dans le bloc contrat de la fiche.

## Contacts

Chaque fiche contient un bloc **Contacts du partenaire** : le contact principal et autant d'autres contacts que nécessaire, modifiables à tout moment.

Le bouton **Exporter les contacts** télécharge un fichier CSV (lisible dans Excel) avec tous les contacts des partenaires au statut « Accepté » : partenaire, rôle, nom, fonction, email, téléphone, offre, code promo, date d'effet et prochaine échéance.

## Documents des partenaires

Chaque fiche contient un bloc **Documents** : contrat signé, avenant, courrier ou autre (PDF, JPG ou PNG, 25 Mo maximum). Les documents se téléchargent et se suppriment depuis la fiche. Ils ne sont visibles que dans l'espace FFPMI. La colonne « Contrat signé » du tableau des échéances indique si le contrat signé est rangé.

**Ranger les contrats déjà signés (une seule fois, après l'import des partenaires)**

Les 33 contrats signés retrouvés sont copiés et renommés dans le dossier `PARTENARIATS/Contrats signés - import appli`. Chaque nom de fichier contient l'identifiant de son partenaire entre crochets, par exemple « Picto - contrat signé 2025 [f59ee96e].pdf ».

1. Ouvrez l'onglet **Contrats et échéances**, puis **Ranger les contrats signés existants**.
2. Sélectionnez tous les fichiers du dossier, puis cliquez sur **Ranger les fichiers**.
3. Chaque fichier rejoint la fiche de son partenaire. Un rapport liste les fichiers éventuellement ignorés.

Vous pouvez relancer l'opération sans risque : un fichier déjà rangé n'est pas ajouté deux fois.

Les contrats d'Art Photo Lab, d'AXA et de Lumina n'existent qu'en version Word non signée : ils ne sont pas dans ce dossier. Ajoutez la version signée dans leur fiche quand vous l'aurez.

## Supprimer un dossier

En bas de chaque fiche, **Supprimer ce dossier** efface définitivement le dossier et ses fichiers (logo, plaquette, documents). Une confirmation est demandée. À réserver aux dépôts de test ou trop incomplets : pour un partenaire refusé ou terminé, préférez les statuts « Refusé » ou « Résilié », qui gardent l'historique.

## Fiche PDF pour le conseil d'administration

Quand un dossier passe au statut « À l'étude », sa fiche affiche le bloc **Fiche pour le conseil d'administration**. Le bouton **Télécharger la fiche PDF** crée un document qui reprend tout le dossier (offre, entreprise, contacts, présentation, identité, souhaits de visibilité), avec les contreparties habituelles de la FFPMI et un encadré pour l'avis du conseil. La case « Inclure les notes internes » ajoute vos notes au PDF. La plaquette du partenaire se télécharge à part. Le PDF est créé dans le navigateur : rien n'est envoyé ailleurs.

## Générer le contrat de partenariat

Quand un dossier passe au statut **Accepté**, un bloc **Contrat de partenariat** apparaît dans sa fiche.

1. Vérifiez les informations reprises du dossier : signataire et qualité, date d'effet, durée, lieu, détail de l'offre (annexe 1).
2. Cochez les engagements de visibilité de la FFPMI. Ils sont pré-cochés d'après ce que le partenaire a demandé.
3. Cliquez sur **Générer le PDF du contrat**. Le fichier se télécharge, avec les logos de la FFPMI et du partenaire (si son logo est en PNG ou JPG).
4. Envoyez-le pour signature : deux exemplaires, mention « Lu et approuvé », paraphe sur chaque page.

**Enregistrer les informations** garde vos saisies sans générer le PDF. La date du dernier PDF généré s'affiche dans la fiche.

Les coordonnées de la FFPMI reprises dans le contrat (SIRET, adresse du siège, signataire) se règlent dans `config.js`, bloc `FFPMI`. Le texte du contrat se trouve dans `contrat.js`.

Si la base a été créée avant l'ajout du contrat, relancez simplement `supabase/schema.sql` dans le SQL Editor : il ajoute les deux colonnes manquantes sans toucher aux dossiers existants.

## Conservation des données (RGPD)

La mention affichée dans le formulaire indique une conservation pendant la durée du partenariat, ou un an après un refus. Pour supprimer un dossier : **Supabase > Table Editor > dossiers**, sélectionnez la ligne puis **Delete**. Supprimez aussi le dossier de fichiers correspondant dans **Storage > partenaires** (il porte le même identifiant que le dossier).

## Ce qui est contrôlé

- SIRET : 14 chiffres avec clé de contrôle valide
- Email, adresses web, couleurs au format #RRGGBB, dates de validité cohérentes
- Logo obligatoire : PNG, JPG, SVG ou WEBP, 5 Mo maximum. Plaquette facultative : PDF, 10 Mo maximum
- Champ invisible anti-robots
- Côté base, les mêmes règles sont revérifiées : un dossier incomplet ou mal formé est refusé, même s'il n'a pas été envoyé depuis le formulaire.
