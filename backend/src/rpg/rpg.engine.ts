import { Injectable } from '@nestjs/common';

export interface LevelResult {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  leveledUp: boolean;
}

@Injectable()
export class RpgEngine {
  getXpRequiredForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  calculateLevel(
    totalXp: number,
    previousLevel = 1,
  ): LevelResult {
    let level = 1;

    while (
      totalXp >=
      this.getXpRequiredForLevel(level)
    ) {
      level++;
    }

    const previousLevelXp =
      level === 1
        ? 0
        : this.getXpRequiredForLevel(level - 1);

    const nextLevelXp =
      this.getXpRequiredForLevel(level);

    return {
      level,
      xpIntoLevel:
        totalXp - previousLevelXp,
      xpForNextLevel:
        nextLevelXp - previousLevelXp,
      leveledUp:
        level > previousLevel,
    };
  }

  getDifficultyReward(
    difficulty: string,
  ) {
    const rewards = {
      EASY: {
        xp: 25,
        gold: 5,
      },
      MEDIUM: {
        xp: 50,
        gold: 10,
      },
      HARD: {
        xp: 100,
        gold: 20,
      },
      EPIC: {
        xp: 200,
        gold: 40,
      },
    };

    return (
      rewards[
        difficulty as keyof typeof rewards
      ] ?? rewards.EASY
    );
  }
}