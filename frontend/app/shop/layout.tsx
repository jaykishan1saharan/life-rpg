import AuthGuard from '../../src/components/auth/AuthGuard';

export default function RewardShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            {children}
        </AuthGuard>
    );
}