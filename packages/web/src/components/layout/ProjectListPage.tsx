import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Trash2, LogOut } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

interface ProjectItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function ProjectListPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  async function loadProjects() {
    setLoading(true);
    const res = await apiFetch<ProjectItem[]>('/projects');
    if (res.success && res.data) {
      setProjects(res.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const res = await apiFetch<ProjectItem>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.success && res.data) {
      setNewName('');
      setShowCreate(false);
      navigate(`/project/${res.data.id}`);
    }
  }

  async function handleDelete(id: string) {
    await apiFetch(`/projects/${id}`, { method: 'DELETE' });
    setProjects((p) => p.filter((proj) => proj.id !== id));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <h1 className="text-xl font-bold text-white">EasyTVC</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-secondary)]">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">My Projects</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-6 flex gap-3 rounded-xl bg-[var(--color-surface)] p-4"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name..."
              autoFocus
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-white outline-none transition focus:border-[var(--color-primary)]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
            >
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Folder size={48} className="mx-auto mb-4 text-[var(--color-text-secondary)]" />
            <p className="text-lg text-[var(--color-text-secondary)]">No projects yet</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Create your first project to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group flex cursor-pointer items-center justify-between rounded-xl bg-[var(--color-surface)] px-5 py-4 transition hover:bg-[var(--color-surface-hover)]"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Folder size={20} className="text-[var(--color-primary)]" />
                  <div>
                    <h3 className="font-medium text-white">{project.name}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="rounded-lg p-2 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
