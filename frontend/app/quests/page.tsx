'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';

import AppShell from '../../src/components/layout/AppShell';
import { app } from '../../src/lib/firebase';

interface Quest {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC';
  attribute: 'STRENGTH' | 'INTELLECT' | 'DISCIPLINE' | 'CREATIVITY';
  xp_reward: number;
  gold_reward: number;
  attribute_reward: number;
  is_active: boolean;
  completed_today: boolean;
}

interface Character {
  level: number;
  total_xp: number;
  gold: number;
  current_streak: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const difficultyReward = {
  EASY: { xp: 25, gold: 5 },
  MEDIUM: { xp: 50, gold: 10 },
  HARD: { xp: 100, gold: 20 },
  EPIC: { xp: 200, gold: 40 },
};

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);

  const activeQuests = quests.filter(
    (quest) => !quest.completed_today
  );

  const completedQuests = quests.filter(
    (quest) => quest.completed_today
  );

  const [character, setCharacter] =
    useState<Character | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] =
    useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'STUDY',
    difficulty: 'MEDIUM',
    attribute: 'INTELLECT',
  });

  async function getToken() {
    const user = getAuth(app).currentUser;

    if (!user) {
      throw new Error('Please login again.');
    }

    return user.getIdToken();
  }

  async function loadData() {
    try {
      setLoading(true);

      const token = await getToken();

      const [questResponse, characterResponse] =
        await Promise.all([
          fetch(`${API_URL}/quests`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          fetch(`${API_URL}/characters/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      if (!questResponse.ok) {
        throw new Error('Failed to load quests');
      }

      const questData = await questResponse.json();
      const characterData =
        await characterResponse.json();

      setQuests(
        Array.isArray(questData)
          ? questData
          : questData.quests ?? [],
      );

      setCharacter(
        characterData.character ??
        characterData,
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createQuest(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.title.trim()) return;

    try {
      setCreating(true);

      const token = await getToken();

      const reward =
        difficultyReward[
        form.difficulty as keyof typeof difficultyReward
        ];

      const response = await fetch(
        `${API_URL}/quests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: form.title.trim(),
            description:
              form.description.trim() || null,
            category: form.category,
            difficulty: form.difficulty,
            attribute: form.attribute,
            xp_reward: reward.xp,
            gold_reward: reward.gold,
            attribute_reward: 1,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message || 'Failed to create quest',
        );
      }

      setForm({
        title: '',
        description: '',
        category: 'STUDY',
        difficulty: 'MEDIUM',
        attribute: 'INTELLECT',
      });

      setShowCreate(false);

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create quest',
      );
    } finally {
      setCreating(false);
    }
  }

  async function completeQuest(id: string) {
    try {
      setCompleting(id);

      const token = await getToken();

      const response = await fetch(
        `${API_URL}/quests/${id}/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'Failed to complete quest',
        );
      }

      alert(
        `⚔️ Quest Complete!\n\n+${data.xp_earned ?? data.xpEarned ?? 0} XP\n+${data.gold_earned ?? data.goldEarned ?? 0} Gold`,
      );

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to complete quest',
      );
    } finally {
      setCompleting(null);
    }
  }

  return (
    <AppShell
      gold={character?.gold ?? 0}
      streak={character?.current_streak ?? 0}
    >
      <main className="min-h-screen bg-[#050509] px-4 py-6 pb-28 text-white sm:px-6 lg:px-10">

        {/* HEADER */}
        <div className="mx-auto max-w-6xl">

          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.3em] text-cyan-400">
                ADVENTURE
              </p>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                QUEST COMMAND
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Turn real-world tasks into XP.
              </p>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400 px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(34,211,238,0.15)] transition hover:scale-[1.02] hover:bg-cyan-300"
            >
              + NEW QUEST
            </button>
          </div>

          {/* QUICK STATS */}
          <div className="mb-8 grid grid-cols-3 gap-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[9px] tracking-[0.2em] text-gray-600">
                ACTIVE
              </p>
              <p className="mt-1 text-2xl font-black">
                {activeQuests.length}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
              <p className="text-[9px] tracking-[0.2em] text-gray-600">
                LEVEL
              </p>
              <p className="mt-1 text-2xl font-black text-cyan-300">
                {character?.level ?? 1}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-400/10 bg-orange-400/[0.03] p-4">
              <p className="text-[9px] tracking-[0.2em] text-gray-600">
                STREAK
              </p>
              <p className="mt-1 text-2xl font-black text-orange-300">
                🔥 {character?.current_streak ?? 0}
              </p>
            </div>

          </div>

          {/* QUEST LIST */}
          <section>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.25em] text-cyan-400">
                  ACTIVE MISSIONS
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  YOUR QUESTS
                </h2>
              </div>

              <span className="text-xs text-gray-600">
                {activeQuests.length} missions
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-gray-500">
                Loading quests...
              </div>
            ) : (
              <>
                {/* ACTIVE QUESTS */}
                {activeQuests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
                    <div className="text-4xl">⚔️</div>

                    <h3 className="mt-4 text-xl font-black">
                      No active quests
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Create your next real-life mission.
                    </p>

                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-5 rounded-xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/10"
                    >
                      CREATE QUEST
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        completing={completing === quest.id}
                        onComplete={() => completeQuest(quest.id)}
                      />
                    ))}
                  </div>
                )}

                {/* COMPLETED TODAY */}
                {completedQuests.length > 0 && (
                  <section className="mt-12">

                    <div className="mb-5 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-bold tracking-[0.3em] text-green-400">
                          ADVENTURE LOG
                        </p>

                        <h2 className="mt-1 text-2xl font-black">
                          COMPLETED TODAY
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Victories already claimed today.
                        </p>
                      </div>

                      <span className="text-xs text-green-400/60">
                        {completedQuests.length} completed
                      </span>
                    </div>

                    <div className="space-y-3">
                      {completedQuests.map((quest) => (
                        <div
                          key={quest.id}
                          className="rounded-2xl border border-green-400/10 bg-green-400/[0.02] p-5 opacity-70"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-wider">
                                <span className="rounded-md border border-green-400/20 bg-green-400/5 px-2 py-1 text-green-400">
                                  ✓ COMPLETED
                                </span>

                                <span className="text-gray-600">
                                  {quest.category}
                                </span>

                                <span className="text-green-400/70">
                                  • {quest.attribute}
                                </span>
                              </div>

                              <h3 className="text-lg font-black text-gray-300">
                                {quest.title}
                              </h3>

                              {quest.description && (
                                <p className="mt-1 text-sm text-gray-600">
                                  {quest.description}
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-black text-cyan-400/70">
                                +{quest.xp_reward} XP
                              </p>

                              <p className="text-xs font-bold text-yellow-400/70">
                                +{quest.gold_reward} Gold
                              </p>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>

                  </section>
                )}
              </>
            )}

          </section>

        </div>
      </main>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-3xl border border-cyan-400/20 bg-[#0b0b12] p-6 shadow-[0_0_80px_rgba(34,211,238,0.1)]">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.25em] text-cyan-400">
                  NEW MISSION
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  CREATE QUEST
                </h2>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="text-2xl text-gray-600 hover:text-white"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={createQuest}
              className="space-y-4"
            >

              <input
                required
                placeholder="Quest title"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-gray-700 focus:border-cyan-400/40"
              />

              <textarea
                placeholder="What do you need to accomplish?"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-gray-700 focus:border-cyan-400/40"
              />

              <div className="grid grid-cols-2 gap-3">

                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value,
                    })
                  }
                  className="rounded-xl border border-white/10 bg-[#0a0a10] px-4 py-3 text-sm outline-none"
                >
                  <option value="STUDY">Study</option>
                  <option value="CODING">Coding</option>
                  <option value="FITNESS">Fitness</option>
                  <option value="WORK">Work</option>
                  <option value="CREATIVE">Creative</option>
                  <option value="PERSONAL">Personal</option>
                </select>

                <select
                  value={form.attribute}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      attribute: e.target.value,
                    })
                  }
                  className="rounded-xl border border-white/10 bg-[#0a0a10] px-4 py-3 text-sm outline-none"
                >
                  <option value="STRENGTH">Strength</option>
                  <option value="INTELLECT">Intellect</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="CREATIVITY">Creativity</option>
                </select>

              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-gray-600">
                  DIFFICULTY
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(difficultyReward).map(
                    ([difficulty, reward]) => (
                      <button
                        type="button"
                        key={difficulty}
                        onClick={() =>
                          setForm({
                            ...form,
                            difficulty,
                          })
                        }
                        className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition ${form.difficulty === difficulty
                          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                          : 'border-white/10 text-gray-600 hover:text-gray-300'
                          }`}
                      >
                        <div>{difficulty}</div>
                        <div className="mt-1 text-[9px]">
                          +{reward.xp} XP
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              <button
                disabled={creating}
                type="submit"
                className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {creating
                  ? 'CREATING...'
                  : 'CREATE QUEST ⚔️'}
              </button>

            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function QuestCard({
  quest,
  completing,
  onComplete,
}: {
  quest: Quest;
  completing: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.035]">

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

        <div className="min-w-0">

          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-wider">

            <span className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-cyan-300">
              {quest.difficulty}
            </span>

            <span className="text-gray-600">
              {quest.category}
            </span>

            <span className="text-cyan-400">
              • {quest.attribute}
            </span>

          </div>

          <h3 className="text-lg font-black">
            {quest.title}
          </h3>

          {quest.description && (
            <p className="mt-1 text-sm text-gray-500">
              {quest.description}
            </p>
          )}

        </div>

        <div className="flex shrink-0 items-center gap-4">

          <div className="text-right">
            <p className="text-sm font-black text-cyan-300">
              +{quest.xp_reward} XP
            </p>

            <p className="text-xs font-bold text-yellow-400">
              +{quest.gold_reward} Gold
            </p>
          </div>

          <button
            onClick={onComplete}
            disabled={completing}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-5 py-3 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completing
              ? '...'
              : 'COMPLETE'}
          </button>

        </div>

      </div>
    </div>
  );
}