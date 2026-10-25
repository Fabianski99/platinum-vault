# Platinum Vault

Una biblioteca de Steam y un museo personal de juegos completados al 100 %, con identidad visual editorial y recorridos interactivos.

## Tecnologías

- Next.js 16, React 19 y TypeScript.
- Tailwind CSS 4, estilos propios y Motion.
- Lucide para iconografía.
- Steam OpenID y Steam Web API.
- Supabase/PostgreSQL **reservados para una etapa futura**.

## Identidad visual y portada personalizable

La segunda versión de la interfaz utiliza una navegación con iconos y nombres claros, tipografía más expresiva y una paleta grafito, coral, azul hielo y lima suave (sin luces RGB). El inicio ya no muestra juegos arbitrarios.

- **Muro de leyendas:** permite elegir y ordenar manualmente hasta **5 juegos completados al 100 %**. Si no hay una selección guardada, muestra provisionalmente los cinco últimos completados detectados. El selector permite añadir, quitar y cambiar posiciones.
- **Siguiente 100 %:** alterna entre «Cerca del 100 %», calculado según el porcentaje real de logros conocidos, y «Mi lista de platinos», donde se pueden guardar hasta **5 juegos pendientes** de cualquier porcentaje.
- El inicio utiliza el mismo SteamID que la biblioteca, por lo que las preferencias no se mezclan entre cuentas en un mismo navegador. **La selección se guarda en localStorage**, aún no en Supabase.
- Se conserva la biblioteca, los filtros, las fichas individuales y el museo con sus recorridos, cronología y favoritos.

No hay integración de base de datos ni despliegue nuevo en esta etapa.

## Funciones actuales

### Biblioteca y conexión

- Inicio de sesión con Steam, horas jugadas, biblioteca real y progreso de logros.
- Se solicita `include_family_licenses=true` en `GetOwnedGames` para recuperar títulos jugados con Steam Families cuando Steam los exponga. Los juegos con `family_shared` aparecen identificados y disponen de un filtro **Compartidos**. Los platinos de préstamo familiar cuentan igual que los propios.
- Si un título prestado históricamente ya no aparece en la respuesta de Steam, esta integración aún no puede recuperarlo automáticamente: queda como limitación pendiente.
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

## Recuperar cambios locales si Git bloquea la actualización

Si `git pull` indica que se sobrescribirían archivos modificados, no fuerces el cambio. Guarda un respaldo reversible:

```powershell
git stash push -u -m "Respaldo local antes de actualizar Platinum Vault"
git pull origin main
```

No ejecutes `git stash pop` de inmediato: revisa primero qué modificaciones guardaste con `git stash show -p`. El respaldo permanece disponible para comparar y recuperar archivos de forma selectiva.

## Planificador de platinos (sin base de datos)

La ruta `/planificador` permite añadir juegos de la biblioteca sin limitarse a cinco, asignarles estado (por empezar, en progreso o pausado), prioridad, notas y consultar el progreso de Steam. Si existe una selección anterior de cinco juegos pendientes, se importa una vez al planificador.

El inicio conserva una selección de cinco objetivos; el planificador permite organizar un número mayor. Las preferencias se almacenan en `localStorage` y se identifican por SteamID. Para mostrar progreso, se reutiliza la caché de logros de la biblioteca cuando existe. En un dispositivo nuevo, entra antes a la biblioteca para sincronizar los logros.

## Generador universal de guías (sin Supabase)

La ruta `/guias/APPID` funciona con **cualquier juego de la biblioteca que Steam exponga con logros accesibles**. No exige programar manualmente una guía por título.

### Datos automáticos y límites

1. La API de logros obtiene desbloqueos, imágenes, fechas y rarezas cuando Steam los proporciona.
2. El motor de `src/lib/universal-guide.ts` construye una ruta inicial con historia, secundarias, limpieza, dificultad, NG+, DLC, multijugador y una etapa por clasificar.
3. Solo se **sugieren** algunas clasificaciones cuando nombres o descripciones contienen términos explícitos. Estas sugerencias aparecen como *sin verificar*. Jamás se deduce automáticamente que un logro sea perdible.
4. En **Watch Dogs 2 (447040)** se reutiliza su clasificación específica y fuentes documentadas.
5. La API de contexto consulta metadatos públicos de la tienda (categorías y DLC asociados), cuando están disponibles. Esto no permite relacionar directamente un logro con un DLC.
6. Se facilitan enlaces a los logros oficiales, guías de la comunidad y tienda para comprobar requisitos. **Todavía no existe un proveedor automático de investigación web ni un modelo IA conectado** que lea esas guías.

### Personalización por juego y partida

- Estado de la historia, preferencia online, disponibilidad de NG+, DLC y dificultad.
- Reordenar las fases manualmente. Ese orden prevalece sobre las sugerencias.
- Para cada logro: cambiar fase, marcar prioridad, indicar perdible/dificultad/NG+/online/DLC como «sí/no/sin verificar», añadir notas y enlace de referencia.
- Checklist manual por fase, separado de los logros reales de Steam.
- Filtros de pendientes, ocultos y sin verificar, y botón para actualizar Steam.
- Almacenamiento por **SteamID y AppID** en el navegador. Exportar e importar ajustes específicos del juego en JSON.
- Se intentan migrar las preferencias del antiguo prototipo de Watch Dogs 2.

Se accede al generador desde cada ficha o desde el planificador. **La nueva guía no está automáticamente verificada u optimizada para cualquier juego**: la calidad mejora a medida que se confirman los requisitos.

### Portadas

**Se mantiene el sistema actual de portadas**: arte de Steam en diferentes formatos y una cubierta propia cuando no hay imagen adecuada. No se agregan imágenes arbitrarias de Internet ni se amplían iconos de baja calidad como carátulas; esa sería una regresión visual.

## Pendiente

- Validar visualmente la galería, los fallback y los logros con la biblioteca real.
- Integrar persistencia en Supabase más adelante (por ahora se usa el almacenamiento del navegador).
- Preparar publicación en Vercel cuando la experiencia local esté estable.
- Añadir fuentes contrastadas de requisitos para las guías personalizadas; existe un contrato inicial en \`src/lib/guide-schema.ts\`, sin guías generadas todavía.
