'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import AppShell from '../../src/components/layout/AppShell';
import { getAuth } from 'firebase/auth';
import { app } from '../../src/lib/firebase';

interface UserData {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Character {
  id: string;
  level: number;
  total_xp: number;
  gold: number;
  strength: number;
  intellect: number;
  discipline: number;
  creativity: number;
  current_streak: number;
  longest_streak: number;
}

interface MeResponse {
  user: UserData;
  character: Character;
}

interface InventoryItem {
  id: string;
  user_id: string;
  item_id: string;
  is_equipped: boolean;
  purchased_at: string;

  name?: string;
  description?: string | null;
  type?: 'ITEM' | 'THEME' | 'BADGE';
  price?: number;
  image_url?: string | null;

  metadata?: {
    icon?: string;
    rarity?: string;
    effect?: string;
    auraStyle?: string;
    auraColor?: string;
    animation?: string;
    themeStyle?: string;
    badgeStyle?: string;
    badgeColor?: string;
  };
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  type: 'ITEM' | 'THEME' | 'BADGE';
  price: number;
  image_url?: string | null;

  metadata?: {
    icon?: string;
    rarity?: string;
    effect?: string;
    auraStyle?: string;
    auraColor?: string;
    animation?: string;
    themeStyle?: string;
    primaryColor?: string;
    secondaryColor?: string;
    badgeStyle?: string;
    badgeColor?: string;
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

function xpForLevel(level: number) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export default function CharacterPage() {
  const [data, setData] =
    useState<MeResponse | null>(null);

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [shopItems, setShopItems] =
    useState<ShopItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadCharacter() {
      try {
        const user =
          getAuth(app).currentUser;

        if (!user) {
          window.location.href = '/login';
          return;
        }

        const token =
          await user.getIdToken();

        const [characterResponse, inventoryResponse, rewardsResponse] =
          await Promise.all([
            fetch(`${API_URL}/users/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),

            fetch(`${API_URL}/inventory`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),

            fetch(`${API_URL}/rewards`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          ]);

        if (!characterResponse.ok) {
          throw new Error(
            'Failed to load character',
          );
        }

        if (!inventoryResponse.ok) {
          throw new Error(
            'Failed to load inventory',
          );
        }

        if (!rewardsResponse.ok) {
          throw new Error(
            'Failed to load reward items',
          );
        }

        const characterResult =
          await characterResponse.json();

        const inventoryResult =
          await inventoryResponse.json();

        const rewardsResult =
          await rewardsResponse.json();

        setData(characterResult);

        setInventory(
          Array.isArray(inventoryResult)
            ? inventoryResult
            : inventoryResult.inventory ?? [],
        );

        setShopItems(
          Array.isArray(rewardsResult)
            ? rewardsResult
            : rewardsResult.rewards ?? [],
        );

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadCharacter();
  }, []);

  async function handleEquip(itemId: string) {
    try {
      const user = getAuth(app).currentUser;

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/inventory/${itemId}/equip`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Failed to equip item',
        );
      }

      // Reload inventory from backend
      const inventoryResponse = await fetch(
        `${API_URL}/inventory`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!inventoryResponse.ok) {
        throw new Error(
          'Failed to refresh inventory',
        );
      }

      const inventoryResult =
        await inventoryResponse.json();

      setInventory(
        Array.isArray(inventoryResult)
          ? inventoryResult
          : inventoryResult.inventory ?? [],
      );

    } catch (error) {
      console.error('Equip error:', error);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050509] text-white">
        <div className="animate-pulse text-sm tracking-[0.3em] text-cyan-400">
          LOADING HERO...
        </div>
      </main>
    );
  }

  if (!data?.character) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050509] text-white">
        Character unavailable.
      </main>
    );
  }

  const { character, user } = data;

  const ownedItemIds = new Set(
    inventory.map((item) => item.item_id),
  );

  const ownedItems = shopItems.filter((item) =>
    ownedItemIds.has(item.id),
  );

  const equippedItems = inventory.filter(
    (item) => item.is_equipped,
  );

  const equippedAura = equippedItems.find(
    (item) =>
      item.metadata?.effect === 'AURA',
  );

  const equippedTheme = equippedItems.find(
    (item) =>
      item.metadata?.effect === 'THEME',
  );

  const equippedBadges = equippedItems.filter(
    (item) =>
      item.metadata?.effect === 'BADGE',
  );

  const equippedRegularItem = equippedItems.find(
    (item) =>
      item.metadata?.effect === 'ITEM',
  );

