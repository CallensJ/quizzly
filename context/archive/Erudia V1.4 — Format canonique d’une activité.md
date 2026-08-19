# Erudia V1.4 — Format canonique d’une activité

**Version :** 1.0  
**Statut :** spécification de production  
**S’applique à :** toutes les activités Pre-A1 et A1 d’Erudia V1.4  
**Sources de référence :**
- Content Map / Curriculum V1.0
- Content Quality Standards V1.1
- Registre d’assets du bloc concerné

---

## 1. Rôle du format canonique

Le format canonique définit la structure obligatoire d’une activité Erudia avant son intégration technique dans l’application.

Il constitue le contrat entre :

- la Content Map, qui définit ce qui doit être appris ;
- les Content Quality Standards, qui définissent les critères de qualité ;
- les registres d’assets, qui définissent les médias autorisés ;
- la production des activités ;
- l’application, qui transformera ensuite ces données en interactions jouables.

Une activité canonique décrit un **micro-objectif pédagogique observable**.

Elle ne décrit pas nécessairement une « question ».

Selon la modalité prévue dans la Content Map, une activité peut demander à l’enfant de :

- écouter puis choisir ;
- toucher une image ;
- associer deux éléments ;
- remettre une courte séquence en ordre ;
- choisir une réplique ;
- comprendre une scène ;
- retrouver une cible déjà rencontrée.

Le format pédagogique reste indépendant du composant d’interface qui réalisera cette interaction.

---

# 2. Principes structurants

## 2.1 Une activité = un micro-objectif

Une activité n’introduit qu’une seule cible nouvelle.

L’objectif suit obligatoirement la forme :

> Après cette activité, l’enfant peut **[action observable]** avec **[cible française]** dans **[contexte concret]**.

Exemple :

> Après cette activité, l’enfant peut reconnaître « bonjour » dans une scène d’arrivée en classe.

---

## 2.2 Séparer contenu pédagogique et interface

Le document décrit :

- ce que l’enfant doit comprendre ;
- ce qu’il reçoit comme stimulus ;
- ce qu’il doit faire ;
- ce qui constitue une réussite ;
- les erreurs pertinentes ;
- le feedback ;
- les assets nécessaires.

Il ne définit pas encore :

- le composant React utilisé ;
- les animations ;
- la disposition précise des boutons ;
- le modèle de stockage ;
- les noms de fonctions ;
- la structure TypeScript finale.

Ces éléments appartiennent à l’implémentation.

---

## 2.3 Les IDs sont des références, pas des fichiers

Une activité référence les IDs définis dans le registre d’assets.

Exemples :

- `CHAR-ENF-01#SALUER`
- `SCL-P01-ENTREE-01`
- `ACT-SALUER-01`
- `OBJ-DESSIN-01`
- `DIA-P01-BONJOUR-01@ADU`

Elle ne référence pas directement un chemin tel que :

`/assets/images/bonjour-final-v3.png`

La résolution entre ID logique et fichier physique appartient au système technique.

---

# 3. Structure canonique obligatoire

Chaque activité utilise exactement les sections suivantes.

---

## [ID] — [titre de travail]

### 1. Métadonnées

- **statut :** brouillon | à vérifier | validé contenu | validé app
- **bloc :** [P01, P02, A11...]
- **niveau :** [Pre-A1 | A1]
- **univers :** [École | Moi | Vivre en France | Repères]
- **type pédagogique :** [découverte | pratique guidée | rappel actif assisté | transfert | consolidation]
- **modalité :** [AI | CV | AM | OR | MD | SC | RA]
- **sources de production :**
  - content-map : [version]
  - content-quality-standards : [version]
  - registre d’assets : [document + version]

---

### 2. Objectif pédagogique

**Objectif observable :**

> Après cette activité, l’enfant peut [action observable] avec [cible française] dans [contexte concret].

**Cible française :**  
[cible exacte]

**Cible nouvelle :**  
[oui | non]

Si non, préciser les activités où elle a déjà été introduite.

---

### 3. Progression pédagogique

**Prérequis vérifiés :**

- [ID activité ou N/A]
- [élément déjà rencontré]

**Réemploi prévu :**

- [ID]
- [ID]

Une activité ne peut pas dépendre d’un prérequis absent de la Content Map ou d’une compétence cachée.

---

### 4. Contexte

**Situation concrète :**  
[description très courte de la situation]

**Ce que l’enfant doit comprendre :**  
[sens utile de la scène ou du stimulus]

**Éléments contextuels autorisés :**

- [personnage]
- [objet]
- [scène]
- [action]

Aucun élément décoratif ne doit introduire une nouvelle notion nécessaire à la réussite.

---

### 5. Consigne enfant

**Langue :** [anglais | français | non verbale]

**Canal :** [texte | audio | visuel | combinaison]

**Consigne exacte :**

> [texte affiché ou prononcé]

**Action attendue :**

