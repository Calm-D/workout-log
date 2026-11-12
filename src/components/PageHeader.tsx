import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = '返回',
  actions,
  eyebrow,
}: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <div className="page-header__top">
        {onBack ? (
          <button
            className="icon-button page-header__back"
            type="button"
            onClick={onBack}
            aria-label={backLabel}
          >
            <Icon name="chevronLeft" size={22} />
          </button>
        ) : (
          <div className="page-header__brand" onClick={() => navigate('/')} role="presentation">
            <span className="brand-mark">
              <Icon name="dumbbell" size={15} />
            </span>
            <span>训练日志</span>
          </div>
        )}
        <div className="page-header__actions">{actions}</div>
      </div>
      <div className="page-header__titles">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}
