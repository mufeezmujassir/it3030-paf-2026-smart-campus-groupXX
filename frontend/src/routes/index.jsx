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
import TicketList from '../pages/tickets/TicketList';
import CreateTicket from '../pages/tickets/CreateTicket';
import TicketDetail from '../pages/tickets/TicketDetail';
import TechnicianDashboard from '../pages/technician/TechnicianDashboard';
import AdminBookingManagement from '../pages/admin/AdminBookingManagement';
import MyBookings from '../pages/MyBookings';

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

                {/* Ticket Routes */}
                <Route path="/tickets" element={<TicketList />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/tickets/create" element={
                    <RoleBasedRoute allowedRoles={['STUDENT', 'STAFF']}>
                        <CreateTicket />
                    </RoleBasedRoute>
                } />

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
                </Route>

                {/* Technician Routes */}
                <Route path="/technician" element={
                    <RoleBasedRoute allowedRoles={['TECHNICIAN']}>
                        <TechnicianDashboard />
                    </RoleBasedRoute>
                } />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;