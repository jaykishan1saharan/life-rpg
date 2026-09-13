import AuthGuard from '../../src/components/auth/AuthGuard';

export default function CharacterLayout({
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