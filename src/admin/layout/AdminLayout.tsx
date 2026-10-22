import { useAuth } from '../auth/AuthProvider';
import { ADMIN_PAGES, adminHref, useAdminPage, useProjectRoute } from '../routing';
import { ProjectEditorPage } from '../pages/ProjectEditorPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { WebsitePage } from '../pages/WebsitePage';

export function AdminLayout() {
  const { email, signOut } = useAuth();
  const page = useAdminPage();
  const editor = useProjectRoute();

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
        {page === 'projects' && editor && (
          <ProjectEditorPage key={editor.kind === 'edit' ? editor.id : 'new'} route={editor} />
        )}
        {page === 'website' && <WebsitePage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
