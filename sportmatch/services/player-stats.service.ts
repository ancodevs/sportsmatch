import { supabase } from './supabase';
import { PlayerStats } from '@/types';

class PlayerStatsService {
  // Obtener estadísticas de un jugador
  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error) {
      console.error('Error al obtener estadísticas:', error);
      return null;
    }

    return data;
  }

  // Actualizar estadísticas
  async updateStats(playerId: string, updates: Partial<PlayerStats>) {
    const { data, error } = await supabase
      .from('player_stats')
      .update(updates)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Incrementar contador de partidos
  async incrementMatches(playerId: string, result: 'win' | 'loss' | 'draw') {
    const stats = await this.getPlayerStats(playerId);
    if (!stats) throw new Error('No se encontraron estadísticas');

    const updates: any = {
      total_matches: stats.total_matches + 1,
    };

    switch (result) {
      case 'win':
        updates.wins = stats.wins + 1;
        break;
      case 'loss':
        updates.losses = stats.losses + 1;
        break;
      case 'draw':
        updates.draws = stats.draws + 1;
        break;
    }

    return this.updateStats(playerId, updates);
  }

  // Incrementar contador MVP
  async incrementMVP(playerId: string) {
    const stats = await this.getPlayerStats(playerId);
    if (!stats) throw new Error('No se encontraron estadísticas');

    return this.updateStats(playerId, {
      mvp_count: stats.mvp_count + 1,
    });
  }

  // Incrementar contador de posición
  async incrementPosition(
    playerId: string,
    position: 'gk' | 'df' | 'mf' | 'fw'
  ) {
    const stats = await this.getPlayerStats(playerId);
    if (!stats) throw new Error('No se encontraron estadísticas');

    const positionKey = `${position}_count` as keyof PlayerStats;
    const currentValue = stats[positionKey] as number;

    return this.updateStats(playerId, {
      [positionKey]: currentValue + 1,
    });
  }

  // Calcular nivel basado en experiencia
  calculateLevel(totalMatches: number): number {
    // Fórmula simple: nivel = raíz cuadrada de (partidos / 10) + 1
    return Math.floor(Math.sqrt(totalMatches / 10)) + 1;
  }

  // Actualizar nivel del jugador
  async updateLevel(playerId: string) {
    const stats = await this.getPlayerStats(playerId);
    if (!stats) throw new Error('No se encontraron estadísticas');

    const newLevel = this.calculateLevel(stats.total_matches);

    if (newLevel !== stats.current_level) {
      return this.updateStats(playerId, {
        current_level: newLevel,
      });
    }

    return stats;
  }

  // Calcular porcentaje de victorias
  calculateWinRate(stats: PlayerStats): number {
    if (stats.total_matches === 0) return 0;
    return (stats.wins / stats.total_matches) * 100;
  }

  // Obtener posición favorita
  getFavoritePosition(stats: PlayerStats): string {
    const positions = [
      { name: 'Portero', count: stats.gk_count, key: 'GK' },
      { name: 'Defensa', count: stats.df_count, key: 'DF' },
      { name: 'Mediocampo', count: stats.mf_count, key: 'MF' },
      { name: 'Delantero', count: stats.fw_count, key: 'FW' },
    ];

    const favorite = positions.reduce((prev, current) =>
      current.count > prev.count ? current : prev
    );

    return favorite.count > 0 ? favorite.name : 'Sin posición favorita';
  }

  // Obtener estadísticas formateadas para mostrar
  getFormattedStats(stats: PlayerStats) {
    return {
      ...stats,
      winRate: this.calculateWinRate(stats).toFixed(1) + '%',
      favoritePosition: this.getFavoritePosition(stats),
      level: stats.current_level,
    };
  }
}

export const playerStatsService = new PlayerStatsService();
