import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const TABS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: '日历', icon: 'calendar' },
  { to: '/plans', label: '计划', icon: 'list' },
  { to: '/trends', label: '趋势', icon: 'chart' },
  { to: '/settings', label: '我的', icon: 'user' },
];

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="主导航">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `tab-item ${isActive ? 'is-active' : ''}`}
        >
          <span className="tab-icon">
            <Icon name={tab.icon} size={21} />
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
