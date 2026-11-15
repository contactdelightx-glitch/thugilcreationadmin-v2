import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Logout03Icon,
  Search01Icon,
  Menu01Icon,
  Cancel01Icon,
  SidebarLeftIcon,
} from '@hugeicons/core-free-icons';
import { navItems } from './navItems';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Designs from './pages/Designs';
import AddDesign from './pages/AddDesign';
import Images from './pages/Images';
import Client from './pages/Client';
import Payments from './pages/Payments';
import Students from './pages/Students';
import CoursePayments from './pages/CoursePayments';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import AddCourse from './pages/AddCourse';
import EditCourse from './pages/EditCourse';
import Certificates from './pages/Certificates';
import Ratings from './pages/Ratings';
import Doubts from './pages/Doubts';

// pages that have their own toolbar/search
const PAGES = { Dashboard, Users, Client, Payments, 'Course Payments': CoursePayments, Students, Courses, 'Course Details': CourseDetail, 'Add Course': AddCourse, 'Edit Course': EditCourse, Certificates, Ratings, Doubts, Designs, Images, 'Add Design': AddDesign };

const MOBILE = '(max-width: 768px)';

export default function App() {
  const [active, setActive] = useState('Dashboard');
  const [params, setParams] = useState(null); // what the open page was asked to show, e.g. { id: 2 }

  // pages navigate with navigate('Course Details', { id })
  const navigate = (page, p = null) => {
    setActive(page);
    setParams(p);
    document.querySelector('.content')?.scrollTo({ top: 0 });
  };
  const [collapsed, setCollapsed] = useState(false); // desktop: icon rail
  const [open, setOpen] = useState(false); // mobile: drawer

  // close the drawer when the viewport grows past mobile
  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const onChange = (e) => !e.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = () =>
    window.matchMedia(MOBILE).matches ? setOpen((o) => !o) : setCollapsed((c) => !c);

  const select = (label) => {
    setActive(label);
    setParams(null);
    setOpen(false);
  };

  return (
    <div className={`layout${collapsed ? ' collapsed' : ''}${open ? ' open' : ''}`}>
      <div className="overlay" onClick={() => setOpen(false)} />

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-text">Admin</span>
          <button className="icon-btn close-btn" onClick={() => setOpen(false)} aria-label="Close menu">
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="nav">
          {navItems.map(({ label, icon }) => (
            <button
              key={label}
              className={`nav-item${active === label || (label === 'Designs' && active === 'Add Design') || (label === 'Courses' && (active === 'Course Details' || active === 'Add Course' || active === 'Edit Course')) ? ' active' : ''}`}
              onClick={() => select(label)}
              title={collapsed ? label : undefined}
            >
              <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
              <span className="label">{label}</span>
            </button>
          ))}
        </nav>

        <button className="nav-item logout" title={collapsed ? 'Logout' : undefined}>
          <HugeiconsIcon icon={Logout03Icon} size={20} strokeWidth={1.5} />
          <span className="label">Logout</span>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn" onClick={toggle} aria-label="Toggle sidebar">
              <HugeiconsIcon
                icon={open || !collapsed ? SidebarLeftIcon : Menu01Icon}
                size={20}
                strokeWidth={1.5}
              />
            </button>
            <h1>{active}</h1>
          </div>
          {!PAGES[active] && (
            <div className="search">
              <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
              <input placeholder="Search..." />
            </div>
          )}
        </header>
        <section className="content">
          {PAGES[active] ? (
            (() => {
              const Page = PAGES[active];
              return <Page onNavigate={navigate} params={params} />;
            })()
          ) : (
            <div className="card">{active} page content goes here.</div>
          )}
        </section>
      </main>
    </div>
  );
}
