import React, { useState } from 'react'
import { 
  PlusIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')

  const students = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@university.edu',
      phone: '+91 9876543210',
      department: 'Computer Science',
      year: '4th Year',
      cgpa: '8.5',
      status: 'placed',
      company: 'Google',
      avatar: 'JD'
    },
    {
      id: 2,
      name: 'Sarah Wilson',
      email: 'sarah.wilson@university.edu',
      phone: '+91 9876543211',
      department: 'Information Technology',
      year: '3rd Year',
      cgpa: '9.2',
      status: 'active',
      company: null,
      avatar: 'SW'
    },
    {
      id: 3,
      name: 'Alex Johnson',
      email: 'alex.johnson@university.edu',
      phone: '+91 9876543212',
      department: 'Electronics',
      year: '4th Year',
      cgpa: '7.8',
      status: 'interviewing',
      company: 'Microsoft',
      avatar: 'AJ'
    },
    {
      id: 4,
      name: 'Emily Chen',
      email: 'emily.chen@university.edu',
      phone: '+91 9876543213',
      department: 'Computer Science',
      year: '2nd Year',
      cgpa: '8.9',
      status: 'active',
      company: null,
      avatar: 'EC'
    },
    {
      id: 5,
      name: 'Michael Brown',
      email: 'michael.brown@university.edu',
      phone: '+91 9876543214',
      department: 'Mechanical',
      year: '4th Year',
      cgpa: '8.1',
      status: 'placed',
      company: 'Tesla',
      avatar: 'MB'
    },
    {
      id: 6,
      name: 'Lisa Davis',
      email: 'lisa.davis@university.edu',
      phone: '+91 9876543215',
      department: 'Information Technology',
      year: '3rd Year',
      cgpa: '8.7',
      status: 'active',
      company: null,
      avatar: 'LD'
    }
  ]

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-blue-100 text-blue-800',
      placed: 'bg-green-100 text-green-800',
      interviewing: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || badges.active
  }

  const getStatusText = (status) => {
    const texts = {
      active: 'Active',
      placed: 'Placed',
      interviewing: 'Interviewing',
      inactive: 'Inactive'
    }
    return texts[status] || 'Active'
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterDepartment === 'all' || student.department === filterDepartment
    return matchesSearch && matchesFilter
  })

  const departments = [...new Set(students.map(student => student.department))]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage student profiles and track placement status
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-button transition-all duration-200 flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Placed</p>
              <p className="text-2xl font-bold text-gray-900">{students.filter(s => s.status === 'placed').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <UserIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Interviewing</p>
              <p className="text-2xl font-bold text-gray-900">{students.filter(s => s.status === 'interviewing').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{students.filter(s => s.status === 'active').length}</p>
            </div>
          </div>
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
              placeholder="Search students..."
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
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student, index) => (
          <div 
            key={student.id}
            className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 card-hover animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{student.avatar}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.department}</p>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(student.status)}`}>
                      {getStatusText(student.status)}
                    </span>
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
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {student.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 mr-2" />
                {student.phone}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <AcademicCapIcon className="h-4 w-4 mr-2" />
                {student.year} • CGPA: {student.cgpa}
              </div>
            </div>

            {/* Company */}
            {student.company && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Company</span>
                  <span className="text-sm font-semibold text-gray-900">{student.company}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
          <button className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-button transition-all duration-200">
            Add New Student
          </button>
        </div>
      )}
    </div>
  )
}

export default Students