  const themeStyles = getThemeStyles(
    equippedTheme?.metadata?.themeStyle,
  );

  const previousLevelXp =
    character.level <= 1
      ? 0
      : xpForLevel(character.level - 1);

  const nextLevelXp =
    xpForLevel(character.level);

  const levelXp =
    nextLevelXp - previousLevelXp;

  const currentLevelProgress =
    character.total_xp -
    previousLevelXp;

  const progress = Math.min(
    100,
    Math.max(
      0,
      (currentLevelProgress /
        levelXp) *
      100,
    ),
  );

  return (
    <AppShell
      gold={character.gold}
      streak={character.current_streak}
    >
      <main className="min-h-screen bg-[#050509] px-4 py-6 pb-28 text-white sm:px-6 lg:px-10">

        <div className="mx-auto max-w-6xl">

          {/* HEADER */}
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.3em] text-cyan-400">
              HERO PROFILE
            </p>

            <h1 className="mt-2 text-4xl font-black sm:text-5xl">
              CHARACTER
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Your real-life progression, visualized.
            </p>
          </div>

          {/* HERO */}
          <section
            className={`grid gap-6 lg:grid-cols-[1.1fr_1.9fr]`}
          >

            <div
              className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-7 transition-all duration-700 ${themeStyles.border} ${themeStyles.background} ${themeStyles.glow}`}
            >

              <div className="absolute right-5 top-5 text-[10px] font-bold tracking-[0.3em] text-cyan-400">
                HERO
              </div>

              <div className="flex flex-col items-center text-center">

                {equippedBadges.length > 0 && (
                  <div className="mb-5 flex flex-wrap justify-center gap-2">
                    {equippedBadges.map((badge) => (
                      <motion.div
                        key={badge.id}
                        initial={{
                          opacity: 0,
                          y: -10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.10)]"
                      >
                        {badge.metadata?.icon || '🏆'}{' '}
                        {badge.name}
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="relative flex h-48 w-48 items-center justify-center">

                  {/* AURA EFFECT */}
                  {equippedAura && (
                    <>
                      <motion.div
                        className="absolute inset-[-15px] rounded-full border border-cyan-400/20"
                        animate={{
                          scale: [1, 1.12, 1],
                          opacity: [0.15, 0.5, 0.15],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />

                      <motion.div
                        className="absolute inset-[-30px] rounded-full bg-cyan-400/10 blur-3xl"
                        animate={{
                          scale: [0.9, 1.15, 0.9],
                          opacity: [0.15, 0.4, 0.15],
                        }}
                        transition={{
                          duration: 3.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />

                      <motion.div
                        className="absolute inset-[-8px] rounded-full border border-cyan-300/30"
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </>
                  )}

                  {/* CHARACTER */}
                  <motion.div
                    className="relative z-10 flex h-32 w-32 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-400/10 text-6xl"
                    animate={{
                      y: [0, -6, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    🧙
                  </motion.div>

                  {equippedRegularItem && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        x: 20,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      className="absolute bottom-0 right-0 z-20 rounded-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur"
                    >
                      <span className="text-lg">
                        {equippedRegularItem.metadata?.icon || '⚔️'}
                      </span>

                      <span className="ml-2 text-[10px] font-bold text-gray-300">
                        {equippedRegularItem.name}
                      </span>
                    </motion.div>
                  )}

                </div>

                {equippedTheme && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`mt-4 text-xs font-black uppercase tracking-[0.3em] ${themeStyles.accent}`}
                  >
                    {equippedTheme.name}
                  </motion.div>
                )}

                <p className="mt-6 text-xs tracking-[0.3em] text-gray-500">
                  LEVEL {character.level}
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  {user.display_name ||
                    'Unknown Hero'}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {user.email}
                </p>

                <div className="mt-7 w-full">

                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-gray-500">
                      EXPERIENCE
                    </span>

                    <span className="text-cyan-400">
                      {currentLevelProgress} /{' '}
                      {levelXp} XP
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-black/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-right text-xs text-gray-600">
                    {character.total_xp} total XP
                  </p>

                </div>
              </div>
            </div>

            {/* ATTRIBUTES */}
            <div className="grid grid-cols-2 gap-4">

              <StatCard
                icon="⚔️"
                name="STRENGTH"
                value={character.strength}
                description="Physical power"
              />

              <StatCard
                icon="🧠"
                name="INTELLECT"
                value={character.intellect}
                description="Learning & knowledge"
              />

              <StatCard
                icon="🎯"
                name="DISCIPLINE"
                value={character.discipline}
                description="Consistency"
              />

              <StatCard
                icon="🎨"
                name="CREATIVITY"
                value={character.creativity}
                description="Ideas & creation"
              />

            </div>
          </section>

          {/* PROGRESSION */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6">

            <div className="mb-6">
              <p className="text-xs tracking-[0.25em] text-cyan-400">
                PROGRESSION
              </p>

              <h2 className="mt-1 text-2xl font-black">
                ADVENTURE STATS
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              <ProgressStat
                icon="🔥"
                label="CURRENT STREAK"
                value={`${character.current_streak} days`}
              />

              <ProgressStat
                icon="🏆"
                label="LONGEST STREAK"
                value={`${character.longest_streak} days`}
              />

              <ProgressStat
                icon="⚡"
                label="TOTAL XP"
                value={character.total_xp.toString()}
              />

            </div>
          </section>

          {/* YOUR COLLECTION */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6">

            <div className="mb-6">
              <p className="text-xs tracking-[0.25em] text-cyan-400">
                INVENTORY
              </p>

              <h2 className="mt-1 text-2xl font-black">
                YOUR COLLECTION
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Equip your rewards and customize your character.
              </p>
            </div>

            {ownedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <div className="text-4xl">
                  🎒
                </div>

                <p className="mt-3 text-sm font-bold text-gray-400">
                  INVENTORY EMPTY
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  Visit the Reward Shop to unlock your first item.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {ownedItems.map((item) => {

                  const inventoryItem =
                    inventory.find(
                      (inventoryItem) =>
                        inventoryItem.item_id === item.id,
                    );

                  const equipped =
                    inventoryItem?.is_equipped ?? false;

                  const icon =
                    item.type === 'THEME'
                      ? '🎨'
                      : item.type === 'BADGE'
                        ? '🏆'
                        : '⚔️';

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 transition ${equipped
                        ? 'border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.08)]'
                        : 'border-white/10 bg-black/20 hover:border-cyan-400/20'
                        }`}
                    >

                      <div className="flex items-start justify-between">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-2xl">
                          {icon}
                        </div>

                        {equipped && (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-black tracking-wider text-cyan-400">
                            ✓ EQUIPPED
                          </span>
                        )}

                      </div>

                      <h3 className="mt-4 font-black text-white">
                        {item.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.description ||
                          'A mysterious reward.'}
                      </p>

                      <div className="mt-4 flex items-center justify-between">

                        <span className="text-[10px] font-bold tracking-wider text-gray-600">
                          {item.type}
                        </span>

                        {equipped ? (
                          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-400">
                            ✓ EQUIPPED
                          </div>
                        ) : (
                          inventoryItem && (
                            <button
                              onClick={() =>
                                handleEquip(item.id)
                              }
                              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-400 transition hover:bg-cyan-400/20"
                            >
                              EQUIP
                            </button>
                          )
                        )}

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </section>

        </div>
      </main>
    </AppShell>
  );
}

