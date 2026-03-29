// src/routes/index.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from '../pages/Login';
import OTPVerification from '../pages/OTPVerification';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProfileSettings from '../pages/ProfileSettings';
import OAuth2RedirectHandler from '../pages/OAuth2RedirectHandler';
import DashboardHome from '../pages/admin/DashboardHome';
import UserManagement from '../pages/admin/UserManagement';
import AdminResourceManagement from '../pages/admin/AdminResourceManagement';
import Resources from '../pages/Resources';
import ResourceDetail from '../pages/ResourceDetail';
import DashboardLayout from '../components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';
import AdminBookingManagement from '../pages/admin/AdminBookingManagement';
import MyBookings from '../pages/MyBookings';  // Add this import

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/otp" element={<OTPVerification />} />
            <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />

            {/* Protected Routes Wrapper */}
            <Route element={
                <ProtectedRoute>
                    <DashboardLayout />
                </ProtectedRoute>
            }>
                <Route path="/settings" element={<ProfileSettings />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/resources/:id" element={<ResourceDetail />} />

                {/* Admin Nested Routes */}
                <Route path="/admin/*" element={
                    <RoleBasedRoute allowedRoles={['ADMIN']}>
                        <Outlet />
                    </RoleBasedRoute>
                }>
                    <Route index element={<DashboardHome />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="resources" element={<AdminResourceManagement />} />
                    <Route path="assets" element={<AdminResourceManagement />} />
                    <Route path="schedules" element={<AdminResourceManagement />} />
                    <Route path="bookings" element={<AdminBookingManagement />} />
                </Route>

                {/* Student Routes */}
                <Route path="/student" element={
                    <RoleBasedRoute allowedRoles={['STUDENT']}>
                        <Outlet />
                    </RoleBasedRoute>
                }>
                    <Route index element={<div className="p-8">Student Dashboard</div>} />
                    <Route path="my-bookings" element={<MyBookings />} />
                    <Route path="courses" element={<div className="p-8">My Courses</div>} />
                    <Route path="grades" element={<div className="p-8">Grades</div>} />
                    <Route path="tickets" element={<div className="p-8">Help Desk</div>} />
                </Route>

                {/* Staff Routes */}
                <Route path="/staff" element={
                    <RoleBasedRoute allowedRoles={['STAFF']}>
                        <Outlet />
                    </RoleBasedRoute>
                }>
                    <Route index element={<div className="p-8">Staff Dashboard</div>} />
                    <Route path="my-bookings" element={<MyBookings />} />
                    <Route path="manage" element={<div className="p-8">Management</div>} />
                    <Route path="department" element={<div className="p-8">My Department</div>} />
                    <Route path="tickets" element={<div className="p-8">Service Requests</div>} />
                </Route>

                {/* Technician Routes */}
                <Route path="/technician" element={
                    <RoleBasedRoute allowedRoles={['TECHNICIAN']}>
                        <Outlet />
                    </RoleBasedRoute>
                }>
                    <Route index element={<div className="p-8">Technician Dashboard</div>} />
                    <Route path="my-bookings" element={<MyBookings />} />
                    <Route path="maintenance" element={<div className="p-8">Maintenance</div>} />
                    <Route path="safety" element={<div className="p-8">Safety Logs</div>} />
                    <Route path="environment" element={<div className="p-8">Environment</div>} />
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;