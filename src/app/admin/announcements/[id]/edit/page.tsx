"use client";

import { use } from "react";

import { AnnouncementForm } from "../../_components/announcement-form";

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mx-auto max-w-3xl w-full">
        <h1 className="font-bold text-2xl">Edit Announcement</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Update the announcement details.</p>
      </div>
      <AnnouncementForm mode="edit" id={Number(id)} />
    </div>
  );
}
