"use client";

import React, { useState } from "react";
import { createStaffMember } from "@/app/actions/staff";
import { Role } from "@prisma/client";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

interface StaffManagementClientProps {
  staffList: StaffMember[];
}

export const StaffManagementClient: React.FC<StaffManagementClientProps> = ({ staffList }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.ARTISAN);
  const [submitting, setSubmitting] = useState(false);

  const filteredStaff = staffList.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await createStaffMember({
      name: newName,
      email: newEmail,
      role: newRole,
    });
    setSubmitting(false);

    if (res.success) {
      alert("Staff member added successfully!");
      setShowModal(false);
      setNewName("");
      setNewEmail("");
      setNewRole(Role.ARTISAN);
      window.location.reload();
    } else {
      alert("Failed to add member: " + res.error);
    }
  };

  // Group stats
  const totalStaff = staffList.length;
  const masterArtisans = staffList.filter((s) => s.role === Role.ARTISAN).length;
  const managers = staffList.filter((s) => s.role === Role.MANAGER).length;

  return (
    <div className="flex flex-col gap-card-gap w-full">
      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-card-gap">
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">Total Staff</span>
            <span className="material-symbols-outlined text-primary">groups</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">{totalStaff}</div>
        </div>
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">Artisans</span>
            <span className="material-symbols-outlined text-primary">verified</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">{masterArtisans}</div>
        </div>
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">Managers / Admins</span>
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">{managers}</div>
        </div>
      </div>

      {/* Team Directory Table */}
      <div className="glass-card rounded-xl overflow-hidden flex-1 flex flex-col mt-4">
        <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-bright/30">
          <h3 className="font-headline-lg text-[20px] text-primary">Team Directory</h3>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white/50 border border-black/5 outline-none font-body-md text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:ring-1 focus:ring-primary"
              placeholder="Search staff..."
              type="text"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-sm text-label-sm font-semibold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Member
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="p-4 font-medium pl-6">Name</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-sm font-body-md">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-white/30 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-medium text-primary">{member.name}</div>
                      <div className="text-xs text-on-surface-variant">{member.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/5 text-primary">
                        <span className="material-symbols-outlined text-[14px]">stars</span>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8F5E9] text-[#2E7D32]">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      {new Date(member.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Staff */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 relative border border-white/40 shadow-2xl">
            <button
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
              onClick={() => setShowModal(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-headline-lg text-2xl text-primary mb-2">Add New Member</h3>
            <p className="text-sm text-on-surface-variant mb-6">Create a profile for a new artisan or staff member.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1 font-semibold">Full Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/60 border border-black/5 outline-none transition-all text-sm"
                  required
                  type="text"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1 font-semibold">Email Address</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/60 border border-black/5 outline-none transition-all text-sm"
                  required
                  type="email"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1 font-semibold">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-lg bg-white/60 border border-black/5 outline-none text-sm text-on-surface"
                >
                  <option value={Role.ARTISAN}>Artisan</option>
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.ADMIN}>Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface-variant hover:bg-white/50 transition-colors"
                  onClick={() => setShowModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="bg-primary text-white px-6 py-2 rounded-lg font-label-sm text-label-sm font-semibold disabled:opacity-50"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StaffManagementClient;
