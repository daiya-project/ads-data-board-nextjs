import { Database as FullDatabase } from './database.types';

export type AdsOnlyDatabase = {
  public: {
    Tables: {
      [K in keyof FullDatabase['public']['Tables'] as K extends `ads_data_${string}` | `shared_${string}` ? K : never]: FullDatabase['public']['Tables'][K]
    }
  }
};
