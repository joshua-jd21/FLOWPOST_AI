import { Card } from '../components/ui';

export default function ConnectedAccounts() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Connected Accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Link your social media accounts to publish content directly.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 'Instagram', color: 'bg-pink-100 text-pink-600', icon: '📷' },
          { name: 'Twitter / X', color: 'bg-sky-100 text-sky-600', icon: '🐦' },
          { name: 'LinkedIn', color: 'bg-blue-100 text-blue-600', icon: '💼' },
          { name: 'Facebook', color: 'bg-indigo-100 text-indigo-600', icon: '👤' },
          { name: 'TikTok', color: 'bg-gray-100 text-gray-600', icon: '🎵' },
          { name: 'YouTube', color: 'bg-red-100 text-red-600', icon: '▶️' },
        ].map((platform) => (
          <Card key={platform.name} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${platform.color}`}
                >
                  {platform.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{platform.name}</p>
                  <p className="text-xs text-gray-400">Not connected</p>
                </div>
              </div>
              <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm">
                Connect
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}