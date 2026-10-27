import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from './api/types';
import { useAuth } from './auth/AuthContext';
import { BrandMark } from './components/Brand';
import { Layout } from './components/Layout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AuditLog from './pages/admin/AuditLog';
import Plans from './pages/admin/Plans';
import Reports from './pages/admin/Reports';
import Subscriptions from './pages/admin/Subscriptions';
import Trainers from './pages/admin/Trainers';
import Users from './pages/admin/Users';
import ForgotPassword from './pages/ForgotPassword';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MemberDashboard from './pages/member/MemberDashboard';
import MyPackages from './pages/member/MyPackages';
import MyPlan from './pages/member/MyPlan';
import MyProgress from './pages/member/MyProgress';
import Policies from './pages/Policies';
import Register from './pages/Register';
import { Forbidden, NotFound } from './pages/Errors';
import Exercises from './pages/shared/Exercises';
import MemberDetail from './pages/shared/MemberDetail';
import Members from './pages/shared/Members';
import Profile from './pages/shared/Profile';
import Schedules from './pages/shared/Schedules';
import PlanEditor from './pages/shared/PlanEditor';
import WorkoutPlans from './pages/shared/WorkoutPlans';
import TrainerDashboard from './pages/trainer/TrainerDashboard';

function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="stack" style={{ alignItems: 'center' }}>
        <div style={{ animation: 'floaty 1.6s ease-in-out infinite' }}><BrandMark size={52} /></div>
        <span className="muted small">Đang tải GymFlow…</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Lớp chặn phía giao diện; backend vẫn kiểm tra quyền ở mọi API. */
function Only({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? <>{children}</> : <Forbidden />;
}

function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'TRAINER') return <TrainerDashboard />;
  return <MemberDashboard />;
}

const STAFF: Role[] = ['ADMIN', 'TRAINER'];
const ADMIN: Role[] = ['ADMIN'];
const MEMBER: Role[] = ['MEMBER'];

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={loading ? <Splash /> : user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={loading ? <Splash /> : user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/policies" element={<Policies />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/me/schedule" element={<Only roles={MEMBER}><Schedules /></Only>} />
        <Route path="/me/plan" element={<Only roles={MEMBER}><MyPlan /></Only>} />
        <Route path="/me/progress" element={<Only roles={MEMBER}><MyProgress /></Only>} />
        <Route path="/me/packages" element={<Only roles={MEMBER}><MyPackages /></Only>} />
        <Route path="/schedules" element={<Only roles={STAFF}><Schedules /></Only>} />
        <Route path="/members" element={<Only roles={STAFF}><Members /></Only>} />
        <Route path="/members/:id" element={<Only roles={STAFF}><MemberDetail /></Only>} />
        <Route path="/workout-plans" element={<Only roles={STAFF}><WorkoutPlans /></Only>} />
        <Route path="/workout-plans/new" element={<Only roles={STAFF}><PlanEditor /></Only>} />
        <Route path="/workout-plans/:id" element={<Only roles={STAFF}><PlanEditor /></Only>} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/trainers" element={<Only roles={ADMIN}><Trainers /></Only>} />
        <Route path="/plans" element={<Only roles={ADMIN}><Plans /></Only>} />
        <Route path="/subscriptions" element={<Only roles={ADMIN}><Subscriptions /></Only>} />
        <Route path="/reports" element={<Only roles={ADMIN}><Reports /></Only>} />
        <Route path="/users" element={<Only roles={ADMIN}><Users /></Only>} />
        <Route path="/audit-logs" element={<Only roles={ADMIN}><AuditLog /></Only>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
