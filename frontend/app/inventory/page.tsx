'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';

import AppShell from '../../src/components/layout/AppShell';
import { app } from '../../src/lib/firebase';

interface InventoryItem {
  id: string;
  item_id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
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

export default function InventoryPage() {
  const [items, setItems] =
    useState<InventoryItem[]>([]);

  const [character, setCharacter] =
    useState<Character | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      const user =
        getAuth(app).currentUser;

      if (!user) {
        window.location.href =
          '/login';
        return;
      }

      const token =
        await user.getIdToken();

      const [inventoryResponse, meResponse] =
        await Promise.all([
          fetch(`${API}/inventory`, {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }),

          fetch(`${API}/users/me`, {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }),
        ]);

      const inventory =
        await inventoryResponse.json();

      const me =
        await meResponse.json();

      setItems(inventory);
      setCharacter(me.character);
      setLoading(false);
    }

    load().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell
      gold={character?.gold ?? 0}
      streak={
        character?.current_streak ?? 0
      }
    >
      <main className="min-h-screen bg-[#050509] px-4 py-6 pb-28 text-white sm:px-6 lg:px-10">

        <div className="mx-auto max-w-6xl">

          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.3em] text-purple-400">
              YOUR COLLECTION
            </p>

            <h1 className="mt-2 text-4xl font-black sm:text-5xl">
              INVENTORY
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Everything you've earned belongs here.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center text-gray-500">
              Loading inventory...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center">

              <div className="text-5xl">
                🎒
              </div>

              <h2 className="mt-4 text-xl font-black">
                Inventory Empty
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Visit the Reward Shop and start collecting.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
                >

                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/5 text-4xl">
                    {item.metadata?.icon ||
                      '🎁'}
                  </div>

                  <p className="mt-5 text-[10px] font-bold tracking-[0.25em] text-purple-400">
                    {item.type}
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {item.name}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    {item.description}
                  </p>

                  <div className="mt-5 inline-flex rounded-lg border border-green-400/20 bg-green-400/5 px-3 py-1 text-[10px] font-bold text-green-400">
                    ✓ OWNED
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