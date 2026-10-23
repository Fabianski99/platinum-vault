# Platinum Vault

Una biblioteca de Steam y un museo personal de juegos completados al 100 %, con identidad visual editorial y recorridos interactivos.

## Tecnologías

- Next.js 16, React 19 y TypeScript.
- Tailwind CSS 4, estilos propios y Motion.
- Lucide para iconografía.
- Steam OpenID y Steam Web API.
- Supabase/PostgreSQL **reservados para una etapa futura**.

## Funciones actuales

### Biblioteca y conexión

- Inicio de sesión con Steam, horas jugadas, biblioteca real y progreso de logros.
- Sincronización automática por lotes, pausa y reintento.
- Búsqueda, estado de logros y clasificación por actividad, nombre, horas y progreso.
- Búsqueda, filtros y orden de la biblioteca guardados localmente.
- Regreso a la sección de origen y restauración aproximada del desplazamiento al cerrar una ficha.

### Sistema de imágenes

1. Intento de portada vertical oficial en las rutas habituales de Steam.
2. Si solo hay arte horizontal, se construye una composición con fondo difuminado y nombre legible. **Nunca se estira un icono pequeño hasta convertirlo en portada**.
3. Si fallan las rutas directas, se consultan metadatos públicos de la tienda mediante \`/api/artwork/[appId]\`.
4. Si no se encuentra arte oficial, se muestra una cubierta tipográfica coherente con el museo. El icono de Steam, si existe, se utiliza solo como elemento pequeño de la cubierta.

Algunas aplicaciones o juegos retirados carecen de ilustraciones públicas. No se muestran imágenes de otros productos como si fueran del juego original.

### Ficha individual (\`/juegos/APPID\`)

- Logros reales, iconos, fechas, rareza global y descripciones cuando Steam los permite.
- Búsqueda y filtros por desbloqueado, pendiente y rareza global.
- Botón para revelar logros ocultos (inicialmente protegidos).
- Últimas conquistas y objetivos pendientes ordenados por popularidad global, **no por dificultad**.
- Estadísticas de logros raros y ocultos; estados de carga con esqueletos.
- Panel preparatorio de guías: no inventa perdibles, dificultad, NG+, multijugador ni DLC.

### Museo

- Exposición principal con selección de favoritas.
- Galería, cronología por año y agrupación por sagas conocidas. Las sagas con una sola obra se conservan en «Otras obras» para no aparentar una colección completa.
- Salas de exploración por año, saga y horas invertidas.
- Reconocimientos fundamentados en horas jugadas, número de logros y último logro final conocido.
- Búsqueda, filtro por año, favoritas, orden y vista recordados en este navegador.

**Nota sobre las fechas:** la fecha presentada es la del último logro que Steam registra, no necesariamente la fecha de la primera vez que el jugador alcanzó el 100 %. Steam no proporciona una puntuación universal de dificultad del 100 %.

## Desarrollo local

1. Ejecuta \`npm install\`.
2. Copia \`.env.example\` a \`.env.local\`.
3. Configura \`NEXT_PUBLIC_APP_URL=http://localhost:3000\`, \`STEAM_API_KEY\` y \`STEAM_SESSION_SECRET\` (secreto aleatorio de 32 caracteres como mínimo).
4. Ejecuta \`npm run dev\`.

Comprueba antes de continuar:

\`\`\`bash
npm run lint
npm run build
\`\`\`

Las claves de Steam permanecen en el servidor. No subas \`.env.local\` ni secretos a GitHub.

## Pendiente

- Validar visualmente la galería, los fallback y los logros con la biblioteca real.
- Integrar persistencia en Supabase más adelante (por ahora se usa el almacenamiento del navegador).
- Preparar publicación en Vercel cuando la experiencia local esté estable.
- Añadir fuentes contrastadas de requisitos para las guías personalizadas; existe un contrato inicial en \`src/lib/guide-schema.ts\`, sin guías generadas todavía.
