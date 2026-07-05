import React from "react";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  let settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = {
      id: "singleton",
      orgName: "Mr. Boot",
      orgPhone: "+91 98765 43210",
      orgEmail: "contact@mrboot.com",
      orgAddress: "12, High Street, Mumbai, Maharashtra 400001",
      billReadyTemplate: "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}",
      reviewRequestTemplate: "Hi {{customer_first_name}}, hope you're loving your {{item_type}}! Would mean a lot if you could leave us a quick review: {{google_review_link}}",
      googleReviewLink: "https://g.page/r/your-google-review-link",
      darkMode: false,
      updatedAt: new Date(),
    };
  }

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      <header className="mb-8">
        <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed">Settings Configuration</h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Configure organization details, theme settings, and WhatsApp notification templates.
        </p>
      </header>

      <SettingsForm settings={settings} />
    </div>
  );
}
export const dynamic = 'force-dynamic';
