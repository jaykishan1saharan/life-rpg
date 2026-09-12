'use client';

import { useState } from 'react';

import { apiRequest } from '../../src/services/api.service';

interface Quest {
  id: string;
  title: string;
  difficulty: string;
  attribute: string;
  xp_reward: number;
  gold_reward: number;
}

export default function QuestTestPage() {
  const [result, setResult] = useState('');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);

  async function createQuest() {
    setLoading(true);
    setResult('');

    try {
      const data = await apiRequest<Quest>(
        '/quests',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Complete CC Assignment',
            description:
              "Finish today's cloud computing practical",
            category: 'STUDY',
            difficulty: 'MEDIUM',
            attribute: 'INTELLECT',
            xpReward: 50,
            goldReward: 10,
            attributeReward: 1,
          }),
        },
      );

      setResult(
        JSON.stringify(data, null, 2),
      );

      await getQuests();
    } catch (error: unknown) {
      setResult(
        error instanceof Error
          ? error.message
          : 'Something went wrong',
      );
    } finally {
      setLoading(false);
    }
  }

  async function getQuests() {
    try {
      const data = await apiRequest<Quest[]>(
        '/quests',
      );

      setQuests(data);

      setResult(
        JSON.stringify(data, null, 2),
      );
    } catch (error: unknown) {
      setResult(
        error instanceof Error
          ? error.message
          : 'Something went wrong',
      );
    }
  }

  async function completeQuest(
    questId: string,
  ) {
    setLoading(true);
    setResult('');

    try {
      const data = await apiRequest(
        `/quests/${questId}/complete`,
        {
          method: 'POST',
        },
      );

      setResult(
        JSON.stringify(data, null, 2),
      );

      await getQuests();
    } catch (error: unknown) {
      setResult(
        error instanceof Error
          ? error.message
          : 'Something went wrong',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold">
          Quest API Test
        </h1>

        <p className="mb-8 text-gray-400">
          Temporary development page
        </p>

        <div className="mb-8 flex gap-4">
          <button
            onClick={createQuest}
            disabled={loading}
            className="rounded-lg bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            Create Quest
          </button>

          <button
            onClick={getQuests}
            disabled={loading}
            className="rounded-lg border border-white/20 px-5 py-3 font-semibold disabled:opacity-50"
          >
            Get Quests
          </button>
        </div>

        <div className="space-y-4">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    {quest.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    {quest.difficulty} •{' '}
                    {quest.attribute}
                  </p>

                  <p className="mt-2 text-sm text-gray-300">
                    ⚡ {quest.xp_reward} XP
                    {' • '}
                    🪙 {quest.gold_reward} Gold
                  </p>
                </div>

                <button
                  onClick={() =>
                    completeQuest(quest.id)
                  }
                  disabled={loading}
                  className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>

        {result && (
          <pre className="mt-8 overflow-auto rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-green-400">
            {result}
          </pre>
        )}
      </div>
    </main>
  );
}