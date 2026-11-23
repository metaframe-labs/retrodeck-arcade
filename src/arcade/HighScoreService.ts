import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@retrodeck8_high_scores_v1';

type HighScoreMap = Record<string, number>;

class HighScoreManager {
  private cache: HighScoreMap = {};
  private isLoaded = false;
  private listeners = new Set<(scores: HighScoreMap) => void>();

  constructor() {
    this.loadFromStorage();
  }

  public async loadFromStorage(): Promise<HighScoreMap> {
    if (this.isLoaded) return this.cache;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.cache = { ...this.cache, ...parsed };
        }
      }
    } catch {
      // Fallback: storage unavailable, use memory cache
    } finally {
      this.isLoaded = true;
      this.notifyListeners();
    }
    return this.cache;
  }

  public getHighScore(cartId: string): number {
    return this.cache[cartId] || 0;
  }

  public async recordScore(cartId: string, score: number): Promise<boolean> {
    const currentBest = this.cache[cartId] || 0;
    if (score > currentBest) {
      this.cache[cartId] = score;
      this.notifyListeners();

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
      } catch {
        // Silently preserve in memory cache
      }
      return true;
    }
    return false;
  }

  public getAllScores(): HighScoreMap {
    return { ...this.cache };
  }

  public subscribe(cb: (scores: HighScoreMap) => void): () => void {
    this.listeners.add(cb);
    cb(this.getAllScores());
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(): void {
    const copy = this.getAllScores();
    this.listeners.forEach((cb) => cb(copy));
  }
}

export const HighScoreService = new HighScoreManager();
