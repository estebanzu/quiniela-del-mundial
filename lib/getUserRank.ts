export function getUserRank(points: number): { label: string; icon: string } {
  if (points >= 150) return { label: 'El Patrón', icon: '👑' }
  if (points >= 50) return { label: 'Zorro Viejo', icon: '🦊' }
  if (points >= 20) return { label: 'Mejenguero', icon: '👟' }
  return { label: 'Bateador', icon: '⚾' }
}
