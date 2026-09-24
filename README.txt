POKEMON ARENA — MULTIJOUEUR EN LIGNE

Ce pack contient :
- pokemon_arena_v21_multiplayer.html : jeu + lobby multijoueur
- server.js : serveur temps réel WebSocket
- package.json : dépendance ws

LANCER EN LOCAL
1. Installer Node.js 18+.
2. Dans ce dossier : npm install
3. Puis : npm start
4. Ouvrir http://localhost:3000
5. Les autres appareils sur le même réseau peuvent utiliser l'adresse IP du PC hôte.

INTERNET
Le HTML seul ne suffit pas pour le multijoueur : GitHub Pages peut publier le site statique mais ne fait pas tourner le serveur WebSocket. Il faut donc déployer server.js sur un hébergeur Node (par exemple Render/Railway/Fly.io) et publier le HTML avec lui ou servir le HTML depuis le même serveur.

SALONS
- 2 à 100 joueurs par salon actuellement.
- Chaque joueur choisit 1 Pokémon.
- Chaque joueur devient une équipe différente.
- Donc 2 joueurs = 1v1, 3 = 1v1v1, 5 = 1v1v1v1v1, etc.
- Le créateur est l'hôte et lance la bataille.
- Le code du salon est partageable aux autres joueurs.

IMPORTANT
Le navigateur doit accéder au jeu via http/https pour se connecter au WebSocket. Ouvrir le fichier HTML directement avec file:// ne permet pas le mode en ligne.
