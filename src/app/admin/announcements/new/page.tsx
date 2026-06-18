import { AnnouncementForm } from "../_components/announcement-form";

export default function NewAnnouncementPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mx-auto max-w-3xl w-full">
        <h1 className="font-bold text-2xl">Add Announcement</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Create a new announcement or news item for the landing page.</p>
      </div>
      <AnnouncementForm mode="create" />
    </div>
  );
}
