# ⚽ Quiniela del Mundial 2026

Una aplicación moderna y premium para pronósticos y quinielas de la Copa Mundial de la FIFA 2026™, diseñada para disfrutar en familia y con amigos. La plataforma incluye una interfaz fluida con animaciones y efectos visuales, un sistema de autenticación seguro, cálculo automatizado de puntos, tablas de clasificación y herramientas administrativas completas.

---

## 🌟 Características Principales

*   **Página Principal y Dashboard:** Vista integral con resúmenes de rendimiento personal, rachas ganadoras y noticias del mundial.
*   **Gestión de Pronósticos interactiva:** Guarda y edita pronósticos de goles para cada partido.
    *   **Bloqueo de Seguridad:** Las predicciones se cierran automáticamente 1 hora antes del pitazo inicial para evitar trampas.
*   **Notificaciones en Tiempo Real (In-App & Rachas):**
    *   Suscripción dinámica a **Supabase Realtime** mediante un panel de campana interactivo.
    *   Generación automática de notificaciones al completarse cada partido, con desgloses detallados de puntuación por acierto exacto, ganador, empate o fallo.
    *   Alertas instantáneas al iniciar, mantener o romper rachas "On Fire" (multiplicador x1.5).
*   **Módulo de Trivia Diaria (Gamificación):**
    *   Responde una pregunta de fútbol al día para ganar **+2 puntos** adicionales.
    *   Protección de respuestas correctas mediante funciones RPC en la base de datos para evitar trampas antes de responder.
    *   Integración directa de los puntos de trivia en el Leaderboard General y el Leaderboard por Fases.
*   **Leaderboards Multi-Modo:**
    *   **Leaderboard General:** Clasificación general por puntos acumulados (quiniela + trivia).
    *   **Leaderboard por Fases:** Desglose del rendimiento en la Fase de Grupos y cada una de las fases de eliminación directa.
    *   **Head-to-Head (H2H):** Comparación directa cara a cara entre cualquier rival del torneo.
    *   **Exportación a PNG:** Genera y comparte la tabla de posiciones por fases como imagen PNG directamente a chats como WhatsApp usando la API de Web Share.
*   **Cálculo Automatizado y Propagación:**
    *   **Sistema de Puntuación Dinámico:** 5 puntos por marcador exacto, 3 puntos por acertar ganador/perdedor, 1 punto por empate no exacto.
    *   **Multiplicador de Racha ("On Fire"):** Si consigues puntos en 3 o más partidos consecutivos, tus puntos en el siguiente partido se multiplican por x1.5 (redondeado hacia arriba).
    *   **Propagación de Llaves:** Al finalizar la fase de grupos, la base de datos clasifica automáticamente a los mejores 1º, 2º y los 8 mejores 3º a la Ronda de 32, y propaga los ganadores en las rondas siguientes.
*   **Soporte PWA (Progressive Web App):**
    *   Configuración completa de manifesto e iconos de marca.
    *   Service Worker integrado para almacenamiento en caché y soporte offline.
    *   Instalable directamente en la pantalla de inicio en smartphones iOS y Android.
*   **Canal RSS de Resultados:**
    *   Feed RSS dinámico en la ruta `/rss` con caché de 10 minutos.
    *   Plantilla HTML enriquecida con banderas emojis, códigos de selecciones y detalles de los partidos jugados "hoy y ayer" ajustados a la hora de Costa Rica.
*   **Panel de Administración Avanzado:**
    *   **Sincronización:** Conexión con `api.football-data.org` para actualizar fixture y resultados reales.
    *   **Emulación y Datos Dummy:** Simula todo el mundial con un solo clic o genera usuarios de prueba con predicciones aleatorias.
    *   **Gráficos de Actividad:** Visualización de usuarios activos y logs de accesos diarios.
    *   **Correos Diarios:** Envío masivo de resultados del día a los correos de recuperación de los usuarios utilizando la API de **Resend**.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** [Next.js 16](https://nextjs.org/) (React 19) con TypeScript.
*   **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) con efectos personalizados de glassmorphism y transiciones fluidas.
*   **Base de Datos y Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL).
    *   **RLS (Row Level Security):** Políticas granulares para proteger los datos de cada usuario.
    *   **Procedimientos Almacenados (RPC) y Triggers:** Lógica en PL/pgSQL para procesamiento de puntos en tiempo real, control de bloqueos, sistema de notificaciones, lógica de trivia y propagación de llaves del torneo.
