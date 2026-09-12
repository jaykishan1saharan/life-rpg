'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';

import AppShell from '../../src/components/layout/AppShell';
import { app } from '../../src/lib/firebase';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  type: 'ITEM' | 'THEME' | 'BADGE';
  price: number;
  image_url: string | null;
  metadata: {
    rarity?: string;
    icon?: string;
  } | null;
}

interface Character {
  gold: number;
  current_streak: number;
}

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

export default function ShopPage() {
  const [rewards, setRewards] =
    useState<Reward[]>([]);

  const [gold, setGold] =
    useState(0);

  const [streak, setStreak] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [buying, setBuying] =
    useState<string | null>(null);

  async function token() {
    const user =
      getAuth(app).currentUser;

    if (!user) {
      throw new Error('Please login again.');
    }

    return user.getIdToken();
  }

  async function load() {
    const authToken = await token();

    const [rewardsResponse, meResponse] =
      await Promise.all([
        fetch(`${API}/rewards`, {
          headers: {
            Authorization:
              `Bearer ${authToken}`,
          },
        }),

        fetch(`${API}/users/me`, {
          headers: {
            Authorization:
              `Bearer ${authToken}`,
          },
        }),
      ]);

    if (!rewardsResponse.ok) {
      throw new Error(
        'Failed to load rewards',
      );
    }

    const rewardData =
      await rewardsResponse.json();

    const meData =
      await meResponse.json();

    setRewards(rewardData);
    setGold(meData.character.gold);
    setStreak(
      meData.character.current_streak,
    );
  }

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() =>
        setLoading(false),
      );
  }, []);

  async function buy(item: Reward) {
    try {
      setBuying(item.id);

      const authToken =
        await token();

      const response =
        await fetch(
          `${API}/rewards/${item.id}/purchase`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${authToken}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Purchase failed',
        );
      }

      setGold(
        data.character.gold,
      );

      alert(
        `🎉 ${item.name} acquired!`,
      );

      await load();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Purchase failed',
      );
    } finally {
      setBuying(null);
    }
  }

  return (
    <AppShell
      gold={gold}
      streak={streak}
    >
      <main className="min-h-screen bg-[#050509] px-4 py-6 pb-28 text-white sm:px-6 lg:px-10">

        <div className="mx-auto max-w-6xl">

          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-yellow-400">
                TREASURE VAULT
              </p>

              <h1 className="mt-2 text-4xl font-black sm:text-5xl">
                REWARD SHOP
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Spend your hard-earned Gold.
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-5 py-3">
              <span className="mr-2">
                🪙
              </span>

              <span className="font-black text-yellow-300">
                {gold} GOLD
              </span>
            </div>

          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center text-gray-500">
              Loading rewards...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {rewards.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-cyan-400/20"
                >

                  <div className="absolute right-4 top-4 rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold tracking-wider text-gray-600">
                    {item.type}
                  </div>

                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 text-5xl">
                    {item.metadata?.icon ||
                      '🎁'}
                  </div>

                  <p className="mt-6 text-[10px] font-bold tracking-[0.25em] text-purple-400">
                    {item.metadata?.rarity ||
                      'COMMON'}
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {item.name}
                  </h2>

                  <p className="mt-2 min-h-10 text-sm text-gray-500">
                    {item.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">

                    <div className="font-black text-yellow-300">
                      🪙 {item.price}
                    </div>

                    <button
                      disabled={
                        buying === item.id ||
                        gold < item.price
                      }
                      onClick={() =>
                        buy(item)
                      }
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {buying === item.id
                        ? 'BUYING...'
                        : gold < item.price
                          ? 'LOCKED'
                          : 'PURCHASE'}
                    </button>

                  </div>
                </div>
              ))}

            </div>
          )}

        </div>
      </main>
    </AppShell>
  );
}