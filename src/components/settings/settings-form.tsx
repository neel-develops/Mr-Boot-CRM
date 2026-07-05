"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { updateSettings } from "@/app/actions/settings";

interface SettingsFormProps {
  settings: any;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings: initialSettings }) => {
  const [settings, setSettings] = useState(initialSettings);
  const [orgName, setOrgName] = useState(settings.orgName || "");
  const [orgPhone, setOrgPhone] = useState(settings.orgPhone || "");
  const [orgEmail, setOrgEmail] = useState(settings.orgEmail || "");
  const [orgAddress, setOrgAddress] = useState(settings.orgAddress || "");
  const [billReadyTemplate, setBillReadyTemplate] = useState(settings.billReadyTemplate || "");
  const [reviewRequestTemplate, setReviewRequestTemplate] = useState(settings.reviewRequestTemplate || "");
  const [googleReviewLink, setGoogleReviewLink] = useState(settings.googleReviewLink || "");
  const [darkMode, setDarkMode] = useState(settings.darkMode || false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateSettings({
      orgName,
      orgPhone,
      orgEmail,
      orgAddress,
      billReadyTemplate,
      reviewRequestTemplate,
      googleReviewLink,
      darkMode,
    });
    setSaving(false);

    if (res.success) {
      alert("Settings saved successfully!");
      // Toggle class on documentElement for light/dark
      if (darkMode) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    } else {
      alert("Failed to save settings: " + res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-gutter w-full">
      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Left Column: Organization Details */}
        <div className="flex flex-col gap-card-gap">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed/20 rounded-lg">
                storefront
              </span>
              <h3 className="font-semibold text-lg text-primary dark:text-primary-fixed">
                Organization Information
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Company Name</label>
                <input
                  required
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Business Phone</label>
                <input
                  type="text"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Business Email</label>
                <input
                  type="email"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Store Address</label>
                <textarea
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md h-24"
                />
              </div>
            </div>
          </GlassCard>


        </div>

        {/* Right Column: WhatsApp Messaging Templates */}
        <div className="flex flex-col gap-card-gap">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed/20 rounded-lg">
                chat
              </span>
              <h3 className="font-semibold text-lg text-primary dark:text-primary-fixed">
                WhatsApp Templates & Links
              </h3>
            </div>

            <div className="space-y-6">
              {/* Template 1: Bill Ready */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Bill Ready Template
                </label>
                <p className="text-xs text-on-surface-variant mb-2">
                  Placeholders: <code className="bg-black/5 px-1 rounded">{"{{customer_first_name}}"}</code>,{" "}
                  <code className="bg-black/5 px-1 rounded">{"{{invoice_pdf_or_track_link}}"}</code>
                </p>
                <textarea
                  required
                  value={billReadyTemplate}
                  onChange={(e) => setBillReadyTemplate(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md h-28"
                />
              </div>

              {/* Template 2: Review Request */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Review Request Template
                </label>
                <p className="text-xs text-on-surface-variant mb-2">
                  Placeholders: <code className="bg-black/5 px-1 rounded">{"{{customer_first_name}}"}</code>,{" "}
                  <code className="bg-black/5 px-1 rounded">{"{{item_type}}"}</code>,{" "}
                  <code className="bg-black/5 px-1 rounded">{"{{google_review_link}}"}</code>
                </p>
                <textarea
                  required
                  value={reviewRequestTemplate}
                  onChange={(e) => setReviewRequestTemplate(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md h-28"
                />
              </div>

              {/* Google Review link */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Google Business Review Link
                </label>
                <input
                  required
                  type="url"
                  value={googleReviewLink}
                  onChange={(e) => setGoogleReviewLink(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-on-primary font-semibold py-3.5 px-8 rounded-lg shadow-md hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving Configurations..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
};
