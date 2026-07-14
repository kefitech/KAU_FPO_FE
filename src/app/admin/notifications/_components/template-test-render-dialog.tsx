"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { notificationTemplateApi } from "@/app/admin/_api/notification-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { NotificationTemplate } from "@/types";
import { getErrorMessage } from "@/lib/get-error-message";

type T = Record<string, string>;

interface TestRenderResult {
  subject: string;
  body: string;
}

interface TemplateTestRenderDialogProps {
  open: boolean;
  onClose: () => void;
  template: NotificationTemplate | null;
  t: T;
  tCommon: T;
}

interface TestRenderResponse {
  template: {
    subject?: string;
    body?: string;
    [key: string]: any;
  };
  rendered: {
    subject?: string;
    body: string;
    whatsapp_template_name?: string;
    whatsapp_template_language?: string;
  };
  context_used: Record<string, string>;
}

export function TemplateTestRenderDialog({ open, onClose, template, t, tCommon }: TemplateTestRenderDialogProps) {
  const [context, setContext] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestRenderResult | null>(null);

  const variables = template?.variables ?? [];

  const mutation = useMutation({
    mutationFn: () => notificationTemplateApi.testRender(template!.id, context),
    onSuccess: (response) => {
      const subject = response.data.rendered.subject || response.data.template.subject || "";
      setResult({
        subject,
        body: response.data.rendered.body,  // ← Access via response.data
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t.toast_failed ?? "Failed to render template"));
    },
  });

  function handleClose() {
    setContext({});
    setResult(null);
    onClose();
  }

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-blue-600" />
            {t.title ?? "Test Render"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <p className="font-medium">{template.template_code_detail.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {template.channel_display}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {template.language_name}
              </Badge>
            </div>
          </div>

          {variables.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="font-medium text-sm">{t.description ?? "Enter sample values"}</p>
              {variables.map((v) => (
                <Field key={v}>
                  <FieldLabel htmlFor={`var-${v}`} className="font-mono text-xs">
                    {`{${v}}`}
                  </FieldLabel>
                  <Input
                    id={`var-${v}`}
                    placeholder={t.variable_placeholder?.replace("{variable}", v) ?? `Sample value for ${v}`}
                    value={context[v] ?? ""}
                    onChange={(e) => setContext((prev) => ({ ...prev, [v]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t.no_variables ?? "This template has no variables."}</p>
          )}

          {result && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <p className="font-medium text-sm">{t.rendered_output ?? "Rendered Output"}</p>
                {result.subject && (
                  <div className="rounded-md border p-3">
                    <p className="mb-1 text-muted-foreground text-xs">{t.subject_label ?? "Subject"}</p>
                    <p className="text-sm">{result.subject}</p>
                  </div>
                )}
                <div className="rounded-md border p-3">
                  <p className="mb-1 text-muted-foreground text-xs">{t.body_label ?? "Body"}</p>
                  <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: result.body }} />
                </div>
              </div>
            </>
          )}
        </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon.close_btn ?? "Close"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <FlaskConical className="mr-1.5 h-4 w-4" />
            {mutation.isPending ? (t.rendering ?? "Rendering...") : (t.render_btn ?? "Render")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}