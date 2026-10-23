# Platinum Vault

Plataforma personal conectada a Steam para explorar una biblioteca, consultar sus logros y exhibir juegos completados al 100 % como un museo interactivo.

## Tecnologías

Next.js 16 (App Router), React, TypeScript, Tailwind CSS 4, CSS, Motion, Lucide y Steam Web API. La integración de Supabase/PostgreSQL se reserva para una fase posterior.

## Funcionamiento

- Inicio de sesión mediante Steam OpenID 2.0.
- Biblioteca real de Steam con horas jugadas, búsqueda, ordenamiento y progreso.
- Sincronización progresiva de logros por lotes, con pausa, avance y almacenamiento temporal en el navegador.
- Arte del juego con varias rutas de la CDN de Steam. Si falta la portada, intenta otros formatos y el icono del juego; si no hay arte oficial, utiliza una cubierta de reemplazo.
- **Ficha individual** en `/juegos/APPID`: progreso, insignias, nombres, descripciones, desbloqueados/pendientes, fechas y rareza global cuando Steam la proporciona.
- **Museo interactivo**: exposición destacada con navegación, galería, cronología, búsqueda, orden y selección de obras favoritas.
- Las favoritas del museo se guardan únicamente en este navegador, separadas por SteamID.

Las fechas de finalización corresponden al **último logro registrado** cuando está disponible; Steam no siempre permite reconstruir la primera vez que un juego se completó al 100 %.

## Configuración local

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env.local`.
3. Configura `NEXT_PUBLIC_APP_URL=http://localhost:3000`, tu `STEAM_API_KEY` y un `STEAM_SESSION_SECRET` aleatorio de al menos 32 caracteres.
4. Ejecuta `npm run dev` y abre `http://localhost:3000`.

Nunca subas `.env.local` ni expongas las claves. La cuenta de Steam debe permitir acceder a los detalles de los juegos para que funcione la biblioteca.

## Comprobaciones

```bash
npm run lint
npm run build
```

## Limitaciones conocidas

- Algunas aplicaciones, herramientas y juegos de Steam no disponen de arte o logros públicos. No se inventa información para rellenar esas ausencias.
- La consulta de logros y sus porcentajes depende de Steam y de la privacidad del perfil. Las llamadas pueden fallar o ser limitadas.
- Las fichas de la demostración no muestran logros ficticios: para obtener los logros auténticos hay que iniciar sesión.
- Todavía no hay base de datos persistente, perfiles públicos ni guías personalizadas. Tampoco se ha desplegado a Vercel.
- Las imágenes de Steam pueden cambiar o desaparecer de sus servidores.

## Próximas etapas

Validar en la cuenta real las fichas y la colección, introducir Supabase para persistencia y preparar el despliegue. Después se desarrollará el motor de guías personalizadas.
