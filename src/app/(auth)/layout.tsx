
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary/50">
            {children}
        </div>
    );
}
