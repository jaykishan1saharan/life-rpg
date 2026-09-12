'use client';

import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import {
    onAuthStateChanged,
    User,
} from 'firebase/auth';

import { auth } from '../../src/lib/firebase';
import { apiRequest } from '../../src/services/api.service';

import AppShell from '../../src/components/layout/AppShell';

interface Character {
    id: string;
    user_id: string;
    level: number;
    total_xp: number;
    gold: number;
    strength: number;
    intellect: number;
    discipline: number;
    creativity: number;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
}

interface UserData {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
}

interface Quest {
    id: string;
    title: string;
    description: string | null;
    category: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC';
    attribute:
    | 'STRENGTH'
    | 'INTELLECT'
    | 'DISCIPLINE'
    | 'CREATIVITY';
    xp_reward: number;
    gold_reward: number;
    attribute_reward: number;
    is_active: boolean;
}

interface MeResponse {
    user: UserData;
    character: Character;
}

interface CompletionResponse {
    rewards: {
        xp: number;
        gold: number;
        attribute: string;
        attributePoints: number;
    };
    character: Character;
    levelUp: boolean;
    level: number;
    streak: number;
}

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

function getLevelXp(level: number) {
    return Math.floor(
        100 * Math.pow(level, 1.5),
    );
}

export default function DashboardPage() {
    const [user, setUser] =
        useState<UserData | null>(null);

    const [character, setCharacter] =
        useState<Character | null>(null);

    const [quests, setQuests] =
        useState<Quest[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [questLoading, setQuestLoading] =
        useState(false);

    const [showCreateQuest, setShowCreateQuest] =
        useState(false);

    const [reward, setReward] =
        useState<CompletionResponse | null>(null);

    const [error, setError] =
        useState('');

    const [questTitle, setQuestTitle] =
        useState('');

    const [questDescription, setQuestDescription] =
        useState('');

    const [questCategory, setQuestCategory] =
        useState('STUDY');

    const [questDifficulty, setQuestDifficulty] =
        useState<Quest['difficulty']>('MEDIUM');

    const [questAttribute, setQuestAttribute] =
        useState<Quest['attribute']>('INTELLECT');

    const loadDashboard = async () => {
        const me =
            await apiRequest<MeResponse>(
                '/users/me',
            );

        const questData =
            await apiRequest<Quest[]>(
                '/quests',
            );

        setUser(me.user);
        setCharacter(me.character);
        setQuests(questData);
    };

    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (firebaseUser: User | null) => {
                    if (!firebaseUser) {
                        window.location.href = '/login';
                        return;
                    }

                    try {
                        setLoading(true);
                        await loadDashboard();
                    } catch (err: unknown) {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'Failed to load dashboard',
                        );
                    } finally {
                        setLoading(false);
                    }
                },
            );

        return unsubscribe;
    }, []);

    const levelProgress = useMemo(() => {
        if (!character) {
            return {
                current: 0,
                required: 100,
                percentage: 0,
            };
        }

        const currentLevel =
            character.level;

        const currentLevelStart =
            currentLevel === 1
                ? 0
                : getLevelXp(currentLevel - 1);

        const nextLevel =
            getLevelXp(currentLevel);

        const current =
            character.total_xp -
            currentLevelStart;

        const required =
            nextLevel -
            currentLevelStart;

        return {
            current,
            required,
            percentage: Math.min(
                100,
                Math.max(
                    0,
                    (current / required) * 100,
                ),
            ),
        };
    }, [character]);

    async function createQuest(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!questTitle.trim()) {
            return;
        }

        setQuestLoading(true);
        setError('');

        try {
            await apiRequest('/quests', {
                method: 'POST',
                body: JSON.stringify({
                    title: questTitle,
                    description:
                        questDescription || undefined,
                    category: questCategory,
                    difficulty: questDifficulty,
                    attribute: questAttribute,
                    xpReward:
                        rewards[questDifficulty].xp,
                    goldReward:
                        rewards[questDifficulty].gold,
                    attributeReward: 1,
                }),
            });

            setQuestTitle('');
            setQuestDescription('');
            setShowCreateQuest(false);

            await loadDashboard();
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to create quest',
            );
        } finally {
            setQuestLoading(false);
        }
    }

    async function completeQuest(
        questId: string,
    ) {
        setQuestLoading(true);
        setError('');

        try {
            const result =
                await apiRequest<CompletionResponse>(
                    `/quests/${questId}/complete`,
                    {
                        method: 'POST',
                    },
                );

            setReward(result);

            setCharacter(result.character);

            const questData =
                await apiRequest<Quest[]>(
                    '/quests',
                );

            setQuests(questData);

            setTimeout(() => {
                setReward(null);
            }, 4500);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to complete quest',
            );
        } finally {
            setQuestLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[#050509] text-white">
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <div className="mb-4 text-5xl">
                            ⚔️
                        </div>

                        <p className="animate-pulse text-sm tracking-[0.3em] text-cyan-400">
                            LOADING CHARACTER...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (!character) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                Character not found.
            </main>
        );
    }

    return (
        <AppShell
            gold={character.gold}
            streak={character.current_streak}
        >
            <main className="min-h-screen overflow-hidden bg-[#050509] text-white">
                {/* Ambient background */}
                <div className="pointer-events-none fixed inset-0">
                    <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                    {/* HEADER */}
                    <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-1 flex items-center gap-3">
                                <span className="text-2xl">
                                    ⚔️
                                </span>

                                <h1 className="text-xl font-black tracking-[0.2em]">
                                    LIFE RPG
                                </h1>
                            </div>

                            <p className="text-sm text-gray-500">
                                Welcome back,{' '}
                                <span className="text-cyan-400">
                                    {user?.display_name ||
                                        user?.email}
                                </span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-2">
                                <span className="mr-2">
                                    🪙
                                </span>

                                <span className="font-bold text-yellow-300">
                                    {character.gold}
                                </span>
                            </div>

                            <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 px-4 py-2">
                                <span className="mr-2">
                                    🔥
                                </span>

                                <span className="font-bold text-orange-300">
                                    {character.current_streak}
                                </span>
                            </div>

                            <button
                                onClick={async () => {
                                    const { logout } =
                                        await import(
                                            '../../src/services/auth.service'
                                        );

                                    await logout();

                                    window.location.href =
                                        '/login';
                                }}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:border-white/20 hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </header>

                    {/* CHARACTER + XP */}
                    <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_2fr]">

                        {/* Character card */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 20,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-white/[0.03] to-purple-500/10 p-6"
                        >
                            <div className="absolute right-5 top-5 text-xs tracking-[0.25em] text-cyan-400">
                                PLAYER
                            </div>

                            <div className="mb-5 flex items-center gap-5">
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-4xl shadow-[0_0_40px_rgba(34,211,238,0.15)]">
                                    🧙
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                                        Character
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black">
                                        {user?.display_name ||
                                            'Unknown Hero'}
                                    </h2>

                                    <p className="mt-1 text-sm text-cyan-400">
                                        Level {character.level}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex justify-between text-xs">
                                    <span className="text-gray-400">
                                        EXPERIENCE
                                    </span>

                                    <span className="text-cyan-400">
                                        {levelProgress.current} /{' '}
                                        {levelProgress.required} XP
                                    </span>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-black/50">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${levelProgress.percentage}%`,
                                        }}
                                        transition={{
                                            duration: 1,
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                                    />
                                </div>

                                <p className="mt-2 text-xs text-gray-600">
                                    {character.total_xp} total XP
                                </p>
                            </div>
                        </motion.div>

                        {/* Attributes */}
                        <div className="grid grid-cols-2 gap-4">
                            <AttributeCard
                                icon="⚔️"
                                label="STRENGTH"
                                value={character.strength}
                                description="Physical power"
                            />

                            <AttributeCard
                                icon="🧠"
                                label="INTELLECT"
                                value={character.intellect}
                                description="Knowledge & learning"
                            />

                            <AttributeCard
                                icon="🎯"
                                label="DISCIPLINE"
                                value={character.discipline}
                                description="Consistency"
                            />

                            <AttributeCard
                                icon="🎨"
                                label="CREATIVITY"
                                value={character.creativity}
                                description="Ideas & creation"
                            />
                        </div>
                    </section>

                    {/* ERROR */}
                    {error && (
                        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* QUEST HEADER */}
                    <section className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-1 text-xs tracking-[0.3em] text-cyan-400">
                                ACTIVE MISSIONS
                            </p>

                            <h2 className="text-3xl font-black">
                                QUEST BOARD
                            </h2>
                        </div>

                        <button
                            onClick={() =>
                                setShowCreateQuest(true)
                            }
                            className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-black transition hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                        >
                            + NEW QUEST
                        </button>
                    </section>

                    {/* QUESTS */}
                    <section className="space-y-3">
                        {quests.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                                <div className="mb-3 text-4xl">
                                    🗡️
                                </div>

                                <p className="font-semibold">
                                    No active quests
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                    Create your first mission.
                                </p>
                            </div>
                        ) : (
                            quests.map((quest, index) => (
                                <motion.div
                                    key={quest.id}
                                    initial={{
                                        opacity: 0,
                                        x: -20,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                    }}
                                    transition={{
                                        delay: index * 0.05,
                                    }}
                                    className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.04]"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <DifficultyBadge
                                                    difficulty={
                                                        quest.difficulty
                                                    }
                                                />

                                                <span className="text-xs text-gray-600">
                                                    {quest.category}
                                                </span>

                                                <span className="text-xs text-gray-600">
                                                    •
                                                </span>

                                                <span className="text-xs text-cyan-400">
                                                    {quest.attribute}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold">
                                                {quest.title}
                                            </h3>

                                            {quest.description && (
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {quest.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="hidden text-right sm:block">
                                                <p className="text-sm font-bold text-cyan-400">
                                                    +{quest.xp_reward} XP
                                                </p>

                                                <p className="text-xs text-yellow-400">
                                                    +{quest.gold_reward} Gold
                                                </p>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    completeQuest(
                                                        quest.id,
                                                    )
                                                }
                                                disabled={questLoading}
                                                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                COMPLETE
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </section>

                    {/* STREAK */}
                    <section className="mt-6 rounded-2xl border border-orange-400/10 bg-orange-400/[0.03] p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs tracking-[0.25em] text-orange-400">
                                    ADVENTURE STREAK
                                </p>

                                <h3 className="mt-1 text-xl font-black">
                                    🔥 {character.current_streak}{' '}
                                    DAYS
                                </h3>
                            </div>

                            <div className="text-right">
                                <p className="text-xs text-gray-600">
                                    LONGEST
                                </p>

                                <p className="font-bold text-orange-300">
                                    {character.longest_streak}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* CREATE QUEST MODAL */}
                <AnimatePresence>
                    {showCreateQuest && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    scale: 0.95,
                                    y: 20,
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.95,
                                    y: 20,
                                }}
                                className="w-full max-w-lg rounded-3xl border border-cyan-400/20 bg-[#0b0b12] p-6 shadow-[0_0_80px_rgba(34,211,238,0.12)]"
                            >
                                <div className="mb-6">
                                    <p className="text-xs tracking-[0.3em] text-cyan-400">
                                        CREATE MISSION
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black">
                                        New Quest
                                    </h2>
                                </div>

                                <form
                                    onSubmit={createQuest}
                                    className="space-y-4"
                                >
                                    <input
                                        value={questTitle}
                                        onChange={(e) =>
                                            setQuestTitle(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Quest title"
                                        required
                                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                                    />

                                    <textarea
                                        value={questDescription}
                                        onChange={(e) =>
                                            setQuestDescription(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Description (optional)"
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                                    />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <select
                                            value={questDifficulty}
                                            onChange={(e) =>
                                                setQuestDifficulty(
                                                    e.target
                                                        .value as Quest['difficulty'],
                                                )
                                            }
                                            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                                        >
                                            <option value="EASY">
                                                EASY — 25 XP
                                            </option>

                                            <option value="MEDIUM">
                                                MEDIUM — 50 XP
                                            </option>

                                            <option value="HARD">
                                                HARD — 100 XP
                                            </option>

                                            <option value="EPIC">
                                                EPIC — 200 XP
                                            </option>
                                        </select>

                                        <select
                                            value={questAttribute}
                                            onChange={(e) =>
                                                setQuestAttribute(
                                                    e.target
                                                        .value as Quest['attribute'],
                                                )
                                            }
                                            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                                        >
                                            <option value="STRENGTH">
                                                ⚔️ Strength
                                            </option>

                                            <option value="INTELLECT">
                                                🧠 Intellect
                                            </option>

                                            <option value="DISCIPLINE">
                                                🎯 Discipline
                                            </option>

                                            <option value="CREATIVITY">
                                                🎨 Creativity
                                            </option>
                                        </select>
                                    </div>

                                    <input
                                        value={questCategory}
                                        onChange={(e) =>
                                            setQuestCategory(
                                                e.target.value
                                                    .toUpperCase(),
                                            )
                                        }
                                        placeholder="Category e.g. STUDY"
                                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                                    />

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCreateQuest(false)
                                            }
                                            className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-semibold text-gray-400 transition hover:text-white"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={questLoading}
                                            className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black transition hover:bg-cyan-300 disabled:opacity-50"
                                        >
                                            {questLoading
                                                ? 'CREATING...'
                                                : 'CREATE QUEST'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* REWARD OVERLAY */}
                <AnimatePresence>
                    {reward && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    scale: 0.5,
                                    y: 40,
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.8,
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 15,
                                }}
                                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/30 bg-[#0b0b12] p-8 text-center shadow-[0_0_100px_rgba(34,211,238,0.2)]"
                            >
                                <motion.div
                                    animate={{
                                        rotate: [0, -10, 10, 0],
                                        scale: [1, 1.1, 1],
                                    }}
                                    transition={{
                                        duration: 0.7,
                                    }}
                                    className="text-6xl"
                                >
                                    ⚔️
                                </motion.div>

                                <p className="mt-4 text-xs tracking-[0.4em] text-cyan-400">
                                    QUEST COMPLETE
                                </p>

                                <h2 className="mt-2 text-3xl font-black">
                                    REWARD ACQUIRED
                                </h2>

                                <div className="mt-7 grid grid-cols-2 gap-3">
                                    <RewardBox
                                        icon="⚡"
                                        value={`+${reward.rewards.xp}`}
                                        label="XP"
                                    />

                                    <RewardBox
                                        icon="🪙"
                                        value={`+${reward.rewards.gold}`}
                                        label="GOLD"
                                    />

                                    <RewardBox
                                        icon="📈"
                                        value={`+${reward.rewards.attributePoints}`}
                                        label={reward.rewards.attribute}
                                    />

                                    <RewardBox
                                        icon="🔥"
                                        value={reward.streak.toString()}
                                        label="STREAK"
                                    />
                                </div>

                                {reward.levelUp && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: 10,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                        }}
                                        className="mt-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4"
                                    >
                                        <p className="text-xs tracking-[0.3em] text-yellow-400">
                                            LEVEL UP
                                        </p>

                                        <p className="mt-1 text-2xl font-black text-yellow-300">
                                            LEVEL {reward.level}
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </AppShell>
    );
}

function AttributeCard({
    icon,
    label,
    value,
    description,
}: {
    icon: string;
    label: string;
    value: number;
    description: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/20"
        >
            <div className="flex items-start justify-between">
                <span className="text-2xl">
                    {icon}
                </span>

                <span className="text-3xl font-black">
                    {value}
                </span>
            </div>

            <p className="mt-4 text-xs font-bold tracking-[0.2em] text-gray-300">
                {label}
            </p>

            <p className="mt-1 text-xs text-gray-600">
                {description}
            </p>
        </motion.div>
    );
}

function DifficultyBadge({
    difficulty,
}: {
    difficulty: Quest['difficulty'];
}) {
    const styles = {
        EASY: 'border-green-400/20 bg-green-400/10 text-green-400',
        MEDIUM:
            'border-blue-400/20 bg-blue-400/10 text-blue-400',
        HARD: 'border-orange-400/20 bg-orange-400/10 text-orange-400',
        EPIC: 'border-purple-400/20 bg-purple-400/10 text-purple-400',
    };

    return (
        <span
            className={`rounded-md border px-2 py-1 text-[10px] font-bold tracking-wider ${styles[difficulty]}`}
        >
            {difficulty}
        </span>
    );
}

function RewardBox({
    icon,
    value,
    label,
}: {
    icon: string;
    value: string;
    label: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xl">
                {icon}
            </div>

            <div className="mt-1 text-xl font-black text-cyan-300">
                {value}
            </div>

            <div className="mt-1 text-[10px] tracking-[0.2em] text-gray-600">
                {label}
            </div>
        </div>
    );
}