[toucher | choisir | associer | ordonner | sélectionner une réplique | autre action prévue]

La consigne demande une seule action à la fois.

Au Pre-A1, aucune lecture française nouvelle ne peut être nécessaire pour réussir.

---

### 6. Stimulus

**Type :**

- [audio]
- [visuel]
- [scène]
- [dialogue]
- [combinaison]

**Stimulus français canonique :**

> [texte exact ou N/A]

**Référence audio :**

`[DIA-ID@LOCUTEUR ou N/A]`

**Référence visuelle principale :**

`[CHAR / SCL / ACT / OBJ / autre ID ou N/A]`

**Répétition audio autorisée :** [oui | non]

Pour une première rencontre Pre-A1, la cible nouvelle est introduite avec audio et support visuel non ambigu.

---

### 7. Interaction

**Modalité :** `[AI | CV | AM | OR | MD | SC | RA]`

**Action réalisée par l’enfant :**

[description observable de l’interaction]

**Nombre d’éléments manipulés :**  
[nombre]

**Nombre de tentatives :**  
[politique prévue]

L’interaction doit mesurer l’objectif pédagogique, pas l’habileté motrice ou la compréhension d’une interface complexe.

---

### 8. Options ou éléments interactifs

Cette section est adaptée à la modalité mais ne peut pas être supprimée.

#### Option A

- **référence :** `[asset ID / texte / audio]`
- **rôle :** bonne réponse | distracteur
- **sens représenté :** [description]
- **alt-text si nécessaire :** [texte]

#### Option B

- **référence :** `[asset ID / texte / audio]`
- **rôle :** bonne réponse | distracteur
- **sens représenté :** [description]
- **alt-text si nécessaire :** [texte]

#### Option C

[uniquement si pédagogiquement nécessaire]

#### Option D

[uniquement si pédagogiquement nécessaire]

Pour une découverte Pre-A1, le nombre de choix reste minimal. Deux choix peuvent être préférables lorsqu’ils suffisent à démontrer la compréhension.

---

### 9. Bonne réponse

**Réponse attendue :**

`[référence ou action exacte]`

**Preuve de réussite :**

[Lien explicite entre la réponse et l’objectif observable.]

Exemple :

> L’enfant sélectionne la scène de salutation après avoir entendu « Bonjour ! ». Cette réponse montre qu’il associe la forme sonore à la situation d’accueil.

Une seule réponse doit être défendable.

---

### 10. Distracteurs

Pour chaque distracteur :

#### Distracteur [ID ou lettre]

**Référence :**  
`[asset ID]`

**Confusion visée :**  
[erreur ou confusion pédagogique pertinente]

**Pourquoi il est plausible :**  
[raison]

**Pourquoi il n’est pas correct :**  
[raison directement liée à la cible]

Un distracteur ne peut pas être :

- manifestement absurde ;
- plus complexe que la cible ;
- reconnaissable uniquement par un détail décoratif ;
- dépendant d’une couleur ;
- fondé sur une connaissance jamais enseignée ;
- graphiquement moins travaillé que la bonne réponse.

---

### 11. Feedback

#### Après réussite

**Feedback pédagogique :**

[confirmation courte de la cible]

**Action éventuelle :**

- répétition audio ;
- mise en évidence du visuel ;
- animation légère ;
- passage à l’activité suivante.

Le feedback confirme ce qui vient d’être compris.

---

#### Après erreur

**Feedback pédagogique :**

[aide courte sans jugement]

**Aide proposée :**

- rejouer l’audio ;
- simplifier ou mettre en évidence le contexte ;
- laisser une nouvelle tentative ;
- autre aide prévue par la modalité.

L’erreur ne retire pas de progression et n’humilie jamais l’enfant.

---

### 12. Assets requis

| ID | Type | Rôle dans l’activité | Statut minimum requis |
| --- | --- | --- | --- |
| [ID] | CHAR / SCL / ACT / OBJ / DIA / autre | [rôle] | [SPÉCIFIÉ / À PRODUIRE / À VÉRIFIER / VALIDÉ APP] |

Aucun asset non enregistré ne peut être ajouté silencieusement.

Si un asset nécessaire n’existe pas, l’activité reste bloquée ou le registre est mis à jour avant production.

---

### 13. Accessibilité

**Sens transmis par couleur uniquement :** non

**Lecture française obligatoire :** non au Pre-A1 lors d’une première rencontre

**Audio essentiel accompagné d’une transcription de référence :** oui si applicable

**Alt-text pédagogique disponible :** oui si applicable

**Action réalisable sans geste moteur précis :** oui

**Visuels distinguables à taille mobile :** à vérifier / oui

---

### 14. Vérification linguistique et factuelle

**Vérification linguistique :**

- cible française : [validée / à vérifier]
- transcription identique à l’audio : [oui / N/A]
- formulation naturelle dans le contexte : [oui / à vérifier]

**Vérification factuelle ou culturelle :**

[N/A ou source utilisée]

