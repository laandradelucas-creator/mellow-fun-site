# Site Mellow Fun

Site estático: não precisa de instalação nem de build. Basta publicar esta pasta (Vercel, Netlify ou qualquer hospedagem).

Para abrir no computador:

    python3 -m http.server 4173 --directory site

Depois acesse http://localhost:4173. Abrir o index.html com dois cliques não funciona, porque o 3D precisa de um servidor.

- Textos: index.html
- Número do WhatsApp e mensagens prontas: topo de js/main.js
- Balões 3D (céu): js/scene.js
- Cores e layout: style.css
- Abertura em "voo" (rolagem com zoom, como na SuperPlay): seção #voo em index.html; .fly-pin tem perspective 500px e a .fly-scene (preserve-3d) anda em Z conforme a rolagem — cada bloco fica parado em translateZ(-parada × 1800px), medido em measure() e animado em updateScene (js/main.js). Sem o modo voo (prefers-reduced-motion) ou se o módulo falhar, as mesmas paradas ficam empilhadas.
