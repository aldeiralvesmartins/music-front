import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Search from '../views/Search.vue';
import CategoryDetails from '../views/CategoryDetails.vue';
import Upload from '../views/Upload.vue';
import Intercom from '../views/Intercom.vue';
import Playlists from '../views/Playlists.vue';
import PlaylistDetails from '../views/PlaylistDetails.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import ForgotPassword from '../views/ForgotPassword.vue';
import ResetPassword from '../views/ResetPassword.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { requiresAuth: true },
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
      meta: { requiresAuth: true },
    },
    {
      path: '/category/:id',
      name: 'category-details',
      component: CategoryDetails,
      meta: { requiresAuth: true },
    },
    {
      path: '/upload',
      name: 'upload',
      component: Upload,
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/intercom',
      name: 'intercom',
      component: Intercom,
      meta: { requiresAuth: true },
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: Playlists,
      meta: { requiresAuth: true },
    },
    {
      path: '/playlists/:id',
      name: 'playlist-details',
      component: PlaylistDetails,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      meta: { guest: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPassword,
      meta: { guest: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPassword,
      meta: { guest: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isGuest = to.matched.some(record => record.meta.guest);
  const requiresSuperAdmin = to.matched.some(record => (record.meta as any).requiresSuperAdmin);
  const isAuthenticated = authStore.isAuthenticated;

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login' });
  } else if (requiresSuperAdmin) {
    const isSuperAdmin = authStore.user?.is_super_admin === true;
    if (!isSuperAdmin) {
      next({ name: 'home' });
    } else {
      next();
    }
  } else if (isGuest && isAuthenticated) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;
