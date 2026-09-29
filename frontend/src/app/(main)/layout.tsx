export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-dvh w-screen max-w-full overflow-hidden flex flex-col overscroll-none">
      {children}
    </div>
  );
}

