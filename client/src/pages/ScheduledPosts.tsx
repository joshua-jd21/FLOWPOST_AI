import { Card } from '../components/ui';

export default function ScheduledPosts() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Scheduled Posts</h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your scheduled content calendar.
          </p>
        </div>
      </div>

      <Card className="p-12">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="mb-4 h-16 w-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No scheduled posts</h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Posts you schedule will appear here. Create a post and set a future
            publish time to see it on this calendar.
          </p>
        </div>
      </Card>
    </div>
  );
}