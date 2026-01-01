import { Star } from 'lucide-react';

export default function OverviewTab({ stats, loading, formatTime }) {
  // Safety check - return early if no stats
  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading dashboard data...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const {
    openTickets = 0,
    onHoldTickets = 0,
    closedTickets = 0,
    avgResponseTime = 0,
    firstResponseTime = 0,
    avgResolutionTime = 0,
    ratingData = {
      averageRating: 0,
      totalFeedbacks: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    volumeData = []
  } = stats;

  return (
    <div className="space-y-6">
      {/* Key Metrics - Top Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard 
          value={openTickets} 
          label="Open Tickets" 
        />
        <MetricCard 
          value={onHoldTickets} 
          label="On Hold Tickets" 
        />
        <MetricCard 
          value={closedTickets} 
          label="Closed Tickets" 
        />
        <MetricCard 
          value={formatTime(avgResponseTime)} 
          label="Average Response Time" 
        />
        <MetricCard 
          value={formatTime(avgResolutionTime)} 
          label="Average Resolution Time" 
        />
      </div>

      {/* Charts Row - Middle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Ratings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Customer Ratings
          </h3>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                {ratingData.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 transition-all ${
                      star <= Math.round(ratingData.averageRating)
                        ? 'text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {ratingData.totalFeedbacks} feedback{ratingData.totalFeedbacks !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingData.ratingDistribution[rating] || 0;
                const percentage = ratingData.totalFeedbacks > 0
                  ? (count / ratingData.totalFeedbacks) * 100
                  : 0;
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{rating}</span>
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                    </div>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Response Times */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Response & Resolution Times
          </h3>
          <div className="space-y-4">
            <TimeBar 
              label="First Response Time" 
              value={formatTime(firstResponseTime || avgResponseTime)} 
            />
            <TimeBar 
              label="Average Response Time" 
              value={formatTime(avgResponseTime)} 
            />
            <TimeBar 
              label="Average Resolution Time" 
              value={formatTime(avgResolutionTime)} 
            />
          </div>
        </div>
      </div>

      {/* Tickets Volume - Bottom Row */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Tickets Volume
        </h3>
        <div className="h-48 flex items-end gap-1">
          {volumeData.length > 0 ? (
            volumeData.map((item, idx) => {
              const maxCount = Math.max(...volumeData.map(d => d.count || 0), 1);
              const height = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 5) : 5;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`${item.date}: ${item.count || 0} tickets`}
                ></div>
              );
            })
          ) : (
            <div className="w-full text-center text-sm text-slate-400 py-8">
              No data available
            </div>
          )}
        </div>
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
          {volumeData.length > 0 && (
            <div>
              Total: {volumeData.reduce((sum, d) => sum + (d.count || 0), 0)} tickets
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ value, label, icon }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        {icon && <div>{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

function TimeBar({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
    </div>
  );
}