Toute donnée concernant la France, l’école, les services ou une pratique culturelle réelle doit être vérifiée avant publication lorsqu’elle porte le sens de l’activité.

---

### 15. Risques et questions ouvertes

**Risques identifiés :**

- [aucun]
- ou [liste]

**Questions ouvertes :**

- [aucune]
- ou [liste]

Une activité comportant une question ouverte bloquante ne peut pas passer au statut `validé contenu`.

---

### 16. Auto-contrôle qualité

Avant validation :

- [ ] un seul micro-objectif nouveau ;
- [ ] objectif observable ;
- [ ] cible conforme à la Content Map ;
- [ ] prérequis explicitement vérifiés ;
- [ ] aucune lecture française cachée au Pre-A1 ;
- [ ] première découverte audio + visuel si applicable ;
- [ ] une seule bonne réponse défendable ;
- [ ] distracteurs pédagogiquement plausibles ;
- [ ] aucune réponse révélée par le graphisme ;
- [ ] consigne courte et univoque ;
- [ ] difficulté provenant de la cible et non de l’interface ;
- [ ] feedback utile après réussite ;
- [ ] aide prévue après erreur ;
- [ ] aucun asset inventé ;
- [ ] IDs conformes au registre ;
- [ ] aucun contenu humiliant, anxiogène ou stéréotypé ;
- [ ] accessibilité vérifiée ;
- [ ] vérification linguistique effectuée ;
- [ ] vérification factuelle effectuée si nécessaire ;
- [ ] aucun placeholder restant ;
- [ ] aucune question ouverte bloquante.

---

# 4. Statuts d’une activité

## BROUILLON

La structure est remplie mais n’a pas encore passé la revue complète.

## À VÉRIFIER

Le contenu pédagogique est complet mais certains éléments restent à contrôler :

- langue ;
- assets ;
- accessibilité ;
- rendu réel ;
- données factuelles.

## VALIDÉ CONTENU

L’activité respecte :

- la Content Map ;
- les Content Quality Standards ;
- le registre d’assets ;
- le format canonique.

Elle peut être transformée dans le format technique de l’application.

Ce statut ne signifie pas que l’activité fonctionne correctement dans l’interface réelle.

## VALIDÉ APP

L’activité a été :

- intégrée ;
- rendue avec ses vrais assets ;
- testée dans l’interface réelle ;
- testée sur le support cible ;
- validée pédagogiquement dans son rendu réel.

C’est le seul statut permettant de considérer l’activité comme prête pour le pilote.

---

# 5. Relation avec le futur modèle technique

Le format canonique est la source éditoriale.

Le futur schéma TypeScript/JSON devra pouvoir représenter l’ensemble de ses informations utiles sans modifier le contenu pédagogique.

Pipeline prévu :

```text
Content Map
    ↓
Content Quality Standards
    ↓
Asset Registry
    ↓
Canonical Activity
    ↓
Validation contenu
    ↓
TypeScript / JSON
    ↓
Activity Engine
    ↓
Interface
    ↓
Validation App
```

La transformation vers TypeScript ou JSON est une opération de structuration des données.

Elle ne doit pas entraîner une réécriture pédagogique de l’activité.

---

# 6. Exemple minimal de squelette

```md
## P01.XX — [titre]

### Métadonnées
- statut : brouillon
- bloc : P01
- niveau : Pre-A1
- univers : École
- type pédagogique :
- modalité :
- sources :

### Objectif
- objectif observable :
- cible française :
- cible nouvelle :

### Progression
- prérequis :
- réemploi :

### Contexte
- situation :
- sens attendu :

### Consigne
- langue :
- canal :
- texte :
- action attendue :

### Stimulus
- français :
- audio :
- visuel :
- répétition :

### Interaction
- modalité :
- action :
- nombre d’éléments :

### Options
- A :
- B :

### Bonne réponse
- réponse :
- preuve :

### Distracteurs
- distracteur :
- confusion visée :
- justification :

### Feedback
- réussite :
- erreur :
- aide :

### Assets
- IDs :

### Accessibilité
- contrôles :

### Vérifications
- linguistique :
- factuelle :

### Risques
- risques :
- questions ouvertes :

### Auto-contrôle
- checklist :
```

---

# 7. Règle de sortie pour une IA

Lorsqu’une IA produit une activité Erudia, elle doit remplir le format canonique sans supprimer les champs obligatoires.

Elle ne doit jamais inventer :

- un prérequis ;
- un asset ;
- un dialogue ;
- une cible ;
- une bonne réponse ;
- une donnée factuelle.

Si une information nécessaire manque ou si deux réponses sont défendables, l’activité doit être signalée comme bloquée plutôt que complétée arbitrairement.

Une activité n’est pas prête tant qu’elle contient :

- un placeholder ;
- un asset inexistant ;
- une source requise non vérifiée ;
- une ambiguïté de réponse ;
- une question ouverte bloquante.