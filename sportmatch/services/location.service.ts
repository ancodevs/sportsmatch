import { supabase } from './supabase';
import { Country, Region, City } from '@/types';

class LocationService {
  // Obtener todos los países
  async getCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error al obtener países:', error);
      throw error;
    }

    return data || [];
  }

  // Obtener regiones por país
  async getRegionsByCountry(countryId: number): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('country_id', countryId)
      .order('name');

    if (error) {
      console.error('Error al obtener regiones:', error);
      throw error;
    }

    return data || [];
  }

  // Obtener ciudades por región
  async getCitiesByRegion(regionId: number): Promise<City[]> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('region_id', regionId)
      .order('name');

    if (error) {
      console.error('Error al obtener ciudades:', error);
      throw error;
    }

    return data || [];
  }

  // Obtener país por ID
  async getCountry(countryId: number): Promise<Country | null> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', countryId)
      .single();

    if (error) {
      console.error('Error al obtener país:', error);
      return null;
    }

    return data;
  }

  // Obtener región por ID
  async getRegion(regionId: number): Promise<Region | null> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('id', regionId)
      .single();

    if (error) {
      console.error('Error al obtener región:', error);
      return null;
    }

    return data;
  }

  // Obtener ciudad por ID
  async getCity(cityId: number): Promise<City | null> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .single();

    if (error) {
      console.error('Error al obtener ciudad:', error);
      return null;
    }

    return data;
  }

  // Obtener ubicación completa del usuario
  async getUserLocation(user: { country_id?: number; region_id?: number; city_id?: number }) {
    const location = {
      country: null as Country | null,
      region: null as Region | null,
      city: null as City | null,
    };

    if (user.country_id) {
      location.country = await this.getCountry(user.country_id);
    }

    if (user.region_id) {
      location.region = await this.getRegion(user.region_id);
    }

    if (user.city_id) {
      location.city = await this.getCity(user.city_id);
    }

    return location;
  }
}

export const locationService = new LocationService();
