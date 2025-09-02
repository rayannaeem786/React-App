import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customer from './pages/Customer';
import OrderConfirmation from './pages/OrderConfirmation';
import MenuManagement from './pages/Menu';
import Settings from './pages/Settings';
import OrderHistory from './pages/OrderHistory';
import KitchenDisplay from './pages/KitchenDisplay';
import RiderDisplay from './pages/RiderDisplay';
import SuperAdmin from './pages/SuperAdmin';

function ProtectedRoute({ allowedRoles, redirectTo, children }) {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role') || '';
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  const [tenantBlocked, setTenantBlocked] = useState(null);

  useEffect(() => {
    // Log current state for debugging
    console.log('ProtectedRoute check:', { userRole, tenantId, token: token ? 'present' : 'missing', allowedRoles, redirectTo });

    // Check if token is missing
    if (!token) {
      console.error('No token found, redirecting to login');
      navigate('/');
      return;
    }

    // Check if tenantId is missing for non-superadmin users
    if (!tenantId && userRole !== 'superadmin') {
      console.error('No tenantId for non-superadmin user, redirecting to login', { userRole });
      navigate('/');
      return;
    }

    // Check tenant blocked status for non-superadmin users
    if (userRole !== 'superadmin') {
      axios.get(`http://localhost:5000/api/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          if (response.data.blocked) {
            console.error('Tenant is blocked, redirecting to login', { tenantId, userRole });
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('tenantId');
            localStorage.removeItem('userId');
            setTenantBlocked(true);
            navigate('/', { state: { error: 'Tenant is blocked' } });
          } else {
            setTenantBlocked(false);
          }
        })
        .catch(error => {
          console.error('Failed to verify tenant status, redirecting to login', {
            error: error.response?.data || error.message,
            tenantId,
            userRole
          });
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('tenantId');
          localStorage.removeItem('userId');
          setTenantBlocked(true);
          navigate('/', { state: { error: 'Invalid tenant' } });
        });
    } else {
      setTenantBlocked(false); // Superadmin doesn't need tenant check
    }

    // Check if userRole is allowed (only if tenant is not blocked)
    if (tenantBlocked === false && !allowedRoles.includes(userRole)) {
      console.error('Unauthorized access attempt', { userRole, allowedRoles });
      navigate(redirectTo);
    }
  }, [userRole, allowedRoles, redirectTo, token, tenantId, navigate, tenantBlocked]);

  return token && allowedRoles.includes(userRole) && tenantBlocked === false ? children : null;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={['manager']}
              redirectTo={localStorage.getItem('role') === 'kitchen' ? '/kitchen' : localStorage.getItem('role') === 'rider' ? '/rider' : localStorage.getItem('role') === 'superadmin' ? '/superadmin' : '/'}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={['kitchen']} redirectTo="/">
              <KitchenDisplay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider"
          element={
            <ProtectedRoute allowedRoles={['rider']} redirectTo="/">
              <RiderDisplay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['superadmin']} redirectTo="/">
              <SuperAdmin />
            </ProtectedRoute>
          }
        />
        <Route path="/customer/:tenantId" element={<Customer />} />
        <Route path="/order-confirmation/:tenantId/:orderId" element={<OrderConfirmation />} />
        <Route
          path="/menu"
          element={
            <ProtectedRoute
              allowedRoles={['manager']}
              redirectTo={localStorage.getItem('role') === 'kitchen' ? '/kitchen' : localStorage.getItem('role') === 'rider' ? '/rider' : localStorage.getItem('role') === 'superadmin' ? '/superadmin' : '/'}
            >
              <MenuManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              allowedRoles={['manager']}
              redirectTo={localStorage.getItem('role') === 'kitchen' ? '/kitchen' : localStorage.getItem('role') === 'rider' ? '/rider' : localStorage.getItem('role') === 'superadmin' ? '/superadmin' : '/'}
            >
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-history"
          element={
            <ProtectedRoute
              allowedRoles={['manager']}
              redirectTo={localStorage.getItem('role') === 'kitchen' ? '/kitchen' : localStorage.getItem('role') === 'rider' ? '/rider' : localStorage.getItem('role') === 'superadmin' ? '/superadmin' : '/'}
            >
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;