import React from 'react'
import { 
  UserPlusIcon, 
  BriefcaseIcon, 
  CheckCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: 'student_registered',
      title: 'New student registration',
      description: 'John Doe registered for Computer Science program',
      time: '2 minutes ago',
      icon: UserPlusIcon,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50'
    },
    {
      id: 2,
      type: 'drive_created',
      title: 'New placement drive created',
      description: 'Google Software Engineer drive scheduled for next week',
      time: '15 minutes ago',
      icon: BriefcaseIcon,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50'
    },
    {
      id: 3,
      type: 'application_approved',
      title: 'Application approved',
      description: 'Sarah Wilson approved for Microsoft internship',
      time: '1 hour ago',
      icon: CheckCircleIcon,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50'
    },
    {
      id: 4,
      type: 'interview_scheduled',
      title: 'Interview scheduled',
      description: 'Technical interview for Amazon SDE role',
      time: '2 hours ago',
      icon: ClockIcon,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50'
    },
    {
      id: 5,
      type: 'profile_viewed',
      title: 'Profile viewed by recruiter',
      description: 'Meta recruiter viewed Alex Johnson\'s profile',
      time: '3 hours ago',
      icon: EyeIcon,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200">
          View all
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={activity.id} 
            className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 animate-slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`flex-shrink-0 p-2 rounded-lg ${activity.iconBg}`}>
              <activity.icon className={`h-5 w-5 ${activity.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {activity.title}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500">
                {activity.time}
              </p>
            </div>
            <div className="flex-shrink-0">
              <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentActivity