export interface Badge {
  key: string
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  category: 'predictions' | 'trivia' | 'chat' | 'consistency'
}

export const BADGES_CATALOG: Badge[] = [
  // --- PREDICTIONS CATEGORY (20) ---
  {
    key: 'first_prediction',
    name: 'Primer Paso',
    description: 'Haz tu primera predicción para un partido.',
    icon: '🔮',
    tier: 'bronze',
    category: 'predictions'
  },
  {
    key: 'ultimo_minuto',
    name: 'Al Filo del Silbato',
    description: 'Guarda una predicción a menos de 10 minutos del inicio del partido.',
    icon: '⚡',
    tier: 'bronze',
    category: 'predictions'
  },
  {
    key: 'perfect_match',
    name: 'Francotirador',
    description: 'Acierta tu primer marcador exacto (5 puntos).',
    icon: '🎯',
    tier: 'bronze',
    category: 'predictions'
  },
  {
    key: 'three_exact',
    name: 'Tridente Exacto',
    description: 'Acierta 3 marcadores exactos en total.',
    icon: '🔱',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'ten_exact',
    name: 'Ojo de Halcón',
    description: 'Acierta 10 marcadores exactos en total.',
    icon: '👁️',
    tier: 'gold',
    category: 'predictions'
  },
  {
    key: 'twenty_exact',
    name: 'El Oráculo',
    description: 'Acierta 20 marcadores exactos en total.',
    icon: '🔮',
    tier: 'platinum',
    category: 'predictions'
  },
  {
    key: 'half_predictions',
    name: 'Comprometido',
    description: 'Realiza predicciones para al menos la mitad de los partidos (52).',
    icon: '📅',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'all_predictions',
    name: 'Álbum Completo',
    description: 'Realiza predicciones para los 104 partidos de la Copa Mundial.',
    icon: '📖',
    tier: 'gold',
    category: 'predictions'
  },
  {
    key: 'group_stage_complete',
    name: 'Explorador de Grupos',
    description: 'Realiza predicciones para todos los partidos de la Fase de Grupos (72).',
    icon: '🗺️',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'knockout_stage_complete',
    name: 'Superviviente de Llaves',
    description: 'Realiza predicciones para todos los partidos de las rondas eliminatorias (32).',
    icon: '🚪',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'first_points',
    name: 'En el Marcador',
    description: 'Consigue tus primeros puntos en la tabla de la quiniela.',
    icon: '⚽',
    tier: 'bronze',
    category: 'predictions'
  },
  {
    key: 'points_50',
    name: 'Cincuenta Goles',
    description: 'Acumula 50 puntos en total con tus predicciones.',
    icon: '🥇',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'points_100',
    name: 'Centenario',
    description: 'Acumula 100 puntos en total con tus predicciones.',
    icon: '💯',
    tier: 'gold',
    category: 'predictions'
  },
  {
    key: 'points_200',
    name: 'Leyenda de las Canchas',
    description: 'Acumula 200 puntos en total con tus predicciones.',
    icon: '👑',
    tier: 'platinum',
    category: 'predictions'
  },
  {
    key: 'exact_draw',
    name: 'Tablas Perfectas',
    description: 'Acierta un empate exacto (por ejemplo: 2 - 2).',
    icon: '🤝',
    tier: 'bronze',
    category: 'predictions'
  },
  {
    key: 'high_scorer',
    name: 'Lluvia de Goles',
    description: 'Acierta un marcador exacto con 4 o más goles de un equipo.',
    icon: '🌧️',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'group_a_clean',
    name: 'Especialista Grupo A',
    description: 'Consigue puntos en todos los partidos correspondientes al Grupo A.',
    icon: '🅰️',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'comeback_king',
    name: 'Rey de las Remontadas',
    description: 'Acierta 3 resultados en partidos que tuvieron goles de ambos y remontadas.',
    icon: '🔄',
    tier: 'silver',
    category: 'predictions'
  },
  {
    key: 'nostradamus',
    name: 'El Nostradamus',
    description: 'Acierta 3 marcadores exactos de manera consecutiva.',
    icon: '🏆',
    tier: 'platinum',
    category: 'predictions'
  },
  {
    key: 'invicto',
    name: 'Invicto de la Fecha',
    description: 'Consigue puntos en todos los partidos finalizados de una jornada mundialista.',
    icon: '🔥',
    tier: 'gold',
    category: 'predictions'
  },

  // --- TRIVIA CATEGORY (15) ---
  {
    key: 'first_trivia',
    name: 'Mente Futbolera',
    description: 'Responde a tu primera trivia diaria.',
    icon: '🧠',
    tier: 'bronze',
    category: 'trivia'
  },
  {
    key: 'perfect_trivia',
    name: 'Cerebro de Oro',
    description: 'Responde correctamente una trivia diaria.',
    icon: '💡',
    tier: 'bronze',
    category: 'trivia'
  },
  {
    key: 'trivia_speed',
    name: 'Respuesta Relámpago',
    description: 'Responde correctamente una trivia diaria en 10 segundos o menos.',
    icon: '⏱️',
    tier: 'silver',
    category: 'trivia'
  },
  {
    key: 'trivia_lucky',
    name: 'Al Filo del Tiempo',
    description: 'Responde correctamente una trivia en los últimos segundos del tiempo límite.',
    icon: '🍀',
    tier: 'bronze',
    category: 'trivia'
  },
  {
    key: 'three_trivia_streak',
    name: 'Racha de Conocimiento',
    description: 'Responde correctamente 3 trivias consecutivas.',
    icon: '📈',
    tier: 'silver',
    category: 'trivia'
  },
  {
    key: 'seven_trivia_streak',
    name: 'Enciclopedia del Balón',
    description: 'Responde correctamente 7 trivias consecutivas.',
    icon: '📚',
    tier: 'gold',
    category: 'trivia'
  },
  {
    key: 'trivia_master',
    name: 'Catedrático Mundialista',
    description: 'Responde correctamente 15 trivias diarias en total.',
    icon: '🎓',
    tier: 'gold',
    category: 'trivia'
  },
  {
    key: 'trivia_half',
    name: 'Mitad de Carrera',
    description: 'Participa en al menos 15 trivias diarias en total.',
    icon: '📝',
    tier: 'silver',
    category: 'trivia'
  },
  {
    key: 'trivia_all',
    name: 'Erudito Absoluto',
    description: 'Completa todas las trivias diarias disponibles de la Quiniela.',
    icon: '🤯',
    tier: 'gold',
    category: 'trivia'
  },
  {
    key: 'trivia_night_owl',
    name: 'Lechuza del Saber',
    description: 'Responde una trivia diaria en la madrugada (11 PM - 4 AM).',
    icon: '🦉',
    tier: 'bronze',
    category: 'trivia'
  },
  {
    key: 'trivia_morning',
    name: 'Café y Fútbol',
    description: 'Responde una trivia diaria temprano por la mañana (antes de las 7 AM).',
    icon: '🌅',
    tier: 'bronze',
    category: 'trivia'
  },
  {
    key: 'trivia_genius',
    name: 'Sabio del Deporte',
    description: 'Acumula al menos 100 puntos en la sección de trivia diaria.',
    icon: '🧠',
    tier: 'silver',
    category: 'trivia'
  },
  {
    key: 'trivia_fanatic',
    name: 'Hábito Intelectual',
    description: 'Responde trivias diarias durante 5 días seguidos.',
    icon: '🔥',
    tier: 'silver',
    category: 'trivia'
  },
  {
    key: 'trivia_comeback',
    name: 'Fénix Mental',
    description: 'Acierta una trivia el día después de haber fallado la anterior.',
    icon: '🐦',
    tier: 'silver',
    category: 'trivia'
  },
  {
    key: 'trivia_perfect_score',
    name: 'Puntaje Perfecto',
    description: 'Obtén la puntuación máxima (10) en 5 trivias consecutivas.',
    icon: '⭐',
    tier: 'gold',
    category: 'trivia'
  },

  // --- CHAT CATEGORY (10) ---
  {
    key: 'first_comment',
    name: 'Primer Grito',
    description: 'Envía tu primer mensaje en cualquier sala de chat.',
    icon: '💬',
    tier: 'bronze',
    category: 'chat'
  },
  {
    key: 'ten_comments',
    name: 'Charlatán del Estadio',
    description: 'Escribe 10 comentarios en los chats de la Quiniela.',
    icon: '📣',
    tier: 'bronze',
    category: 'chat'
  },
  {
    key: 'fifty_comments',
    name: 'Portavoz de la Hinchada',
    description: 'Escribe 50 comentarios en los chats de la Quiniela.',
    icon: '🎤',
    tier: 'silver',
    category: 'chat'
  },
  {
    key: 'spammer',
    name: 'Megáfono Humano',
    description: 'Escribe 100 comentarios en total en los chats de la Quiniela.',
    icon: '📢',
    tier: 'gold',
    category: 'chat'
  },
  {
    key: 'first_gif',
    name: 'Reacción Animada',
    description: 'Envía tu primer GIF de Giphy en cualquiera de los chats.',
    icon: '🖼️',
    tier: 'bronze',
    category: 'chat'
  },
  {
    key: 'first_mention',
    name: 'Conexión Social',
    description: 'Menciona a otro usuario (`@usuario`) en el chat.',
    icon: '🏷️',
    tier: 'bronze',
    category: 'chat'
  },
  {
    key: 'lobby_chatter',
    name: 'Hablador del Lobby',
    description: 'Escribe al menos 5 mensajes en el canal #general.',
    icon: '🏢',
    tier: 'bronze',
    category: 'chat'
  },
  {
    key: 'match_chatter',
    name: 'Analista al Minuto',
    description: 'Envía tu primer comentario en el chat de un partido.',
    icon: '🎙️',
    tier: 'bronze',
    category: 'chat'
  },
  {
    key: 'five_chats',
    name: 'Red de Amigos',
    description: 'Chatea en 5 salas de chat de partidos distintos.',
    icon: '🌐',
    tier: 'silver',
    category: 'chat'
  },
  {
    key: 'friendly',
    name: 'Compañero de Tribuna',
    description: 'Recibe una mención de parte de otro usuario en el chat.',
    icon: '🤝',
    tier: 'bronze',
    category: 'chat'
  },

  // --- CONSISTENCY CATEGORY (5) ---
  {
    key: 'first_login',
    name: 'Bienvenido al Club',
    description: 'Inicia sesión por primera vez en la Quiniela.',
    icon: '🔑',
    tier: 'bronze',
    category: 'consistency'
  },
  {
    key: 'three_days_streak',
    name: 'Hinchada Fiel',
    description: 'Inicia sesión en la app durante 3 días consecutivos.',
    icon: '📅',
    tier: 'bronze',
    category: 'consistency'
  },
  {
    key: 'seven_days_streak',
    name: 'Asistencia Perfecta',
    description: 'Inicia sesión en la app durante 7 días consecutivos.',
    icon: '📆',
    tier: 'silver',
    category: 'consistency'
  },
  {
    key: 'fifteen_days_streak',
    name: 'Socio Vitalicio',
    description: 'Inicia sesión en la app durante 15 días consecutivos.',
    icon: '🎫',
    tier: 'gold',
    category: 'consistency'
  },
  {
    key: 'final_day_login',
    name: 'La Gran Cita',
    description: 'Inicia sesión el día de la gran final de la Copa Mundial (19 de Julio, 2026).',
    icon: '💎',
    tier: 'platinum',
    category: 'consistency'
  }
]
