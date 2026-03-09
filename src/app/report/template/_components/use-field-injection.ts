"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
  type: string;
};

type FieldTemplateItem = {
  id: string;
  name: string;
  field_catalog: FieldCatalogItem[];
};

type FieldTemplatesApiResponse = {
  ok: boolean;
  error?: string;
  field_templates?: FieldTemplateItem[];
};

/** Hook to manage field template selection, grouping, and field injection clipboard logic */
export function useFieldInjection(enabled: boolean) {
  const { t } = useLanguage();
  const [fieldTemplates, setFieldTemplates] = useState<FieldTemplateItem[]>([]);
  const [selectedFieldTemplateId, setSelectedFieldTemplateId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const loadFieldTemplates = useCallback(async () => {
    const res = await fetch("/api/report/field-templates", { cache: "no-store" });
    const data = (await res.json()) as FieldTemplatesApiResponse;
    if (data.ok && Array.isArray(data.field_templates)) {
      setFieldTemplates(data.field_templates);
      setSelectedFieldTemplateId((prev) => prev || data.field_templates?.[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    if (enabled) void loadFieldTemplates();
  }, [enabled, loadFieldTemplates]);

  const selectedFieldTemplate = useMemo(
    () => fieldTemplates.find((item) => item.id === selectedFieldTemplateId) ?? null,
    [fieldTemplates, selectedFieldTemplateId],
  );

  const fieldCatalog = useMemo(
    () => selectedFieldTemplate?.field_catalog ?? [],
    [selectedFieldTemplate],
  );

  const fieldsByGroup = useMemo(
    () =>
      fieldCatalog.reduce((acc, field) => {
        const group = field.group || t("template.editor.ungrouped");
        if (!acc[group]) acc[group] = [];
        acc[group].push(field);
        return acc;
      }, {} as Record<string, FieldCatalogItem[]>),
    [fieldCatalog, t],
  );

  const groups = useMemo(
    () => Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi")),
    [fieldsByGroup],
  );

  const fieldsInSelectedGroup = useMemo(
    () => (selectedGroup ? fieldsByGroup[selectedGroup] ?? [] : []),
    [fieldsByGroup, selectedGroup],
  );

  // Reset group/field when field template changes
  useEffect(() => {
    if (!selectedFieldTemplateId) {
      setSelectedGroup("");
      setSelectedFieldKey("");
      return;
    }
    const nextGroups = Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi"));
    if (nextGroups.length > 0) {
      setSelectedGroup(nextGroups[0]);
      setSelectedFieldKey((fieldsByGroup[nextGroups[0]] ?? [])[0]?.field_key ?? "");
    } else {
      setSelectedGroup("");
      setSelectedFieldKey("");
    }
  }, [fieldsByGroup, selectedFieldTemplateId]);

  /** Copy field placeholder to clipboard */
  function injectField(fieldKey?: string) {
    const key = fieldKey ?? selectedFieldKey;
    if (!key) return;
    const placeholder = `[${key}]`;
    void navigator.clipboard.writeText(placeholder).then(() => {
      setCopyFeedback(placeholder);
      window.setTimeout(() => setCopyFeedback(null), 2000);
    });
  }

  return {
    fieldTemplates,
    selectedFieldTemplateId,
    setSelectedFieldTemplateId,
    selectedGroup,
    setSelectedGroup,
    selectedFieldKey,
    setSelectedFieldKey,
    copyFeedback,
    fieldCatalog,
    fieldsByGroup,
    groups,
    fieldsInSelectedGroup,
    injectField,
  };
}
