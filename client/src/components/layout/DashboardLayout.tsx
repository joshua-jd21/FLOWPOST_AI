import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        {/* Spacer for mobile bottom nav */}
        <div className="h-16 lg:hidden" />
      </div>
    </div>
  );
}