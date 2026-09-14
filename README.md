# Kalam

Atelier d'écriture et bibliothèque personnelle : écrire, importer, organiser, résumer et exporter ses textes en livres PDF.

- **Bibliothèque** : tous vos écrits en cartes ou en liste, recherche, filtres par genre, tri.
- **Import** : `.docx`, `.pdf`, `.txt`, `.md`, `.odt`. Le texte devient éditable, le fichier d'origine est conservé.
- **Éditeur** : gras, italique, souligné, titres, listes, citations, sauts de page, plan des chapitres, mode focus, compteur de mots, sauvegarde automatique (avec copie de secours sur l'appareil).
- **Fiches de résumé** : formulaire complet, proposition automatique par l'IA, export PDF, vue « Toutes mes fiches ».
- **Livre PDF** : formats poche (A5), roman (15 × 23 cm) ou A4, 4 polices, page de titre, couverture, table des matières avec numéros de page, fiche en ouverture, aperçu avant téléchargement.
- **Privé** : connexion par mot de passe ou lien magique, chaque donnée est protégée par des règles de sécurité Supabase.
- **Téléphone** : interface pensée d'abord pour le mobile, mode nuit, installable sur l'écran d'accueil.

---

## Mise en ligne, pas à pas (≈ 20 minutes, sans coder)

Il vous faut trois comptes gratuits : **GitHub**, **Supabase** et **Vercel**. Une clé **Anthropic** est facultative (pour les résumés par IA).

### 1. Supabase : base de données et connexion

1. Créez un projet sur [supabase.com](https://supabase.com) (région : Europe, par exemple Paris ou Francfort).
2. Menu **SQL Editor** → **New query** → collez tout le contenu du fichier `supabase/schema.sql` → **Run**.
   Cela crée les tables, les règles de confidentialité et les espaces de stockage des couvertures.
3. Menu **Project Settings → API** : notez l'**URL du projet** et la clé **anon public**.

### 2. GitHub : déposer le code

1. Créez un dépôt **privé** sur [github.com/new](https://github.com/new), nommé `kalam`.
2. Sur la page du dépôt vide, cliquez sur **uploading an existing file** et glissez-y tout le contenu de ce dossier (sauf `node_modules` s'il existe). Validez avec **Commit changes**.

### 3. Vercel : mettre l'application en ligne

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, puis importez le dépôt `kalam`.
2. Avant de cliquer sur **Deploy**, ouvrez **Environment Variables** et ajoutez :

   | Nom | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | l'URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé anon public |
   | `ANTHROPIC_API_KEY` | votre clé depuis [console.anthropic.com](https://console.anthropic.com) (facultatif) |
   | `NEXT_PUBLIC_ALLOW_SIGNUP` | `true` |

3. **Deploy**. Au bout de 2 minutes, Vercel vous donne une adresse du type `https://kalam-xxxx.vercel.app`.

### 4. Relier la connexion à votre adresse

Dans Supabase, **Authentication → URL Configuration** :

- **Site URL** : `https://kalam-xxxx.vercel.app`
- **Redirect URLs** : ajoutez `https://kalam-xxxx.vercel.app/auth/callback`

### 5. Créer votre compte, puis fermer les inscriptions

1. Ouvrez votre adresse, onglet **Créer un compte**, confirmez l'email reçu.
2. Pour que personne d'autre ne puisse s'inscrire :
   - dans Supabase, **Authentication → Sign In / Providers → Email** : désactivez **Allow new users to sign up** ;
   - dans Vercel, passez `NEXT_PUBLIC_ALLOW_SIGNUP` à `false` puis **Redeploy**.

C'est prêt. Sur téléphone, menu du navigateur → **Ajouter à l'écran d'accueil**.

---

## Utilisation au quotidien

- **Chapitres** : dans l'éditeur, le bouton *H1* transforme une ligne en titre de chapitre. Le plan (icône à gauche de la barre) liste les chapitres, et chaque chapitre ouvre une nouvelle page dans le livre.
- **Saut de page** : bouton dédié, ou `Ctrl + Entrée`.
- **Enregistrement** : automatique. L'indicateur en haut à gauche affiche « Enregistré à … ». Hors connexion, le texte est gardé sur l'appareil et envoyé dès le retour du réseau.
- **Couverture, genre, statut, tags, résumé** : bouton *Informations* (icône réglages) dans l'éditeur.
- **Fiche** puis **Exporter** : en haut à droite de chaque écrit.

---

## Pour les développeurs

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
npm run build                # vérification complète (types + compilation)
```

**Pile** : Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Tiptap 3 · Supabase (Postgres, Auth, Storage) · react-pdf · mammoth / unpdf / JSZip · API Claude (`claude-opus-5`).

### Organisation du code

```
supabase/schema.sql            Tables, sécurité (RLS), buckets de stockage
src/proxy.ts                   Protection des pages (session Supabase)
src/app/
  connexion/                   Connexion : mot de passe, lien magique, inscription
  auth/callback/               Retour des liens envoyés par email
  (bibliotheque)/              Pages avec la navigation principale
    page.tsx, library.tsx      Bibliothèque
    importer/                  Import de documents
    fiches/                    Toutes les fiches
    reglages/                  Nom de plume, compte
  (atelier)/ecrits/[id]/       Un écrit
    studio.tsx                 Éditeur
    fiche/                     Fiche de résumé
    livre/                     Export en livre + aperçu
  api/resume/route.ts          Résumé par IA (côté serveur uniquement)
  actions.ts                   Actions serveur (créer, supprimer, déconnexion)
src/components/                Interface (logo, boutons, panneaux, barre d'outils…)
src/lib/
  editor/                      Extensions Tiptap, sauvegarde automatique, plan
  import/extract.ts            Extraction docx / pdf / odt / md / txt (dans le navigateur)
  pdf/                         Mise en page du livre et de la fiche (react-pdf)
  supabase/                    Clients navigateur et serveur
public/fonts/                  Polices embarquées dans les PDF
```

### Choix techniques

- **Contenu** stocké en JSON Tiptap (`writings.content`), doublé d'une version texte (`content_text`) pour la recherche et l'IA.
- **Import dans le navigateur** : pas de limite de taille imposée par l'hébergeur et aucun serveur intermédiaire.
- **PDF générés dans le navigateur** avec react-pdf plutôt que Puppeteer : fonctionne sur Vercel sans Chromium, et hors ligne une fois la page chargée. La table des matières est calculée en deux passes pour afficher les vrais numéros de page.
- **IA** : un seul appel côté serveur, avec sortie JSON structurée et repli automatique de modèle (`fallbacks: "default"`) si le modèle principal décline. La clé n'est jamais exposée au navigateur.

### Évolutions prévues

L'architecture anticipe les fonctions suivantes :

- **Lien de partage** : colonnes `visibility` (`private` / `link` / `public`) et `share_slug` déjà présentes dans `writings`. Il suffira d'une route publique `/lire/[slug]` et d'une règle RLS de lecture pour `visibility <> 'private'`.
- **Export EPUB** : le JSON Tiptap se convertit en XHTML avec `generateHTML(content, baseExtensions)` (`src/lib/editor/extensions.ts`), à empaqueter avec JSZip (déjà installé).
- **Lecture « livre qui tourne les pages »** : réutiliser le découpage en chapitres (`extractOutline`) et le rendu HTML ci-dessus dans une vue paginée.
- **Mode collaboratif** : Tiptap propose une extension de collaboration (Yjs) ; Supabase Realtime peut servir de canal de synchronisation. Ajouter alors une table `writing_members` et élargir les règles RLS.
