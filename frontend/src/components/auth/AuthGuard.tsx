'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { app } from '../../lib/firebase';

import {
    getAuth,
} from 'firebase/auth';

const auth = getAuth(app);

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (firebaseUser) => {
                if (!firebaseUser) {
                    router.replace('/login');
                    return;
                }

                setUser(firebaseUser);
                setChecking(false);
            },
        );

        return () => unsubscribe();
    }, [router]);

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050508] text-white">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

                    <p className="text-sm font-bold tracking-widest text-cyan-400">
                        LOADING CHARACTER...
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}