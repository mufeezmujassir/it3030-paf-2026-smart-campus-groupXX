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

                <Route path="/student" element={
                    <RoleBasedRoute allowedRoles={['STUDENT']}>
                        <div className="p-8">Student Dashboard</div>
                    </RoleBasedRoute>
                } />
                <Route path="/staff" element={
                    <RoleBasedRoute allowedRoles={['STAFF']}>
                        <div className="p-8">Staff Dashboard</div>
                    </RoleBasedRoute>
                } />
                <Route path="/technician" element={
                    <RoleBasedRoute allowedRoles={['TECHNICIAN']}>
                        <div className="p-8">Technician Dashboard</div>
                    </RoleBasedRoute>
                } />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;