function StatCard({
  icon,
  name,
  value,
  description,
}: {
  icon: string;
  name: string;
  value: number;
  description: string;
}) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:-translate-y-1 hover:border-cyan-400/20">

      <div className="flex items-start justify-between">
        <span className="text-3xl">
          {icon}
        </span>

        <span className="text-4xl font-black">
          {value}
        </span>
      </div>

      <p className="mt-8 text-xs font-black tracking-[0.2em] text-gray-300">
        {name}
      </p>

      <p className="mt-1 text-xs text-gray-600">
        {description}
      </p>

    </div>
  );
}

function ProgressStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <span className="text-2xl">
        {icon}
      </span>

      <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-gray-600">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function getThemeStyles(
  themeStyle?: string,
) {
  switch (themeStyle) {
    case 'cyber-knight':
      return {
        background:
          'from-cyan-400/10 via-purple-500/5 to-blue-500/10',
        border:
          'border-cyan-400/30',
        glow:
          'shadow-[0_0_60px_rgba(34,211,238,0.12)]',
        accent:
          'text-cyan-400',
      };

    case 'void-walker':
      return {
        background:
          'from-purple-950/40 via-black to-indigo-950/30',
        border:
          'border-purple-500/30',
        glow:
          'shadow-[0_0_70px_rgba(139,92,246,0.15)]',
        accent:
          'text-purple-400',
      };

    default:
      return {
        background:
          'from-cyan-400/10 via-white/[0.02] to-purple-500/10',
        border:
          'border-cyan-400/20',
        glow:
          'shadow-[0_0_60px_rgba(34,211,238,0.10)]',
        accent:
          'text-cyan-400',
      };
  }
}