"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { menuApi } from "@/app/admin/_api/menu";
import { rolesApi } from "@/app/admin/_api/roles";
import { translationApi } from "@/app/admin/_api/translation";
import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { iconMap } from "@/lib/utils/icon-map";
import type { AdminMenuItem } from "@/types/admin";
import type { IconName } from "@/types/navigation";

type T = Record<string, string>;

const schema = z.object({
  label_key: z.string().min(1, { message: "Label key is required" }),
  path: z.string().min(1, { message: "Path is required" }),
  icon: z.string().min(1, { message: "Icon is required" }),
  roles: z.array(z.number()),
  parent: z.number().nullable(),
  order: z.coerce.number().int().min(0, { message: "Order must be a positive number" }),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface MenuItemFormProps {
  mode: "create" | "edit";
  menuItem?: AdminMenuItem;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  label_key: "",
  path: "",
  icon: "",
  roles: [],
  parent: null,
  order: 1,
  is_active: true,
};

function toFormValues(item: AdminMenuItem): FormValues {
  return {
    label_key: item.label_key ?? "",
    path: item.path ?? "",
    icon: item.icon ?? "",
    roles: item.roles ?? [],
    parent: item.parent ?? null,
    order: item.order ?? 1,
    is_active: item.is_active ?? true,
  };
}

export function MenuItemForm({ mode, menuItem, t = {}, tCommon = {} }: MenuItemFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const [labelKeyOpen, setLabelKeyOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: menuItem ? toFormValues(menuItem) : defaultValues,
  });

  useEffect(() => {
    if (menuItem) reset(toFormValues(menuItem));
  }, [menuItem?.id, reset, menuItem]);

  const { data: allMenuItems } = useQuery({
    queryKey: ["menu-items-list"],
    queryFn: () => menuApi.getAll({ page: 1, page_size: 100 }),
  });

  const { data: allRoles } = useQuery({
    queryKey: ["roles-list"],
    queryFn: () => rolesApi.getAll({ page: 1, page_size: 100 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list-menu"],
    queryFn: () => translationCategoryApi.getAll({ page: 1, page_size: 100 }),
  });

  const menuCategoryId = (categoriesData?.data ?? []).find((c) => c.code === "menu")?.id;

  const { data: menuTranslations } = useQuery({
    queryKey: ["menu-translation-keys", menuCategoryId],
    queryFn: () => translationApi.getAll({ page: 1, page_size: 200, category: menuCategoryId }),
    enabled: !!menuCategoryId,
  });

  const uniqueKeys = Array.from(new Map((menuTranslations?.data ?? []).map((tr) => [tr.full_key, tr])).values());

  const topLevelItems = (allMenuItems?.data ?? []).filter((item) => item.parent === null && item.id !== menuItem?.id);
  const roleOptions = allRoles?.data ?? [];

  const allIcons = Object.keys(iconMap) as IconName[];
  const filteredIcons = iconSearch.trim()
    ? allIcons.filter((n) => n.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 200)
    : allIcons.slice(0, 120);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        label_key: values.label_key,
        path: values.path,
        icon: values.icon,
        roles: values.roles,
        parent: values.parent,
        order: values.order,
        is_active: values.is_active,
      };
      return isEdit ? menuApi.update(menuItem!.id, payload) : menuApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Menu item updated successfully")
          : (t.toast_created ?? "Menu item created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      router.push("/admin/languages?tab=menu");
    },
    onError: () => toast.error(isEdit ? "Failed to update menu item" : "Failed to create menu item"),
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Menu Item Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v as FormValues))} className="flex flex-col gap-5">
            <FieldGroup>
              {/* ── Label Key ── */}
              <Controller
                control={control}
                name="label_key"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>
                      {t.label_key ?? "Label Key"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Popover open={labelKeyOpen} onOpenChange={setLabelKeyOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={labelKeyOpen}
                          className="w-full justify-between font-normal"
                        >
                          {field.value ? (
                            <span className="font-mono text-xs">{field.value}</span>
                          ) : (
                            <span className="text-muted-foreground">
                              {t.label_key_placeholder ?? "Select a translation key…"}
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t.label_key_search_placeholder ?? "Search key or value…"} />
                          <CommandList>
                            <CommandEmpty>
                              {!menuCategoryId
                                ? (t.label_key_loading ?? "Loading keys…")
                                : (t.label_key_no_results ?? "No keys found.")}
                            </CommandEmpty>
                            <CommandGroup>
                              {uniqueKeys.map((tr) => (
                                <CommandItem
                                  key={tr.id}
                                  value={`${tr.full_key} ${tr.value}`}
                                  onSelect={() => {
                                    field.onChange(tr.full_key);
                                    setLabelKeyOpen(false);
                                  }}
                                  data-checked={field.value === tr.full_key}
                                >
                                  <div className="flex min-w-0 flex-col gap-0.5">
                                    <span className="font-mono text-xs leading-none">{tr.full_key}</span>
                                    {tr.value && (
                                      <span className="truncate text-muted-foreground text-xs">{tr.value}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {field.value && (
                      <button
                        type="button"
                        className="self-start text-muted-foreground text-xs hover:text-destructive"
                        onClick={() => field.onChange("")}
                      >
                        Clear
                      </button>
                    )}
                    {errors.label_key && <FieldError errors={[errors.label_key]} />}
                  </Field>
                )}
              />

              {/* ── Path ── */}
              <Controller
                control={control}
                name="path"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="mi-path">
                      {t.path ?? "Path"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input id="mi-path" placeholder={t.path_placeholder ?? "e.g. /admin/dashboard"} {...field} />
                    {errors.path && <FieldError errors={[errors.path]} />}
                  </Field>
                )}
              />

              {/* ── Icon ── */}
              <Controller
                control={control}
                name="icon"
                render={({ field }) => {
                  const SelectedIcon = field.value
                    ? iconMap[(field.value.charAt(0).toUpperCase() + field.value.slice(1)) as IconName]
                    : null;
                  return (
                    <Field>
                      <FieldLabel>
                        {t.icon ?? "Icon"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Popover
                        open={iconOpen}
                        onOpenChange={(o) => {
                          setIconOpen(o);
                          if (!o) setIconSearch("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={iconOpen}
                            className="w-full justify-between font-normal"
                          >
                            {SelectedIcon ? (
                              <span className="flex items-center gap-2">
                                <SelectedIcon className="h-4 w-4" />
                                <span className="font-mono text-xs">{field.value}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t.icon_placeholder ?? "Select an icon…"}</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <div className="flex flex-col gap-0">
                            {/* Search input */}
                            <div className="flex items-center gap-2 border-b px-3 py-2">
                              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <input
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder={t.icon_search_placeholder ?? "Search icons…"}
                                value={iconSearch}
                                onChange={(e) => setIconSearch(e.target.value)}
                              />
                              {iconSearch && (
                                <button
                                  type="button"
                                  onClick={() => setIconSearch("")}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Icon count hint */}
                            <p className="border-b px-3 py-1.5 text-[11px] text-muted-foreground">
                              {iconSearch.trim()
                                ? `${filteredIcons.length} result${filteredIcons.length !== 1 ? "s" : ""}`
                                : `Showing 120 of ${allIcons.length.toLocaleString()} icons — type to search`}
                            </p>

                            {/* Icon grid */}
                            <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto p-2">
                              {filteredIcons.length === 0 && (
                                <p className="col-span-8 py-4 text-center text-muted-foreground text-xs">
                                  {t.icon_no_results ?? "No icons found."}
                                </p>
                              )}
                              {filteredIcons.map((name) => {
                                const Icon = iconMap[name];
                                const lcName = name.charAt(0).toLowerCase() + name.slice(1);
                                const isSelected = field.value === lcName;
                                return (
                                  <button
                                    key={name}
                                    type="button"
                                    title={lcName}
                                    onClick={() => {
                                      field.onChange(lcName);
                                      setIconOpen(false);
                                      setIconSearch("");
                                    }}
                                    className={cn(
                                      "flex aspect-square items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted",
                                      isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                                    )}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {errors.icon && <FieldError errors={[errors.icon]} />}
                    </Field>
                  );
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* ── Parent ── */}
                <Controller
                  control={control}
                  name="parent"
                  render={({ field }) => {
                    const selectedItem = topLevelItems.find((i) => i.id === field.value);
                    return (
                      <Field>
                        <FieldLabel>{t.parent ?? "Parent Item"}</FieldLabel>
                        <Popover open={parentOpen} onOpenChange={setParentOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={parentOpen}
                              className="w-full justify-between font-normal"
                            >
                              {selectedItem ? (
                                <span className="truncate font-mono text-xs">{selectedItem.label_key}</span>
                              ) : (
                                <span className="text-muted-foreground">{t.parent_placeholder ?? "Top level"}</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder={t.parent_search_placeholder ?? "Search parent…"} />
                              <CommandList>
                                <CommandEmpty>{t.parent_no_results ?? "No items found."}</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="__none__"
                                    onSelect={() => {
                                      field.onChange(null);
                                      setParentOpen(false);
                                    }}
                                    data-checked={field.value === null}
                                  >
                                    <span className="text-muted-foreground">{t.parent_none ?? "None (top level)"}</span>
                                  </CommandItem>
                                  {topLevelItems.map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={item.label_key}
                                      onSelect={() => {
                                        field.onChange(item.id);
                                        setParentOpen(false);
                                      }}
                                      data-checked={field.value === item.id}
                                    >
                                      <span className="font-mono text-xs">{item.label_key}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </Field>
                    );
                  }}
                />

                {/* ── Order ── */}
                <Controller
                  control={control}
                  name="order"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="mi-order">
                        {t.order ?? "Order"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="mi-order"
                        type="number"
                        min={0}
                        placeholder={t.order_placeholder ?? "e.g. 1"}
                        {...field}
                      />
                      {errors.order && <FieldError errors={[errors.order]} />}
                    </Field>
                  )}
                />
              </div>

              {/* ── Roles ── */}
              <Controller
                control={control}
                name="roles"
                render={({ field }) => {
                  const selected: number[] = field.value;
                  return (
                    <Field>
                      <FieldLabel>{t.roles ?? "Roles"}</FieldLabel>
                      <Popover open={roleOpen} onOpenChange={setRoleOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={roleOpen}
                            className="w-full justify-between font-normal"
                          >
                            {selected.length > 0 ? (
                              <span className="text-sm">
                                {selected.length} role{selected.length !== 1 ? "s" : ""} selected
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t.roles_placeholder ?? "Select roles…"}</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={t.roles_search_placeholder ?? "Search roles…"} />
                            <CommandList>
                              <CommandEmpty>
                                {roleOptions.length === 0
                                  ? (t.roles_loading ?? "Loading roles…")
                                  : (t.roles_no_results ?? "No roles found.")}
                              </CommandEmpty>
                              <CommandGroup>
                                {roleOptions.map((role) => {
                                  const checked = selected.includes(role.id);
                                  return (
                                    <CommandItem
                                      key={role.id}
                                      value={role.name}
                                      onSelect={() => {
                                        field.onChange(
                                          checked ? selected.filter((id) => id !== role.id) : [...selected, role.id],
                                        );
                                      }}
                                      data-checked={checked}
                                    >
                                      <Check
                                        className={cn("mr-2 h-4 w-4 shrink-0", checked ? "opacity-100" : "opacity-0")}
                                      />
                                      {role.name}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Selected role badges */}
                      {selected.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {selected.map((rid) => {
                            const role = roleOptions.find((r) => r.id === rid);
                            return (
                              <Badge
                                key={rid}
                                variant="secondary"
                                className="cursor-pointer gap-1 text-xs"
                                onClick={() => field.onChange(selected.filter((s) => s !== rid))}
                              >
                                {role?.name ?? rid}
                                <X className="h-3 w-3" />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </Field>
                  );
                }}
              />
            </FieldGroup>

            {/* ── Active toggle ── */}
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FieldLabel className="mb-0">{t.is_active ?? "Active"}</FieldLabel>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      {t.is_active_description ?? "Inactive items are hidden from the sidebar"}
                    </p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/languages?tab=menu")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(menuItem ? toFormValues(menuItem) : defaultValues)}
              >
                {tCommon.reset_btn ?? "Reset"}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
