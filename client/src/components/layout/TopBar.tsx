import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();

  const getPlanBadgeColor = (plan?: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-indigo-100 text-indigo-800';
      case 'business':
        return 'bg-violet-100 text-violet-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: page title / empty for now — each page can add its own */}
        <div className="flex items-center gap-3">
          {/* Mobile logo (visible only on small screens) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 text-xs font-bold text-white">
              F
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900">
              FlowPost <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">AI</span>
            </span>
          </div>
        </div>

        {/* Right: user info */}
        <div className="flex items-center gap-4">
          {/* Plan badge */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getPlanBadgeColor(user?.plan)}`}
          >
            {user?.plan || 'free'}
          </span>

          {/* User info */}
          <div className="hidden items-center gap-3 sm:flex">
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}