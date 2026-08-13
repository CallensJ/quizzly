# AI Interaction Guidelines — Erudia

## Communication Principles

- Répondre en français sauf demande contraire.
- Être direct, concis et pragmatique.
- Expliquer brièvement les choix d'implémentation lorsqu'ils ne sont pas évidents.
- Ne pas masquer une incertitude : poser des questions précises si une exigence manque de clarté.
- Ne jamais proposer une refonte globale du code quand une modif ou correction ciblée suffit.
- Obtenir la confirmation explicite de Johan avant toute modification de schéma de base de données (Supabase), d'architecture d'état (Zustand) ou de logique tarifaire (Stripe).

## Méthode de travail

Pour chaque fonctionnalité, correction, contenu ou optimisation :

Pour chaque fonctionnalité, correction, contenu ou optimisation :

1. **Documenter**  
   Décrire la tâche, le périmètre et les critères d'acceptation dans `@context/current-feature.md`.

2. **Inspecter**  
   Lire les composants, données, routes, tests et styles déjà concernés. Réutiliser les patterns existants.

3. **Créer une branche**  
   Utiliser une branche dédiée :
   - `feature/...`
   - `fix/...`
   - `content/...`
   - `seo/...`
   - `refactor/...`

4. **Implémenter**  
   Effectuer les changements minimaux nécessaires. Ne pas refactoriser les fichiers voisins par réflexe.

5. **Vérifier**  
   Contrôler :
   - comportement fonctionnel ;
   - responsive ;
   - accessibilité de base ;
   - liens et CTA ;
   - métadonnées SEO ;
   - erreurs console ;
   - contenu français.
6. **Tester**  
   Lancer les tests ciblés, puis :

   ```bash
   npm run test
   npm run build
   ```

7. **Itérer**  
   Corriger les problèmes détectés. Ne pas contourner une erreur de build avec une désactivation arbitraire.
8. **Présenter le résultat**  
   Résumer :
   - les fichiers modifiés ;
   - ce qui a changé ;
   - les vérifications effectuées ;
   - les éventuels points restant à décider.

9. **Commit et merge**  
   Ne jamais commit, push, merge ou supprimer une branche sans autorisation explicite de Johan.

10. **Clôturer**  
    Mettre le statut sur `Completed` et ajouter une entrée dans l'historique de `current-feature.md`.

## Branches et commits

Utiliser des noms lisibles :

```text
feature/gamification-refactorisation
fix/contact-form-validation
content/prestations-copy
seo/local-metadata
```

Utiliser des commits conventionnels et ciblés

Ne jamais ajouter de signature ou de mention promotionnelle liée à l'IA.

## Limites de périmètre

- Ne pas ajouter de fonctionnalité « utile plus tard » sans demande.
- Ne pas modifier les tarifs ou les offres sans instruction explicite.
- Ne pas modifier simultanément design, contenu et architecture si la tâche ne le demande pas.
- Ne pas inventer de statistiques, témoignages, clients ou résultats.
- Ne pas transformer automatiquement un projet fictif en client réel.
- Préserver les redirections et anciennes URLs tant que leur suppression n'a pas été validée.
- Ne pas introduire de base de données, CMS ou authentification dans ce site vitrine sans décision dédiée.

## Quand une exigence est ambiguë

Avant d'agir :

1. vérifier `project-overview.md` ;
2. vérifier `current-feature.md` ;
3. inspecter le code existant ;
4. choisir l'interprétation la plus conservatrice.

Si plusieurs options ont un impact important, présenter clairement les alternatives avant de modifier l'architecture.

## Quand une tentative échoue

Après deux ou trois tentatives raisonnables :

- arrêter les changements aléatoires ;
- expliquer la cause probable ;
- indiquer ce qui a été testé ;
- proposer la prochaine action la plus sûre.

Ne pas multiplier les dépendances, hacks CSS ou contournements TypeScript pour forcer une solution.

## Revue du code généré

Vérifier particulièrement :

- validation des entrées ;
- échappement du contenu utilisateur ;
- rate limiting ;
- exposition de secrets ;
- composants client inutiles ;
- re-renders et animations coûteuses ;
- liens cassés ;

