
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Shield, UserCircle, ToggleLeft, ToggleRight, Edit3, X, Upload, AlertCircle, Key, Lock, UserCheck } from 'lucide-react';
import { store } from '../store';
import { User, UserRole, UserStatus } from '../types';

export const Users: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [newUser, setNewUser] = useState<Omit<User, 'user_id' | 'created_at'>>({
    username: '',
    full_name: '',
    role: UserRole.STAFF,
    status: UserStatus.ACTIVE,
    avatar_url: ''
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await store.getUsers();
    setAllUsers(data);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const users = allUsers;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file (PNG, JPG, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large. Please select a photo under 5MB.");
      return;
    }

    try {
      setLoading(true);
      const publicUrl = await store.uploadProductImage(file);
      if (publicUrl) {
        if (isEdit && editingUser) {
          setEditingUser({ ...editingUser, avatar_url: publicUrl });
        } else {
          setNewUser({ ...newUser, avatar_url: publicUrl });
        }
      } else {
        setError("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload image.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.avatar_url) {
      setError("Profile photo is mandatory for registration.");
      return;
    }
    if (!newUser.full_name) {
      setError("Full name is required for receipt generation.");
      return;
    }

    await store.addUser(newUser);
    setShowAddModal(false);
    setNewUser({ username: '', full_name: '', role: UserRole.STAFF, status: UserStatus.ACTIVE, avatar_url: '' });
    setError(null);
    fetchUsers();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      if (!editingUser.avatar_url) {
        setError("Profile photo cannot be empty.");
        return;
      }
      await store.updateUser(editingUser.user_id, editingUser);
      setEditingUser(null);
      setError(null);
      fetchUsers();
    }
  };

  const handleDelete = async (id: string) => {
    if (id === '1') return alert("Cannot delete main admin account.");
    if (confirm("Permanently delete this user?")) {
      await store.deleteUser(id);
      fetchUsers();
    }
  };

  const toggleStatus = async (id: string, current: UserStatus) => {
    if (id === '1') return;
    await store.updateUser(id, { status: current === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE });
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Access Control</h2>
          <p className="text-slate-500 font-bold text-lg">Manage system privileges and user identities.</p>
        </div>
        <button
          onClick={() => { setError(null); setShowAddModal(true); }}
          className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 uppercase tracking-widest"
        >
          <Plus size={20} /> New User Account
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f6f5] text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">System Identity</th>
                <th className="px-10 py-6">Receipt Name (Served By)</th>
                <th className="px-10 py-6">Privilege Level</th>
                <th className="px-10 py-6">Account Status</th>
                <th className="px-10 py-6 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.user_id} className={`hover:bg-slate-50 transition-colors group ${user.status === UserStatus.DISABLED ? 'bg-slate-50/50 opacity-60' : ''}`}>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-slate-50">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${user.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            {user.role === UserRole.ADMIN ? <Shield size={24} /> : <UserCircle size={24} />}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-black text-slate-900 block text-lg">{user.username}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">ID: {user.user_id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-sm font-black text-slate-700">{user.full_name || 'NOT CONFIGURED'}</span>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border
                      ${user.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <button
                      onClick={() => toggleStatus(user.user_id, user.status)}
                      className="flex items-center gap-2 group/toggle outline-none"
                    >
                      {user.status === UserStatus.ACTIVE ? (
                        <span className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 group-hover/toggle:bg-emerald-100 transition-colors">
                          <ToggleRight size={20} className="fill-emerald-600 text-emerald-600" /> ACTIVE
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-slate-400 font-bold text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 group-hover/toggle:bg-slate-200 transition-colors">
                          <ToggleLeft size={20} /> DISABLED
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setError(null); setEditingUser(user); }}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                        title="Modify Profile"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.user_id)}
                        disabled={user.user_id === '1'}
                        className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-0 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20">
            <div className="p-10 border-b flex items-center justify-between bg-indigo-600 text-white">
              <div>
                <h3 className="text-3xl font-black tracking-tight">Register Access</h3>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">Create new system identity</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleAdd} className="p-10 space-y-8">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              <div className="flex gap-8 items-start">
                {/* Photo Upload Area */}
                <div className="flex flex-col items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden group relative"
                  >
                    {newUser.avatar_url ? (
                      <img src={newUser.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload size={32} className="text-slate-300 group-hover:text-indigo-400 group-hover:-translate-y-1 transition-all" />
                        <span className="text-[9px] font-black text-slate-400 uppercase mt-2">Upload Photo</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, false)}
                  />
                  <p className="text-[9px] text-slate-400 font-bold text-center max-w-[120px]">Mandatory Photo ID (Max 5MB)</p>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Username</label>
                    <div className="relative">
                      <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text" required
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900"
                        value={newUser.username}
                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="e.g. jdoe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role & Privilege</label>
                    <div className="relative">
                      <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 appearance-none cursor-pointer"
                        value={newUser.role}
                        onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      >
                        <option value={UserRole.STAFF}>Retail Staff</option>
                        <option value={UserRole.ADMIN}>Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Legal Name (Receipt Display)</label>
                <input
                  type="text" required
                  className="w-full px-6 py-4 bg-indigo-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/20 font-black text-indigo-900"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="The name that appears on customer receipts"
                />
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                <Key size={20} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Security Policy Protocol</p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    The initial password will automatically be set to match the username. The user will be prompted to change it upon first login.
                  </p>
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3">
                <Plus size={18} /> Finalize Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20">
            <div className="p-10 border-b flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="text-3xl font-black tracking-tight">Modify Profile</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Update identification & access</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-10 space-y-8">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              <div className="flex gap-8 items-start">
                <div className="flex flex-col items-center gap-4">
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-32 h-32 rounded-[24px] border-4 border-slate-100 shadow-lg overflow-hidden cursor-pointer hover:opacity-80 transition-all relative group bg-slate-100"
                  >
                    <img src={editingUser.avatar_url || 'https://via.placeholder.com/150'} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
                      <Upload className="text-white" size={28} />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, true)}
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Update Photo</p>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Served By (Full Name)</label>
                    <input
                      type="text" required
                      className="w-full px-6 py-4 bg-indigo-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/20 font-black text-indigo-900"
                      value={editingUser.full_name || ''}
                      onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })}
                      placeholder="Appears on receipt as 'Served by'"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1">Change Account Password</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-300" size={18} />
                      <input
                        type="password"
                        className="w-full pl-14 pr-6 py-4 bg-rose-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 font-bold text-rose-900 placeholder:text-rose-300"
                        value={editingUser.password || ''}
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                        placeholder="Enter new password..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
                  <select
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 appearance-none cursor-pointer"
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  >
                    <option value={UserRole.STAFF}>Retail Staff</option>
                    <option value={UserRole.ADMIN}>Administrator</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Status</label>
                  <select
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 appearance-none cursor-pointer"
                    value={editingUser.status}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                  >
                    <option value={UserStatus.ACTIVE}>Active</option>
                    <option value={UserStatus.DISABLED}>Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-[24px] hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">
                  Discard Changes
                </button>
                <button type="submit" className="flex-[2] py-5 bg-slate-900 text-white font-black rounded-[24px] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px] px-8">
                  Update Account Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
