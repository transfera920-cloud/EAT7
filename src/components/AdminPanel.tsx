import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  LogOut,
  FolderTree,
  Type,
  Globe,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowUp,
  ArrowDown,
  Save,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import type { Category, SiteSettings } from '../types.ts';
import { apiFetch } from '../lib/api.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  categories: Category[];
  settings: SiteSettings;
  onRefreshData: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  token,
  onLoginSuccess,
  onLogout,
  categories,
  settings,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'texts' | 'seo' | 'password'>('categories');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Category management state
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySort, setNewCategorySort] = useState(0);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [catActionMsg, setCatActionMsg] = useState<string | null>(null);

  // Settings form state
  const [formSettings, setFormSettings] = useState<SiteSettings>(settings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Sync settings when passed
  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Load all categories for admin (including inactive ones)
  const fetchAdminCategories = async () => {
    if (!token) return;
    try {
      const { res, data } = await apiFetch<{ success: boolean; categories: Category[] }>('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && data?.success && Array.isArray(data.categories)) {
        setAdminCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to load admin categories', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminCategories();
    }
  }, [token]);

  if (!isOpen) return null;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const { res, data, error } = await apiFetch<{ success: boolean; token: string; error?: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (!res.ok || !data?.success) {
        setLoginError(error || data?.error || '登入失敗，請檢查帳號密碼');
      } else {
        onLoginSuccess(data.token);
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      setLoginError(err?.message || '網路或伺服器連線失敗');
    } finally {
      setLoginLoading(false);
    }
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const { res, error } = await apiFetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          sort_order: Number(newCategorySort) || 0,
          is_active: 1
        })
      });
      if (res.ok) {
        setNewCategoryName('');
        setNewCategorySort(0);
        setIsAddingCategory(false);
        setCatActionMsg('分類已成功新增');
        await fetchAdminCategories();
        await onRefreshData();
        setTimeout(() => setCatActionMsg(null), 3000);
      } else {
        setCatActionMsg(error || '新增分類失敗');
      }
    } catch {
      setCatActionMsg('新增分類失敗');
    }
  };

  // Update Category
  const handleUpdateCategory = async (cat: Category) => {
    try {
      const { res, error } = await apiFetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cat.name,
          sort_order: cat.sort_order,
          is_active: cat.is_active
        })
      });
      if (res.ok) {
        setEditingCategory(null);
        setCatActionMsg('分類已成功更新');
        await fetchAdminCategories();
        await onRefreshData();
        setTimeout(() => setCatActionMsg(null), 3000);
      } else {
        setCatActionMsg(error || '更新分類失敗');
      }
    } catch {
      setCatActionMsg('更新分類失敗');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('確定要刪除此分類嗎？此動作將無法復原。')) return;
    try {
      const { res, error } = await apiFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCatActionMsg('分類已刪除');
        await fetchAdminCategories();
        await onRefreshData();
        setTimeout(() => setCatActionMsg(null), 3000);
      } else {
        setCatActionMsg(error || '刪除分類失敗');
      }
    } catch {
      setCatActionMsg('刪除分類失敗');
    }
  };

  // Move Category (Order adjustment)
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= adminCategories.length) return;

    const current = adminCategories[index];
    const target = adminCategories[targetIndex];

    const tempSort = current.sort_order;
    current.sort_order = target.sort_order;
    target.sort_order = tempSort;

    await handleUpdateCategory(current);
    await handleUpdateCategory(target);
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSavedMsg(null);

    try {
      const { res, error } = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formSettings)
      });
      if (res.ok) {
        setSettingsSavedMsg('前台設定與 SEO 文字已成功更新！');
        await onRefreshData();
        setTimeout(() => setSettingsSavedMsg(null), 4000);
      } else {
        setSettingsSavedMsg(error || '更新設定失敗');
      }
    } catch {
      setSettingsSavedMsg('更新設定失敗');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: '新密碼與確認密碼不相符', isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ text: '新密碼長度至少需 6 個字元', isError: true });
      return;
    }

    try {
      const { res, data, error } = await apiFetch<{ success: boolean; error?: string }>('/api/admin/change-password', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (res.ok && data?.success) {
        setPwdMsg({ text: '密碼已成功更新！下次登入請使用新密碼。', isError: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdMsg({ text: error || data?.error || '密碼更新失敗', isError: true });
      }
    } catch (err: any) {
      setPwdMsg({ text: err?.message || '變更密碼請求失敗', isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-snug">後台管理系統</h2>
              <p className="text-xs text-slate-400">管理搜尋分類、前台文案與 SEO 設定</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {token && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>登出後台</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!token ? (
          /* Login Form */
          <div className="p-8 max-w-md mx-auto w-full my-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">管理員身分驗證</h3>
              <p className="text-xs text-slate-400 mt-1">請輸入管理員帳號與密碼以進入後台</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  帳號
                </label>
                <input
                  id="admin-login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="管理員帳號"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  密碼
                </label>
                <input
                  id="admin-login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="管理員密碼"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                id="btn-submit-admin-login"
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? '登入中...' : '登入後台'}
              </button>
            </form>
          </div>
        ) : (
          /* Logged In Dashboard with Tabs */
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-56 bg-slate-950 border-r border-slate-800 p-3 flex md:flex-col gap-1 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>分類管理</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('texts')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === 'texts'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>前台文字管理</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === 'seo'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>SEO 設定</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === 'password'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>變更密碼</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-5 overflow-y-auto bg-slate-900">
              {/* TAB 1: Categories */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">前台餐點分類管理</h3>
                      <p className="text-xs text-slate-400">
                        新增、編輯、刪除分類，調整排序與啟用狀態（前台搜尋選單即時同步）
                      </p>
                    </div>
                    <button
                      id="btn-add-category-toggle"
                      type="button"
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>新增分類</span>
                    </button>
                  </div>

                  {catActionMsg && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>{catActionMsg}</span>
                    </div>
                  )}

                  {/* Add category inline form */}
                  {isAddingCategory && (
                    <form onSubmit={handleAddCategory} className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-emerald-400">新增餐點搜尋分類</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">分類名稱</label>
                          <input
                            id="input-new-cat-name"
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="例如：熱炒、早午餐、燒肉"
                            required
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">排序編號（數字小者在前）</label>
                          <input
                            id="input-new-cat-sort"
                            type="number"
                            value={newCategorySort}
                            onChange={(e) => setNewCategorySort(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingCategory(false)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                        >
                          取消
                        </button>
                        <button
                          id="btn-submit-new-category"
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                        >
                          確認儲存
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Categories Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3 w-12 text-center">排序</th>
                          <th className="p-3">分類名稱</th>
                          <th className="p-3 w-24 text-center">狀態</th>
                          <th className="p-3 w-36 text-right">管理操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {adminCategories.map((cat, idx) => {
                          const isEditing = editingCategory?.id === cat.id;
                          return (
                            <tr key={cat.id} className="hover:bg-slate-850/50">
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-mono text-slate-400">{cat.sort_order}</span>
                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveCategory(idx, 'up')}
                                      className="text-slate-500 hover:text-white disabled:opacity-20"
                                      title="上移"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === adminCategories.length - 1}
                                      onClick={() => handleMoveCategory(idx, 'down')}
                                      className="text-slate-500 hover:text-white disabled:opacity-20"
                                      title="下移"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingCategory.name}
                                    onChange={(e) =>
                                      setEditingCategory({ ...editingCategory, name: e.target.value })
                                    }
                                    className="bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white"
                                  />
                                ) : (
                                  <span className="font-semibold text-white">{cat.name}</span>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCategory({
                                      ...cat,
                                      is_active: cat.is_active === 1 ? 0 : 1
                                    })
                                  }
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer ${
                                    cat.is_active === 1
                                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                      : 'bg-slate-950 text-slate-500 border-slate-800'
                                  }`}
                                >
                                  {cat.is_active === 1 ? '已啟用' : '已停用'}
                                </button>
                              </td>

                              <td className="p-3 text-right space-x-1.5">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCategory(editingCategory)}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                                  >
                                    儲存
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategory(cat)}
                                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                                    title="編輯"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40"
                                  title="刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Site Texts */}
              {activeTab === 'texts' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">前台文字與介面設定</h3>
                    <p className="text-xs text-slate-400">
                      動態修改前台顯示的網站標題、提示文字與按鈕文字
                    </p>
                  </div>

                  {settingsSavedMsg && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>{settingsSavedMsg}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        網站標題 (Site Title)
                      </label>
                      <input
                        id="setting-site-title"
                        type="text"
                        value={formSettings.siteTitle || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, siteTitle: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        說明文字 (Site Description)
                      </label>
                      <textarea
                        id="setting-site-desc"
                        rows={2}
                        value={formSettings.siteDescription || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, siteDescription: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        登山口輸入欄提示文字 (Placeholder)
                      </label>
                      <input
                        id="setting-trailhead-placeholder"
                        type="text"
                        value={formSettings.trailheadPlaceholder || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, trailheadPlaceholder: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        搜尋按鈕文字 (Button Text)
                      </label>
                      <input
                        id="setting-button-text"
                        type="text"
                        value={formSettings.buttonText || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, buttonText: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      id="btn-save-site-texts"
                      type="submit"
                      disabled={settingsLoading}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{settingsLoading ? '儲存中...' : '儲存文字設定'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: SEO Settings */}
              {activeTab === 'seo' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">SEO 搜尋引擎最佳化設定</h3>
                    <p className="text-xs text-slate-400">
                      設定搜尋引擎標題、描述與 Canonical URL，提升登山相關搜尋曝光度
                    </p>
                  </div>

                  {settingsSavedMsg && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>{settingsSavedMsg}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        SEO Title（網頁標題）
                      </label>
                      <input
                        id="setting-seo-title"
                        type="text"
                        value={formSettings.seoTitle || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, seoTitle: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        SEO Meta Description（網頁摘要描述）
                      </label>
                      <textarea
                        id="setting-seo-desc"
                        rows={3}
                        value={formSettings.seoDescription || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, seoDescription: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Canonical URL（標準網址）
                      </label>
                      <input
                        id="setting-canonical-url"
                        type="url"
                        value={formSettings.canonicalUrl || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, canonicalUrl: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      id="btn-save-seo-settings"
                      type="submit"
                      disabled={settingsLoading}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{settingsLoading ? '儲存中...' : '儲存 SEO 設定'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: Change Password */}
              {activeTab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <h3 className="text-base font-bold text-white">變更管理員密碼</h3>
                    <p className="text-xs text-slate-400">
                      使用 PBKDF2 安全雜湊儲存，密碼不會以明文形式存在資料庫中
                    </p>
                  </div>

                  {pwdMsg && (
                    <div
                      className={`p-3 border text-xs rounded-xl flex items-center gap-2 ${
                        pwdMsg.isError
                          ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                          : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      {pwdMsg.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      <span>{pwdMsg.text}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        目前密碼
                      </label>
                      <input
                        id="pwd-current"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        新密碼（至少 6 個字元）
                      </label>
                      <input
                        id="pwd-new"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        確認新密碼
                      </label>
                      <input
                        id="pwd-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-submit-change-password"
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>確認變更密碼</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
