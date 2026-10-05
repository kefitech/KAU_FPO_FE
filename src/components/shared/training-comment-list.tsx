import type { TrainingSessionComment } from "@/types/training";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** "Comment by {name}, {designation} · {date} (edited)" */
export function TrainingCommentHeader({
  comment,
  commentByLabel = "Comment by",
  editedLabel = "edited",
}: {
  comment: TrainingSessionComment;
  commentByLabel?: string;
  editedLabel?: string;
}) {
  return (
    <p className="text-muted-foreground text-xs">
      {commentByLabel} <span className="font-medium text-foreground">{comment.author_name}</span>,{" "}
      {comment.author_designation} · {new Date(comment.created_at).toLocaleString("en-IN", DATE_FORMAT)}
      {comment.edited_at && (
        <span title={new Date(comment.edited_at).toLocaleString("en-IN", DATE_FORMAT)}> ({editedLabel})</span>
      )}
    </p>
  );
}

/**
 * KAU admin / sub-admin comments on a training session, read-only.
 * Used by the CBBO / government training view sheets; the admin Training tab
 * renders its own editable rows with TrainingCommentHeader.
 */
export function TrainingCommentList({
  comments,
  commentByLabel = "Comment by",
  editedLabel = "edited",
  emptyLabel,
}: {
  comments: TrainingSessionComment[];
  commentByLabel?: string;
  editedLabel?: string;
  /** shown when there are no comments; omit to render nothing */
  emptyLabel?: string;
}) {
  if (comments.length === 0) {
    return emptyLabel ? <p className="text-muted-foreground text-sm">{emptyLabel}</p> : null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {comments.map((c) => (
        <li key={c.id} className="wrap-anywhere rounded-md border bg-muted/40 px-3 py-2">
          <TrainingCommentHeader comment={c} commentByLabel={commentByLabel} editedLabel={editedLabel} />
          <p className="mt-1 whitespace-pre-wrap text-sm">{c.comment}</p>
        </li>
      ))}
    </ul>
  );
}
