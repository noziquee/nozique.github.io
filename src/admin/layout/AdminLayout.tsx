import { useAuth } from '../auth/AuthProvider';
import { ADMIN_PAGES, adminHref, useAdminPage } from '../routing';
import { ProjectsPage } from '../pages/ProjectsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { WebsitePage } from '../pages/WebsitePage';

export function AdminLayout() {
  const { email, signOut } = useAuth();
  const page = useAdminPage();

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href={adminHref('projects')}>
          NOZI<span className="accent">Q</span>UE
        </a>
        <nav aria-label="Admin">
          {ADMIN_PAGES.map((item) => (
            <a
              key={item.id}
              href={adminHref(item.id)}
              aria-current={item.id === page ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="muted">{email}</span>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        {page === 'projects' && <ProjectsPage />}
        {page === 'website' && <WebsitePage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
