import { saveHackathon } from "@/actions/hackathon-admin";
import { HackathonForm } from "@/components/hackathon-forms";
import { requireAdmin } from "@/lib/session";

export default async function NewHackathon() {
  await requireAdmin();
  return (
    <div className="border border-line p-4 md:p-6">
      <h2 className="text-title-m mb-1">new hackathon</h2>
      <p className="mb-6 text-body-s text-muted">Save it as a draft to preview it first; only admins can see drafts.</p>
      <HackathonForm
        action={saveHackathon.bind(null, null)}
        published={false}
        isNew
        defaults={{ title: "", slug: "", summary: "", brief: "", theme: "", rules: "", prizes: "", linkUrl: "", coverUrl: null, opensAt: "", closesAt: "" }}
      />
    </div>
  );
}
