'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    CalendarDays,
    ChevronRight,
    Droplets,
    History,
    RefreshCw,
    Settings,
    Target,
    Trophy,
} from 'lucide-react';

import { auth } from '../../../src/lib/firebase';
import AppShell from '../../../src/components/layout/AppShell';

type HistoryEntry = {
    date: string;
    total_ml: number;
};

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatLitres(ml: number) {
    return `${(ml / 1000).toFixed(2)} L`;
}

function formatMl(ml: number) {
    return `${ml.toLocaleString()} ml`;
}

function formatHistoryDate(value: string) {
    const date = new Date(
        `${value}T00:00:00Z`,
    );

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function getDateOnly(date = new Date()) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1,
    ).padStart(2, '0');
    const day = String(
        date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getDayDifference(dateString: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(
        `${dateString}T00:00:00`,
    );

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return Math.round(
        (today.getTime() - date.getTime()) /
        (1000 * 60 * 60 * 24),
    );
}

function getRelativeLabel(dateString: string) {
    const difference =
        getDayDifference(dateString);

    if (difference === 0) {
        return 'TODAY';
    }

    if (difference === 1) {
        return 'YESTERDAY';
    }

    if (
        difference !== null &&
        difference > 1 &&
        difference <= 7
    ) {
        return `${difference} DAYS AGO`;
    }

    return null;
}

function getProgress(total: number, goal: number) {
    if (goal <= 0) return 0;

    return Math.min(
        Math.round((total / goal) * 100),
        100,
    );
}

export default function HydrationHistoryPage() {
    const [history, setHistory] = useState<
        HistoryEntry[]
    >([]);

    const [dailyGoal, setDailyGoal] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState('');

    const loadHistory = useCallback(
        async (showRefresh = false) => {
            try {
                if (showRefresh) {
                    setRefreshing(true);
                } else {
                    setIsLoading(true);
                }

                setError('');

                const user = auth.currentUser;

                if (!user) {
                    setError(
                        'Please login to access hydration history.',
                    );
                    return;
                }

                const token = await user.getIdToken();

                /*
                 * Load complete hydration history.
                 */
                const historyResponse = await fetch(
                    `${API_URL}/hydration/history`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                if (!historyResponse.ok) {
                    const message =
                        await historyResponse.text();

                    throw new Error(
                        message ||
                        'Failed to load hydration history.',
                    );
                }

                const historyData =
                    await historyResponse.json();

                /*
                 * The backend returns the history array
                 * directly.
                 */
                const historyRows = Array.isArray(
                    historyData,
                )
                    ? historyData
                    : Array.isArray(historyData?.history)
                        ? historyData.history
                        : [];

                setHistory(
                    historyRows.map((item: any) => ({
                        date: String(item.date),
                        total_ml: Number(
                            item.total_ml ?? item.totalMl ?? 0,
                        ),
                    })),
                );

                /*
                 * Load current settings so every historical
                 * day can be compared against the configured
                 * hydration goal.
                 */
                const hydrationResponse =
                    await fetch(
                        `${API_URL}/hydration`,
                        {
                            method: 'GET',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        },
                    );

                if (hydrationResponse.ok) {
                    const hydrationData =
                        await hydrationResponse.json();

                    const goal = Number(
                        hydrationData?.today?.goalMl ??
                        hydrationData?.settings
                            ?.daily_goal_ml ??
                        hydrationData?.settings
                            ?.dailyGoalMl ??
                        0,
                    );

                    setDailyGoal(goal);
                }
            } catch (err) {
                console.error(
                    '[Hydration History] Failed to load:',
                    err,
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load hydration history.',
                );
            } finally {
                setIsLoading(false);
                setRefreshing(false);
            }
        },
        [],
    );

    useEffect(() => {
        let unsubscribe:
            | (() => void)
            | undefined;

        unsubscribe =
            auth.onAuthStateChanged(
                async (user) => {
                    if (user) {
                        await loadHistory();
                    } else {
                        setIsLoading(false);
                        setHistory([]);
                        setDailyGoal(0);
                    }
                },
            );

        return () => {
            unsubscribe?.();
        };
    }, [loadHistory]);

    /*
     * Statistics
     */
    const statistics = useMemo(() => {
        if (!history.length) {
            return {
                totalDays: 0,
                totalWater: 0,
                average: 0,
                completedDays: 0,
            };
        }

        const totalWater = history.reduce(
            (sum, item) =>
                sum + Number(item.total_ml || 0),
            0,
        );

        const completedDays =
            dailyGoal > 0
                ? history.filter(
                    (item) =>
                        Number(item.total_ml) >=
                        dailyGoal,
                ).length
                : 0;

        return {
            totalDays: history.length,
            totalWater,
            average: Math.round(
                totalWater / history.length,
            ),
            completedDays,
        };
    }, [history, dailyGoal]);

    return (
        <AppShell gold={0} streak={0}>
            <main className="min-h-screen bg-[#05070d] text-white">
                {/* Ambient background */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute left-[5%] top-[10%] h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

                    <div className="absolute right-[5%] top-[35%] h-96 w-96 rounded-full bg-blue-600/10 blur-[140px]" />

                    <div className="absolute bottom-[5%] left-[30%] h-72 w-72 rounded-full bg-violet-600/10 blur-[130px]" />
                </div>

                <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    {/* Header */}
                    <header className="mb-8">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div>
                                <Link
                                    href="/hydration"
                                    className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-500 transition hover:text-cyan-400"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    BACK TO HYDRATION
                                </Link>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                                        <History className="h-6 w-6 text-cyan-400" />
                                    </div>

                                    <div>
                                        <div className="text-xs font-bold tracking-[0.25em] text-cyan-400">
                                            HYDRATION ARCHIVE
                                        </div>

                                        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                                            Complete History
                                        </h1>
                                    </div>
                                </div>

                                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                                    Every recorded hydration day, from
                                    your latest entry back to your first
                                    recorded drink.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        loadHistory(true)
                                    }
                                    disabled={refreshing}
                                    className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300 disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${refreshing
                                                ? 'animate-spin'
                                                : ''
                                            }`}
                                    />
                                    Refresh
                                </button>

                                <Link
                                    href="/hydration/settings"
                                    className="flex h-11 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: -10,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                        >
                            {error}
                        </motion.div>
                    )}

                    {isLoading ? (
                        <LoadingHistory />
                    ) : (
                        <>
                            {/* Overview stats */}
                            <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                                <HistoryStat
                                    icon={
                                        <CalendarDays className="h-5 w-5" />
                                    }
                                    label="RECORDED DAYS"
                                    value={statistics.totalDays.toString()}
                                    description="All recorded days"
                                />

                                <HistoryStat
                                    icon={
                                        <Droplets className="h-5 w-5" />
                                    }
                                    label="TOTAL WATER"
                                    value={
                                        statistics.totalWater
                                            ? formatLitres(
                                                statistics.totalWater,
                                            )
                                            : '0 L'
                                    }
                                    description="Across all history"
                                />

                                <HistoryStat
                                    icon={
                                        <Target className="h-5 w-5" />
                                    }
                                    label="DAILY AVERAGE"
                                    value={
                                        statistics.average
                                            ? formatLitres(
                                                statistics.average,
                                            )
                                            : '0 L'
                                    }
                                    description="Average per recorded day"
                                />

                                <HistoryStat
                                    icon={
                                        <Trophy className="h-5 w-5" />
                                    }
                                    label="GOAL DAYS"
                                    value={statistics.completedDays.toString()}
                                    description={
                                        dailyGoal
                                            ? `Target: ${formatLitres(
                                                dailyGoal,
                                            )}`
                                            : 'Goal not configured'
                                    }
                                />
                            </section>

                            {/* History */}
                            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
                                <div className="border-b border-white/10 px-5 py-5 sm:px-7">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="text-xs font-bold tracking-[0.2em] text-cyan-400">
                                                ALL TIME RECORD
                                            </div>

                                            <h2 className="mt-1 text-xl font-black">
                                                Hydration Timeline
                                            </h2>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                            {history.length}{' '}
                                            {history.length === 1
                                                ? 'day'
                                                : 'days'}{' '}
                                            recorded
                                        </div>
                                    </div>
                                </div>

                                {history.length === 0 ? (
                                    <EmptyHistory />
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {history.map(
                                            (entry, index) => {
                                                const total = Number(
                                                    entry.total_ml || 0,
                                                );

                                                const progress =
                                                    getProgress(
                                                        total,
                                                        dailyGoal,
                                                    );

                                                const relative =
                                                    getRelativeLabel(
                                                        entry.date,
                                                    );

                                                const isToday =
                                                    getDateOnly() ===
                                                    entry.date;

                                                const reachedGoal =
                                                    dailyGoal > 0 &&
                                                    total >= dailyGoal;

                                                return (
                                                    <motion.div
                                                        key={`${entry.date}-${index}`}
                                                        initial={{
                                                            opacity: 0,
                                                            x: -12,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            x: 0,
                                                        }}
                                                        transition={{
                                                            delay:
                                                                Math.min(
                                                                    index * 0.025,
                                                                    0.4,
                                                                ),
                                                        }}
                                                        className="group px-5 py-5 transition hover:bg-cyan-400/[0.02] sm:px-7"
                                                    >
                                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                                                            {/* Date */}
                                                            <div className="flex min-w-0 items-center gap-4 lg:w-64">
                                                                <div
                                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${isToday
                                                                            ? 'border-cyan-400/30 bg-cyan-400/10'
                                                                            : 'border-white/10 bg-white/[0.03]'
                                                                        }`}
                                                                >
                                                                    <CalendarDays
                                                                        className={`h-5 w-5 ${isToday
                                                                                ? 'text-cyan-400'
                                                                                : 'text-slate-500'
                                                                            }`}
                                                                    />
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div className="truncate font-bold text-slate-200">
                                                                        {formatHistoryDate(
                                                                            entry.date,
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-1 flex items-center gap-2">
                                                                        {relative && (
                                                                            <span
                                                                                className={`text-[10px] font-black tracking-widest ${isToday
                                                                                        ? 'text-cyan-400'
                                                                                        : 'text-slate-600'
                                                                                    }`}
                                                                            >
                                                                                {relative}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Amount */}
                                                            <div className="flex items-center gap-4 lg:w-52">
                                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/10">
                                                                    <Droplets className="h-5 w-5 text-blue-400" />
                                                                </div>

                                                                <div>
                                                                    <div className="text-xl font-black text-white">
                                                                        {formatLitres(
                                                                            total,
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-1 text-xs text-slate-600">
                                                                        {formatMl(
                                                                            total,
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Progress */}
                                                            <div className="flex-1">
                                                                <div className="mb-2 flex items-center justify-between text-xs">
                                                                    <span className="font-semibold text-slate-600">
                                                                        DAILY GOAL
                                                                    </span>

                                                                    <span
                                                                        className={
                                                                            reachedGoal
                                                                                ? 'font-bold text-emerald-400'
                                                                                : 'font-bold text-slate-500'
                                                                        }
                                                                    >
                                                                        {dailyGoal > 0
                                                                            ? `${progress}%`
                                                                            : '--'}
                                                                    </span>
                                                                </div>

                                                                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                                                                    <motion.div
                                                                        initial={{
                                                                            width: 0,
                                                                        }}
                                                                        animate={{
                                                                            width: `${dailyGoal >
                                                                                    0
                                                                                    ? progress
                                                                                    : 0
                                                                                }%`,
                                                                        }}
                                                                        transition={{
                                                                            duration:
                                                                                0.6,
                                                                            delay:
                                                                                Math.min(
                                                                                    index *
                                                                                    0.025,
                                                                                    0.4,
                                                                                ),
                                                                        }}
                                                                        className={`h-full rounded-full ${reachedGoal
                                                                                ? 'bg-emerald-400'
                                                                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                                                            }`}
                                                                    />
                                                                </div>

                                                                {dailyGoal > 0 && (
                                                                    <div className="mt-2 text-[10px] font-semibold text-slate-700">
                                                                        Goal:{' '}
                                                                        {formatLitres(
                                                                            dailyGoal,
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Status */}
                                                            <div className="flex items-center justify-between gap-4 lg:w-36 lg:justify-end">
                                                                {reachedGoal ? (
                                                                    <div className="flex items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 text-[10px] font-black tracking-widest text-emerald-400">
                                                                        <Trophy className="h-3.5 w-3.5" />
                                                                        GOAL MET
                                                                    </div>
                                                                ) : (
                                                                    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] font-black tracking-widest text-slate-600">
                                                                        {dailyGoal > 0
                                                                            ? `${Math.max(
                                                                                dailyGoal -
                                                                                total,
                                                                                0,
                                                                            ).toLocaleString()} ML LEFT`
                                                                            : 'RECORDED'}
                                                                    </div>
                                                                )}

                                                                <ChevronRight className="h-5 w-5 text-slate-700 transition group-hover:translate-x-1 group-hover:text-cyan-400" />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* Footer information */}
                            {history.length > 0 && (
                                <div className="mt-5 flex flex-col gap-2 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Showing every recorded hydration
                                        day.
                                    </span>

                                    <span className="flex items-center gap-2">
                                        <Droplets className="h-3.5 w-3.5 text-cyan-500/50" />
                                        New days appear automatically when
                                        water is logged.
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </AppShell>
    );
}

function HistoryStat({
    icon,
    label,
    value,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 10,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-cyan-400/15"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                {icon}
            </div>

            <div className="mt-5 text-[10px] font-bold tracking-[0.18em] text-slate-600">
                {label}
            </div>

            <div className="mt-1 truncate text-2xl font-black text-slate-100">
                {value}
            </div>

            <div className="mt-1 text-xs text-slate-600">
                {description}
            </div>
        </motion.div>
    );
}

function LoadingHistory() {
    return (
        <div className="animate-pulse">
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="h-36 rounded-3xl bg-white/[0.025]" />
                <div className="h-36 rounded-3xl bg-white/[0.025]" />
                <div className="h-36 rounded-3xl bg-white/[0.025]" />
                <div className="h-36 rounded-3xl bg-white/[0.025]" />
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/5">
                <div className="h-24 bg-white/[0.025]" />

                <div className="divide-y divide-white/5">
                    {Array.from({
                        length: 6,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="h-28 bg-white/[0.015]"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function EmptyHistory() {
    return (
        <div className="flex min-h-[430px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/10 bg-cyan-400/5">
                <History className="h-9 w-9 text-cyan-400" />
            </div>

            <h3 className="mt-6 text-xl font-black">
                No Hydration History
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                Once you start logging water, every day will
                automatically appear here.
            </p>

            <Link
                href="/hydration"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-black text-black transition hover:bg-cyan-300"
            >
                <Droplets className="h-4 w-4" />
                Log Water
            </Link>
        </div>
    );
}