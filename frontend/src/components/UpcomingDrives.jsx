import React from 'react'
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  UsersIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const UpcomingDrives = () => {
  const drives = [
    {
      id: 1,
      company: 'Google',
      position: 'Software Engineer',
      date: 'Dec 15, 2024',
      location: 'Campus',
      applicants: 45,
      logo: 'G',
      color: 'bg-blue-500'
    },
    {
      id: 2,
      company: 'Microsoft',
      position: 'Product Manager',
      date: 'Dec 18, 2024',
      location: 'Virtual',
      applicants: 32,
      logo: 'M',
      color: 'bg-green-500'
    },
    {
      id: 3,
      company: 'Amazon',
      position: 'SDE Intern',
      date: 'Dec 22, 2024',
      location: 'Campus',
      applicants: 67,
      logo: 'A',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Upcoming Drives</h2>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200">
          View all
        </button>
      </div>
      
      <div className="space-y-4">
        {drives.map((drive, index) => (
          <div 
            key={drive.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-soft transition-all duration-200 animate-slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${drive.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{drive.logo}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{drive.company}</h3>
                  <p className="text-sm text-gray-600">{drive.position}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-primary-600 transition-colors duration-200">
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                {drive.date}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4 mr-2" />
                {drive.location}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <UsersIcon className="h-4 w-4 mr-2" />
                {drive.applicants} applicants
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UpcomingDrives