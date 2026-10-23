# Platinum Vault

Plataforma para reunir la biblioteca de Steam y exhibir los juegos completados al 100 % como un museo digital.

## Tecnologías

- Next.js 16 (App Router), React y TypeScript.
- Tailwind CSS 4 y CSS personalizado para una identidad visual editorial.
- Motion para transiciones de páginas y apariciones.
- Lucide para iconografía.
- Steam OpenID 2.0 y Steam Web API para identificación, biblioteca y logros.
- Supabase / PostgreSQL, preparados para persistencia en las próximas iteraciones.

## Estado del prototipo

El sitio tiene tres vistas: inicio, biblioteca y museo. Sin una sesión válida utiliza una colección **ficticia de demostración**, claramente identificada. No corresponde a una cuenta real.

Con una sesión de Steam, obtiene la biblioteca visible y consulta automáticamente los logros por grupos de ocho juegos, con concurrencia limitada y barra de progreso. La biblioteca puede ordenarse por última actividad, orden alfabético, horas jugadas o progreso. La colección del museo se forma únicamente con juegos cuyo total de logros se haya podido comprobar. Puedes pausar la consulta o repetirla si algún juego no se actualizó.

**Limitaciones actuales:** la sincronización de logros no se guarda todavía en Supabase; se conserva temporalmente en este navegador durante 12 horas; no hay base de datos activa, estadísticas históricas persistentes, guías ni recomendador. La fecha del último logro se usa como aproximación de la finalización del 100 %, no como certificación histórica del platino.

## Configuración local

1. Instalar dependencias mediante `npm install`.
2. Copiar `.env.example` a `.env.local`.
3. Configurar:
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - `STEAM_API_KEY`: clave Web API del propietario del sitio.
   - `STEAM_SESSION_SECRET`: secreto aleatorio de **al menos 32 caracteres**, exclusivo del proyecto.
4. Ejecutar `npm run dev`.
5. Abrir `http://localhost:3000`.

Las variables de Supabase están documentadas, pero no son necesarias para este prototipo. No subir claves privadas ni `.env.local` al repositorio.

Steam requiere que la información del perfil y los detalles de juegos estén disponibles para la consulta. Si la API no puede obtener los datos, la interfaz mostrará un mensaje y regresará a la demostración.

Para comprobar el código: `npm run lint` y `npm run build`.

## Alcance

**Etapa 1:** vinculación con Steam, lectura de biblioteca y logros consultados bajo demanda.

**Etapa 2:** exposición visual de completados al 100 %, fichas y navegación entre colecciones.

Próximos pasos: persistir datos en Supabase, guardar instantáneas verificables, mejorar la sincronización y desarrollar las guías personalizadas.