*   **Servicio de Correo:** [Resend](https://resend.com/) para notificaciones automatizadas.
*   **Utilidades:** `html-to-image` para la generación de PNGs de forma dinámica en el cliente.

---

## 📁 Estructura del Proyecto

El código está modularizado para garantizar mantenibilidad y escalabilidad:

```
├── app/
│   ├── api/
│   │   ├── football-data/        # Proxy para la API de Football Data
│   │   ├── news/                 # Fetch de noticias del torneo
│   │   ├── send-daily-results/   # Envío de emails con Resend (Solo Admin)
│   │   └── sync-matches/         # Sincronización de resultados de partidos
│   ├── login/                    # Pantalla de login y registro
│   ├── rss/                      # Generación de feed RSS dinámico para resultados
│   │   └── route.ts
│   ├── globals.css               # Estilos globales y tema visual premium
│   ├── layout.tsx                # Configuración de layout raíz y soporte PWA
│   └── page.tsx                  # Orquestador del Dashboard principal
├── components/                   # Componentes visuales autónomos
│   ├── AdminView.tsx             # Panel de administración, simulaciones y gráficas
│   ├── GroupsView.tsx            # Tablas de posiciones de los Grupos A al L
│   ├── H2HView.tsx               # Comparador cara a cara (Head-to-Head)
│   ├── MatchCard.tsx             # Tarjeta de partido y control de predicciones
│   ├── NotificationBell.tsx      # Campana de notificaciones en tiempo real
│   ├── PhasesView.tsx            # Clasificación desglosada por fases y exportación PNG
│   ├── ScheduleView.tsx          # Calendario de partidos día por día
│   ├── StatsView.tsx             # Estadísticas del usuario y cambio de clave
│   └── TriviaView.tsx            # Vista de la trivia diaria de fútbol
├── lib/                          # Funciones puras e integraciones externas
│   ├── getGroupStandings.ts      # Computa posiciones del grupo a partir de goles
│   ├── getUserRank.ts            # Calcula posición en tabla general
│   ├── groupsData.ts             # Datos estáticos de países y grupos
│   ├── supabase.ts               # Cliente del SDK de Supabase
│   ├── translations.ts           # Traducciones de nombres y fases
│   └── types.ts                  # Definiciones de tipos TypeScript comunes
├── public/                       # Elementos estáticos y manifiesto PWA
│   ├── icons/                    # Iconos de marca para móviles PWA
│   ├── manifest.json             # Manifiesto de PWA para instalación nativa
│   └── sw.js                     # Service worker para caché offline
└── supabase/                     # Scripts y Migraciones de la Base de Datos
    ├── quiniela_schema.sql       # Esquema de tablas, políticas RLS y triggers de puntos
    ├── setup_and_seed.sql        # Inicialización consolidada y fixture del Mundial
    ├── notifications_migration.sql # Esquema, políticas e triggers de notificaciones
    ├── trivia_migration.sql      # Preguntas, respuestas y triggers para el juego de trivia
    └── update_match_times.sql    # Corrección de horarios de partidos (Costa Rica)
```

---

## 🚀 Instalación y Configuración Local

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/tu-usuario/quiniela-del-mundial.git
cd quiniela-del-mundial
npm install
```

### 2. Configurar la Base de Datos en Supabase
1. Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2. Ve al **SQL Editor** en la consola de tu proyecto.
3. Copia y ejecuta en orden secuencial los contenidos de los siguientes scripts del directorio [`supabase/`](file:///Users/ezunigam/Documents/quiniela/quiniela-mundial/supabase):
    *   [`setup_and_seed.sql`](file:///Users/ezunigam/Documents/quiniela/quiniela-mundial/supabase/setup_and_seed.sql) (Esquema principal, fixture de 104 partidos y RPCs de simulación).
    *   [`update_match_times.sql`](file:///Users/ezunigam/Documents/quiniela/quiniela-mundial/supabase/update_match_times.sql) (Ajuste de tiempos y zonas horarias).
    *   [`notifications_migration.sql`](file:///Users/ezunigam/Documents/quiniela/quiniela-mundial/supabase/notifications_migration.sql) (Base del sistema de notificaciones).
    *   [`trivia_migration.sql`](file:///Users/ezunigam/Documents/quiniela/quiniela-mundial/supabase/trivia_migration.sql) (Esquema de trivia, RPCs y banco de preguntas).
4. **Habilitar Realtime para Notificaciones:** En el Dashboard de Supabase, navega a **Database** ➔ **Replication** ➔ bajo `supabase_realtime` activa el interruptor para la tabla `notifications`.

### 3. Crear el archivo de variables de entorno `.env.local`
Crea el archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```ini
# Variables públicas para Supabase (Cliente)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase

# Clave de servicio para operaciones de administración (Servidor)
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-supabase

# API Key de Resend para el envío de correos
RESEND_API_KEY=re_tu_api_key_de_resend
RESEND_FROM_EMAIL=Quiniela Mundial <onboarding@resend.dev>

# API Key para sincronizar partidos (Opcional - api.football-data.org)
FOOTBALL_DATA_API_KEY=tu_api_key_de_football_data
```

> [!WARNING]
> Nunca compartas ni subas tu archivo `.env.local` al repositorio de Git. Está excluido de forma predeterminada mediante `.gitignore`.

### 4. Iniciar la aplicación
Puedes utilizar el **Makefile** automatizado para gestionar el servidor de desarrollo:
```bash
# Iniciar Next.js en segundo plano en http://127.0.0.1:3000
make start

# Detener el servidor de desarrollo Next.js
make stop

# Detener el servidor y limpiar archivos temporales de compilación
make clean

# Limpieza total (incluye borrar node_modules)
make clean-all
```

---

## 👥 Administración y Pruebas

Para acceder a las funciones administrativas del sistema:
1. Crea un usuario en la plataforma con el correo **`admin@quiniela.local`**.
2. Con este usuario logueado, se te concederá acceso al botón **Modo Administrador** en el menú de usuario.
3. Desde allí podrás:
    *   Simular el transcurso del mundial y calcular puntos automáticamente.
    *   Crear usuarios simulados (`dummy_juan`, `dummy_sofia`, etc.) y rellenar sus predicciones para probar las tablas de posiciones.
    *   Enviar el correo diario a todos los usuarios registrados que tengan configurado un correo de recuperación en sus metadatos (`recovery_email`).

---

## 📱 Instalación PWA (Móviles)

Para disfrutar de la experiencia móvil nativa instalable:
*   **iOS (Safari):** Abre la aplicación en Safari, pulsa el botón **Compartir** (Share) y selecciona **Agregar a pantalla de inicio** (Add to Home Screen).
*   **Android (Chrome):** Abre la aplicación en Chrome, pulsa el banner de instalación automático o abre el menú (tres puntos) y selecciona **Instalar aplicación** (Install app).
