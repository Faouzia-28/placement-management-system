import React, { useState } from 'react'
import { 
  PlusIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

const Drives = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const drives = [
    {
      id: 1,
      company: 'Google',
      position: 'Software Engineer',
      type: 'Full-time',
      status: 'active',
      date: 'Dec 15, 2024',
      location: 'Campus',
      applicants: 45,
      selected: 12,
      package: '₹25-30 LPA',
      logo: 'G',
      color: 'bg-blue-500'
    },
    {
      id: 2,
      company: 'Microsoft',
      position: 'Product Manager',
      type: 'Full-time',
      status: 'upcoming',
      date: 'Dec 18, 2024',
      location: 'Virtual',
      applicants: 32,
      selected: 0,
      package: '₹22-28 LPA',
      logo: 'M',
      color: 'bg-green-500'
    },
    {
      id: 3,
      company: 'Amazon',
      position: 'SDE Intern',
      type: 'Internship',
      status: 'completed',
      date: 'Nov 22, 2024',
      location: 'Campus',
      applicants: 67,
      selected: 8,
      package: '₹50k/month',
      logo: 'A',
      color: 'bg-orange-500'
    },
    {
      id: 4,
      company: 'Meta',
      position: 'Frontend Developer',
      type: 'Full-time',
      status: 'active',
      date: 'Dec 20, 2024',
      location: 'Virtual',
      applicants: 28,
      selected: 5,
      package: '₹30-35 LPA',
      logo: 'F',
      color: 'bg-blue-600'
    }
  ]

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      upcoming: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return badges[status] || badges.active
  }

  const filteredDrives = drives.filter(drive => {
    const matchesSearch = drive.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drive.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || drive.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement Drives</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and track all placement drives
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-button transition-all duration-200 flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Drive
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search drives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Drives Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDrives.map((drive, index) => (
          <div 
            key={drive.id}
            className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 card-hover animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${drive.color} rounded-xl flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{drive.logo}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{drive.company}</h3>
                  <p className="text-sm text-gray-600">{drive.position}</p>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(drive.status)}`}>
                      {drive.status.charAt(0).toUpperCase() + drive.status.slice(1)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{drive.type}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
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
                {drive.applicants} applicants • {drive.selected} selected
              </div>
            </div>

            {/* Package */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Package</span>
                <span className="text-lg font-semibold text-gray-900">{drive.package}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Selection Progress</span>
                <span>{Math.round((drive.selected / drive.applicants) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(drive.selected / drive.applicants) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDrives.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BriefcaseIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No drives found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
          <button className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-button transition-all duration-200">
            Create New Drive
          </button>
        </div>
      )}
    </div>
  )
}

export default Drives