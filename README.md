# Système d'Exploration et de Résolution de Labyrinthes

Ce projet est une application web interactive dédiée à la **génération** et à la **résolution** de labyrinthes. Il met en œuvre des algorithmes sophistiqués pour la création de structures labyrinthiques, ainsi qu'une approche par **algorithme génétique** pour la recherche d'un chemin optimal.

---

## Fonctionnement du Système

Le système se compose de deux modules principaux : la génération du labyrinthe et sa résolution.

### 1. Génération du Labyrinthe

Le module de génération permet la création de labyrinthes basés sur divers algorithmes, chacun produisant une structure distincte. Les algorithmes disponibles sont les suivants :

-   **Algorithmes Basés sur les Arbres Couvrants Minimums (MST):**
    -   **Algorithme de Prim:** Génère des labyrinthes à chemins simples, avec peu de boucles.
    -   **Algorithme de Kruskal:** Produit des labyrinthes avec une topologie ouverte et une grande diversité de chemins.
-   **Algorithmes Basés sur la Marche Aléatoire:**
    -   **Parcours en Profondeur (DFS - Depth-First Search):** Crée des labyrinthes avec de longs couloirs et une faible densité de boucles.
    -   **Recursive Backtracker:** Similaire au DFS, mais souvent plus simple à implémenter, il génère des labyrinthes complexes et sinueux.
    -   **Hunt-and-Kill:** Assure que toutes les parties du labyrinthe sont accessibles en "chassant" les cellules non visitées.
-   **Autres Algorithmes de Génération:**
    -   **Recursive Division (non mentionné mais souvent utilisé):** Sépare l'espace en sections par des murs, créant des labyrinthes de type "cavernes".
    -   **Sidewinder Algorithm:** Produit des labyrinthes qui sont beaucoup plus "ouverts" dans une direction que dans l'autre, avec de longues voies.
    -   **Eller's Algorithm:** Un algorithme qui génère des labyrinthes ligne par ligne, avec une complexité spatiale minimale.
    -   **Wilson's Algorithm:** Utilise des marches aléatoires pour construire le labyrinthe, garantissant une uniformité de la distribution des chemins.
    -   **Growing Tree Algorithm:** Un algorithme paramétrable qui peut se comporter comme un DFS ou un Prim en fonction de ses réglages, offrant une grande variété de structures.
    -   **Binary Tree Algorithm:** Génère des labyrinthes très simples et biaisés, avec tous les chemins menant dans une direction prédominante.

L'utilisateur peut également ajuster la taille du labyrinthe, son taux d'ouverture (pour introduire des boucles) et utiliser une "graine" (seed) pour reproduire des labyrinthes identiques de manière déterministe. Un mode de dessin manuel est également disponible pour la création de labyrinthes personnalisés, incluant des murs simples, des passages à sens unique et des passages à nombre de franchissements limités.

---

### 2. Résolution par Algorithme Génétique

La résolution du labyrinthe est effectuée à l'aide d'un **algorithme génétique (AG)**, une technique d'optimisation inspirée par le processus de sélection naturelle. Le principe de l'AG est de faire évoluer une population d'individus (ici, des chemins potentiels) sur plusieurs générations afin de trouver la solution la plus performante.

#### 2.1. Principes de l'Algorithme Génétique

-   **Individu (Chemin):** Un chemin est représenté par une séquence de mouvements (gènes), comme des déplacements Nord, Sud, Est ou Ouest.
-   **Population:** L'AG maintient un ensemble d'individus (chemins) qui explorent le labyrinthe en parallèle.
-   **Fonction de Fitness:** Pour évaluer la "performance" de chaque individu, une fonction de fitness est utilisée. Elle attribue un score en fonction de plusieurs critères :
    -   **Distance à la sortie:** Un poids élevé est donné aux chemins se rapprochant de la cible.
    -   **Longueur du chemin:** Un poids négatif est appliqué aux chemins excessivement longs pour encourager des solutions courtes.
    -   **Pénalité de collision:** Un poids très négatif est appliqué lorsqu'un chemin "frappe" un mur.
    -   **Progrès et virages:** Ces critères récompensent l'exploration de nouvelles zones et pénalisent les mouvements inefficaces (trop de virages, par exemple).
-   **Mécanismes Évolutionnaires:**
    -   **Sélection (Tournoi):** Les individus les plus "aptes" (ceux avec le meilleur score de fitness) sont sélectionnés pour se reproduire.
    -   **Croisement (Crossover):** Les gènes de deux parents sont combinés pour créer de nouveaux individus (descendants), mélangeant les caractéristiques des chemins réussis. Différents types de croisement (point unique, deux points, uniforme) sont pris en charge.
    -   **Mutation:** Un changement aléatoire est introduit dans les gènes des descendants pour maintenir la diversité génétique et éviter que l'algorithme ne stagne dans un optimum local. Des stratégies de mutation comme le *swap*, l'*inversion* et le *scramble* sont disponibles.
    -   **Élitisme:** Les meilleurs individus de chaque génération sont conservés sans modification pour garantir que la meilleure solution trouvée ne soit pas perdue.

#### 2.2. Avantages de cette Approche

L'utilisation d'un algorithme génétique offre plusieurs avantages pour la résolution de labyrinthes complexes, notamment ceux contenant des boucles ou des passages à sens unique. Contrairement aux algorithmes déterministes comme la recherche en largeur (BFS) ou en profondeur (DFS) qui garantissent une solution, l'AG est une approche heuristique. Il peut trouver des solutions pour des labyrinthes non conventionnels ou avec des contraintes complexes (telles que les pénalités de longueur de chemin) qui seraient difficiles à modéliser avec des méthodes de recherche traditionnelles. Bien qu'il ne garantisse pas toujours la solution la plus courte, il est particulièrement efficace pour explorer un grand espace de solutions et trouver rapidement un chemin viable, même dans des environnements très larges.

---

## Technologies Utilisées

-   **HTML/CSS:** Structure et style de l'interface utilisateur.
-   **Tailwind CSS:** Framework utilitaire pour une conception rapide et réactive.
-   **JavaScript (Vanilla JS):** Logique principale de l'application, incluant les algorithmes de génération et de résolution, la gestion des événements et la manipulation du canevas.
