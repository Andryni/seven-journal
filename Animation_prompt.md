### Hero Dashboard 3D
- **Couche :** Interface / Scroll
- **Section(s) concernée(s) :** Hero Section
- **Description visuelle :** Un tableau de bord en verre dépoli (glassmorphism) flottant en 3D, incliné vers l'avant. Au chargement, il se redresse avec un effet de ressort tandis qu'un graphique interne se dessine.
- **Comportement :** Au chargement de la page (`initial={{ opacity: 0, y: 50, rotateX: 25 }}`), le dashboard apparaît et se relève doucement (`animate={{ opacity: 1, y: 0, rotateX: 0 }}`). 
- **Technique :** Framer Motion (perspective 3D et transform) + Recharts pour le graphique. Le choix de la 3D donne un effet immédiat de profondeur.
- **Paramètres clés :** Durée 1.2s, délai 0.8s, effet spring (bounce: 0.4), perspective: 1200px.
- **Prompt de reproduction :** "Crée une carte avec un style glassmorphism et un border fin. Au chargement, fais-la pivoter de 25 degrés sur l'axe X (vers l'arrière) et déplace-la vers le bas. Anime-la vers sa position d'origine (0 degré, Y: 0) avec un effet de rebond dynamique (spring) sur 1.2 secondes."

### Background Orbs & Candlesticks
- **Couche :** Background
- **Section(s) concernée(s) :** Global (Hero & Features)
- **Description visuelle :** Des halos lumineux (Onyx, Emerald, Amber, Rose) très diffus en arrière-plan et des icônes de chandeliers japonais (🕯️) qui flottent très lentement de bas en haut comme des particules.
- **Comportement :** Boucle infinie. Les chandeliers montent de 110vh à -10vh en tournant légèrement sur eux-mêmes, à des vitesses et délais aléatoires.
- **Technique :** CSS pur / Framer Motion. Framer Motion gère la boucle `repeat: Infinity` de manière fluide.
- **Paramètres clés :** Flou des orbes (blur 150px). Chandeliers: durée entre 15 et 35s, ease "linear", rotation de 0 à 15 puis -15 degrés.
- **Prompt de reproduction :** "Génère 8 particules textuelles (émojis) qui partent du bas de l'écran (hors champ) et montent lentement vers le haut. Chaque particule doit avoir un délai aléatoire, une durée aléatoire longue, une trajectoire linaire infinie, et pivoter doucement comme si elle flottait dans l'eau."

### Spotlight Card
- **Couche :** Interface
- **Section(s) concernée(s) :** Bento Grid (Features)
- **Description visuelle :** Les cartes ont un fond sombre, mais lorsqu'on survole la carte avec la souris, un halo de lumière diffuse suit exactement le curseur et illumine les bordures internes.
- **Comportement :** Se déclenche au `mousemove`. Le halo (radial-gradient) suit les coordonnées X/Y du curseur relatives à la carte. L'opacité du halo passe à 1 au `mouseenter` et à 0 au `mouseleave`.
- **Technique :** React (`useRef`, `onMouseMove`) + CSS statique. Très performant et très élégant sans surcharger le DOM d'animations coûteuses.
- **Paramètres clés :** `radial-gradient(800px circle at Xpx Ypx, rgba(255,255,255,0.08), transparent 40%)`, transition d'opacité 300ms.
- **Prompt de reproduction :** "Crée un composant React de carte. Ajoute un écouteur de mouvement de souris qui capte les coordonnées X et Y locales. Utilise ces coordonnées pour lier la position d'un background radial-gradient transparent qui agit comme un effet de lampe torche révélant la bordure des éléments au survol."

### Dynamic Chart Tooltip Hover
- **Couche :** Interface
- **Section(s) concernée(s) :** Hero Dashboard & Bento Grid
- **Description visuelle :** Un tooltip "glassmorphic" (verre dépoli) qui apparaît de manière fluide en suivant le curseur lorsque l'utilisateur survole les barres ou la ligne du graphique.
- **Comportement :** Révélation instantanée au focus/hover du point de donnée. Assombrit ou met en valeur (drop-shadow) l'élément survolé.
- **Technique :** Recharts Tooltip + Composant React Custom.
- **Paramètres clés :** Backdrop-blur, border rgba(255,255,255,0.1), transition sur `fill-opacity 0.2s`.
- **Prompt de reproduction :** "Utilise ou simule l'interaction de Recharts : lorsqu'un utilisateur survole un point d'un SVG de graphique, affiche une div flottante avec un effet de flou d'arrière-plan contenant les données formatées associées à ce point."

### Rocket Stock Chart Animation
- **Couche :** Interface / SVG
- **Section(s) concernée(s) :** Bento Grid (Analyse de Confluences)
- **Description visuelle :** Un petit graphique boursier vectoriel qui monte, crash brusquement en rouge, avant qu'une fusée apparaisse et propulse la courbe vers de nouveaux sommets.
- **Comportement :** Boucle constante. La courbe dessine un chemin, change de couleur au crash, puis la ligne remonte avec une petite émoticône 🚀 à l'extrémité.
- **Technique :** Framer Motion / SVG. Manipulation de `pathLength` et changements de `stroke`.
- **Paramètres clés :** SVG Path tracing, gestion de séquences avec `animate`.
- **Prompt de reproduction :** "Crée une animation SVG d'une courbe boursière qui monte progressivement, s'effondre soudainement avec un éclat rouge, puis une petite fusée décolle depuis le bas et propulse la ligne vers un nouveau sommet record, avec un effet de traînée. Style flat UI minimal."
