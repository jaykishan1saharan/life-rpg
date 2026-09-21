'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export default function Home() {

    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        let listener:
            { remove: () => Promise<void> } | null = null;

        const checkNativeAuth = async () => {
            try {
                if (!Capacitor.isNativePlatform()) {
                    return;
                }

                listener =
                    await FirebaseAuthentication.addListener(
                        'authStateChange',
                        (change) => {
                            if (cancelled) {
                                return;
                            }

                            if (change.user) {
                                router.replace('/dashboard');
                            }
                        },
                    );

                const current =
                    await FirebaseAuthentication.getCurrentUser();

                if (cancelled) {
                    return;
                }

                if (current.user) {
                    router.replace('/dashboard');
                    return;
                }
            } catch (error) {
                console.error(
                    '[ROOT AUTH] Failed:',
                    error,
                );
            }
        };

        checkNativeAuth();

        return () => {
            cancelled = true;

            if (listener) {
                listener.remove();
            }
        };
    }, [router]);

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#050508] text-white">

            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[10%] top-[15%] h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
                <div className="absolute right-[10%] top-[30%] h-80 w-80 rounded-full bg-purple-500/10 blur-[140px]" />
                <div className="absolute bottom-0 left-[40%] h-72 w-72 rounded-full bg-blue-500/10 blur-[130px]" />

                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>

            {/* Navigation */}
            <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 lg:px-20">

                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-2xl">
                        ⚔️
                    </div>

                    <div>
                        <h1 className="text-lg font-black tracking-[0.3em]">
                            LIFE RPG
                        </h1>

                        <p className="text-[9px] font-bold tracking-[0.3em] text-cyan-400">
                            REAL LIFE • REAL XP
                        </p>
                    </div>
                </div>

                <div className="hidden items-center gap-3 sm:flex">
                    <Link
                        href="/login"
                        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                    >
                        Login
                    </Link>

                    <Link
                        href="/register"
                        className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300"
                    >
                        Register
                    </Link>
                </div>
            </header>

            {/* Main */}
            <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-7xl items-center px-6 pb-16 pt-8 md:px-12 lg:px-20">

                <div className="grid w-full items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">

                    {/* LEFT */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs font-bold tracking-widest text-cyan-300">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                            YOUR LIFE. YOUR QUEST.
                        </div>

                        <h2 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-8xl">
                            LEVEL UP
                            <br />

                            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                                YOUR LIFE.
                            </span>
                        </h2>

                        <p className="mt-7 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
                            Turn the things you need to do into quests.
                            Complete them, earn XP, build your character,
                            maintain your streak and become the strongest
                            version of yourself.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                <span className="text-lg">⚔️</span>
                                <span className="ml-2 text-sm text-gray-400">
                                    Quests
                                </span>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                <span className="text-lg">⚡</span>
                                <span className="ml-2 text-sm text-gray-400">
                                    XP & Levels
                                </span>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                <span className="text-lg">🔥</span>
                                <span className="ml-2 text-sm text-gray-400">
                                    Streaks
                                </span>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                <span className="text-lg">🪙</span>
                                <span className="ml-2 text-sm text-gray-400">
                                    Rewards
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT AUTH CARD */}
                    <motion.div
                        initial={{ opacity: 0, x: 30, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                        className="mx-auto w-full max-w-md"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#0b0c12]/90 p-7 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-9">

                            {/* Card glow */}
                            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

                            <div className="relative">

                                <div className="mb-8">
                                    <p className="text-xs font-bold tracking-[0.3em] text-cyan-400">
                                        PLAYER ACCESS
                                    </p>

                                    <h3 className="mt-3 text-3xl font-black">
                                        Enter the RPG
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-gray-500">
                                        Your quests, XP and character are waiting.
                                    </p>
                                </div>

                                <div className="space-y-3">

                                    <Link
                                        href="/login"
                                        className="group flex w-full items-center justify-between rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-4 transition hover:border-cyan-300 hover:bg-cyan-400/15"
                                    >
                                        <div>
                                            <p className="font-black text-cyan-300">
                                                LOGIN
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                Continue your adventure
                                            </p>
                                        </div>

                                        <span className="text-xl transition-transform group-hover:translate-x-1">
                                            →
                                        </span>
                                    </Link>

                                    <Link
                                        href="/register"
                                        className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-purple-400/30 hover:bg-purple-400/5"
                                    >
                                        <div>
                                            <p className="font-black text-white">
                                                CREATE CHARACTER
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                Start a new adventure
                                            </p>
                                        </div>

                                        <span className="text-xl text-purple-300 transition-transform group-hover:translate-x-1">
                                            →
                                        </span>
                                    </Link>

                                </div>

                                <div className="my-7 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <span className="text-[10px] font-bold tracking-widest text-gray-600">
                                        NEW PLAYER?
                                    </span>
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>

                                <p className="text-center text-sm text-gray-500">
                                    Don't have an account?{' '}
                                    <Link
                                        href="/register"
                                        className="font-bold text-cyan-400 hover:text-cyan-300"
                                    >
                                        Sign up
                                    </Link>
                                </p>

                                <p className="mt-2 text-center text-xs text-gray-700">
                                    Already have an account?{' '}
                                    <Link
                                        href="/login"
                                        className="text-gray-400 hover:text-white"
                                    >
                                        Log in
                                    </Link>
                                </p>

                            </div>
                        </div>
                    </motion.div>

                </div>
            </section>
        </main>
    );
}