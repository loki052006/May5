import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdminGate, RequireAuth } from './components/RequireAuth'
import { StubPage } from './components/StubPage'

const CustomerLayout = lazy(() =>
  import('./layouts/CustomerLayout').then((module) => ({ default: module.CustomerLayout })),
)
const VendorLayout = lazy(() =>
  import('./layouts/VendorLayout').then((module) => ({ default: module.VendorLayout })),
)
const AdminLayout = lazy(() =>
  import('./layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })),
)
const PhonePage = lazy(() =>
  import('./pages/auth/PhonePage').then((module) => ({ default: module.PhonePage })),
)
const OtpPage = lazy(() =>
  import('./pages/auth/OtpPage').then((module) => ({ default: module.OtpPage })),
)
const RoleSelectPage = lazy(() =>
  import('./pages/auth/RoleSelectPage').then((module) => ({ default: module.RoleSelectPage })),
)
const CustomerHomePage = lazy(() =>
  import('./pages/customer/HomePage').then((module) => ({ default: module.CustomerHomePage })),
)
const CustomerExplorePage = lazy(() =>
  import('./pages/customer/ExplorePage').then((module) => ({ default: module.CustomerExplorePage })),
)
const ExploreMapPage = lazy(() =>
  import('./pages/customer/ExploreMapPage').then((module) => ({ default: module.ExploreMapPage })),
)
const CustomerFavoritesPage = lazy(() =>
  import('./pages/customer/FavoritesPage').then((module) => ({ default: module.CustomerFavoritesPage })),
)
const CustomerBookingsPage = lazy(() =>
  import('./pages/customer/BookingsPage').then((module) => ({ default: module.CustomerBookingsPage })),
)
const CustomerProfilePage = lazy(() =>
  import('./pages/customer/ProfilePage').then((module) => ({ default: module.CustomerProfilePage })),
)
const EditProfilePage = lazy(() =>
  import('./pages/customer/EditProfilePage').then((module) => ({ default: module.EditProfilePage })),
)
const HistoryPage = lazy(() =>
  import('./pages/customer/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
const LogoutPage = lazy(() =>
  import('./pages/customer/LogoutPage').then((module) => ({ default: module.LogoutPage })),
)
const CustomerSettingsPage = lazy(() =>
  import('./pages/customer/CustomerSettingsPage').then((module) => ({ default: module.CustomerSettingsPage })),
)
const SalonDetailPage = lazy(() =>
  import('./pages/salon/SalonDetailPage').then((module) => ({ default: module.SalonDetailPage })),
)
const ServiceDetailPage = lazy(() =>
  import('./pages/salon/ServiceDetailPage').then((module) => ({ default: module.ServiceDetailPage })),
)
const NewBookingPage = lazy(() =>
  import('./pages/booking/NewBookingPage').then((module) => ({ default: module.NewBookingPage })),
)
const BookingLocationPrefPage = lazy(() =>
  import('./pages/booking/BookingLocationPrefPage').then((module) => ({ default: module.BookingLocationPrefPage })),
)
const VendorDashboardPage = lazy(() =>
  import('./pages/vendor/VendorDashboardPage').then((module) => ({ default: module.VendorDashboardPage })),
)
const VendorCalendarPage = lazy(() =>
  import('./pages/vendor/VendorCalendarPage').then((module) => ({ default: module.VendorCalendarPage })),
)
const VendorServicesPage = lazy(() =>
  import('./pages/vendor/VendorServicesPage').then((module) => ({ default: module.VendorServicesPage })),
)
const VendorStaffPage = lazy(() =>
  import('./pages/vendor/VendorStaffPage').then((module) => ({ default: module.VendorStaffPage })),
)
const AddServicePage = lazy(() =>
  import('./pages/vendor/AddServicePage').then((module) => ({ default: module.AddServicePage })),
)
const VendorMorePage = lazy(() =>
  import('./pages/vendor/VendorMorePage').then((module) => ({ default: module.VendorMorePage })),
)
const VendorAnalyticsPage = lazy(() =>
  import('./pages/vendor/VendorAnalyticsPage').then((module) => ({ default: module.VendorAnalyticsPage })),
)
const VendorSettingsPage = lazy(() =>
  import('./pages/vendor/VendorSettingsPage').then((module) => ({ default: module.VendorSettingsPage })),
)
const VendorBookingPrefsPage = lazy(() =>
  import('./pages/vendor/VendorBookingPrefsPage').then((module) => ({ default: module.VendorBookingPrefsPage })),
)
const AdminGatePage = lazy(() =>
  import('./pages/admin/AdminGatePage').then((module) => ({ default: module.AdminGatePage })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
)
const AdminApprovalsPage = lazy(() =>
  import('./pages/admin/AdminApprovalsPage').then((module) => ({ default: module.AdminApprovalsPage })),
)
const AdminVendorsPage = lazy(() =>
  import('./pages/admin/AdminVendorsPage').then((module) => ({ default: module.AdminVendorsPage })),
)
const AdminMorePage = lazy(() =>
  import('./pages/admin/AdminMorePage').then((module) => ({ default: module.AdminMorePage })),
)

function stub(title: string, apk: string, back: string) {
  return <StubPage title={title} apkRoute={apk} backTo={back} />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="may5-page-pad" role="status">Loading…</div>}>
    <Routes>
      <Route path="/" element={<Navigate to="/customer/home" replace />} />

      <Route path="/auth/phone" element={<PhonePage />} />
      <Route path="/auth/otp" element={<OtpPage />} />
      <Route
        path="/role-select"
        element={
          <RequireAuth>
            <RoleSelectPage />
          </RequireAuth>
        }
      />

      <Route path="/salon/:id" element={<SalonDetailPage />} />
      <Route path="/service/:id" element={<ServiceDetailPage />} />
      <Route path="/booking/new/:serviceId" element={<NewBookingPage />} />
      <Route path="/booking-location-pref" element={<BookingLocationPrefPage />} />

      <Route
        path="/customer"
        element={
          <RequireAuth role="customer">
            <CustomerLayout />
          </RequireAuth>
        }
      >
        <Route path="home" element={<CustomerHomePage />} />
        <Route path="explore" element={<CustomerExplorePage />} />
        <Route path="explore/map" element={<ExploreMapPage />} />
        <Route path="favorites" element={<CustomerFavoritesPage />} />
        <Route path="bookings" element={<CustomerBookingsPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
        <Route path="profile/edit" element={<EditProfilePage />} />
        <Route path="profile/history" element={<HistoryPage />} />
        <Route path="profile/logout" element={<LogoutPage />} />
        <Route path="profile/payment-methods" element={stub('Payment methods', '/(customer)/profile/payment-methods', '/customer/profile')} />
        <Route path="profile/:section" element={<CustomerSettingsPage />} />
      </Route>

      <Route
        path="/vendor"
        element={
          <RequireAuth role="vendor">
            <VendorLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<VendorDashboardPage />} />
        <Route path="calendar" element={<VendorCalendarPage />} />
        <Route path="services" element={<VendorServicesPage />} />
        <Route path="more" element={<VendorMorePage />} />
        <Route path="customers" element={stub('Customers', '/(vendor)/customers', '/vendor/dashboard')} />
        <Route path="analytics" element={<VendorAnalyticsPage />} />
        <Route path="settings" element={<VendorSettingsPage />} />
        <Route path="booking-prefs" element={<VendorBookingPrefsPage />} />
        <Route path="add-service" element={<AddServicePage />} />
        <Route path="billing" element={stub('Billing', '/(vendor)/billing', '/vendor/more')} />
        <Route path="portfolio" element={stub('Portfolio', '/(vendor)/portfolio/index', '/vendor/more')} />
        <Route path="promotions" element={stub('Promotions', '/(vendor)/promotions/index', '/vendor/more')} />
        <Route path="staff" element={<VendorStaffPage />} />
      </Route>

      <Route path="/admin/gate" element={<RequireAuth role="admin"><AdminGatePage /></RequireAuth>} />

      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <RequireAdminGate>
              <AdminLayout />
            </RequireAdminGate>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="approvals" element={<AdminApprovalsPage />} />
        <Route path="vendors" element={<AdminVendorsPage />} />
        <Route path="more" element={<AdminMorePage />} />
        <Route path="users" element={stub('Users', '/(admin)/users', '/admin/dashboard')} />
        <Route path="bookings" element={stub('Bookings', '/(admin)/bookings', '/admin/dashboard')} />
        <Route path="finance" element={stub('Finance', '/(admin)/finance', '/admin/dashboard')} />
        <Route path="app-stats" element={stub('App stats', '/(admin)/app-stats', '/admin/dashboard')} />
        <Route path="maintenance" element={stub('Maintenance', '/(admin)/maintenance', '/admin/dashboard')} />
        <Route path="support" element={stub('Support', '/(admin)/support/index', '/admin/dashboard')} />
      </Route>

      <Route path="*" element={<Navigate to="/customer/home" replace />} />
    </Routes>
    </Suspense>
  )
}
