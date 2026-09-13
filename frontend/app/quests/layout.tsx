import AuthGuard from '../../src/components/auth/AuthGuard';

export default function QuestsLayout({
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