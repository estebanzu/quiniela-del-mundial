# ⚽ Quiniela del Mundial 2026

Una aplicación moderna y premium para pronósticos y quinielas de la Copa Mundial de la FIFA 2026™, diseñada para disfrutar en familia y con amigos. La plataforma incluye una interfaz fluida con animaciones y efectos visuales, un sistema de autenticación seguro, cálculo automatizado de puntos, tablas de clasificación y herramientas administrativas completas.

---

## 🌟 Características Principales

*   **Página Principal y Dashboard:** Vista integral con resúmenes de rendimiento personal, rachas ganadoras y noticias del mundial.
*   **Gestión de Pronósticos interactiva:** Guarda y edita pronósticos de goles para cada partido.
    *   **Bloqueo de Seguridad:** Las predicciones se cierran automáticamente 1 hora antes del pitazo inicial para evitar trampas.
*   **Leaderboards Multi-Modo:**
    *   **Leaderboard General:** Clasificación general por puntos acumulados.
    *   **Leaderboard por Fases:** Desglose del rendimiento en la Fase de Grupos y cada una de las fases de eliminación directa.
    *   **Head-to-Head (H2H):** Comparación directa cara a cara entre cualquier rival del torneo.
*   **Cálculo Automatizado y Propagación:**
    *   **Sistema de Puntuación Dinámico:** 5 puntos por marcador exacto, 3 puntos por acertar ganador/perdedor, 1 punto por empate no exacto.
    *   **Multiplicador de Racha ("On Fire"):** Si consigues puntos en 3 o más partidos consecutivos, tus puntos en el siguiente partido se multiplican por x1.5 (redondeado hacia arriba).
    *   **Propagación de Llaves:** Al finalizar la fase de grupos, la base de datos clasifica automáticamente a los mejores 1º, 2º y los 8 mejores 3º a la Ronda de 32, y propaga los ganadores en las rondas siguientes.
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
    *   **RLS (Row Level Security):** Políticas granulares para proteger los pronósticos de cada usuario.
    *   **Procedimientos Almacenados (RPC):** Triggers en PL/pgSQL para procesamiento en tiempo real y propagación de llaves del torneo.
*   **Servicio de Correo:** [Resend](https://resend.com/) para notificaciones automatizadas.

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
│   ├── globals.css               # Estilos globales y tema visual premium
│   ├── layout.tsx                # Configuración de layout raíz
│   └── page.tsx                  # Orquestador del Dashboard principal
├── components/                   # Componentes visuales autónomos
│   ├── AdminView.tsx             # Panel de administración, simulaciones y gráficas
│   ├── GroupsView.tsx            # Tablas de posiciones de los Grupos A al L
│   ├── H2HView.tsx               # Comparador cara a cara (Head-to-Head)
│   ├── MatchCard.tsx             # Tarjeta de partido y control de predicciones
│   ├── PhasesView.tsx            # Clasificación desglosada por fases de torneo
│   ├── ScheduleView.tsx          # Calendario de partidos día por día
│   └── StatsView.tsx             # Estadísticas del usuario y cambio de clave
├── lib/                          # Funciones puras e integraciones externas
│   ├── getGroupStandings.ts      # Computa posiciones del grupo a partir de goles
│   ├── getUserRank.ts            # Calcula posición en tabla general
│   ├── groupsData.ts             # Datos estáticos de países y grupos
│   ├── supabase.ts               # Cliente del SDK de Supabase
│   ├── translations.ts           # Traducciones de nombres y fases
│   └── types.ts                  # Definiciones de tipos TypeScript comunes
└── supabase/                     # Scripts de la Base de Datos
    ├── quiniela_schema.sql       # Esquema de tablas, políticas RLS y triggers de puntos
    └── setup_and_seed.sql        # Inicialización consolidada y fixture del Mundial
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
3. Copia y ejecuta el contenido del script [`supabase/setup_and_seed.sql`](file:///c:/Users/marci/Documents/quiniela-del-mundial/supabase/setup_and_seed.sql). Esto creará:
    *   La tabla `matches` poblada con los 104 partidos del Mundial 2026.
    *   La tabla `predictions` y `user_logins`.
    *   Políticas RLS y Triggers para puntuaciones, bloqueos de tiempo y avance de llaves.
    *   Funciones RPC para la administración.

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

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación corriendo.

---

## 👥 Administración y Pruebas

Para acceder a las funciones administrativas del sistema:
1. Crea un usuario en la plataforma con el correo **`admin@quiniela.local`**.
2. Con este usuario logueado, se te concederá acceso al botón **Modo Administrador** en el menú de usuario.
3. Desde allí podrás:
    *   Simular el transcurso del mundial y calcular puntos automáticamente.
    *   Crear usuarios simulados (`dummy_juan`, `dummy_sofia`, etc.) y rellenar sus predicciones para probar las tablas.
    *   Enviar el correo diario a todos los usuarios registrados que tengan configurado un correo de recuperación en sus metadatos (`recovery_email`).
