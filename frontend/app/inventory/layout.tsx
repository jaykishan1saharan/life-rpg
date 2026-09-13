import AuthGuard from '../../src/components/auth/AuthGuard';

export default function InventoryLayout({
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